import React, { useEffect, useState } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Mail,
  Code2,
  X,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Location, Warehouse } from '../types.ts';
import { MailProviderPlanModal } from '../components/MailProviderPlanModal.tsx';
import { FastApiModal } from '../components/FastApiModal.tsx';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'warehouses' | 'locations' | 'mail' | 'fastapi'>('warehouses');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showWhModal, setShowWhModal] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [showMailModal, setShowMailModal] = useState(false);
  const [showFastApiModal, setShowFastApiModal] = useState(false);

  // Forms
  const [whName, setWhName] = useState('');
  const [whCode, setWhCode] = useState('');
  const [whAddress, setWhAddress] = useState('');

  const [locName, setLocName] = useState('');
  const [locCode, setLocCode] = useState('');
  const [locWhId, setLocWhId] = useState<number>(1);
  const [locType, setLocType] = useState('internal');

  const loadData = async () => {
    try {
      const [whData, locData] = await Promise.all([api.getWarehouses(), api.getLocations()]);
      setWarehouses(whData);
      setLocations(locData);
      if (whData.length > 0) {
        setLocWhId(whData[0].id);
      }
    } catch (err) {
      console.error('Failed to load settings data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateWarehouse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createWarehouse({
        name: whName,
        shortCode: whCode,
        address: whAddress,
      });
      setShowWhModal(false);
      setWhName('');
      setWhCode('');
      setWhAddress('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create warehouse');
    }
  };

  const handleCreateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createLocation({
        name: locName,
        shortCode: locCode,
        warehouseId: locWhId,
        locationType: locType,
      });
      setShowLocModal(false);
      setLocName('');
      setLocCode('');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to create location');
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-[#0F172A] p-5 sm:p-6 rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          System &amp; Inventory Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Configure physical warehouses, storage locations, mail provider deployment plans, and backend architecture.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0] dark:border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('warehouses')}
          className={`pb-3 px-3.5 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'warehouses'
              ? 'border-[#1E40AF] text-[#1E40AF] dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>Warehouses</span>
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`pb-3 px-3.5 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'locations'
              ? 'border-[#1E40AF] text-[#1E40AF] dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>Storage Locations</span>
        </button>
        <button
          onClick={() => setActiveTab('mail')}
          className={`pb-3 px-3.5 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'mail'
              ? 'border-[#1E40AF] text-[#1E40AF] dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Mail className="w-3.5 h-3.5" />
          <span>Mail Provider Plan (OTP)</span>
        </button>
        <button
          onClick={() => setActiveTab('fastapi')}
          className={`pb-3 px-3.5 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'fastapi'
              ? 'border-[#1E40AF] text-[#1E40AF] dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>FastAPI &amp; PostgreSQL Docs</span>
        </button>
      </div>

      {/* WAREHOUSES TAB */}
      {activeTab === 'warehouses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Configured Warehouses</h3>
            <button
              onClick={() => setShowWhModal(true)}
              className="px-3.5 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Warehouse</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {warehouses.map((wh) => (
              <div
                key={wh.id}
                className="bg-white dark:bg-[#0F172A] p-5 rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xs"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">{wh.name}</h4>
                    <span className="inline-block mt-1 font-mono text-xs px-2 py-0.5 bg-blue-50 dark:bg-[#1E40AF]/30 text-[#1E40AF] dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded font-semibold">
                      Short Code: {wh.shortCode}
                    </span>
                  </div>
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/60 rounded-md text-[#1E40AF] dark:text-blue-300">
                    <Building2 className="w-4 h-4" />
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">{wh.address || 'Address not configured'}</p>

                <div className="mt-4 pt-3 border-t border-[#E2E8F0] dark:border-slate-800 flex justify-between items-center text-xs">
                  <span className="text-slate-400">Child Locations:</span>
                  <span className="font-semibold text-slate-700 dark:text-slate-300 font-mono">
                    {wh.locations?.length ?? locations.filter((l) => l.warehouseId === wh.id).length} zones
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LOCATIONS TAB with Comfortable Enterprise Density */}
      {activeTab === 'locations' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Storage Locations &amp; Internal Racks
            </h3>
            <button
              onClick={() => setShowLocModal(true)}
              className="px-3.5 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Location</span>
            </button>
          </div>

          <div className="bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border-b border-[#E2E8F0] dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 sm:px-5">Location Name</th>
                  <th className="py-3 px-4 sm:px-5">Short Code</th>
                  <th className="py-3 px-4 sm:px-5">Warehouse</th>
                  <th className="py-3 px-4 sm:px-5">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-blue-50/20 dark:hover:bg-slate-800/40">
                    <td className="py-3.5 px-4 sm:px-5 font-semibold text-slate-900 dark:text-white">{loc.name}</td>
                    <td className="py-3.5 px-4 sm:px-5 font-mono text-slate-500 dark:text-slate-400">{loc.shortCode}</td>
                    <td className="py-3.5 px-4 sm:px-5 text-slate-600 dark:text-slate-400">
                      {loc.warehouseName || 'Global / Virtual'}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5">
                      <span className="capitalize px-2.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700">
                        {loc.locationType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MAIL PROVIDER TAB */}
      {activeTab === 'mail' && (
        <div className="space-y-4">
          <div className="p-6 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-800 rounded-lg shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Mail Provider &amp; OTP Authentication Architecture
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              StockSense is currently configured in development testing mode: OTPs are logged directly to the server terminal and can be verified immediately. Integration plans for production deployment with Resend, SendGrid, and AWS SES are provided.
            </p>
            <button
              onClick={() => setShowMailModal(true)}
              className="mt-4 px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <span>Open Email Provider Architecture &amp; Test Suite →</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-5 bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xs">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">Step 1: Console Sim</span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Server generates 6-digit cryptographic code, stores hash &amp; expiration in PostgreSQL table <code className="font-mono text-[#1E40AF] dark:text-blue-400">otp_codes</code>, and prints to console.
              </p>
            </div>
            <div className="p-5 bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xs">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">Step 2: Mail Provider Hook</span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Replace logger with <code className="font-mono text-[#1E40AF] dark:text-blue-400">resend.emails.send()</code> or Twilio SendGrid client using verified domain SPF/DKIM keys.
              </p>
            </div>
            <div className="p-5 bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xs">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">Step 3: Secure Verification</span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Client submits OTP + new password; server ensures code has not expired, marks code as used, and hashes new password with bcrypt.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* FASTAPI & POSTGRESQL DOCS TAB */}
      {activeTab === 'fastapi' && (
        <div className="space-y-4">
          <div className="p-6 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-800 rounded-lg shadow-xs">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              FastAPI Python Implementation Reference
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              Complete Python FastAPI backend is provided inside <code className="font-mono bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-900">/fastapi_backend</code> with SQLAlchemy models, Pydantic schemas, and OTP authentication routers.
            </p>
            <button
              onClick={() => setShowFastApiModal(true)}
              className="mt-4 px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
            >
              <span>Open Full FastAPI Endpoints Documentation &amp; Setup →</span>
            </button>
          </div>
        </div>
      )}

      {/* ADD WAREHOUSE MODAL */}
      {showWhModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="bg-[#1E40AF] text-white p-4 flex justify-between items-center">
              <h3 className="text-sm font-semibold">Add New Warehouse</h3>
              <button onClick={() => setShowWhModal(false)} className="text-blue-200 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateWarehouse} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Warehouse Name
                </label>
                <input
                  type="text"
                  required
                  value={whName}
                  onChange={(e) => setWhName(e.target.value)}
                  placeholder="e.g. West Coast Distribution"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Short Code (Unique, e.g. WH3)
                </label>
                <input
                  type="text"
                  required
                  value={whCode}
                  onChange={(e) => setWhCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WCD"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white font-mono uppercase focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
                <textarea
                  rows={2}
                  value={whAddress}
                  onChange={(e) => setWhAddress(e.target.value)}
                  placeholder="Physical street address..."
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowWhModal(false)}
                  className="flex-1 py-2 border border-[#E2E8F0] dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-semibold rounded-md transition-colors cursor-pointer shadow-xs"
                >
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD LOCATION MODAL */}
      {showLocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="bg-[#1E40AF] text-white p-4 flex justify-between items-center">
              <h3 className="text-sm font-semibold">Add Storage Location</h3>
              <button onClick={() => setShowLocModal(false)} className="text-blue-200 hover:text-white cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateLocation} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Location Name (e.g. WH/Stock3)
                </label>
                <input
                  type="text"
                  required
                  value={locName}
                  onChange={(e) => setLocName(e.target.value)}
                  placeholder="e.g. WH/Stock3"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Short Code</label>
                <input
                  type="text"
                  required
                  value={locCode}
                  onChange={(e) => setLocCode(e.target.value.toUpperCase())}
                  placeholder="e.g. Stock3"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white font-mono uppercase focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Parent Warehouse
                </label>
                <select
                  value={locWhId}
                  onChange={(e) => setLocWhId(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.shortCode})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Location Type</label>
                <select
                  value={locType}
                  onChange={(e) => setLocType(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none"
                >
                  <option value="internal">Internal (Warehouse Storage)</option>
                  <option value="vendor">Vendor / Supplier</option>
                  <option value="customer">Customer / Outbound</option>
                  <option value="inventory_loss">Inventory Loss / Scrap</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowLocModal(false)}
                  className="flex-1 py-2 border border-[#E2E8F0] dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-semibold rounded-md transition-colors cursor-pointer shadow-xs"
                >
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* External Modals */}
      <MailProviderPlanModal isOpen={showMailModal} onClose={() => setShowMailModal(false)} />
      <FastApiModal isOpen={showFastApiModal} onClose={() => setShowFastApiModal(false)} />
    </div>
  );
};
