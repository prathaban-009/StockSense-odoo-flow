import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  CheckCircle2,
  Package,
  Sliders,
  Truck,
  Building2,
  X,
} from 'lucide-react';
import { Operation, Product } from '../types.ts';
import { api } from '../services/api.ts';

interface LowStockAlertPanelProps {
  products: Product[];
  onReplenishmentSuccess: (createdOp: Operation) => void;
  onNavigateToOperations: (type?: string, status?: string) => void;
  onNavigateToProducts: (filter?: string) => void;
}

export const LowStockAlertPanel: React.FC<LowStockAlertPanelProps> = ({
  products,
  onReplenishmentSuccess,
  onNavigateToOperations,
  onNavigateToProducts,
}) => {
  // Threshold mode: 'reorder_level' (individual per-product rule) or 'custom_threshold' (global threshold)
  const [thresholdMode, setThresholdMode] = useState<'reorder_level' | 'custom_threshold'>('custom_threshold');
  const [customThreshold, setCustomThreshold] = useState<number>(35); // Defaults to 35 so low items are flagged
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'warning'>('all');

  // Quick Reorder Modal State
  const [reorderProduct, setReorderProduct] = useState<Product | null>(null);
  const [isBulkReorder, setIsBulkReorder] = useState(false);
  const [vendorName, setVendorName] = useState('Azure Interior');
  const [targetLocationId, setTargetLocationId] = useState<number>(1);
  const [replenishQty, setReplenishQty] = useState<number>(50);
  const [autoValidate, setAutoValidate] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState<{ reference: string; message: string; op: Operation } | null>(null);

  // Filter low stock products based on active threshold
  const lowStockItems = products.map((p) => {
    const threshold = thresholdMode === 'reorder_level' ? (p.minReorderLevel ?? 10) : customThreshold;
    const isLow = p.onHand <= threshold;
    const isCritical = p.onHand === 0 || p.onHand <= Math.floor(threshold * 0.5);
    const deficit = Math.max(0, threshold - p.onHand);
    const suggestedQty = p.reorderQty && p.reorderQty > 0 ? p.reorderQty : Math.max(deficit, 20);
    const estimatedCost = Number(p.costPrice || 0) * suggestedQty;
    const healthPercent = Math.min(100, Math.round((p.onHand / Math.max(1, threshold)) * 100));

    return {
      product: p,
      threshold,
      isLow,
      isCritical,
      deficit,
      suggestedQty,
      estimatedCost,
      healthPercent,
    };
  }).filter((item) => {
    if (!item.isLow) return false;
    if (selectedCategory !== 'all' && String(item.product.categoryId) !== selectedCategory) return false;
    if (severityFilter === 'critical' && !item.isCritical) return false;
    if (severityFilter === 'warning' && item.isCritical) return false;
    return true;
  });

  const categories = Array.from(new Set(products.map((p) => p.categoryName).filter(Boolean)));
  const totalReplenishCost = lowStockItems.reduce((acc, item) => acc + item.estimatedCost, 0);

  const handleOpenSingleReorder = (item: typeof lowStockItems[0]) => {
    setReorderProduct(item.product);
    setIsBulkReorder(false);
    setReplenishQty(item.suggestedQty);
    setVendorName(item.product.categoryName === 'Raw Materials' ? 'Steel Corp' : 'Azure Interior');
  };

  const handleOpenBulkReorder = () => {
    setReorderProduct(null);
    setIsBulkReorder(true);
    setVendorName('Global Supply & Restock Corp');
  };

  const handleConfirmReplenishment = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);

    try {
      let linesToCreate: Array<{ productId: number; demandQty: number }> = [];

      if (isBulkReorder) {
        linesToCreate = lowStockItems.map((item) => ({
          productId: item.product.id,
          demandQty: item.suggestedQty,
        }));
      } else if (reorderProduct) {
        linesToCreate = [
          {
            productId: reorderProduct.id,
            demandQty: replenishQty,
          },
        ];
      }

      if (linesToCreate.length === 0) return;

      // 1. Create replenishment receipt in PostgreSQL
      const createdOp = await api.createOperation({
        operationType: 'receipt',
        contact: vendorName.trim() || 'Restock Supplier',
        sourceLocationId: 5, // Vendors location
        destLocationId: targetLocationId || 1, // WH/Stock1
        scheduledDate: new Date().toISOString().split('T')[0],
        responsible: 'Inventory Manager',
        notes: isBulkReorder
          ? `Bulk restock for ${lowStockItems.length} low-stock inventory items`
          : `Quick replenishment order for ${reorderProduct?.name} [${reorderProduct?.sku}]`,
        lines: linesToCreate,
      });

      // 2. If user chose "Auto Validate", immediately execute stock increment
      let finalOp = createdOp;
      if (autoValidate) {
        const valRes = await api.validateOperation(createdOp.id);
        finalOp = valRes.operation;
      }

      // Close modal and set success banner
      setReorderProduct(null);
      setIsBulkReorder(false);
      setSuccessBanner({
        reference: finalOp.reference,
        message: autoValidate
          ? `Receipt ${finalOp.reference} validated & stock levels updated in PostgreSQL.`
          : `Replenishment order ${finalOp.reference} generated in Draft status.`,
        op: finalOp,
      });

      onReplenishmentSuccess(finalOp);
    } catch (err: any) {
      alert(err.message || 'Failed to create replenishment order');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xs overflow-hidden">
      {/* Enterprise Alert Header */}
      <div className="p-4 sm:p-5 border-b border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Low Stock &amp; Replenishment Alert
              </h3>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {lowStockItems.length} items flagged
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Identifies inventory items below safety thresholds. Create replenishment receipts to restock warehouse bins.
            </p>
          </div>
        </div>

        {/* Header Action Button */}
        {lowStockItems.length > 0 && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={handleOpenBulkReorder}
              className="px-3.5 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Bulk Restock All ({lowStockItems.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Threshold & Filter Controller Bar */}
      <div className="px-4 py-3 bg-slate-50/80 dark:bg-slate-900/60 border-b border-[#E2E8F0] dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-400">
            <Sliders className="w-3.5 h-3.5" />
            <span>Threshold Rule:</span>
          </div>

          <div className="flex bg-white dark:bg-slate-900 p-0.5 rounded-md border border-[#E2E8F0] dark:border-slate-700">
            <button
              onClick={() => setThresholdMode('custom_threshold')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                thresholdMode === 'custom_threshold'
                  ? 'bg-[#1E40AF] text-white font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Global Safety ({customThreshold} units)
            </button>
            <button
              onClick={() => setThresholdMode('reorder_level')}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors cursor-pointer ${
                thresholdMode === 'reorder_level'
                  ? 'bg-[#1E40AF] text-white font-semibold shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Product Min Rules
            </button>
          </div>

          {/* Quick preset limits */}
          {thresholdMode === 'custom_threshold' && (
            <div className="flex items-center gap-1.5 pl-2 border-l border-[#E2E8F0] dark:border-slate-700">
              <span className="text-slate-400 text-[11px]">Level:</span>
              {[25, 35, 50].map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setCustomThreshold(lvl)}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-medium transition-colors cursor-pointer ${
                    customThreshold === lvl
                      ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {lvl}
                </button>
              ))}
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min="5"
                  max="500"
                  value={customThreshold}
                  onChange={(e) => setCustomThreshold(Number(e.target.value) || 10)}
                  className="w-14 px-1.5 py-0.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded text-center text-xs font-mono dark:text-white"
                />
                <span className="text-slate-400 text-[11px]">units</span>
              </div>
            </div>
          )}
        </div>

        {/* Severity & Category Filter */}
        <div className="flex items-center gap-2">
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1E40AF]"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical (≤ 50% threshold)</option>
            <option value="warning">Low Stock</option>
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1 text-xs bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-700 rounded-md dark:text-white focus:outline-none focus:ring-1 focus:ring-[#1E40AF]"
          >
            <option value="all">All Categories</option>
            {categories.map((c, i) => (
              <option key={i} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Success Notification Banner after Replenishment */}
      {successBanner && (
        <div className="m-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-md flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <div>
              <span className="font-semibold">{successBanner.message}</span>
              <span className="ml-2 font-mono text-[11px] text-emerald-700 dark:text-emerald-300">
                Ref: {successBanner.reference}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToOperations('receipt')}
              className="px-2.5 py-1 bg-emerald-800 hover:bg-emerald-900 text-white rounded text-xs font-medium cursor-pointer"
            >
              View in Receipts →
            </button>
            <button
              onClick={() => setSuccessBanner(null)}
              className="text-slate-400 hover:text-slate-600 p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Low Stock Items List Table with Comfortable Enterprise Density */}
      <div className="p-0">
        {lowStockItems.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
              All Stock Levels Within Safety Parameters
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              No products are below the {thresholdMode === 'custom_threshold' ? `${customThreshold} units` : 'reorder'} threshold.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-b border-[#E2E8F0] dark:border-slate-800 font-semibold">
                <tr>
                  <th className="py-3 px-4 sm:px-5">Product / SKU</th>
                  <th className="py-3 px-4 sm:px-5">Category</th>
                  <th className="py-3 px-4 sm:px-5 text-right">On Hand</th>
                  <th className="py-3 px-4 sm:px-5 text-right">Threshold</th>
                  <th className="py-3 px-4 sm:px-5">Stock Health</th>
                  <th className="py-3 px-4 sm:px-5 text-right">Deficit</th>
                  <th className="py-3 px-4 sm:px-5 text-right">Suggested Order</th>
                  <th className="py-3 px-4 sm:px-5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                {lowStockItems.map((item) => (
                  <tr
                    key={item.product.id}
                    className="hover:bg-blue-50/20 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 sm:px-5">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {item.product.name}
                          </span>
                          <span className="font-mono text-[11px] text-slate-400">
                            {item.product.sku}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 sm:px-5">
                      <span className="text-slate-600 dark:text-slate-400">
                        {item.product.categoryName || 'General'}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 sm:px-5 text-right font-mono font-bold tabular-nums">
                      <span className={item.isCritical ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'}>
                        {item.product.onHand} {item.product.uom}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 sm:px-5 text-right font-mono tabular-nums text-slate-500">
                      {item.threshold} {item.product.uom}
                    </td>

                    <td className="py-3.5 px-4 sm:px-5 min-w-[120px]">
                      <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            item.isCritical ? 'bg-rose-500' : 'bg-amber-500'
                          }`}
                          style={{ width: `${item.healthPercent}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400 mt-1 block">
                        {item.healthPercent}% ({item.isCritical ? 'Critical' : 'Low'})
                      </span>
                    </td>

                    <td className="py-3.5 px-4 sm:px-5 text-right font-mono font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                      -{item.deficit} {item.product.uom}
                    </td>

                    <td className="py-3.5 px-4 sm:px-5 text-right font-mono tabular-nums">
                      <span className="font-semibold text-slate-900 dark:text-white block">
                        +{item.suggestedQty} {item.product.uom}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        ≈ {item.estimatedCost.toLocaleString()} Rs
                      </span>
                    </td>

                    <td className="py-3.5 px-4 sm:px-5 text-right">
                      <button
                        onClick={() => handleOpenSingleReorder(item)}
                        className="px-3 py-1.5 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded text-xs font-semibold transition-colors inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                        title="Create replenishment receipt for this product"
                      >
                        <ArrowDownLeft className="w-3 h-3" />
                        <span>Reorder</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QUICK REORDER MODAL - CLEAN ENTERPRISE DIALOG */}
      {(reorderProduct || isBulkReorder) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white dark:bg-[#0F172A] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden my-6">
            <div className="p-4 bg-[#1E40AF] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Truck className="w-4 h-4 text-blue-200" />
                <h3 className="text-sm font-semibold">
                  {isBulkReorder
                    ? `Bulk Replenishment Order (${lowStockItems.length} Products)`
                    : `Replenishment Receipt: ${reorderProduct?.name}`}
                </h3>
              </div>
              <button
                onClick={() => {
                  setReorderProduct(null);
                  setIsBulkReorder(false);
                }}
                className="text-blue-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReplenishment} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Vendor / Supplier
                </label>
                <div className="relative">
                  <Building2 className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    placeholder="e.g. Azure Interior, Steel Corp"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Destination Storage Location
                </label>
                <select
                  value={targetLocationId}
                  onChange={(e) => setTargetLocationId(Number(e.target.value))}
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                >
                  <option value={1}>WH/Stock1 (Primary Warehouse Zone)</option>
                  <option value={2}>WH/Stock2 (Secondary Storage)</option>
                  <option value={3}>Production Floor</option>
                  <option value={4}>WH/Output</option>
                </select>
              </div>

              {!isBulkReorder && reorderProduct && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-slate-700 dark:text-slate-300">
                      Replenishment Quantity ({reorderProduct.uom})
                    </label>
                    <span className="text-slate-400 text-[11px] font-mono">
                      Current: {reorderProduct.onHand} | Safety: {thresholdMode === 'reorder_level' ? reorderProduct.minReorderLevel : customThreshold}
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1"
                    required
                    value={replenishQty}
                    onChange={(e) => setReplenishQty(Number(e.target.value))}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md font-mono font-semibold dark:text-white focus:ring-1 focus:ring-[#1E40AF] focus:outline-none"
                  />
                  <p className="mt-1 text-[11px] text-slate-500 font-mono">
                    Estimated Cost: {(Number(reorderProduct.costPrice || 0) * replenishQty).toLocaleString()} Rs
                  </p>
                </div>
              )}

              {isBulkReorder && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-700 rounded-md space-y-1.5 max-h-36 overflow-y-auto">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                    Items to be restocked ({lowStockItems.length}):
                  </span>
                  {lowStockItems.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span className="truncate">{item.product.name}</span>
                      <span className="font-mono font-medium text-slate-900 dark:text-white">
                        +{item.suggestedQty} {item.product.uom}
                      </span>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-[#E2E8F0] dark:border-slate-700 flex justify-between font-semibold text-slate-900 dark:text-white font-mono">
                    <span>Total Batch Valuation:</span>
                    <span>{totalReplenishCost.toLocaleString()} Rs</span>
                  </div>
                </div>
              )}

              {/* Instant Intake Checkbox */}
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-[#E2E8F0] dark:border-slate-700 rounded-md flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-900 dark:text-white block">
                    Auto-Validate &amp; Increment Stock Immediately
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Directly marks receipt as Done and increments Cloud SQL on-hand levels
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={autoValidate}
                  onChange={(e) => setAutoValidate(e.target.checked)}
                  className="w-4 h-4 rounded text-[#1E40AF] cursor-pointer"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setReorderProduct(null);
                    setIsBulkReorder(false);
                  }}
                  className="flex-1 py-2 font-medium border border-[#E2E8F0] dark:border-slate-700 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="flex-1 py-2 font-semibold bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {actionLoading ? 'Creating Order...' : 'Confirm Replenishment Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
