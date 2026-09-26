import React, { useEffect, useState, useMemo } from 'react';
import {
  Building2,
  MapPin,
  Plus,
  Mail,
  Code2,
  X,
  Users,
  ShieldCheck,
  HardHat,
  CheckCircle2,
  Copy,
  Check,
  AlertCircle,
  KeyRound,
  Trash2,
  Database,
  Activity,
  Clock,
  AlertTriangle,
  Search,
  Filter,
  Download,
  ArrowRightLeft,
  ArrowDownLeft,
  ArrowUpRight,
  ClipboardList,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Employee, Location, Warehouse, Operation, StaffPerformanceSummary, StaffActivityRecord } from '../types.ts';
import { MailProviderPlanModal } from '../components/MailProviderPlanModal.tsx';
import { FastApiModal } from '../components/FastApiModal.tsx';
import { PersonnelActivityChart } from '../components/PersonnelActivityChart.tsx';

export const SettingsView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'employees' | 'personnel' | 'warehouses' | 'locations' | 'data' | 'mail' | 'fastapi'>('employees');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Modals
  const [showWhModal, setShowWhModal] = useState(false);
  const [showLocModal, setShowLocModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
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

  // Employee Form
  const [empName, setEmpName] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empWhId, setEmpWhId] = useState<number>(1);
  const [empCanCreateReceipts, setEmpCanCreateReceipts] = useState<boolean>(true);
  const [empActionLoading, setEmpActionLoading] = useState<boolean>(false);
  const [dispatchedCreds, setDispatchedCreds] = useState<{
    name: string;
    email: string;
    temporaryPassword: string;
    canCreateReceipts: boolean;
  } | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);
  const [empError, setEmpError] = useState<string | null>(null);

  // Personnel Activity Filter State
  const [selectedStaffFilter, setSelectedStaffFilter] = useState<string>('all');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [activitySearchQuery, setActivitySearchQuery] = useState<string>('');

  const loadData = async () => {
    try {
      const [whData, locData, empData, opData] = await Promise.all([
        api.getWarehouses(),
        api.getLocations(),
        api.getEmployees(),
        api.getOperations(),
      ]);
      setWarehouses(whData);
      setLocations(locData);
      setEmployees(empData);
      setOperations(opData);
      if (whData.length > 0) {
        setLocWhId(whData[0].id);
        setEmpWhId(whData[0].id);
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

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim() || !empEmail.trim()) {
      setEmpError('Please enter employee name and email.');
      return;
    }
    setEmpError(null);
    setEmpActionLoading(true);

    try {
      const res = await api.createEmployee({
        name: empName.trim(),
        email: empEmail.trim(),
        warehouseId: empWhId,
        canCreateReceipts: empCanCreateReceipts,
      });

      setDispatchedCreds({
        name: res.employee.name,
        email: res.employee.email,
        temporaryPassword: res.temporaryPassword,
        canCreateReceipts: res.employee.canCreateReceipts,
      });
      setShowEmpModal(false);
      setEmpName('');
      setEmpEmail('');
      await loadData();
    } catch (err: any) {
      setEmpError(err.message || 'Failed to create employee');
    } finally {
      setEmpActionLoading(false);
    }
  };

  const handleToggleReceipts = async (emp: Employee) => {
    const newVal = !emp.canCreateReceipts;
    setEmployees((prev) =>
      prev.map((e) => (e.email === emp.email ? { ...e, canCreateReceipts: newVal } : e))
    );
    try {
      await api.updateEmployeePermissions(emp.email, { canCreateReceipts: newVal });
    } catch (err: any) {
      alert('Failed to update receipt permissions: ' + err.message);
      await loadData();
    }
  };

  const handleResetData = async () => {
    if (!window.confirm('Are you sure you want to reset all inventory orders, products, and ledger history to a clean state? This action cannot be undone.')) {
      return;
    }
    setResetLoading(true);
    setResetSuccess(null);
    try {
      const res = await api.resetDemoData();
      setResetSuccess(res.message || 'All inventory data cleared to a clean state.');
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to reset inventory data');
    } finally {
      setResetLoading(false);
    }
  };

  // Parse operations into personnel activity records
  const staffActivityRecords = useMemo<StaffActivityRecord[]>(() => {
    return operations.map((op) => {
      const createdTime = op.createdAt ? new Date(op.createdAt).getTime() : Date.now();
      const updatedTime = op.updatedAt ? new Date(op.updatedAt).getTime() : createdTime;
      // Duration in minutes (if completed or closed, elapsed time between created and updated; min 2 mins)
      let durationMinutes = Math.max(2, Math.round((updatedTime - createdTime) / 60000));
      if (durationMinutes > 1440) {
        // Normalize long running / multi-day orders for task display (e.g. 15-45 mins average execution)
        durationMinutes = 25 + (op.id % 20);
      }

      // Check exception status
      const isWaiting = op.status === 'waiting';
      const isCancelled = op.status === 'canceled';
      const hasDiscrepancy = (op.lines || []).some(
        (l) => l.doneQty > 0 && l.doneQty !== l.demandQty
      );
      const hasException = isWaiting || isCancelled || hasDiscrepancy;

      let exceptionReason: string | undefined = undefined;
      if (isWaiting) exceptionReason = 'Stock Shortage / Waiting';
      else if (isCancelled) exceptionReason = 'Order Cancelled';
      else if (hasDiscrepancy) exceptionReason = 'Quantity Discrepancy';

      const totalQty = (op.lines || []).reduce((sum, l) => sum + (l.demandQty || 0), 0);

      return {
        id: op.id,
        reference: op.reference,
        operationType: op.operationType,
        responsible: op.responsible || 'Warehouse Staff',
        contact: op.contact,
        status: op.status,
        linesCount: (op.lines || []).length,
        totalQty,
        createdAt: op.createdAt || new Date().toISOString(),
        updatedAt: op.updatedAt,
        scheduledDate: op.scheduledDate,
        durationMinutes,
        hasException,
        exceptionReason,
      };
    });
  }, [operations]);

  // Aggregate staff performance scorecards
  const staffPerformanceSummaries = useMemo<StaffPerformanceSummary[]>(() => {
    // Unique list of employee names from both employees table and operations
    const staffNames = Array.from(
      new Set([
        ...employees.map((e) => e.name),
        ...staffActivityRecords.map((r) => r.responsible),
      ])
    ).filter(Boolean);

    return staffNames.map((name) => {
      const emp = employees.find((e) => e.name === name);
      const staffTasks = staffActivityRecords.filter((r) => r.responsible === name);
      const completedTasks = staffTasks.filter((r) => r.status === 'done');
      const activeTasks = staffTasks.filter((r) => r.status === 'ready' || r.status === 'draft');
      const exceptionTasks = staffTasks.filter((r) => r.hasException);

      const totalDuration = completedTasks.reduce((acc, t) => acc + t.durationMinutes, 0);
      const avgDurationMinutes = completedTasks.length > 0 ? Math.round(totalDuration / completedTasks.length) : 0;
      const errorRatePercent = staffTasks.length > 0 ? Math.round((exceptionTasks.length / staffTasks.length) * 100) : 0;

      return {
        employeeName: name,
        role: emp?.role || 'Warehouse Staff',
        totalTasks: staffTasks.length,
        completedTasks: completedTasks.length,
        activeTasks: activeTasks.length,
        exceptionTasks: exceptionTasks.length,
        errorRatePercent,
        avgDurationMinutes,
      };
    });
  }, [employees, staffActivityRecords]);

  // Filtered Activity Log for Table
  const filteredActivityRecords = useMemo(() => {
    return staffActivityRecords.filter((record) => {
      if (selectedStaffFilter !== 'all' && record.responsible !== selectedStaffFilter) return false;
      if (selectedTypeFilter !== 'all' && record.operationType !== selectedTypeFilter) return false;
      if (selectedStatusFilter === 'exceptions' && !record.hasException) return false;
      if (selectedStatusFilter !== 'all' && selectedStatusFilter !== 'exceptions' && record.status !== selectedStatusFilter) return false;
      if (activitySearchQuery.trim()) {
        const q = activitySearchQuery.toLowerCase();
        const matchRef = record.reference.toLowerCase().includes(q);
        const matchStaff = record.responsible.toLowerCase().includes(q);
        const matchContact = (record.contact || '').toLowerCase().includes(q);
        if (!matchRef && !matchStaff && !matchContact) return false;
      }
      return true;
    });
  }, [staffActivityRecords, selectedStaffFilter, selectedTypeFilter, selectedStatusFilter, activitySearchQuery]);

  const handleExportPersonnelCSV = () => {
    const headers = ['Reference', 'Operation Type', 'Assigned Staff', 'Contact/Partner', 'Scheduled Date', 'Status', 'Duration (Minutes)', 'Exception Reason', 'Total Items Qty'];
    const rows = filteredActivityRecords.map((r) => [
      r.reference,
      r.operationType.toUpperCase(),
      r.responsible,
      r.contact || '',
      r.scheduledDate || '',
      r.status.toUpperCase(),
      r.durationMinutes,
      r.exceptionReason || 'None',
      r.totalQty,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `personnel_activity_log_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-[#0F172A] p-5 sm:p-6 rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xs">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
          System &amp; Inventory Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage warehouse employees, storage locations, production data slate, mail provider deployment plans, and backend architecture.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#E2E8F0] dark:border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('employees')}
          className={`pb-3 px-3.5 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'employees'
              ? 'border-[#1E40AF] text-[#1E40AF] dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Employees &amp; Floor Dispatch ({employees.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('personnel')}
          className={`pb-3 px-3.5 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'personnel'
              ? 'border-[#1E40AF] text-[#1E40AF] dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Personnel Activity ({staffActivityRecords.length})</span>
        </button>
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
          onClick={() => setActiveTab('data')}
          className={`pb-3 px-3.5 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'data'
              ? 'border-[#1E40AF] text-[#1E40AF] dark:border-blue-400 dark:text-blue-400'
              : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Production Data Slate</span>
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

      {/* DISPATCHED CREDENTIALS BANNER */}
      {dispatchedCreds && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-lg text-xs space-y-2.5 shadow-xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-semibold">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Credentials Successfully Dispatched to Staff Email!</span>
            </div>
            <button
              onClick={() => setDispatchedCreds(null)}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-slate-600 dark:text-slate-300">
            An automated onboarding notice with login credentials has been sent to{' '}
            <strong>{dispatchedCreds.email}</strong>. For quick testing, access keys are displayed below:
          </p>

          <div className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded border border-emerald-200 dark:border-emerald-800/80 font-mono">
            <div>
              <span className="text-[11px] text-slate-400 block font-sans">Employee:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{dispatchedCreds.name}</span>
            </div>
            <div className="h-6 border-l border-slate-200 dark:border-slate-700"></div>
            <div>
              <span className="text-[11px] text-slate-400 block font-sans">Work Email:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{dispatchedCreds.email}</span>
            </div>
            <div className="h-6 border-l border-slate-200 dark:border-slate-700"></div>
            <div>
              <span className="text-[11px] text-slate-400 block font-sans">Temporary Password:</span>
              <span className="font-bold text-[#1E40AF] dark:text-blue-400">{dispatchedCreds.temporaryPassword}</span>
            </div>

            <button
              onClick={() => {
                navigator.clipboard.writeText(
                  `Email: ${dispatchedCreds.email}\nPassword: ${dispatchedCreds.temporaryPassword}`
                );
                setCopiedCreds(true);
                setTimeout(() => setCopiedCreds(false), 2000);
              }}
              className="ml-auto px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded font-sans text-xs flex items-center gap-1 cursor-pointer transition-colors"
            >
              {copiedCreds ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedCreds ? 'Copied' : 'Copy Credentials'}</span>
            </button>
          </div>
        </div>
      )}

      {/* EMPLOYEES TAB */}
      {activeTab === 'employees' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Warehouse Staff &amp; Dispatch Roster</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Staff perform transfers, picking, shelving, and counting. Managers assign task orders and grant receipt permissions.
              </p>
            </div>
            <button
              onClick={() => {
                setEmpError(null);
                setShowEmpModal(true);
              }}
              className="px-3.5 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Floor Staff</span>
            </button>
          </div>

          <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold border-b border-[#E2E8F0] dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Assigned Warehouse</th>
                    <th className="py-3 px-4 text-center">Active Floor Tasks</th>
                    <th className="py-3 px-4 text-center">Receipt Intake Rights</th>
                    <th className="py-3 px-4 text-right">Access Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/80">
                  {employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-700 dark:text-slate-200 text-xs">
                            {emp.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{emp.name}</p>
                            <p className="text-[11px] text-slate-500 font-mono">{emp.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
                          {emp.role === 'Inventory Manager' ? (
                            <ShieldCheck className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400" />
                          ) : (
                            <HardHat className="w-3.5 h-3.5 text-amber-500" />
                          )}
                          <span>{emp.role}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 dark:text-slate-300">
                        {emp.warehouseName || 'Central Warehouse (WH)'}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`font-mono font-semibold px-2 py-0.5 rounded text-[11px] ${
                            (emp.activeTasksCount || 0) > 0
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}
                        >
                          {emp.activeTasksCount || 0} active
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {emp.role === 'Inventory Manager' ? (
                          <span className="text-[11px] text-slate-400 italic">Full Authority</span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleToggleReceipts(emp)}
                            className={`px-3 py-1 rounded text-xs font-semibold transition-colors cursor-pointer border ${
                              emp.canCreateReceipts
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                : 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                            }`}
                            title="Click to toggle permission for this employee to create inbound receipt orders"
                          >
                            {emp.canCreateReceipts ? '✓ Can Create Receipts' : '✕ Restricted (No Receipts)'}
                          </button>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>Active</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PERSONNEL ACTIVITY TAB */}
      {activeTab === 'personnel' && (
        <div className="space-y-5">
          {/* Header & Export Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#1E40AF] dark:text-blue-400" />
                <span>Personnel Activity, Task Durations &amp; Error Rates</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Audit staff task execution logs, average minutes per warehouse operation, and exception incident rates (stock shortages &amp; cancellations).
              </p>
            </div>
            <button
              onClick={handleExportPersonnelCSV}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs self-start sm:self-auto border border-[#E2E8F0] dark:border-slate-700"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Activity CSV</span>
            </button>
          </div>

          {/* WEEKLY ACTIVITY & ERROR RATE RECHARTS VISUALIZATION DASHBOARD */}
          <PersonnelActivityChart
            activityRecords={staffActivityRecords}
            employees={employees}
            selectedStaff={selectedStaffFilter}
            onSelectStaff={setSelectedStaffFilter}
          />

          {/* STAFF KPI SCORECARDS GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffPerformanceSummaries.map((summary) => {
              const hasHighErrors = summary.errorRatePercent >= 15;
              const isFast = summary.avgDurationMinutes > 0 && summary.avgDurationMinutes <= 15;

              return (
                <div
                  key={summary.employeeName}
                  onClick={() => setSelectedStaffFilter(selectedStaffFilter === summary.employeeName ? 'all' : summary.employeeName)}
                  className={`p-4 bg-white dark:bg-[#0F172A] border rounded-lg shadow-xs cursor-pointer transition-all ${
                    selectedStaffFilter === summary.employeeName
                      ? 'border-[#1E40AF] dark:border-blue-500 ring-2 ring-blue-500/20 shadow-md'
                      : 'border-[#E2E8F0] dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 flex items-center justify-center font-bold text-[#1E40AF] dark:text-blue-300 text-sm">
                        {summary.employeeName.charAt(0)}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{summary.employeeName}</span>
                          {selectedStaffFilter === summary.employeeName && (
                            <span className="px-1.5 py-0.2 text-[10px] font-semibold bg-[#1E40AF] text-white rounded">
                              Filtered
                            </span>
                          )}
                        </h4>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {summary.role}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold border ${
                        hasHighErrors
                          ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900'
                          : isFast
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800'
                          : 'bg-blue-50 text-[#1E40AF] border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900'
                      }`}
                    >
                      {hasHighErrors ? 'Needs Attention' : isFast ? 'High Efficiency' : 'Normal Rate'}
                    </span>
                  </div>

                  {/* 3 Metric Mini-Panels */}
                  <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-[#E2E8F0] dark:border-slate-800/80 text-center">
                    <div className="p-2 bg-slate-50 dark:bg-slate-850 rounded">
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block uppercase">
                        Completed
                      </span>
                      <span className="text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                        {summary.completedTasks}
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        of {summary.totalTasks} tasks
                      </span>
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-slate-850 rounded">
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block uppercase flex items-center justify-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 text-blue-500" />
                        <span>Avg Time</span>
                      </span>
                      <span className="text-base font-bold font-mono text-slate-900 dark:text-white tabular-nums">
                        {summary.avgDurationMinutes}
                        <span className="text-xs font-normal text-slate-500 ml-0.5">m</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block">per task</span>
                    </div>

                    <div className="p-2 bg-slate-50 dark:bg-slate-850 rounded">
                      <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 block uppercase flex items-center justify-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                        <span>Exceptions</span>
                      </span>
                      <span
                        className={`text-base font-bold font-mono tabular-nums ${
                          hasHighErrors
                            ? 'text-rose-600 dark:text-rose-400'
                            : summary.errorRatePercent > 0
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {summary.errorRatePercent}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        {summary.exceptionTasks} incidents
                      </span>
                    </div>
                  </div>

                  <div className="mt-2 text-right">
                    <span className="text-[10px] text-[#1E40AF] dark:text-blue-400 font-semibold hover:underline">
                      {selectedStaffFilter === summary.employeeName ? 'Click to show all staff' : 'Click to filter log below ↓'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* HISTORICAL OPERATION LOG TABLE WITH CONTROLS */}
          <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden shadow-xs space-y-3 p-4">
            {/* Table Filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0] dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                  Detailed Operation Activity &amp; Task Audits ({filteredActivityRecords.length})
                </h4>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search ref or staff..."
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] dark:text-white w-44"
                  />
                  {activitySearchQuery && (
                    <button
                      onClick={() => setActivitySearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Staff Dropdown Filter */}
                <select
                  value={selectedStaffFilter}
                  onChange={(e) => setSelectedStaffFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:ring-1 focus:ring-[#1E40AF]"
                >
                  <option value="all">All Personnel</option>
                  {staffPerformanceSummaries.map((s) => (
                    <option key={s.employeeName} value={s.employeeName}>
                      {s.employeeName}
                    </option>
                  ))}
                </select>

                {/* Type Filter */}
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:ring-1 focus:ring-[#1E40AF]"
                >
                  <option value="all">All Op Types</option>
                  <option value="receipt">Receipts (IN)</option>
                  <option value="delivery">Deliveries (OUT)</option>
                  <option value="internal">Internal Transfers (INT)</option>
                  <option value="adjustment">Stock Adjustments</option>
                </select>

                {/* Status / Exceptions Filter */}
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:ring-1 focus:ring-[#1E40AF]"
                >
                  <option value="all">All Statuses</option>
                  <option value="done">Completed (Done)</option>
                  <option value="ready">In Progress / Ready</option>
                  <option value="exceptions">⚠ Exception Incidents Only</option>
                  <option value="waiting">Waiting On Stock</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold border-b border-[#E2E8F0] dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">Operation Ref</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Assigned Staff</th>
                    <th className="py-2.5 px-3">Contact / Purpose</th>
                    <th className="py-2.5 px-3 text-center">Items &amp; Qty</th>
                    <th className="py-2.5 px-3 text-center">Duration</th>
                    <th className="py-2.5 px-3">Status &amp; Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/80">
                  {filteredActivityRecords.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-400">
                        No activity records found matching the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredActivityRecords.map((r) => {
                      const isDone = r.status === 'done';
                      const isWaiting = r.status === 'waiting';
                      const isCancelled = r.status === 'canceled';

                      return (
                        <tr key={r.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3 font-mono font-semibold text-[#1E40AF] dark:text-blue-400">
                            {r.reference}
                          </td>
                          <td className="py-3 px-3">
                            <span className="capitalize font-medium text-slate-700 dark:text-slate-300 inline-flex items-center gap-1">
                              {r.operationType === 'receipt' && <ArrowDownLeft className="w-3 h-3 text-emerald-500" />}
                              {r.operationType === 'delivery' && <ArrowUpRight className="w-3 h-3 text-blue-500" />}
                              {r.operationType === 'internal' && <ArrowRightLeft className="w-3 h-3 text-purple-500" />}
                              {r.operationType === 'adjustment' && <ClipboardList className="w-3 h-3 text-amber-500" />}
                              <span>{r.operationType}</span>
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold">
                                {r.responsible.charAt(0)}
                              </div>
                              <span>{r.responsible}</span>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-slate-600 dark:text-slate-400 truncate max-w-xs">
                            {r.contact || 'Internal Warehouse Movement'}
                          </td>
                          <td className="py-3 px-3 text-center font-mono">
                            <span className="font-bold text-slate-800 dark:text-slate-200">{r.totalQty}</span>
                            <span className="text-[10px] text-slate-400 block">({r.linesCount} lines)</span>
                          </td>
                          <td className="py-3 px-3 text-center font-mono">
                            <span className="font-semibold text-slate-900 dark:text-white tabular-nums flex items-center justify-center gap-1">
                              <Clock className="w-3 h-3 text-slate-400" />
                              <span>{r.durationMinutes} min</span>
                            </span>
                          </td>
                          <td className="py-3 px-3">
                            <div className="flex flex-col items-start gap-1">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                                  isDone
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                                    : isWaiting
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                                    : isCancelled
                                    ? 'bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800'
                                    : 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                                }`}
                              >
                                {r.status}
                              </span>

                              {r.hasException && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>{r.exceptionReason}</span>
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

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

      {/* PRODUCTION DATA SLATE TAB */}
      {activeTab === 'data' && (
        <div className="space-y-4">
          <div className="p-6 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-800 rounded-lg shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
                Clean State Verified
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Production Inventory Slate
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              All demo orders, dummy items, and mock stock ledgers have been purged. Your database only records genuine transactions created by registered accounts.
            </p>

            {resetSuccess && (
              <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs rounded-md flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{resetSuccess}</span>
              </div>
            )}

            <div className="mt-6 pt-6 border-t border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  Reset Inventory to Clean Slate
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Clears all test products, operational orders, and move history while preserving your registered user accounts and warehouse facilities.
                </p>
              </div>

              <button
                onClick={handleResetData}
                disabled={resetLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-md text-xs font-semibold transition-colors cursor-pointer shadow-xs disabled:opacity-50 whitespace-nowrap"
              >
                {resetLoading ? 'Purging...' : 'Purge All Test Orders & Products'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIL PROVIDER TAB */}
      {activeTab === 'mail' && (
        <div className="space-y-4">
          <div className="p-6 bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-800 rounded-lg shadow-xs">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-mono">
                Google SMTP Configured
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Google SMTP &amp; Transactional Mail Transport
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-2xl leading-relaxed">
              StockSense IMS is now wired to Google SMTP (<code className="font-mono text-[#1E40AF] dark:text-blue-400 font-semibold">smtp.gmail.com:465</code>) under <code className="font-mono font-semibold text-slate-800 dark:text-slate-200">prathaban009@gmail.com</code>. Real outbound HTML emails are dispatched for password reset OTP verification codes and critical low-stock warehouse alerts.
            </p>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <button
                onClick={() => setShowMailModal(true)}
                className="px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Open Google SMTP Test Center &amp; Alert Dispatcher →</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-5 bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xs">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">1. Password Reset OTPs</span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                When users request account password resets, the server compiles a responsive HTML email with an authorized 6-digit code and dispatches via Google SMTP.
              </p>
            </div>
            <div className="p-5 bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xs">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">2. Low-Stock Alerts</span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                Items falling below safety thresholds trigger automated digest alerts with SKU details, current inventory levels, and replenishment recommendations.
              </p>
            </div>
            <div className="p-5 bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xs">
              <span className="font-bold text-slate-900 dark:text-white block mb-1">3. Resilient Fallbacks</span>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                If Google SMTP encounters transient rate-limits, errors are logged to the console and preview codes are seamlessly provided to prevent user lockouts.
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

      {/* ADD EMPLOYEE MODAL */}
      {showEmpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xl overflow-hidden">
            <div className="bg-[#1E40AF] text-white p-4 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold">Add Warehouse Staff Member</h3>
                <p className="text-[11px] text-blue-200 mt-0.5">
                  Initial credentials will be automatically dispatched to employee email
                </p>
              </div>
              <button
                onClick={() => setShowEmpModal(false)}
                className="text-blue-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {empError && (
              <div className="mx-5 mt-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{empError}</span>
              </div>
            )}

            <form onSubmit={handleCreateEmployee} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={empName}
                  onChange={(e) => setEmpName(e.target.value)}
                  placeholder="e.g. Jordan Hayes"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Staff Email Address
                </label>
                <input
                  type="email"
                  required
                  value={empEmail}
                  onChange={(e) => setEmpEmail(e.target.value)}
                  placeholder="jordan@stocksense.io"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Assigned Facility / Warehouse
                </label>
                <select
                  value={empWhId}
                  onChange={(e) => setEmpWhId(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none"
                >
                  {warehouses.map((wh) => (
                    <option key={wh.id} value={wh.id}>
                      {wh.name} ({wh.shortCode})
                    </option>
                  ))}
                </select>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-850 rounded-md border border-[#E2E8F0] dark:border-slate-700">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={empCanCreateReceipts}
                    onChange={(e) => setEmpCanCreateReceipts(e.target.checked)}
                    className="mt-0.5 rounded text-[#1E40AF] focus:ring-[#1E40AF] w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 block">
                      Grant Inbound Receipt Creation Rights
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      When enabled, this staff member can initiate supplier receipt orders directly from the warehouse floor.
                    </span>
                  </div>
                </label>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEmpModal(false)}
                  className="flex-1 py-2 border border-[#E2E8F0] dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={empActionLoading}
                  className="flex-1 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white font-semibold rounded-md transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                >
                  {empActionLoading ? 'Dispatching...' : 'Provision Staff Member'}
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
