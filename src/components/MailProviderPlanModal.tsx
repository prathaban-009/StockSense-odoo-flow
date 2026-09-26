import React, { useEffect, useState } from 'react';
import { Mail, Check, Terminal, ShieldCheck, Send, Copy, X, CheckCircle2, AlertTriangle, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api.ts';

interface MailProviderPlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MailProviderPlanModal: React.FC<MailProviderPlanModalProps> = ({ isOpen, onClose }) => {
  const [testEmail, setTestEmail] = useState('prathaban009@gmail.com');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    deliveredViaSmtp: boolean;
    message?: string;
    error?: string;
  } | null>(null);

  const [lowStockLoading, setLowStockLoading] = useState(false);
  const [lowStockResult, setLowStockResult] = useState<{
    success: boolean;
    deliveredViaSmtp: boolean;
    message: string;
    itemCount?: number;
    error?: string;
  } | null>(null);

  const [smtpStatus, setSmtpStatus] = useState<{
    configured: boolean;
    host: string;
    port: number;
    secure: boolean;
    username: string;
    connected: boolean;
    message: string;
  } | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);

  const [activeCodeTab, setActiveCodeTab] = useState<'express' | 'fastapi'>('express');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen]);

  const checkStatus = async () => {
    setStatusLoading(true);
    try {
      const status = await api.getSmtpStatus();
      setSmtpStatus(status);
    } catch (err: any) {
      setSmtpStatus({
        configured: true,
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        username: 'prathaban009@gmail.com',
        connected: false,
        message: err.message || 'Could not verify SMTP connection',
      });
    } finally {
      setStatusLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleTestOtp = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await api.sendTestEmail(testEmail);
      setTestResult({
        success: res.success,
        deliveredViaSmtp: res.deliveredViaSmtp,
        message: res.deliveredViaSmtp
          ? `✅ Live email successfully dispatched via Google SMTP to ${testEmail}! Check your inbox.`
          : `⚠️ Google SMTP returned fallback: ${res.error}`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        deliveredViaSmtp: false,
        error: err.message || 'Failed to dispatch test email',
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSendLowStockAlert = async () => {
    setLowStockLoading(true);
    setLowStockResult(null);
    try {
      const res = await api.sendLowStockAlert(testEmail);
      setLowStockResult(res);
    } catch (err: any) {
      setLowStockResult({
        success: false,
        deliveredViaSmtp: false,
        message: err.message || 'Failed to dispatch low stock alert',
        error: err.message,
      });
    } finally {
      setLowStockLoading(false);
    }
  };

  const expressCode = `// src/services/mailer.ts (Google SMTP via nodemailer)
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL port 465
  auth: {
    user: process.env.SMTP_USERNAME, // prathaban009@gmail.com
    pass: process.env.SMTP_PASSWORD, // Google App Password
  },
});

export async function sendOtpEmail(to: string, otpCode: string) {
  return await transporter.sendMail({
    from: process.env.SMTP_FROM || 'StockSense IMS <prathaban009@gmail.com>',
    to,
    subject: 'Your StockSense IMS Password Reset Passcode',
    html: \`
      <div style="font-family: sans-serif; padding: 24px; max-width: 500px; border: 1px solid #E2E8F0; border-radius: 8px;">
        <h2 style="color: #1E40AF;">StockSense Security Verification</h2>
        <p>Your one-time passcode is:</p>
        <h1 style="font-size: 34px; letter-spacing: 5px; color: #1E40AF;">\${otpCode}</h1>
        <p>This code expires in 10 minutes.</p>
      </div>
    \`
  });
}`;

  const fastapiCode = `# fastapi_backend/routers/auth.py (Google SMTP via smtplib)
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def send_otp_email(recipient: str, otp_code: str):
    msg = MIMEMultipart()
    msg['From'] = "StockSense IMS <prathaban009@gmail.com>"
    msg['To'] = recipient
    msg['Subject'] = "Your StockSense IMS Password Reset Passcode"
    
    html = f"<h2>Your Passcode: <b>{otp_code}</b></h2><p>Expires in 10 minutes.</p>"
    msg.attach(MIMEText(html, 'html'))
    
    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login("prathaban009@gmail.com", "YOUR_APP_PASSWORD")
        server.send_message(msg)`;

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
              <h2 className="text-sm font-semibold">Google SMTP &amp; Outbound Notification Center</h2>
              <p className="text-xs text-blue-200">
                Active Provider: Google SMTP (smtp.gmail.com:465 SSL) • prathaban009@gmail.com
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-blue-200 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto text-xs">
          {/* Active SMTP Connection Status Card */}
          <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border border-[#E2E8F0] dark:border-slate-800 rounded-md">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded mt-0.5 border ${
                  smtpStatus?.connected
                    ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                    : 'bg-blue-50 dark:bg-blue-950/60 text-[#1E40AF] dark:text-blue-300 border-blue-200 dark:border-blue-800'
                }`}>
                  {smtpStatus?.connected ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Mail className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-900 dark:text-white">
                      Google SMTP Transport Configuration
                    </h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                      Configured
                    </span>
                  </div>
                  <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Host: <code className="font-mono text-slate-800 dark:text-slate-200">smtp.gmail.com</code> • Port: <code className="font-mono text-slate-800 dark:text-slate-200">465 (SSL/TLS)</code> • Account: <code className="font-mono text-[#1E40AF] dark:text-blue-400 font-semibold">prathaban009@gmail.com</code>
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {smtpStatus?.message || 'Authentication credentials mounted in application environment.'}
                  </p>
                </div>
              </div>

              <button
                onClick={checkStatus}
                disabled={statusLoading}
                className="px-2.5 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 rounded text-[11px] font-medium flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${statusLoading ? 'animate-spin' : ''}`} />
                <span>Re-verify</span>
              </button>
            </div>
          </div>

          {/* Live SMTP Dispatch Diagnostic Tool */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-md border border-[#E2E8F0] dark:border-slate-800">
            <h4 className="font-semibold text-slate-800 dark:text-white mb-1.5 flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400" />
              <span>Send Live Test Email via Google SMTP</span>
            </h4>
            <p className="text-slate-500 dark:text-slate-400 mb-3 text-[11px]">
              Sends an authentic HTML verification test message through Google's SMTP servers to confirm live delivery.
            </p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="Enter recipient email address"
                className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
              />
              <button
                type="button"
                onClick={handleTestOtp}
                disabled={testLoading}
                className="px-4 py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{testLoading ? 'Sending...' : 'Send Live Test Email'}</span>
              </button>
            </div>

            {testResult && (
              <div className={`mt-3 p-3 rounded-md text-[11px] flex items-start gap-2 border ${
                testResult.deliveredViaSmtp
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}>
                {testResult.deliveredViaSmtp ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold block">{testResult.message || testResult.error}</span>
                  {!testResult.deliveredViaSmtp && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                      Note: If Google blocks the outbound connection in cloud environments due to network policies, StockSense automatically provides preview OTPs so users can continue testing without interruption.
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Low Stock Alert Dispatch Tool */}
          <div className="p-4 bg-white dark:bg-slate-900 rounded-md border border-[#E2E8F0] dark:border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="font-semibold text-slate-800 dark:text-white mb-0.5 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>Low Stock Safety Reorder Alerts</span>
                </h4>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Scans active PostgreSQL inventory for items below minimum safety levels and emails a structured reorder table to the warehouse manager.
                </p>
              </div>

              <button
                type="button"
                onClick={handleSendLowStockAlert}
                disabled={lowStockLoading}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap self-start sm:self-auto"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{lowStockLoading ? 'Scanning & Dispatching...' : 'Dispatch Reorder Alert'}</span>
              </button>
            </div>

            {lowStockResult && (
              <div className={`mt-3 p-3 rounded-md text-[11px] flex items-start gap-2 border ${
                lowStockResult.success
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
              }`}>
                {lowStockResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <span className="font-semibold block">{lowStockResult.message}</span>
                  {lowStockResult.itemCount !== undefined && (
                    <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5 block">
                      Target items identified: {lowStockResult.itemCount}
                    </span>
                  )}
                </div>
              </div>
            )}
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
              Google SMTP Security &amp; Delivery Policies
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
              <li>Using 16-character Google App Passwords ensures two-factor authentication (2FA) is maintained on your Google Account.</li>
              <li>Outbound connections use port 465 with SSL/TLS encryption for end-to-end security.</li>
              <li>Generated OTP codes expire automatically in 10 minutes and are invalidated in PostgreSQL upon successful verification.</li>
              <li>Fallback preview codes ensure developer productivity and uninterrupted account access if external mail servers experience transient rate-limiting.</li>
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
