import React, { useState } from 'react';
import { Mail, Check, Terminal, ShieldCheck, Send, Copy, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface MailProviderPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MailProviderPlanModal: React.FC<MailProviderPlanModalProps> = ({ isOpen, onClose }) => {
  const { requestOtp } = useAuth();
  const [testEmail, setTestEmail] = useState('inventory-admin@company.com');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [activeCodeTab, setActiveCodeTab] = useState<'express' | 'fastapi'>('express');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleTestOtp = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await requestOtp(testEmail);
      setTestResult(
        `OTP Code Generated & Logged to Server Terminal:\nCode: ${res.testOtpCode} (Valid for 10 minutes)\nRecipient: ${testEmail}`
      );
    } catch (err: any) {
      setTestResult(`Error triggering test OTP: ${err.message || 'Unknown error'}`);
    } finally {
      setTestLoading(false);
    }
  };

  const expressCode = `// src/services/mailer.ts (Express / Node.js)
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendOtpEmail(to: string, otpCode: string) {
  if (process.env.NODE_ENV !== 'production' || !process.env.RESEND_API_KEY) {
    // Development Mode: Terminal standard output
    console.log(\`[CONSOLE OTP] Recipient: \${to} | Code: \${otpCode}\`);
    return { success: true, mode: 'console' };
  }

  // Production Dispatch via Resend:
  return await resend.emails.send({
    from: 'StockSense IMS <security@stocksense.io>',
    to,
    subject: 'Your StockSense Password Reset Code',
    html: \`
      <div style="font-family: sans-serif; padding: 20px;">
        <h2>StockSense Authentication</h2>
        <p>Your one-time passcode for password reset is:</p>
        <h1 style="font-size: 32px; letter-spacing: 4px; color: #1E40AF;">\${otpCode}</h1>
        <p>This code expires in 10 minutes. If you did not request this, please disregard.</p>
      </div>
    \`
  });
}`;

  const fastapiCode = `# fastapi_backend/routers/auth.py (FastAPI / Python)
import os
import resend

resend.api_key = os.getenv("RESEND_API_KEY")

def send_otp_email(recipient_email: str, otp_code: str):
    mail_provider = os.getenv("MAIL_PROVIDER", "console")

    if mail_provider == "console":
        # Development Mode: Print to terminal
        print(f"[CONSOLE OTP] Recipient: {recipient_email} | Code: {otp_code}")
        return {"status": "printed_to_console"}

    # Production Dispatch:
    params = {
        "from": "StockSense IMS <security@stocksense.io>",
        "to": [recipient_email],
        "subject": "Your StockSense Password Reset OTP",
        "html": f"<strong>Your 6-digit code:</strong> <h1 style='color:#1E40AF'>{otp_code}</h1>",
    }
    return resend.Emails.send(params)`;

  const copyCode = () => {
    navigator.clipboard.writeText(activeCodeTab === 'express' ? expressCode : fastapiCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-3xl bg-white dark:bg-[#0F172A] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden my-6">
        {/* Header */}
        <div className="bg-[#1E40AF] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-blue-200" />
            <div>
              <h2 className="text-sm font-semibold">Mail Provider &amp; OTP Integration Plan</h2>
              <p className="text-xs text-blue-200">
                Current: Terminal logging · Production Blueprint: Resend / SendGrid / AWS SES
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Current State Indicator */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-[#E2E8F0] dark:border-slate-800 rounded-md">
            <div className="flex items-start gap-3">
              <div className="p-1.5 bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 rounded mt-0.5 border border-blue-200 dark:border-blue-900">
                <Terminal className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 dark:text-white">
                  Active Mode: Standard Terminal Output
                </h3>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Generated 6-digit OTP codes are logged to the dev server console and saved in the PostgreSQL <code className="font-mono text-[#1E40AF] dark:text-blue-400">otp_codes</code> table.
                </p>
                <div className="mt-2 font-mono text-[11px] bg-slate-950 text-emerald-400 p-2.5 rounded border border-slate-800">
                  [AUTH OTP] Recipient: test@company.com | Code: 849201 | Expiry: 10 mins | Stored: PostgreSQL
                </div>
              </div>
            </div>
          </div>

          {/* Quick OTP Console Tester */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-md border border-[#E2E8F0] dark:border-slate-800">
            <h4 className="font-semibold text-slate-800 dark:text-white mb-2">
              Trigger Test OTP Code
            </h4>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter email to simulate"
                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
              />
              <button
                type="button"
                onClick={handleTestOtp}
                disabled={testLoading}
                className="px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testLoading ? 'Generating...' : 'Generate Test OTP'}</span>
              </button>
            </div>
            {testResult && (
              <pre className="mt-3 p-3 bg-slate-950 text-emerald-400 font-mono text-[11px] rounded whitespace-pre-wrap border border-slate-800">
                {testResult}
              </pre>
            )}
          </div>

          {/* Mail Provider Comparison & Production Architecture */}
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2.5">
              Production Mail Provider Migration Blueprint
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-md border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-slate-900 dark:text-white">Resend API</span>
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-blue-50 dark:bg-[#1E40AF]/30 text-[#1E40AF] dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded">
                    Recommended
                  </span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Modern developer-first API with instant DNS DKIM setup and high deliverability.
                </p>
                <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                  <div><strong>Package:</strong> resend</div>
                  <div><strong>Env:</strong> RESEND_API_KEY</div>
                </div>
              </div>

              <div className="p-3.5 rounded-md border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <span className="font-semibold text-slate-900 dark:text-white block mb-1">Twilio SendGrid</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Enterprise high-volume transactional email with sub-account management.
                </p>
                <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                  <div><strong>Package:</strong> @sendgrid/mail</div>
                  <div><strong>Env:</strong> SENDGRID_API_KEY</div>
                </div>
              </div>

              <div className="p-3.5 rounded-md border border-[#E2E8F0] dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
                <span className="font-semibold text-slate-900 dark:text-white block mb-1">AWS SES</span>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Cost-effective scalable service integrated with IAM credentials and CloudWatch.
                </p>
                <div className="mt-2.5 pt-2 border-t border-[#E2E8F0] dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5">
                  <div><strong>Package:</strong> @aws-sdk/client-ses</div>
                  <div><strong>Env:</strong> AWS_SES_REGION</div>
                </div>
              </div>
            </div>
          </div>

          {/* Implementation Code Snippet */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md border border-[#E2E8F0] dark:border-slate-700">
                <button
                  onClick={() => setActiveCodeTab('express')}
                  className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                    activeCodeTab === 'express'
                      ? 'bg-white dark:bg-[#0F172A] text-[#1E40AF] dark:text-white font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Node.js / Express
                </button>
                <button
                  onClick={() => setActiveCodeTab('fastapi')}
                  className={`px-3 py-1 rounded text-xs transition-colors cursor-pointer ${
                    activeCodeTab === 'fastapi'
                      ? 'bg-white dark:bg-[#0F172A] text-[#1E40AF] dark:text-white font-semibold shadow-xs'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  Python / FastAPI
                </button>
              </div>

              <button
                onClick={copyCode}
                className="text-xs text-[#1E40AF] hover:text-[#1D4ED8] dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1 font-medium cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>

            <pre className="p-3.5 bg-slate-950 text-slate-200 font-mono text-[11px] rounded-md overflow-x-auto border border-slate-800 max-h-56">
              {activeCodeTab === 'express' ? expressCode : fastapiCode}
            </pre>
          </div>

          {/* Security Best Practices */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-md border border-[#E2E8F0] dark:border-slate-800">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-1.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#1E40AF] dark:text-blue-400" />
              Production Security Checklist
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
              <li>Never expose API keys on the frontend; all dispatches route through the server backend.</li>
              <li>OTP codes are cryptographically generated and expire automatically in 10 minutes.</li>
              <li>Codes are invalidated immediately once verified to prevent replay attacks.</li>
              <li>Passwords are hashed with bcrypt before storage in PostgreSQL.</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
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
