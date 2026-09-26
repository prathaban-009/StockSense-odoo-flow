import React, { useState } from 'react';
import { Code2, Server, Check, Copy, Terminal, X } from 'lucide-react';

interface FastApiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FastApiModal: React.FC<FastApiModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const runCommand = `cd fastapi_backend
python -m venv venv
source venv/bin/activate  # on Windows: venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000`;

  const copyCommand = () => {
    navigator.clipboard.writeText(runCommand);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white dark:bg-[#0F172A] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden my-6">
        <div className="bg-[#1E40AF] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Code2 className="w-4 h-4 text-blue-200" />
            <div>
              <h2 className="text-sm font-semibold">FastAPI &amp; PostgreSQL Backend Reference</h2>
              <p className="text-xs text-blue-200">
                Complete Python REST implementation available in <code className="font-mono bg-blue-900/60 px-1 py-0.5 rounded">/fastapi_backend</code>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
          {/* Architecture Explanation */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-[#E2E8F0] dark:border-slate-800 rounded-md space-y-2">
            <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <Server className="w-4 h-4 text-[#1E40AF] dark:text-blue-400" />
              <span>Full-Stack &amp; Dual Architecture Specification</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              1. <strong>Cloud Studio Runtime:</strong> Runs an integrated Express + Cloud SQL PostgreSQL server on port 3000 to deliver this live preview.
            </p>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              2. <strong>FastAPI Python Standalone:</strong> Full Python FastAPI codebase is prepared in <code className="font-mono bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 px-1 py-0.5 rounded border border-blue-200 dark:border-blue-900">/fastapi_backend</code> with Pydantic schemas, SQLAlchemy models, OTP console logging, and JWT authentication.
            </p>
          </div>

          {/* Quick Terminal Command */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400" />
                Run FastAPI Locally:
              </label>
              <button
                onClick={copyCommand}
                className="text-xs text-[#1E40AF] dark:text-blue-400 hover:underline flex items-center gap-1 font-medium cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>
            <pre className="p-3.5 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-md overflow-x-auto border border-slate-800 leading-relaxed">
              {runCommand}
            </pre>
          </div>

          {/* Endpoints Table */}
          <div>
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">
              Available REST Endpoints
            </h4>
            <div className="border border-[#E2E8F0] dark:border-slate-800 rounded-md overflow-hidden text-xs">
              <table className="w-full text-left">
                <thead className="bg-slate-100/70 dark:bg-slate-900 border-b border-[#E2E8F0] dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                  <tr>
                    <th className="py-2.5 px-3.5">Method</th>
                    <th className="py-2.5 px-3.5">Path</th>
                    <th className="py-2.5 px-3.5">Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] dark:divide-slate-800 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                  <tr>
                    <td className="py-2.5 px-3.5 text-[#1E40AF] dark:text-blue-400 font-bold">POST</td>
                    <td className="py-2.5 px-3.5">/api/auth/register</td>
                    <td className="font-sans text-slate-500 dark:text-slate-400">Register new user account</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-[#1E40AF] dark:text-blue-400 font-bold">POST</td>
                    <td className="py-2.5 px-3.5">/api/auth/login</td>
                    <td className="font-sans text-slate-500 dark:text-slate-400">Login and receive JWT session token</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-[#1E40AF] dark:text-blue-400 font-bold">POST</td>
                    <td className="py-2.5 px-3.5">/api/auth/request-otp</td>
                    <td className="font-sans text-slate-500 dark:text-slate-400">Generate 6-digit OTP code &amp; log to console</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-[#1E40AF] dark:text-blue-400 font-bold">POST</td>
                    <td className="py-2.5 px-3.5">/api/auth/reset-password-otp</td>
                    <td className="font-sans text-slate-500 dark:text-slate-400">Verify OTP code and set new bcrypt hashed password</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-bold">GET</td>
                    <td className="py-2.5 px-3.5">/api/dashboard/stats</td>
                    <td className="font-sans text-slate-500 dark:text-slate-400">Inventory counts, low-stock metrics, pipeline summary</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-slate-600 dark:text-slate-400 font-bold">GET</td>
                    <td className="py-2.5 px-3.5">/api/products</td>
                    <td className="font-sans text-slate-500 dark:text-slate-400">Catalogue with on-hand and location breakdowns</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-[#1E40AF] dark:text-blue-400 font-bold">POST</td>
                    <td className="py-2.5 px-3.5">/api/operations</td>
                    <td className="font-sans text-slate-500 dark:text-slate-400">Create new receipt, delivery, transfer, or adjustment</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3.5 text-[#1E40AF] dark:text-blue-400 font-bold">POST</td>
                    <td className="py-2.5 px-3.5">/api/operations/:id/validate</td>
                    <td className="font-sans text-slate-500 dark:text-slate-400">Validate transfer &amp; update physical stock ledger</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-[#E2E8F0] dark:border-slate-800 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold cursor-pointer shadow-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
