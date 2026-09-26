import React, { useEffect, useState } from 'react';
import {
  History,
  Search,
  List,
  LayoutGrid,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api.ts';
import { StockLedgerItem } from '../types.ts';

export const MoveHistoryView: React.FC = () => {
  const [moves, setMoves] = useState<StockLedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const loadLedger = async () => {
    try {
      const data = await api.getStockLedger(searchQuery, typeFilter);
      setMoves(data);
    } catch (err) {
      console.error('Failed to load ledger:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [typeFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLedger();
  };

  const getMoveDirectionStyle = (type: string) => {
    switch (type) {
      case 'receipt':
        return {
          badge: 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          text: 'text-emerald-700 dark:text-emerald-400 font-semibold',
          icon: ArrowDownLeft,
          label: 'IN (Receipt)',
        };
      case 'delivery':
        return {
          badge: 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          text: 'text-rose-600 dark:text-rose-400 font-semibold',
          icon: ArrowUpRight,
          label: 'OUT (Delivery)',
        };
      case 'internal':
        return {
          badge: 'bg-blue-50 text-[#1E40AF] dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800',
          text: 'text-[#1E40AF] dark:text-blue-400 font-semibold',
          icon: History,
          label: 'INTERNAL',
        };
      case 'adjustment':
        return {
          badge: 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          text: 'text-amber-600 dark:text-amber-400 font-semibold',
          icon: RefreshCw,
          label: 'ADJUSTMENT',
        };
      default:
        return {
          badge: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700',
          text: 'text-slate-700 dark:text-slate-300',
          icon: History,
          label: type.toUpperCase(),
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white dark:bg-[#0F172A] p-5 sm:p-6 rounded-lg border border-[#E2E8F0] dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Move History &amp; Stock Ledger
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Enterprise audit trail of all incoming receipts, customer dispatches, and internal warehouse movements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* View Mode Toggle */}
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
              title="Kanban View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={loadLedger}
            className="p-2 border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md transition-colors cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-[#0F172A] p-4 rounded-lg border border-[#E2E8F0] dark:border-slate-800 shadow-xs">
        <form onSubmit={handleSearch} className="flex items-center gap-2 w-full sm:w-80">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search reference, contact, product..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="px-3.5 py-1.5 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold cursor-pointer transition-colors shadow-2xs"
          >
            Search
          </button>
        </form>

        {/* Direction Filter Segmented Controls */}
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">Filter:</span>
          {[
            { id: 'all', label: 'All Moves' },
            { id: 'receipt', label: 'Inbound' },
            { id: 'delivery', label: 'Outbound' },
            { id: 'internal', label: 'Internal' },
            { id: 'adjustment', label: 'Adjustments' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                typeFilter === t.id
                  ? 'bg-[#1E40AF] text-white shadow-2xs font-semibold'
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* LIST VIEW with Comfortable Enterprise Density */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-[#0F172A] rounded-lg border border-[#E2E8F0] dark:border-slate-800 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100/70 dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-semibold border-b border-[#E2E8F0] dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4 sm:px-5 font-semibold">Reference</th>
                  <th className="py-3 px-4 sm:px-5 font-semibold">Date</th>
                  <th className="py-3 px-4 sm:px-5 font-semibold">Contact / Partner</th>
                  <th className="py-3 px-4 sm:px-5 font-semibold">Source</th>
                  <th className="py-3 px-4 sm:px-5 font-semibold">Destination</th>
                  <th className="py-3 px-4 sm:px-5 font-semibold">Product &amp; SKU</th>
                  <th className="py-3 px-4 sm:px-5 text-right font-semibold">Quantity</th>
                  <th className="py-3 px-4 sm:px-5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800/80 text-slate-700 dark:text-slate-300">
                {moves.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      No stock move records found in ledger.
                    </td>
                  </tr>
                ) : (
                  moves.map((move) => {
                    const style = getMoveDirectionStyle(move.operationType);
                    const DirIcon = style.icon;
                    const isIn = move.operationType === 'receipt';
                    const isOut = move.operationType === 'delivery';

                    return (
                      <tr
                        key={move.id}
                        className="hover:bg-blue-50/20 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 sm:px-5 font-mono font-bold text-slate-900 dark:text-white">
                          {move.reference}
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-slate-500 font-mono tabular-nums whitespace-nowrap">{move.date}</td>
                        <td className="py-3.5 px-4 sm:px-5 font-medium text-slate-900 dark:text-white">
                          {move.contact || 'Internal Move'}
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-slate-600 dark:text-slate-400">{move.fromLocation}</td>
                        <td className="py-3.5 px-4 sm:px-5 text-slate-600 dark:text-slate-400">{move.toLocation}</td>
                        <td className="py-3.5 px-4 sm:px-5">
                          <span className="font-semibold text-slate-900 dark:text-white block">
                            {move.productName}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">{move.productSku}</span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-5 text-right font-mono text-xs tabular-nums">
                          <span
                            className={`inline-flex items-center gap-1 font-semibold ${
                              isIn
                                ? 'text-emerald-700 dark:text-emerald-400'
                                : isOut
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-[#1E40AF] dark:text-blue-400'
                            }`}
                          >
                            <DirIcon className="w-3 h-3" />
                            {isIn ? `+${move.quantity}` : isOut ? `-${move.quantity}` : move.quantity}{' '}
                            {move.productUom || 'Units'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 sm:px-5">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-semibold border uppercase tracking-wider ${style.badge}`}
                          >
                            {move.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KANBAN BOARD VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { type: 'receipt', title: 'Inbound Receipts', border: 'border-[#E2E8F0] dark:border-slate-800' },
            { type: 'delivery', title: 'Outbound Deliveries', border: 'border-[#E2E8F0] dark:border-slate-800' },
            { type: 'internal', title: 'Internal Moves & Adjustments', border: 'border-[#E2E8F0] dark:border-slate-800' },
          ].map((col) => {
            const colMoves = moves.filter((m) =>
              col.type === 'internal'
                ? m.operationType === 'internal' || m.operationType === 'adjustment'
                : m.operationType === col.type
            );

            return (
              <div
                key={col.type}
                className={`bg-white dark:bg-[#0F172A] rounded-lg p-4 border ${col.border} flex flex-col min-h-[420px] shadow-xs`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0] dark:border-slate-800 mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
                    {col.title}
                  </h3>
                  <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold rounded text-slate-600 dark:text-slate-300 font-mono tabular-nums border border-[#E2E8F0] dark:border-slate-700">
                    {colMoves.length}
                  </span>
                </div>

                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {colMoves.length === 0 ? (
                    <div className="text-center py-12 text-xs text-slate-400">No records in this category</div>
                  ) : (
                    colMoves.map((m) => {
                      const isIn = m.operationType === 'receipt';
                      const isOut = m.operationType === 'delivery';

                      return (
                        <div
                          key={m.id}
                          className="p-3.5 bg-slate-50 dark:bg-[#1E293B] rounded-md border border-[#E2E8F0] dark:border-slate-700/80 shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                              {m.reference}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{m.date}</span>
                          </div>

                          <p className="text-xs font-semibold text-slate-900 dark:text-white mt-1">
                            {m.contact || 'Internal'}
                          </p>

                          <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                            <div>From: {m.fromLocation}</div>
                            <div>To: {m.toLocation}</div>
                          </div>

                          <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] dark:border-slate-700 flex justify-between items-center text-xs">
                            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[130px]">
                              {m.productName}
                            </span>
                            <span
                              className={`font-mono font-bold tabular-nums ${
                                isIn
                                  ? 'text-emerald-600 dark:text-emerald-400'
                                  : isOut
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-[#1E40AF] dark:text-blue-400'
                              }`}
                            >
                              {isIn ? `+${m.quantity}` : isOut ? `-${m.quantity}` : m.quantity}{' '}
                              {m.productUom || 'Units'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
