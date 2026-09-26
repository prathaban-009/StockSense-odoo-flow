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
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { Location, Operation, OperationType, Product } from '../types.ts';
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

  const [activeType, setActiveType] = useState<OperationType>(initialType);
  const [activeStatus, setActiveStatus] = useState<string>(initialStatus || 'all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [operations, setOperations] = useState<Operation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected operation for detail modal
  const [activeOp, setActiveOp] = useState<Operation | null>(selectedOperationFromDashboard || null);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // New operation form state
  const [contact, setContact] = useState('');
  const [sourceLocationId, setSourceLocationId] = useState<number | undefined>(undefined);
  const [destLocationId, setDestLocationId] = useState<number | undefined>(undefined);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Array<{ productId: number; demandQty: number }>>([
    { productId: 1, demandQty: 10 },
  ]);

  // Stock Adjustment specific form
  const [adjustmentCountedQty, setAdjustmentCountedQty] = useState<number>(50);

  const loadData = async () => {
    try {
      const [opsData, prodsData, locsData] = await Promise.all([
        api.getOperations(),
        api.getProducts(),
        api.getLocations(),
      ]);
      setOperations(opsData);
      setProducts(prodsData);
      setLocations(locsData);

      // Default locations
      if (!sourceLocationId && locsData.length > 0) {
        setSourceLocationId(locsData[0].id);
      }
      if (!destLocationId && locsData.length > 0) {
        setDestLocationId(locsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load operations:', err);
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

  const filteredOps = operations.filter((op) => {
    if (op.operationType !== activeType) return false;
    if (activeStatus !== 'all' && op.status !== activeStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchRef = op.reference.toLowerCase().includes(q);
      const matchContact = (op.contact || '').toLowerCase().includes(q);
      if (!matchRef && !matchContact) return false;
    }
    return true;
  });

  // Calculate task counts for staff floor dashboard
  const readyReceiptsCount = operations.filter((o) => o.operationType === 'receipt' && (o.status === 'ready' || o.status === 'waiting')).length;
  const readyDeliveriesCount = operations.filter((o) => o.operationType === 'delivery' && (o.status === 'ready' || o.status === 'waiting')).length;
  const readyTransfersCount = operations.filter((o) => o.operationType === 'internal' && (o.status === 'ready' || o.status === 'waiting')).length;

  const handleCreateOperation = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setStatusMessage(null);

    try {
      let finalLines = lines;

      // Handle Stock Adjustment specific mapping
      if (activeType === 'adjustment') {
        const prodId = lines[0]?.productId || products[0]?.id;
        finalLines = [{ productId: prodId, demandQty: adjustmentCountedQty }];
      }

      const newOp = await api.createOperation({
        operationType: activeType,
        contact: activeType === 'internal' || activeType === 'adjustment' ? 'Internal Inventory' : contact,
        sourceLocationId:
          activeType === 'receipt' ? 5 : sourceLocationId || 1, // Vendors = 5
        destLocationId:
          activeType === 'delivery' ? 6 : destLocationId || 1, // Customers = 6
        scheduledDate,
        notes,
        responsible: user?.name || (isStaff ? 'Warehouse Staff' : 'Inventory Manager'),
        lines: finalLines,
      });

      setShowNewModal(false);
      setContact('');
      setNotes('');
      setLines([{ productId: products[0]?.id || 1, demandQty: 10 }]);
      setStatusMessage({
        type: 'success',
        text: `Operation ${newOp.reference} successfully created in ${newOp.status} state.`,
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

  const handleValidateOperation = async (opId: number) => {
    setActionLoading(true);
    setStatusMessage(null);

    try {
      const res = await api.validateOperation(opId);
      setStatusMessage({
        type: 'success',
        text: `Operation ${res.operation.reference} validated! Physical stock levels updated in PostgreSQL.`,
      });
      setActiveOp(res.operation);
      await loadData();
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Validation failed. Check on-hand stock availability.',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancelOperation = async (opId: number) => {
    setActionLoading(true);
    try {
      const updated = await api.cancelOperation(opId);
      setActiveOp(updated);
      await loadData();
      setStatusMessage({
        type: 'success',
        text: `Operation ${updated.reference} cancelled.`,
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Failed to cancel operation',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const addLine = () => {
    setLines([...lines, { productId: products[0]?.id || 1, demandQty: 5 }]);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'done':
        return 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800';
      case 'ready':
        return 'bg-blue-50 text-[#1E40AF] dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800';
      case 'waiting':
        return 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800';
      case 'draft':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700';
      default:
        return 'bg-slate-100 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Controls Header */}
      <div className="bg-white dark:bg-[#0F172A] p-5 sm:p-6 rounded-lg border border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isStaff ? 'Warehouse Floor Operations' : 'Inventory Operations'}
            </h1>
            {isStaff && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#1E40AF] dark:text-blue-300 bg-blue-50 dark:bg-[#1E40AF]/30 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-full">
                <HardHat className="w-3 h-3 text-[#1E40AF] dark:text-blue-400" />
                <span>Floor Task Queue</span>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isStaff
              ? 'Real-time task queue for verifying incoming supplier shipments, picking customer orders, and moving stock between warehouse racks.'
              : 'Enterprise management for supplier receipts, outbound dispatches, warehouse transfers, and physical stock reconciliations.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
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

          <button
            onClick={() => setShowNewModal(true)}
            className="px-3.5 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isStaff ? 'New Floor Transfer' : 'New Operation'}</span>
          </button>
        </div>
      </div>

      {/* Staff Floor Mode Task Summary Bar */}
      {isStaff && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            onClick={() => {
              setActiveType('receipt');
              setActiveStatus('ready');
            }}
            className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
              activeType === 'receipt'
                ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-700 shadow-2xs'
                : 'bg-white dark:bg-[#0F172A] border-[#E2E8F0] dark:border-slate-800 hover:border-blue-300'
            }`}
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold uppercase tracking-wider text-[10px]">Inbound Intake</span>
              <ArrowDownLeft className="w-4 h-4 text-[#1E40AF]" />
            </div>
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {readyReceiptsCount} Pending Intake
            </p>
            <span className="text-[11px] text-[#1E40AF] dark:text-blue-400 font-medium">Verify vendor boxes &amp; stock bins →</span>
          </div>

          <div
            onClick={() => {
              setActiveType('delivery');
              setActiveStatus('ready');
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
              {readyDeliveriesCount} Orders To Pick
            </p>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Pick from shelves &amp; pack →</span>
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
              <RefreshCw className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {readyTransfersCount} Rack Moves
            </p>
            <span className="text-[11px] text-purple-600 dark:text-purple-400 font-medium">Relocate between warehouse racks →</span>
          </div>
        </div>
      )}

      {/* Sub-Navigation Tabs & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0F172A] p-4 rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xs">
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {[
            { id: 'receipt', label: isStaff ? '1. Inbound Receipts' : 'Receipts (Inbound)' },
            { id: 'delivery', label: isStaff ? '2. Delivery Orders' : 'Delivery Orders (Outbound)' },
            { id: 'internal', label: isStaff ? '3. Internal Moves' : 'Internal Transfers' },
            { id: 'adjustment', label: isStaff ? '4. Physical Count Log' : 'Stock Adjustments' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveType(tab.id as OperationType);
                setActiveOp(null);
              }}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors cursor-pointer ${
                activeType === tab.id
                  ? 'bg-[#1E40AF] text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reference, contact..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
          />
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-md text-xs flex items-center justify-between shadow-2xs ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
              : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
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
          <button onClick={() => setStatusMessage(null)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* LIST VIEW with Comfortable Enterprise Density */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border-b border-[#E2E8F0] dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 sm:px-5">Reference</th>
                  <th className="py-3 px-4 sm:px-5">Source</th>
                  <th className="py-3 px-4 sm:px-5">Destination</th>
                  <th className="py-3 px-4 sm:px-5">Contact / Entity</th>
                  <th className="py-3 px-4 sm:px-5">Scheduled Date</th>
                  <th className="py-3 px-4 sm:px-5">Items / Quantity</th>
                  <th className="py-3 px-4 sm:px-5">Status</th>
                  <th className="py-3 px-4 sm:px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                {filteredOps.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No {activeType} operations found. Click "+ {isStaff ? 'New Floor Transfer' : 'New Operation'}" to create one.
                    </td>
                  </tr>
                ) : (
                  filteredOps.map((op) => (
                    <tr
                      key={op.id}
                      onClick={() => setActiveOp(op)}
                      className="hover:bg-blue-50/20 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-4 sm:px-5 font-mono font-bold text-slate-900 dark:text-white">
                        {op.reference}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-slate-600 dark:text-slate-400">
                        {op.sourceLocationName || (op.operationType === 'receipt' ? 'Vendor' : 'WH/Stock1')}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-slate-600 dark:text-slate-400">
                        {op.destLocationName || (op.operationType === 'delivery' ? 'Customer' : 'WH/Stock1')}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 font-medium text-slate-900 dark:text-white">{op.contact || 'Internal'}</td>
                      <td className="py-3.5 px-4 sm:px-5 font-mono tabular-nums text-slate-500 dark:text-slate-400">{op.scheduledDate || '—'}</td>
                      <td className="py-3.5 px-4 sm:px-5">
                        {op.lines.map((l, i) => (
                          <div key={i} className="text-[11px] leading-relaxed">
                            <span className="font-semibold text-slate-900 dark:text-white">{l.productName}</span>{' '}
                            <span className="text-slate-500 dark:text-slate-400 font-mono">
                              ({l.demandQty} {l.productUom || 'Units'})
                            </span>
                          </div>
                        ))}
                      </td>
                      <td className="py-3.5 px-4 sm:px-5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wider ${getStatusColor(
                            op.status
                          )}`}
                        >
                          {op.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 sm:px-5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveOp(op);
                          }}
                          className="px-3 py-1.5 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-950/60 hover:text-[#1E40AF] dark:hover:text-blue-300 rounded text-xs font-semibold transition-colors cursor-pointer border border-[#E2E8F0] dark:border-slate-700"
                        >
                          {isStaff ? 'Open Task' : 'Review & Validate'}
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
          {(['draft', 'waiting', 'ready', 'done'] as const).map((stage) => {
            const stageOps = filteredOps.filter((op) => op.status === stage);
            return (
              <div
                key={stage}
                className="bg-white dark:bg-[#0F172A] rounded-lg p-3.5 border border-[#E2E8F0] dark:border-slate-800 flex flex-col min-h-[420px] shadow-xs"
              >
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-[#E2E8F0] dark:border-slate-800 px-1">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    {stage}
                  </span>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[11px] font-mono rounded text-slate-600 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 font-semibold">
                    {stageOps.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {stageOps.length === 0 ? (
                    <div className="text-center py-10 text-xs text-slate-400">No items in {stage}</div>
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
                        <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400">
                          {op.lines.map((l, i) => (
                            <div key={i} className="flex justify-between py-0.5">
                              <span className="truncate max-w-[140px]">{l.productName}</span>
                              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                                {l.demandQty} {l.productUom || 'Units'}
                              </span>
                            </div>
                          ))}
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

      {/* OPERATION DETAIL & VALIDATION MODAL */}
      {activeOp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-[#0F172A] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden my-6">
            {/* Header with Pipeline status */}
            <div className="bg-[#1E40AF] text-white px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-base font-bold">
                  {activeOp.reference}
                </span>
                <span className="text-xs text-blue-200 uppercase font-semibold">({activeOp.operationType})</span>
              </div>

              {/* Lifecycle Stage Indicator */}
              <div className="flex items-center bg-blue-900/60 p-1 rounded text-xs border border-blue-800">
                {['draft', 'waiting', 'ready', 'done'].map((step, idx) => (
                  <div key={step} className="flex items-center">
                    <span
                      className={`px-2 py-0.5 rounded uppercase text-[10px] font-semibold tracking-wider ${
                        activeOp.status === step
                          ? 'bg-white text-[#1E40AF]'
                          : 'text-blue-200'
                      }`}
                    >
                      {step}
                    </span>
                    {idx < 3 && <span className="text-blue-300 px-1">›</span>}
                  </div>
                ))}
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

            {/* Action Bar */}
            <div className="bg-slate-50 dark:bg-slate-900 px-5 py-3 border-b border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {activeOp.status !== 'done' && (
                  <button
                    onClick={() => handleValidateOperation(activeOp.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>
                      {actionLoading
                        ? 'Validating...'
                        : isStaff
                        ? 'Confirm Count & Complete Task'
                        : 'Validate & Update Stock'}
                    </span>
                  </button>
                )}

                <button
                  onClick={() => setShowPrintModal(true)}
                  className="px-3.5 py-2 bg-white dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 rounded-md text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  <span>Print Slip</span>
                </button>
              </div>

              {activeOp.status !== 'done' && activeOp.status !== 'canceled' && !isStaff && (
                <button
                  onClick={() => handleCancelOperation(activeOp.id)}
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
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Partner / Contact:</p>
                  <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-[#1E40AF] dark:text-blue-400" />
                    {activeOp.contact || 'Internal Organization'}
                  </p>
                  <div className="mt-2 text-slate-500 dark:text-slate-400 space-y-0.5">
                    <div>
                      Source: <span className="font-semibold text-slate-800 dark:text-slate-200">{activeOp.sourceLocationName || 'Vendor / Origin'}</span>
                    </div>
                    <div>
                      Destination: <span className="font-semibold text-slate-800 dark:text-slate-200">{activeOp.destLocationName || 'Customer / Stock'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 sm:text-right">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">Scheduled Date:</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center sm:justify-end gap-1 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {activeOp.scheduledDate || 'Immediate'}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400 mt-2 font-medium">Responsible Operator:</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center sm:justify-end gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {activeOp.responsible || user?.name || 'Warehouse Staff'}
                  </p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h4 className="font-bold text-slate-900 dark:text-white mb-2.5">
                  Items to Verify &amp; Intake ({activeOp.lines.length})
                </h4>
                <div className="border border-[#E2E8F0] dark:border-slate-800 rounded-md overflow-hidden">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100/70 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border-b border-[#E2E8F0] dark:border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3.5">Product</th>
                        <th className="py-2.5 px-3.5">SKU Code</th>
                        <th className="py-2.5 px-3.5 text-center">UoM</th>
                        <th className="py-2.5 px-3.5 text-right">Target Demand</th>
                        <th className="py-2.5 px-3.5 text-right">Physical Counted / Done</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/80">
                      {activeOp.lines.map((l, idx) => (
                        <tr key={idx} className="hover:bg-blue-50/20 dark:hover:bg-slate-800/40">
                          <td className="py-3 px-3.5 font-semibold text-slate-900 dark:text-white">
                            {l.productName}
                          </td>
                          <td className="py-3 px-3.5 font-mono text-slate-500 dark:text-slate-400">{l.productSku}</td>
                          <td className="py-3 px-3.5 text-center text-slate-500">{l.productUom || 'Units'}</td>
                          <td className="py-3 px-3.5 text-right font-mono tabular-nums text-slate-700 dark:text-slate-300 font-medium">
                            {l.demandQty}
                          </td>
                          <td className="py-3 px-3.5 text-right font-mono tabular-nums font-bold text-slate-900 dark:text-white">
                            {l.doneQty ?? (activeOp.status === 'done' ? l.demandQty : 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {activeOp.notes && (
                <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-[#E2E8F0] dark:border-slate-800 text-slate-600 dark:text-slate-400">
                  <span className="font-semibold text-slate-900 dark:text-white block mb-0.5">Operation Notes:</span>
                  <p>{activeOp.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CREATE NEW OPERATION MODAL */}
      {showNewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white dark:bg-[#0F172A] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden my-6">
            <div className="bg-[#1E40AF] text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">
                  Create New {activeType === 'receipt' ? 'Inbound Receipt' : activeType === 'delivery' ? 'Outbound Dispatch' : activeType === 'internal' ? 'Floor Transfer' : 'Physical Stock Count'}
                </h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  Reference ID sequenced automatically in PostgreSQL
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {activeType !== 'internal' && activeType !== 'adjustment' && (
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      {activeType === 'receipt' ? 'Vendor / Supplier' : 'Customer / Destination'}
                    </label>
                    <input
                      type="text"
                      required
                      value={contact}
                      onChange={(e) => setContact(e.target.value)}
                      placeholder={activeType === 'receipt' ? 'e.g. Azure Interior' : 'e.g. Deco Addict'}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                    />
                  </div>
                )}

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Scheduled Date
                  </label>
                  <input
                    type="date"
                    required
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                  />
                </div>

                {activeType === 'receipt' && (
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Destination Warehouse Location
                    </label>
                    <select
                      value={destLocationId}
                      onChange={(e) => setDestLocationId(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name} ({loc.shortCode})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(activeType === 'delivery' || activeType === 'internal') && (
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Source Location (Pick from)
                    </label>
                    <select
                      value={sourceLocationId}
                      onChange={(e) => setSourceLocationId(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {activeType === 'internal' && (
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Destination Location (Move to)
                    </label>
                    <select
                      value={destLocationId}
                      onChange={(e) => setDestLocationId(Number(e.target.value))}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Product Lines Section */}
              {activeType !== 'adjustment' ? (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="font-semibold text-slate-800 dark:text-slate-200">
                      Product Items
                    </label>
                    <button
                      type="button"
                      onClick={addLine}
                      className="text-xs font-semibold text-[#1E40AF] dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      + Add Item
                    </button>
                  </div>

                  <div className="space-y-2">
                    {lines.map((line, idx) => {
                      const selectedProd = products.find((p) => p.id === line.productId);
                      const isLowStock = activeType === 'delivery' && (selectedProd?.onHand ?? 0) < line.demandQty;

                      return (
                        <div
                          key={idx}
                          className={`p-2.5 rounded-md border flex items-center gap-2 ${
                            isLowStock
                              ? 'border-rose-300 bg-rose-50 dark:bg-rose-950/30'
                              : 'border-[#E2E8F0] dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60'
                          }`}
                        >
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
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Stock Adjustment Form */
                <div className="p-3.5 bg-slate-50 dark:bg-slate-850 rounded-md border border-[#E2E8F0] dark:border-slate-700 space-y-3">
                  <h4 className="font-semibold text-slate-900 dark:text-white">
                    Physical Count Adjustment
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">
                        Select Product
                      </label>
                      <select
                        value={lines[0]?.productId || products[0]?.id}
                        onChange={(e) => updateLine(0, 'productId', Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white"
                      >
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} (Current: {p.onHand} {p.uom})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-slate-700 dark:text-slate-300 mb-1">
                        Physical Counted Quantity
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={adjustmentCountedQty}
                        onChange={(e) => setAdjustmentCountedQty(Number(e.target.value))}
                        className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white font-mono font-bold focus:ring-1 focus:ring-[#1E40AF]"
                      />
                    </div>
                  </div>

                  {(() => {
                    const sel = products.find((p) => p.id === (lines[0]?.productId || products[0]?.id));
                    const recorded = sel?.onHand ?? 0;
                    const diff = adjustmentCountedQty - recorded;
                    return (
                      <div className="p-2.5 bg-white dark:bg-slate-900 rounded border border-[#E2E8F0] dark:border-slate-700 text-xs flex justify-between items-center font-mono">
                        <span className="text-slate-500 font-sans">
                          Recorded: <strong>{recorded}</strong> → Physical Count: <strong>{adjustmentCountedQty}</strong>
                        </span>
                        <span
                          className={`font-bold ${
                            diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-600'
                          }`}
                        >
                          Adjustment: {diff > 0 ? `+${diff}` : diff} {sel?.uom || 'Units'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Notes &amp; Internal Instructions
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional delivery or receipt notes..."
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
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
                  {actionLoading ? 'Creating...' : isStaff ? 'Create Floor Task' : 'Create Operation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT RECEIPT MODAL */}
      <PrintReceiptModal
        operation={activeOp}
        isOpen={showPrintModal}
        onClose={() => setShowPrintModal(false)}
      />
    </div>
  );
};
