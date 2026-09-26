import React from 'react';
import { Printer, Building2, Calendar, User, FileText, X } from 'lucide-react';
import { Operation } from '../types.ts';

interface PrintReceiptModalProps {
  operation: Operation | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({ operation, isOpen, onClose }) => {
  if (!isOpen || !operation) return null;

  const handlePrint = () => {
    window.print();
  };

  const isReceipt = operation.operationType === 'receipt';
  const title = isReceipt ? 'GOODS RECEIPT NOTE (GRN)' : 'DELIVERY DISPATCH VOUCHER';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0F172A] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden my-8">
        {/* Actions Bar */}
        <div className="bg-[#1E40AF] text-white px-5 py-3.5 flex items-center justify-between border-b border-blue-800">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <FileText className="w-4 h-4 text-blue-200" />
            <span>Document Preview &amp; Print Service</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-white text-[#1E40AF] hover:bg-blue-50 rounded-md text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Voucher</span>
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-blue-900/60 hover:bg-blue-800 border border-blue-700 text-blue-100 rounded-md text-xs font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

        {/* Printable Paper Canvas */}
        <div className="p-8 bg-white text-slate-900 font-sans print:p-0 text-xs">
          {/* Header */}
          <div className="flex justify-between items-start border-b border-slate-200 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-[#1E40AF] text-white flex items-center justify-center font-bold text-xs">
                  SS
                </div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">StockSense IMS</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">Enterprise Supply Chain &amp; Inventory Logistics</p>
              <p className="text-xs text-slate-500">Central Distribution Hub</p>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-900 font-mono text-xs font-bold rounded border border-slate-300">
                {operation.reference}
              </span>
              <p className="text-[11px] font-semibold text-slate-500 mt-1 uppercase tracking-wider">
                Status: <span className="text-emerald-700 font-bold">{operation.status.toUpperCase()}</span>
              </p>
            </div>
          </div>

          <div className="py-3 text-center border-b border-slate-200">
            <h2 className="text-sm font-bold tracking-wider text-slate-800 uppercase">{title}</h2>
          </div>

          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 py-3.5 border-b border-slate-200">
            <div className="space-y-1">
              <p className="text-slate-500">
                {isReceipt ? 'Vendor / Supplier:' : 'Customer / Destination:'}
              </p>
              <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-slate-500" />
                {operation.contact || 'Azure Interior'}
              </p>
              <p className="text-slate-500 mt-1.5">Storage Location:</p>
              <p className="font-medium text-slate-800">
                {isReceipt ? operation.destLocationName : operation.sourceLocationName || 'WH/Stock1'}
              </p>
            </div>

            <div className="space-y-1 text-right">
              <p className="text-slate-500">Scheduled Date:</p>
              <p className="font-medium text-slate-800 flex items-center justify-end gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                {operation.scheduledDate || new Date().toISOString().split('T')[0]}
              </p>
              <p className="text-slate-500 mt-1.5">Responsible:</p>
              <p className="font-medium text-slate-800 flex items-center justify-end gap-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                {operation.responsible || 'Inventory Manager'}
              </p>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="py-4">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-300 text-slate-700 font-semibold">
                  <th className="py-2">Item Description</th>
                  <th className="py-2">SKU</th>
                  <th className="py-2 text-right">Demanded</th>
                  <th className="py-2 text-right">Processed / Done</th>
                  <th className="py-2 text-center">UoM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {operation.lines.map((l, i) => (
                  <tr key={i}>
                    <td className="py-2.5 font-medium">{l.productName}</td>
                    <td className="py-2.5 font-mono text-slate-500">{l.productSku}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums">{l.demandQty}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums font-bold">
                      {l.doneQty ?? (operation.status === 'done' ? l.demandQty : 0)}
                    </td>
                    <td className="py-2.5 text-center text-slate-500">{l.productUom || 'Units'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Signatures Footer */}
          <div className="mt-8 pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-center text-slate-500">
            <div>
              <div className="border-b border-slate-300 h-12" />
              <p className="mt-1 text-[11px]">Warehouse Dispatcher / Receiver Signature</p>
            </div>
            <div>
              <div className="border-b border-slate-300 h-12" />
              <p className="mt-1 text-[11px]">Authorized Inventory Controller</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
