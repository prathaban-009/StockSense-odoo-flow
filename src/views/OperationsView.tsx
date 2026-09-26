import React, { useEffect, useState } from 'react';
import {
  Plus,
  Search,
  List,
  LayoutGrid,
  CheckCircle2,
  Printer,
  AlertCircle,
  Building2,
  Calendar,
  User,
  Trash2,
  X,
  HardHat,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowRightLeft,
  RefreshCw,
  Play,
  Check,
  MapPin,
  Clock,
  Shield,
  Layers,
  UserCheck,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Employee, Location, Operation, OperationLine, OperationType, Product, Warehouse } from '../types.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { PrintReceiptModal } from '../components/PrintReceiptModal.tsx';

interface OperationsViewProps {
  initialType?: OperationType;
  initialStatus?: string;
  selectedOperationFromDashboard?: Operation | null;
  onClearSelectedOperation?: () => void;
}

export const OperationsView: React.FC<OperationsViewProps> = ({
  initialType = 'receipt',
  initialStatus,
  selectedOperationFromDashboard,
  onClearSelectedOperation,
}) => {
  const { user } = useAuth();
  const isStaff = user?.role === 'Warehouse Staff';
  const canCreateReceipts = !isStaff || !!user?.canCreateReceipts;

  const [activeType, setActiveType] = useState<OperationType>(initialType);
  const [activeStatus, setActiveStatus] = useState<string>(initialStatus || 'all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [operations, setOperations] = useState<Operation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected operation for detail modal
  const [activeOp, setActiveOp] = useState<Operation | null>(selectedOperationFromDashboard || null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assigningOp, setAssigningOp] = useState<Operation | null>(null);
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New operation form state
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<number>(1);
  const [contact, setContact] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState<number>(1);
  const [destLocationId, setDestLocationId] = useState<number>(1);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [responsible, setResponsible] = useState<string>('Sam Rivera');
  const [notes, setNotes] = useState('');

  // Product lines for new operation
  const [lines, setLines] = useState<
    Array<{
      productId: number;
      demandQty: number;
      destLocationId?: number;
      sourceLocationId?: number;
    }>
  >([{ productId: 1, demandQty: 10, destLocationId: 1, sourceLocationId: 1 }]);

  // Stock Adjustment specific form
  const [adjustmentLocationId, setAdjustmentLocationId] = useState<number>(1);
  const [adjustmentProductId, setAdjustmentProductId] = useState<number>(1);
  const [adjustmentCountedQty, setAdjustmentCountedQty] = useState<number>(0);

  const loadData = async () => {
    try {
      const [opsData, prodsData, locsData, whData, empData] = await Promise.all([
        api.getOperations(),
        api.getProducts(),
        api.getLocations(),
        api.getWarehouses(),
        api.getEmployees(),
      ]);
      setOperations(opsData);
      setProducts(prodsData);
      setLocations(locsData);
      setWarehouses(whData);
      setEmployees(empData);

      if (whData.length > 0) {
        setSelectedWarehouseId(whData[0].id);
      }
      if (locsData.length > 0) {
        setSourceLocationId(locsData[0].id);
        setDestLocationId(locsData[0].id);
        setAdjustmentLocationId(locsData[0].id);
      }
      if (prodsData.length > 0) {
        setAdjustmentProductId(prodsData[0].id);
        setAdjustmentCountedQty(prodsData[0].onHand || 0);
      }
      if (empData.length > 0) {
        const defaultStaff = empData.find((e) => e.role === 'Warehouse Staff');
        setResponsible(defaultStaff ? defaultStaff.name : empData[0].name);
      }
    } catch (err) {
      console.error('Failed to load operations data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedOperationFromDashboard) {
      setActiveOp(selectedOperationFromDashboard);
      setActiveType(selectedOperationFromDashboard.operationType);
    }
  }, [selectedOperationFromDashboard]);

  // Keep activeOp in sync with latest operation data after reload
  useEffect(() => {
    if (activeOp) {
      const refreshed = operations.find((o) => o.id === activeOp.id);
      if (refreshed) {
        setActiveOp(refreshed);
      }
    }
  }, [operations]);

  const filteredOps = operations.filter((op) => {
    if (op.operationType !== activeType) return false;
    if (activeStatus !== 'all' && op.status !== activeStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = op.reference.toLowerCase().includes(q);
      const matchContact = (op.contact || '').toLowerCase().includes(q);
      const matchResp = (op.responsible || '').toLowerCase().includes(q);
      if (!matchRef && !matchContact && !matchResp) return false;
    }
    return true;
  });

  // Calculate task counts for staff floor dashboard
  const readyReceiptsCount = operations.filter(
    (o) => o.operationType === 'receipt' && (o.status === 'ready' || o.status === 'processing')
  ).length;
  const readyDeliveriesCount = operations.filter(
    (o) => o.operationType === 'delivery' && (o.status === 'ready' || o.status === 'processing')
  ).length;
  const readyTransfersCount = operations.filter(
    (o) => o.operationType === 'internal' && (o.status === 'ready' || o.status === 'processing')
  ).length;

  // Filter locations for selected warehouse
  const internalWarehouseLocations = locations.filter(
    (l) => l.warehouseId === selectedWarehouseId && l.locationType === 'internal'
  );

  const handleCreateOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMessage(null);

    try {
      if (activeType === 'adjustment') {
        const prod = products.find((p) => p.id === adjustmentProductId);
        const loc = locations.find((l) => l.id === adjustmentLocationId);
        const recorded = prod?.onHand ?? 0;
        const diff = adjustmentCountedQty - recorded;

        const newOp = await api.createOperation({
          operationType: 'adjustment',
          contact: `Count Adjustment · ${loc?.name || 'Warehouse'}`,
          sourceLocationId: adjustmentLocationId,
          destLocationId: adjustmentLocationId,
          scheduledDate,
          responsible: user?.name || responsible,
          notes: notes || `Physical counted quantity: ${adjustmentCountedQty} ${prod?.uom || 'Units'} (Delta: ${diff >= 0 ? '+' : ''}${diff})`,
          lines: [{ productId: adjustmentProductId, demandQty: adjustmentCountedQty, doneQty: 0 }],
        });

        setShowNewModal(false);
        setStatusMessage({
          type: 'success',
          text: `Stock Adjustment ${newOp.reference} drafted! Follow Draft ➔ Ready ➔ Done workflow with manager sign-off.`,
        });
        await loadData();
        setActiveOp(newOp);
        return;
      }

      // Format lines with designated locations
      const formattedLines = lines.map((l) => ({
        productId: l.productId,
        demandQty: l.demandQty,
        destLocationId: activeType === 'receipt' ? (l.destLocationId || destLocationId || 1) : undefined,
        sourceLocationId: activeType === 'delivery' ? (l.sourceLocationId || sourceLocationId || 1) : undefined,
      }));

      const newOp = await api.createOperation({
        operationType: activeType,
        warehouseId: selectedWarehouseId,
        contact:
          activeType === 'internal'
            ? 'Internal Warehouse Relocation'
            : contact.trim() || (activeType === 'receipt' ? 'Supplier' : 'Customer'),
        sourceLocationId:
          activeType === 'receipt'
            ? 5 // Vendor virtual location
            : sourceLocationId,
        destLocationId:
          activeType === 'delivery'
            ? 6 // Customer virtual location
            : destLocationId,
        scheduledDate,
        responsible,
        notes,
        lines: formattedLines,
      });

      setShowNewModal(false);
      setContact('');
      setNotes('');
      setLines([{ productId: products[0]?.id || 1, demandQty: 10, destLocationId: 1, sourceLocationId: 1 }]);
      setStatusMessage({
        type: 'success',
        text: `Operation ${newOp.reference} created in 'Draft' state. Ready for manager review and dispatch.`,
      });
      await loadData();
      setActiveOp(newOp);
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to create operation',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // State transitions: Draft -> Ready, Ready -> Processing, Processing -> Done, Canceled
  const handleUpdateStatus = async (
    opId: number,
    nextStatus: string,
    assignedStaff?: { id?: number; name?: string }
  ) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const updated = await api.updateOperationStatus(opId, nextStatus, assignedStaff);
      setStatusMessage({
        type: 'success',
        text: `Operation ${updated.reference} transitioned to '${nextStatus}'${
          assignedStaff?.name ? ` (Assigned: ${assignedStaff.name})` : ''
        }.`,
      });
      setActiveOp(updated);
      await loadData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to update operation state',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenAssignModal = (op: Operation) => {
    setAssigningOp(op);
    const staffList = employees.filter((e) => e.role === 'Warehouse Staff');
    const defaultEmp = staffList[0] || employees[0];
    setSelectedStaffId(defaultEmp?.id || null);
    setShowAssignModal(true);
  };

  const handleConfirmAssignment = async () => {
    if (!assigningOp) return;
    const staffMember = employees.find((e) => e.id === selectedStaffId);
    await handleUpdateStatus(
      assigningOp.id,
      'ready',
      staffMember ? { id: staffMember.id, name: staffMember.name } : undefined
    );
    setShowAssignModal(false);
    setAssigningOp(null);
  };

  // Line-by-line shelving/picking confirmation
  const handleConfirmLine = async (opId: number, lineId: number) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.confirmOperationLine(opId, lineId);
      setStatusMessage({
        type: 'success',
        text: res.message,
      });
      setActiveOp(res.operation);
      await loadData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to process line item',
      });
    } finally {
      setActionLoading(false);
    }
  };

  // Full validation of remaining lines
  const handleValidateOperation = async (opId: number) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await api.validateOperation(opId);
      setStatusMessage({
        type: 'success',
        text: `Operation ${res.operation.reference} completed! All stock balances synchronized.`,
      });
      setActiveOp(res.operation);
      await loadData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Validation failed. Check stock availability.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        productId: products[0]?.id || 1,
        demandQty: 5,
        destLocationId: locations[0]?.id || 1,
        sourceLocationId: locations[0]?.id || 1,
      },
    ]);
  };

  const removeLine = (idx: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== idx));
  };

  const updateLine = (idx: number, field: string, value: any) => {
    const updated = [...lines];
    updated[idx] = { ...updated[idx], [field]: value };
    setLines(updated);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Completed</span>
          </span>
        );
      case 'processing':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            <span>Processing</span>
          </span>
        );
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E40AF] dark:text-blue-300">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>Ready (Assigned)</span>
          </span>
        );
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>Draft</span>
          </span>
        );
      case 'canceled':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            <span>Canceled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <span className="w-2 h-2 rounded-full bg-slate-400"></span>
            <span>{status}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Header */}
      <div className="bg-white dark:bg-[#0F172A] p-5 sm:p-6 rounded-lg border border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isStaff ? 'Warehouse Floor Operations' : 'Inventory Operations Management'}
            </h1>
            {isStaff && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E40AF] dark:text-blue-300 bg-blue-50 dark:bg-[#1E40AF]/30 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                <HardHat className="w-3 h-3 text-[#1E40AF] dark:text-blue-400" />
                <span>Floor Task Mode</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isStaff
              ? 'Real-time task queue: Perform vendor receiving, customer picking, and rack transfers line-by-line.'
              : 'Dispatch and monitor supplier receipts, customer deliveries, internal transfers, and physical count reconciliations.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Refresh Button */}
          <button
            onClick={loadData}
            title="Refresh Live Operations"
            className="p-2 border border-[#E2E8F0] dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 rounded-md transition-colors cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* View Toggle */}
          <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-[#E2E8F0] dark:border-slate-700">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-[#0F172A] text-[#1E40AF] dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="List View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`p-1.5 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-[#0F172A] text-[#1E40AF] dark:text-white shadow-2xs font-semibold'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
              title="Kanban Board View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Operation Button with Permission Guard */}
          {(!isStaff || (activeType === 'receipt' && canCreateReceipts) || activeType === 'internal') && (
            <button
              onClick={() => {
                setStatusMessage(null);
                setShowNewModal(true);
              }}
              className="px-3.5 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>
                {activeType === 'receipt'
                  ? 'New Receipt Order'
                  : activeType === 'delivery'
                  ? 'New Delivery Order'
                  : activeType === 'internal'
                  ? 'New Transfer'
                  : 'New Count Adjustment'}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Staff Floor Mode Task Summary Bar */}
      {isStaff && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            onClick={() => {
              setActiveType('receipt');
              setActiveStatus('all');
            }}
            className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
              activeType === 'receipt'
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-2xs'
                : 'bg-white dark:bg-[#0F172A] border-[#E2E8F0] dark:border-slate-800 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Inbound Shelving</span>
              <ArrowDownLeft className="w-4 h-4 text-[#1E40AF]" />
            </div>
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {readyReceiptsCount}{' '}
              <span className="text-xs font-sans text-slate-500 font-normal">Active Tasks</span>
            </p>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 mt-0.5 block">
              {canCreateReceipts ? '✓ Receipt Intake Rights Active' : 'Restricted: Assigned Tasks Only'}
            </span>
          </div>

          <div
            onClick={() => {
              setActiveType('delivery');
              setActiveStatus('all');
            }}
            className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
              activeType === 'delivery'
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-2xs'
                : 'bg-white dark:bg-[#0F172A] border-[#E2E8F0] dark:border-slate-800 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Outbound Picking</span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {readyDeliveriesCount}{' '}
              <span className="text-xs font-sans text-slate-500 font-normal">Active Tasks</span>
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              Pick items from assigned shelf racks
            </span>
          </div>

          <div
            onClick={() => {
              setActiveType('internal');
              setActiveStatus('all');
            }}
            className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
              activeType === 'internal'
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-2xs'
                : 'bg-white dark:bg-[#0F172A] border-[#E2E8F0] dark:border-slate-800 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Floor Transfers</span>
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {readyTransfersCount}{' '}
              <span className="text-xs font-sans text-slate-500 font-normal">Active Tasks</span>
            </p>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
              Rack-to-rack stock relocations
            </span>
          </div>
        </div>
      )}

      {/* Status Feedback Notification */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-lg text-xs flex items-center justify-between gap-2 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 dark:hover:text-white cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Operation Type Switcher */}
      <div className="flex border-b border-[#E2E8F0] dark:border-slate-800 gap-2 overflow-x-auto">
        {(
          [
            { id: 'receipt', label: 'Inbound Receipts', icon: ArrowDownLeft },
            { id: 'delivery', label: 'Outbound Deliveries', icon: ArrowUpRight },
            { id: 'internal', label: 'Internal Transfers', icon: ArrowRightLeft },
            { id: 'adjustment', label: 'Stock Adjustments', icon: Layers },
          ] as const
        ).map((t) => {
          const Icon = t.icon;
          const isActive = activeType === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveType(t.id);
                setActiveStatus('all');
              }}
              className={`pb-3 px-3.5 text-xs font-semibold transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
                isActive
                  ? 'border-[#1E40AF] text-[#1E40AF] dark:border-blue-400 dark:text-blue-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-md border border-[#E2E8F0] dark:border-slate-700/80 overflow-x-auto">
          {(['all', 'draft', 'ready', 'processing', 'done'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setActiveStatus(s)}
              className={`px-3 py-1 rounded text-xs font-medium capitalize transition-all cursor-pointer whitespace-nowrap ${
                activeStatus === s
                  ? 'bg-white dark:bg-[#0F172A] text-slate-900 dark:text-white font-semibold shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {s === 'done' ? 'Completed' : s === 'ready' ? 'Ready (Assigned)' : s}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reference, contact, operator..."
            className="w-full pl-8.5 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1E40AF] text-xs"
          />
        </div>
      </div>

      {/* OPERATIONS LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-slate-800 rounded-lg overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-300 font-semibold border-b border-[#E2E8F0] dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Reference</th>
                  <th className="py-3 px-4">Contact / Operation</th>
                  <th className="py-3 px-4">Scheduled Date</th>
                  <th className="py-3 px-4">Assigned Operator</th>
                  <th className="py-3 px-4">Target Facility / Locations</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/80">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400">
                      Loading operations ledger...
                    </td>
                  </tr>
                ) : filteredOps.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
                          <ArrowRightLeft className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {operations.length === 0 ? 'No Active Operations' : 'No Matching Operations'}
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 leading-relaxed">
                          {operations.length === 0
                            ? 'Your warehouse operation queue is completely clear. Create a vendor receipt, delivery order, or internal transfer to begin.'
                            : 'No operations match your selected document type, status, or search query.'}
                        </p>
                        {operations.length === 0 && (!isStaff || canCreateReceipts) && (
                          <button
                            onClick={() => {
                              setActiveType('receipt');
                              setShowNewModal(true);
                            }}
                            className="px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Create First Inbound Receipt</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredOps.map((op) => (
                    <tr
                      key={op.id}
                      onClick={() => setActiveOp(op)}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#1E40AF] dark:text-blue-400">
                        {op.reference}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {op.contact || 'Internal Transfer'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">
                          {op.lines.length} item line{op.lines.length !== 1 ? 's' : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-400">
                        {op.scheduledDate || 'Immediate'}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                          <User className="w-3 h-3 text-slate-400" />
                          <span>{op.responsible || 'Floor Staff'}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                        {op.operationType === 'receipt' ? (
                          <span>
                            To: <strong>{op.destLocationName || 'Warehouse Storage'}</strong>
                          </span>
                        ) : op.operationType === 'delivery' ? (
                          <span>
                            From: <strong>{op.sourceLocationName || 'Warehouse Storage'}</strong>
                          </span>
                        ) : (
                          <span>
                            {op.sourceLocationName} → {op.destLocationName}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">{getStatusBadge(op.status)}</td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveOp(op);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded transition-colors cursor-pointer"
                        >
                          {isStaff ? 'Open Task' : 'Manage'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {(['draft', 'ready', 'processing', 'done'] as const).map((stage) => {
            const stageOps = filteredOps.filter((op) => op.status === stage);
            return (
              <div
                key={stage}
                className="bg-white dark:bg-[#0F172A] rounded-lg p-3.5 border border-[#E2E8F0] dark:border-slate-800 flex flex-col min-h-[440px] shadow-xs"
              >
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#E2E8F0] dark:border-slate-800 px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {stage === 'done' ? 'Completed' : stage === 'ready' ? 'Ready (Assigned)' : stage}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[11px] font-mono rounded text-slate-600 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 font-semibold">
                    {stageOps.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {stageOps.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400">No items in {stage}</div>
                  ) : (
                    stageOps.map((op) => (
                      <div
                        key={op.id}
                        onClick={() => setActiveOp(op)}
                        className="bg-slate-50/70 dark:bg-[#1E293B] p-3.5 rounded-md border border-[#E2E8F0] dark:border-slate-700 hover:border-blue-400 dark:hover:border-blue-500 shadow-2xs cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {op.reference}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{op.scheduledDate}</span>
                        </div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                          {op.contact || 'Internal'}
                        </p>
                        <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                          <span>Operator: {op.responsible}</span>
                          <span className="font-mono font-semibold">{op.lines.length} lines</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* OPERATION DETAIL & LINE-BY-LINE EXECUTION MODAL */}
      {activeOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-[#0F172A] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden my-6">
            {/* Header with Pipeline status */}
            <div className="bg-[#1E40AF] text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold">{activeOp.reference}</span>
                <span className="text-xs text-blue-200 uppercase font-semibold">({activeOp.operationType})</span>
              </div>

              {/* Operational Lifecycle Pipeline Stepper */}
              <div className="flex items-center bg-blue-900/80 p-1.5 rounded-md text-xs border border-blue-700/60 shadow-inner">
                {[
                  { key: 'draft', label: '1. Draft' },
                  { key: 'ready', label: '2. Ready' },
                  { key: 'processing', label: '3. Processing' },
                  { key: 'done', label: '4. Done' },
                ].map((step, idx) => {
                  const isCurrent = activeOp.status === step.key;
                  const isPast =
                    (step.key === 'draft' && ['ready', 'processing', 'done'].includes(activeOp.status)) ||
                    (step.key === 'ready' && ['processing', 'done'].includes(activeOp.status)) ||
                    (step.key === 'processing' && activeOp.status === 'done');

                  return (
                    <div key={step.key} className="flex items-center">
                      <span
                        className={`px-2.5 py-1 rounded text-[11px] font-bold tracking-wider uppercase transition-colors ${
                          isCurrent
                            ? 'bg-white text-[#1E40AF] shadow-xs'
                            : isPast
                            ? 'text-emerald-300 font-semibold'
                            : 'text-blue-200/70 font-normal'
                        }`}
                      >
                        {step.label}
                      </span>
                      {idx < 3 && <span className="text-blue-300/60 px-1 font-bold">›</span>}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => {
                  setActiveOp(null);
                  if (onClearSelectedOperation) onClearSelectedOperation();
                }}
                className="text-blue-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Bar based on State Machine */}
            <div className="bg-slate-50 dark:bg-slate-900 px-5 py-3 border-b border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                {/* 1. DRAFT STATE ACTIONS */}
                {activeOp.status === 'draft' && (
                  <>
                    <button
                      onClick={() => handleOpenAssignModal(activeOp)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Assign Staff &amp; Mark as Ready</span>
                    </button>
                    <span className="text-[11px] text-slate-500">
                      Assigned operator: <strong>{activeOp.responsible || 'Unassigned'}</strong>
                    </span>
                  </>
                )}

                {/* 2. READY STATE ACTIONS (Staff or Manager starts processing) */}
                {activeOp.status === 'ready' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleUpdateStatus(activeOp.id, 'processing')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      <HardHat className="w-3.5 h-3.5" />
                      <span>
                        {activeOp.operationType === 'receipt'
                          ? 'Start Inbound Shelving (Processing)'
                          : activeOp.operationType === 'delivery'
                          ? 'Start Order Picking (Processing)'
                          : activeOp.operationType === 'adjustment'
                          ? 'Start Physical Count Verification'
                          : 'Start Relocation (Processing)'}
                      </span>
                    </button>
                    {!isStaff && (
                      <button
                        onClick={() => handleOpenAssignModal(activeOp)}
                        disabled={actionLoading}
                        className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded text-xs font-medium cursor-pointer"
                        title="Reassign to another staff member"
                      >
                        Reassign Staff
                      </button>
                    )}
                  </div>
                )}

                {/* 3. PROCESSING STATE (Line-by-line or Bulk Validate) */}
                {activeOp.status === 'processing' && (
                  <button
                    onClick={() => handleValidateOperation(activeOp.id)}
                    disabled={actionLoading}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {activeOp.operationType === 'adjustment'
                        ? 'Sign-off & Commit Stock Adjustment to PostgreSQL'
                        : 'Validate All Lines & Commit to Stock'}
                    </span>
                  </button>
                )}

                {/* 4. DONE STATE (Completed confirmation) */}
                {activeOp.status === 'done' && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded text-emerald-800 dark:text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>Completed · PostgreSQL Stock Levels &amp; Ledger Committed</span>
                  </div>
                )}

                {/* Print Slip */}
                <button
                  onClick={() => setShowPrintModal(true)}
                  className="px-3.5 py-1.5 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print Slip</span>
                </button>
              </div>

              {/* Manager Cancellation Control */}
              {activeOp.status !== 'done' && activeOp.status !== 'canceled' && !isStaff && (
                <button
                  onClick={() => handleUpdateStatus(activeOp.id, 'canceled')}
                  disabled={actionLoading}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline font-medium cursor-pointer"
                >
                  Cancel Operation
                </button>
              )}
            </div>

            {/* Operational Document Body */}
            <div className="p-6 space-y-5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-[#E2E8F0] dark:border-slate-800">
                <div className="space-y-1">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Partner / Supplier / Customer:</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#1E40AF] dark:text-blue-400" />
                    {activeOp.contact || 'Internal Organization'}
                  </p>
                  <div className="mt-2 text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div>
                      Source:{' '}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {activeOp.operationType === 'receipt'
                          ? 'Vendor / Supplier (No internal pick location)'
                          : activeOp.sourceLocationName || 'Warehouse Storage'}
                      </span>
                    </div>
                    <div>
                      Destination:{' '}
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {activeOp.operationType === 'delivery'
                          ? 'Customer Dispatch'
                          : activeOp.destLocationName || 'Warehouse Storage'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 sm:text-right">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Scheduled Date:</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center sm:justify-end gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {activeOp.scheduledDate || 'Immediate'}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Assigned Floor Operator:</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center sm:justify-end gap-1">
                    <HardHat className="w-3.5 h-3.5 text-amber-500" />
                    {activeOp.responsible || 'Warehouse Floor Staff'}
                  </p>
                </div>
              </div>

              {/* Line Items Table with Per-Line Shelving & Picking Buttons */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-bold text-slate-900 dark:text-white">
                    Operation Line Items &amp; Physical Storage Placement ({activeOp.lines.length})
                  </h4>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Completed:{' '}
                    {activeOp.lines.filter((l) => (l.doneQty ?? 0) >= l.demandQty).length} of {activeOp.lines.length}
                  </span>
                </div>

                <div className="border border-[#E2E8F0] dark:border-slate-800 rounded-md overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100/70 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border-b border-[#E2E8F0] dark:border-slate-800 text-xs">
                      <tr>
                        <th className="py-2.5 px-3.5">Product &amp; SKU</th>
                        <th className="py-2.5 px-3.5">Target Shelf / Bin Location</th>
                        <th className="py-2.5 px-3.5 text-right">Demand</th>
                        <th className="py-2.5 px-3.5 text-right">Done</th>
                        <th className="py-2.5 px-3.5 text-right">Floor Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/80 text-xs">
                      {activeOp.lines.map((l, idx) => {
                        const isLineDone = (l.doneQty ?? 0) >= l.demandQty;
                        const targetLoc =
                          activeOp.operationType === 'receipt'
                            ? l.destLocationName || activeOp.destLocationName || 'Warehouse Storage'
                            : activeOp.operationType === 'delivery'
                            ? l.sourceLocationName || activeOp.sourceLocationName || 'Warehouse Storage'
                            : `${activeOp.sourceLocationName} → ${activeOp.destLocationName}`;

                        return (
                          <tr key={idx} className="hover:bg-blue-50/20 dark:hover:bg-slate-800/40">
                            <td className="py-3 px-3.5">
                              <p className="font-semibold text-slate-900 dark:text-white">{l.productName}</p>
                              <p className="text-[11px] font-mono text-slate-500">{l.productSku}</p>
                            </td>
                            <td className="py-3 px-3.5">
                              <span className="inline-flex items-center gap-1 font-mono font-medium text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                <MapPin className="w-3 h-3 text-[#1E40AF]" />
                                <span>{targetLoc}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                              {l.demandQty} {l.productUom || 'Units'}
                            </td>
                            <td className="py-3 px-3.5 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                              {l.doneQty ?? (activeOp.status === 'done' ? l.demandQty : 0)}
                            </td>
                            <td className="py-3 px-3.5 text-right">
                              {isLineDone ? (
                                <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>
                                    {activeOp.operationType === 'receipt'
                                      ? 'Shelved'
                                      : activeOp.operationType === 'delivery'
                                      ? 'Picked'
                                      : activeOp.operationType === 'adjustment'
                                      ? 'Count Verified'
                                      : 'Moved'}
                                  </span>
                                </span>
                              ) : activeOp.status === 'processing' ? (
                                <button
                                  type="button"
                                  onClick={() => l.id && handleConfirmLine(activeOp.id, l.id)}
                                  disabled={actionLoading}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                                >
                                  {activeOp.operationType === 'receipt'
                                    ? 'Shelve & Confirm'
                                    : activeOp.operationType === 'delivery'
                                    ? 'Pick from Bin'
                                    : activeOp.operationType === 'adjustment'
                                    ? 'Verify Count'
                                    : 'Confirm Move'}
                                </button>
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">
                                  {activeOp.status === 'draft' ? 'In Draft' : 'Waiting Start'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {activeOp.notes && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-[#E2E8F0] dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">Instructions:</span>
                  <p>{activeOp.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW OPERATION MODAL (With Per-Line Location Assignment) */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0F172A] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden my-6">
            <div className="bg-[#1E40AF] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">
                  Create{' '}
                  {activeType === 'receipt'
                    ? 'Inbound Receipt Order'
                    : activeType === 'delivery'
                    ? 'Outbound Delivery Order'
                    : activeType === 'internal'
                    ? 'Internal Transfer Order'
                    : 'Physical Stock Count'}
                </h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  Initial state: <strong>Draft</strong>. Order sequenced automatically in PostgreSQL.
                </p>
              </div>
              <button
                onClick={() => setShowNewModal(false)}
                className="text-blue-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateOperation} className="p-6 space-y-4 text-xs">
              {/* Warehouse & Contact Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Warehouse Facility
                  </label>
                  <select
                    value={selectedWarehouseId}
                    onChange={(e) => setSelectedWarehouseId(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] dark:text-white"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh.id} value={wh.id}>
                        {wh.name} ({wh.shortCode})
                      </option>
                    ))}
                  </select>
                </div>

                {activeType !== 'internal' && activeType !== 'adjustment' && (
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {activeType === 'receipt' ? 'Vendor / Supplier' : 'Customer Name'}
                    </label>
                    <input
                      type="text"
                      required
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder={activeType === 'receipt' ? 'e.g. Acme Industrial Suppliers' : 'e.g. Deco Addict'}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Scheduled Execution Date
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] dark:text-white font-mono"
                  />
                </div>

                {/* Assigned Floor Operator */}
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Assign Warehouse Staff Operator
                  </label>
                  <select
                    value={responsible}
                    onChange={(e) => setResponsible(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] dark:text-white"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Internal Transfer Specific Locations */}
                {activeType === 'internal' && (
                  <>
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Source Location (Move from)
                      </label>
                      <select
                        value={sourceLocationId}
                        onChange={(e) => setSourceLocationId(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Destination Location (Move to)
                      </label>
                      <select
                        value={destLocationId}
                        onChange={(e) => setDestLocationId(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>

              {/* Line Items Section with Per-Line Location Configuration */}
              {activeType !== 'adjustment' ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-semibold text-slate-800 dark:text-slate-200">
                      Product Items &amp; Storage Placement
                    </label>
                    <button
                      type="button"
                      onClick={addLine}
                      className="text-xs font-semibold text-[#1E40AF] dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      + Add Item Line
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {lines.map((line, idx) => {
                      const selectedProd = products.find((p) => p.id === line.productId);
                      const isLowStock =
                        activeType === 'delivery' && (selectedProd?.onHand ?? 0) < line.demandQty;

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-md border space-y-2 ${
                            isLowStock
                              ? 'border-rose-300 bg-rose-50/60 dark:bg-rose-950/20'
                              : 'border-[#E2E8F0] dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {/* Product Selector */}
                            <select
                              value={line.productId}
                              onChange={(e) => updateLine(idx, 'productId', Number(e.target.value))}
                              className="flex-1 px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white"
                            >
                              {products.map((p) => (
                                <option key={p.id} value={p.id}>
                                  {p.name} [{p.sku}] - Available: {p.onHand} {p.uom}
                                </option>
                              ))}
                            </select>

                            {/* Quantity Input */}
                            <div className="w-24">
                              <input
                                type="number"
                                min="1"
                                value={line.demandQty}
                                onChange={(e) => updateLine(idx, 'demandQty', Number(e.target.value))}
                                placeholder="Qty"
                                className="w-full px-2 py-1.5 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white text-center font-bold font-mono focus:ring-1 focus:ring-[#1E40AF]"
                              />
                            </div>

                            <span className="text-slate-500 font-medium">
                              {selectedProd?.uom || 'Units'}
                            </span>

                            {lines.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeLine(idx)}
                                className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          {/* Line-level Location Selection */}
                          <div className="flex items-center gap-2 pt-1 border-t border-slate-200 dark:border-slate-700/80">
                            {activeType === 'receipt' && (
                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                                  Destination Bin/Rack:
                                </span>
                                <select
                                  value={line.destLocationId || destLocationId}
                                  onChange={(e) => updateLine(idx, 'destLocationId', Number(e.target.value))}
                                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded text-xs dark:text-white font-mono"
                                >
                                  {(internalWarehouseLocations.length > 0 ? internalWarehouseLocations : locations).map(
                                    (loc) => (
                                      <option key={loc.id} value={loc.id}>
                                        {loc.name} ({loc.shortCode})
                                      </option>
                                    )
                                  )}
                                </select>
                              </div>
                            )}

                            {activeType === 'delivery' && (
                              <div className="flex-1 flex items-center gap-2">
                                <span className="text-[11px] text-slate-500 whitespace-nowrap">
                                  Source Pick Rack:
                                </span>
                                <select
                                  value={line.sourceLocationId || sourceLocationId}
                                  onChange={(e) => updateLine(idx, 'sourceLocationId', Number(e.target.value))}
                                  className="w-full px-2 py-1 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded text-xs dark:text-white font-mono"
                                >
                                  {locations.map((loc) => (
                                    <option key={loc.id} value={loc.id}>
                                      {loc.name} ({loc.shortCode})
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Stock Adjustment Form */
                <div className="p-4 bg-slate-50 dark:bg-slate-850 rounded-md border border-[#E2E8F0] dark:border-slate-700 space-y-3.5">
                  <div>
                    <h4 className="font-semibold text-slate-900 dark:text-white">
                      Physical Stock Counting &amp; Reconciliation
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Enter the verified physical count on shelf. The system will adjust stock balance and log an immutable audit entry in the move ledger.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">
                        Counting Location
                      </label>
                      <select
                        value={adjustmentLocationId}
                        onChange={(e) => setAdjustmentLocationId(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white"
                      >
                        {locations.map((loc) => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name} ({loc.shortCode})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">
                        Select Product
                      </label>
                      <select
                        value={adjustmentProductId}
                        onChange={(e) => {
                          const pId = Number(e.target.value);
                          setAdjustmentProductId(pId);
                          const sel = products.find((p) => p.id === pId);
                          if (sel) setAdjustmentCountedQty(sel.onHand || 0);
                        }}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} [{p.sku}]
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 mb-1 font-medium">
                      Physical Counted Quantity
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={adjustmentCountedQty}
                      onChange={(e) => setAdjustmentCountedQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white font-mono font-bold text-sm focus:ring-1 focus:ring-[#1E40AF]"
                    />
                  </div>

                  {(() => {
                    const sel = products.find((p) => p.id === adjustmentProductId);
                    const recorded = sel?.onHand ?? 0;
                    const diff = adjustmentCountedQty - recorded;
                    return (
                      <div className="p-3 bg-white dark:bg-slate-900 rounded border border-[#E2E8F0] dark:border-slate-700 flex justify-between items-center font-mono">
                        <span className="text-slate-500 font-sans text-xs">
                          System Recorded: <strong>{recorded}</strong> → Physical Verified:{' '}
                          <strong>{adjustmentCountedQty}</strong>
                        </span>
                        <span
                          className={`font-bold text-xs ${
                            diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-600'
                          }`}
                        >
                          Discrepancy: {diff > 0 ? `+${diff}` : diff} {sel?.uom || 'Units'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Operation Notes &amp; Handling Instructions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special storage requirements, pallet IDs, or invoice references..."
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewModal(false)}
                  className="flex-1 py-2 font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 font-semibold bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {actionLoading
                    ? 'Creating...'
                    : activeType === 'adjustment'
                    ? 'Create Draft Adjustment'
                    : 'Create Draft Operation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STAFF ASSIGNMENT MODAL (Prompt manager to select assigned warehouse worker) */}
      {showAssignModal && assigningOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white dark:bg-[#0F172A] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden">
            <div className="bg-[#1E40AF] text-white p-5 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-blue-200" />
                  <h3 className="text-base font-bold">Assign Warehouse Staff</h3>
                </div>
                <p className="text-xs text-blue-100 mt-0.5">
                  Designate floor personnel for {assigningOp.reference}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssigningOp(null);
                }}
                className="text-blue-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div>
                <label className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                  Select Registered Warehouse Worker:
                </label>
                <p className="text-slate-500 dark:text-slate-400 text-[11px] leading-relaxed">
                  Moving {assigningOp.reference} to <strong>Ready</strong> will notify the selected operator and place items into their active floor execution queue.
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100 dark:divide-slate-800">
                {employees.length === 0 ? (
                  <p className="text-slate-400 py-6 text-center">No registered warehouse staff found.</p>
                ) : (
                  employees.map((emp) => {
                    const isSelected = selectedStaffId === emp.id;
                    return (
                      <div
                        key={emp.id}
                        onClick={() => setSelectedStaffId(emp.id)}
                        className={`pt-2 p-3 rounded-lg border flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-[#1E40AF] bg-blue-50/60 dark:bg-blue-950/40 shadow-xs'
                            : 'border-[#E2E8F0] dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                              isSelected
                                ? 'bg-[#1E40AF] text-white shadow-2xs'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                            }`}
                          >
                            {emp.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{emp.name}</span>
                              {emp.role === 'Warehouse Staff' && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded font-medium bg-blue-100 dark:bg-blue-900/60 text-[#1E40AF] dark:text-blue-300">
                                  Staff
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">{emp.email}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                            {emp.activeTasksCount ?? 0} active
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="flex gap-2 pt-3 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAssignModal(false);
                    setAssigningOp(null);
                  }}
                  className="flex-1 py-2 font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  disabled={actionLoading || !selectedStaffId}
                  className="flex-1 py-2 font-semibold bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Confirm &amp; Mark Ready</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PRINT RECEIPT SLIP MODAL */}
      <PrintReceiptModal
        operation={activeOp}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />
    </div>
  );
};
