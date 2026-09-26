import React, { useState } from 'react';
import { KeyRound, Mail, ArrowLeft, CheckCircle2, Terminal, AlertCircle, Copy, Check, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';

interface OtpResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const OtpResetModal: React.FC<OtpResetModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const { requestOtp, verifyOtpResetPassword } = useAuth();
  const [step, setStep] = useState<'request' | 'verify' | 'success'>('request');
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulatedOtp, setSimulatedOtp] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide an email address');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const res = await requestOtp(email.trim());
      if (res.testOtpCode) {
        setSimulatedOtp(res.testOtpCode);
      }
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to request OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim()) {
      setError('Please enter the 6-digit OTP code');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await verifyOtpResetPassword(email.trim(), otpCode.trim(), newPassword);
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
    } finally {
      setLoading(false);
    }
  };

  const copySimulatedOtp = () => {
    if (simulatedOtp) {
      navigator.clipboard.writeText(simulatedOtp);
      setCopied(true);
      setOtpCode(simulatedOtp);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
      <div className="w-full max-w-md bg-white dark:bg-[#0F172A] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="bg-[#1E40AF] text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-blue-200" />
            <h2 className="text-sm font-semibold">Password Reset via OTP</h2>
          </div>
          <button
            onClick={onClose}
            className="text-blue-200 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-xs">
          {error && (
            <div className="mb-4 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-md text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'request' && (
            <form onSubmit={handleRequestOtp} className="space-y-3.5">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Registered Account Email
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. manager@stocksense.io"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-[#E2E8F0] dark:border-slate-700 text-slate-600 dark:text-slate-400 flex items-start gap-2">
                <Terminal className="w-3.5 h-3.5 mt-0.5 text-[#1E40AF] dark:text-blue-400 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white">Terminal Mode:</span>
                  <p className="mt-0.5">
                    The OTP code will be logged directly to the server terminal and displayed in the verification screen for developer testing.
                  </p>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2 border border-[#E2E8F0] dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 font-semibold bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {loading ? 'Sending OTP...' : 'Send Reset Code'}
                </button>
              </div>
            </form>
          )}

          {step === 'verify' && (
            <form onSubmit={handleVerifyOtp} className="space-y-3.5">
              {/* Simulated OTP Alert Banner */}
              {simulatedOtp && (
                <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-850 rounded-md">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5 text-[#1E40AF] dark:text-blue-400" />
                      Server Console Code:
                    </span>
                    <button
                      type="button"
                      onClick={copySimulatedOtp}
                      className="text-[#1E40AF] dark:text-blue-300 hover:underline flex items-center gap-1 font-medium cursor-pointer"
                    >
                      {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      <span>{copied ? 'Auto-filled' : 'Auto-fill OTP'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-base font-bold text-[#1E40AF] dark:text-blue-300 tracking-widest text-center py-1 bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 rounded">
                    {simulatedOtp}
                  </div>
                </div>
              )}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Enter 6-Digit OTP Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="e.g. 849201"
                  className="w-full text-center tracking-widest font-mono text-base py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                />
              </div>

              <div className="flex gap-2 pt-2 border-t border-[#E2E8F0] dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setStep('request')}
                  className="flex items-center justify-center gap-1 px-3 py-2 border border-[#E2E8F0] dark:border-slate-700 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 font-semibold bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                >
                  {loading ? 'Verifying...' : 'Set New Password'}
                </button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="text-center py-4 space-y-3">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Password Updated!</h3>
                <p className="text-slate-500 dark:text-slate-400 mt-0.5">
                  Your credentials have been securely refreshed in PostgreSQL.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
                className="w-full py-2 font-semibold bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md transition-colors cursor-pointer shadow-xs"
              >
                Proceed to Login
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
