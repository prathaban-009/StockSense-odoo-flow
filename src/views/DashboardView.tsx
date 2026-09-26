import React, { useEffect, useState } from 'react';
import {
  Package,
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Clock,
  ArrowRight,
  Search,
  Layers,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { DashboardStats, Operation, Product } from '../types.ts';
import { LowStockAlertPanel } from '../components/LowStockAlertPanel.tsx';

interface DashboardViewProps {
  onNavigateToOperations: (type?: string, status?: string) => void;
  onNavigateToProducts: (filter?: string) => void;
  onSelectOperation: (op: Operation) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToOperations,
  onNavigateToProducts,
  onSelectOperation,
}) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const loadData = async () => {
    try {
      const [statsData, opsData, prodsData] = await Promise.all([
        api.getDashboardStats(),
        api.getOperations(),
        api.getProducts(),
      ]);
      setStats(statsData);
      setOperations(opsData);
      setProducts(prodsData);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredOperations = operations.filter((op) => {
    if (docTypeFilter !== 'all' && op.operationType !== docTypeFilter) return false;
    if (statusFilter !== 'all' && op.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = op.reference.toLowerCase().includes(q);
      const matchContact = (op.contact || '').toLowerCase().includes(q);
      const matchResponsible = (op.responsible || '').toLowerCase().includes(q);
      if (!matchRef && !matchContact && !matchResponsible) return false;
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'ready':
        return 'bg-blue-50 text-[#1E40AF] dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'waiting':
        return 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'canceled':
        return 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2.5">
          <div className="w-7 h-7 border-2 border-[#1E40AF] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-500 font-medium">Loading inventory metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Executive Operational Header */}
      <div className="bg-white dark:bg-[#0F172A] p-5 sm:p-6 rounded-lg border border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium tracking-wide">
              PostgreSQL Connected • Real-time State
            </span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Operations &amp; Inventory Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enterprise operational queue for vendor receipts, customer shipments, and physical stock reconciliation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={loadData}
            className="p-2 border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md text-slate-600 dark:text-slate-300 transition-colors"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => onNavigateToOperations('receipt', 'ready')}
            className="px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Process Receipts</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Row (Tabular Figures & Clean Supply Chain Layout) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total Products */}
        <div
          onClick={() => onNavigateToProducts()}
          className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-lg border border-[#E2E8F0] dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Total Products</span>
            <div className="w-6 h-6 rounded bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 flex items-center justify-center">
              <Package className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {stats?.totalProductsCount ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{stats?.totalProductsInStock ?? 0}</span> in active stock
          </p>
        </div>

        {/* Low Stock Items */}
        <div
          onClick={() => onNavigateToProducts('low_stock')}
          className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-lg border border-[#E2E8F0] dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 transition-colors cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Below Safety Level</span>
            <div className="w-6 h-6 rounded bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 mt-2">
            {stats?.lowStockCount ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Requires replenishment</p>
        </div>

        {/* Pending Receipts */}
        <div
          onClick={() => onNavigateToOperations('receipt')}
          className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-lg border border-[#E2E8F0] dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Pending Receipts</span>
            <div className="w-6 h-6 rounded bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {stats?.receipts.toReceive ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{stats?.receipts.total ?? 0}</span> in inbound pipeline
          </p>
        </div>

        {/* Pending Deliveries */}
        <div
          onClick={() => onNavigateToOperations('delivery')}
          className="bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-lg border border-[#E2E8F0] dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Pending Deliveries</span>
            <div className="w-6 h-6 rounded bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {stats?.deliveries.toDeliver ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            <span className="font-semibold text-slate-800 dark:text-slate-200">{stats?.deliveries.total ?? 0}</span> outbound orders
          </p>
        </div>

        {/* Internal Transfers Scheduled */}
        <div
          onClick={() => onNavigateToOperations('internal')}
          className="col-span-2 lg:col-span-1 bg-white dark:bg-[#0F172A] p-4 sm:p-5 rounded-lg border border-[#E2E8F0] dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 transition-colors cursor-pointer shadow-xs"
        >
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span>Internal Moves</span>
            <div className="w-6 h-6 rounded bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white mt-2">
            {stats?.internalTransfersScheduled ?? 0}
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Between warehouse zones</p>
        </div>
      </div>

      {/* Operational Summary Cards (Receipt & Delivery Inbound/Outbound) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Receipt Card */}
        <div className="bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 flex items-center justify-center font-bold">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Receipts</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Vendor Inbound
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => onNavigateToOperations('receipt', 'ready')}
              className="p-3.5 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-left transition-colors cursor-pointer shadow-xs group"
            >
              <span className="text-[11px] text-blue-200 block font-medium">To Receive</span>
              <span className="text-lg font-bold font-mono tabular-nums block mt-0.5 group-hover:translate-x-0.5 transition-transform">
                {stats?.receipts.toReceive ?? 0} TO RECEIVE →
              </span>
            </button>

            <button
              onClick={() => onNavigateToOperations('receipt')}
              className="p-3.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/80 rounded-md text-left transition-colors cursor-pointer"
            >
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Total Operations</span>
              <span className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white block mt-0.5">
                {stats?.receipts.total ?? 0} IN PIPELINE
              </span>
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              {stats?.receipts.late ?? 0} Late (overdue)
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              {stats?.receipts.waiting ?? 0} Awaiting shipment
            </span>
          </div>
        </div>

        {/* Delivery Card */}
        <div className="bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 p-5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 flex items-center justify-center font-bold">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Delivery Orders</h3>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Customer Outbound
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <button
              onClick={() => onNavigateToOperations('delivery', 'ready')}
              className="p-3.5 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-left transition-colors cursor-pointer shadow-xs group"
            >
              <span className="text-[11px] text-blue-200 block font-medium">To Deliver</span>
              <span className="text-lg font-bold font-mono tabular-nums block mt-0.5 group-hover:translate-x-0.5 transition-transform">
                {stats?.deliveries.toDeliver ?? 0} TO DELIVER →
              </span>
            </button>

            <button
              onClick={() => onNavigateToOperations('delivery')}
              className="p-3.5 bg-slate-50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700/80 rounded-md text-left transition-colors cursor-pointer"
            >
              <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-medium">Total Operations</span>
              <span className="text-lg font-bold font-mono tabular-nums text-slate-900 dark:text-white block mt-0.5">
                {stats?.deliveries.total ?? 0} IN PIPELINE
              </span>
            </button>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              {stats?.deliveries.late ?? 0} Late (overdue)
            </span>
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              {stats?.deliveries.waiting ?? 0} Waiting for stocks
            </span>
          </div>
        </div>
      </div>

      {/* Low Stock Alert & Replenishment Panel */}
      <LowStockAlertPanel
        products={products}
        onReplenishmentSuccess={(createdOp) => {
          loadData();
          setOperations((prev) => [createdOp, ...prev]);
        }}
        onNavigateToOperations={onNavigateToOperations}
        onNavigateToProducts={onNavigateToProducts}
      />

      {/* Dynamic Filters & Recent Operations Table */}
      <div className="bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 overflow-hidden shadow-xs">
        {/* Filter Controls Header */}
        <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-slate-800 space-y-3.5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Warehouse Operations</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Filter documents by type, lifecycle status, warehouse, and partner contact
              </p>
            </div>

            {/* Search Box */}
            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search reference, contact..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white transition-colors"
              />
            </div>
          </div>

          {/* Dynamic Filter Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
            {/* Document Type Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Type:</span>
              {[
                { id: 'all', label: 'All Documents' },
                { id: 'receipt', label: 'Receipts' },
                { id: 'delivery', label: 'Deliveries' },
                { id: 'internal', label: 'Internal' },
                { id: 'adjustment', label: 'Adjustments' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setDocTypeFilter(t.id)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    docTypeFilter === t.id
                      ? 'bg-[#1E40AF] text-white shadow-2xs font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Status Pills */}
            <div className="flex flex-wrap items-center gap-1 text-xs">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Status:</span>
              {['all', 'draft', 'waiting', 'ready', 'done'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-0.5 rounded text-[11px] uppercase tracking-wider font-semibold transition-colors cursor-pointer ${
                    statusFilter === st
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                      : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Operations Table with Comfortable Enterprise Density */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100/70 dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 font-semibold border-b border-[#E2E8F0] dark:border-slate-800">
              <tr>
                <th className="py-3 px-4 sm:px-5">Reference</th>
                <th className="py-3 px-4 sm:px-5">Type</th>
                <th className="py-3 px-4 sm:px-5">Source Location</th>
                <th className="py-3 px-4 sm:px-5">Destination Location</th>
                <th className="py-3 px-4 sm:px-5">Partner Contact</th>
                <th className="py-3 px-4 sm:px-5">Scheduled Date</th>
                <th className="py-3 px-4 sm:px-5">Status</th>
                <th className="py-3 px-4 sm:px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
              {filteredOperations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No matching operations found for current filters.
                  </td>
                </tr>
              ) : (
                filteredOperations.map((op) => (
                  <tr
                    key={op.id}
                    onClick={() => onSelectOperation(op)}
                    className="hover:bg-blue-50/30 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 sm:px-5 font-mono font-bold text-slate-900 dark:text-white">
                      {op.reference}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 capitalize font-medium">{op.operationType}</td>
                    <td className="py-3.5 px-4 sm:px-5 text-slate-600 dark:text-slate-400">
                      {op.sourceLocationName || (op.operationType === 'receipt' ? 'Vendor' : 'WH/Stock1')}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 text-slate-600 dark:text-slate-400">
                      {op.destLocationName || (op.operationType === 'delivery' ? 'Customer' : 'WH/Stock1')}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 font-medium">{op.contact || 'Internal'}</td>
                    <td className="py-3.5 px-4 sm:px-5 font-mono tabular-nums text-slate-500 dark:text-slate-400">
                      {op.scheduledDate || '—'}
                    </td>
                    <td className="py-3.5 px-4 sm:px-5">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wider ${getStatusBadge(
                          op.status
                        )}`}
                      >
                        {op.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 sm:px-5 text-right">
                      <span className="text-[#1E40AF] dark:text-blue-400 hover:text-[#1D4ED8] font-semibold hover:underline inline-flex items-center gap-1">
                        View <ArrowRight className="w-3 h-3" />
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
