import React, { useState } from 'react';
import { Mail, Lock, User as UserIcon, Shield, Layers, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { UserRole } from '../types.ts';
import { OtpResetModal } from './OtpResetModal.tsx';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register, loginWithGoogle, loginAsDemo } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('Inventory Manager');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOtpReset, setShowOtpReset] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'signin') {
        await login(email, password);
      } else {
        if (!name.trim()) throw new Error('Name is required');
        await register(name, email, password, role);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = (demoRole: UserRole) => {
    loginAsDemo(demoRole);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
        <div className="w-full max-w-md bg-white dark:bg-[#0F172A] rounded-lg shadow-xl border border-[#E2E8F0] dark:border-slate-800 overflow-hidden">
          {/* Header */}
          <div className="bg-[#1E40AF] text-white p-5 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-blue-200 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded bg-blue-900/60 text-white flex items-center justify-center font-bold border border-blue-400/30">
                <Layers className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-base font-bold tracking-tight">StockSense IMS</h2>
            </div>
            <p className="text-blue-100 text-xs">Modular Enterprise Inventory Management</p>

            <div className="flex bg-blue-950/50 border border-blue-900/60 p-0.5 rounded-md mt-4 text-xs font-medium">
              <button
                type="button"
                onClick={() => setMode('signin')}
                className={`flex-1 py-1.5 rounded transition-colors cursor-pointer ${
                  mode === 'signin' ? 'bg-white text-[#1E40AF] font-bold shadow-2xs' : 'text-blue-200 hover:text-white'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => setMode('signup')}
                className={`flex-1 py-1.5 rounded transition-colors cursor-pointer ${
                  mode === 'signup' ? 'bg-white text-[#1E40AF] font-bold shadow-2xs' : 'text-blue-200 hover:text-white'
                }`}
              >
                Create Account
              </button>
            </div>
          </div>

          {/* Form */}
          <div className="p-5 text-xs">
            {error && (
              <div className="mb-4 p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-md text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}

            {/* Quick Demo Switchers */}
            <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-md border border-[#E2E8F0] dark:border-slate-700">
              <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wider">
                Quick Evaluation Access:
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleDemoSignIn('Inventory Manager')}
                  className="py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-[#E2E8F0] dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:text-[#1E40AF] rounded text-xs font-semibold transition-colors text-center cursor-pointer shadow-2xs"
                >
                  Inventory Manager
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoSignIn('Warehouse Staff')}
                  className="py-1.5 px-2 bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-slate-700 border border-[#E2E8F0] dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:text-[#1E40AF] rounded text-xs font-semibold transition-colors text-center cursor-pointer shadow-2xs"
                >
                  Warehouse Staff
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {mode === 'signup' && (
                <>
                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <UserIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. John Doe"
                        className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                      Assigned Role
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('Inventory Manager')}
                        className={`py-1.5 px-2.5 rounded-md font-medium border text-left flex items-center justify-between cursor-pointer ${
                          role === 'Inventory Manager'
                            ? 'border-[#1E40AF] bg-[#1E40AF] text-white shadow-2xs'
                            : 'border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>Manager</span>
                        <Shield className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole('Warehouse Staff')}
                        className={`py-1.5 px-2.5 rounded-md font-medium border text-left flex items-center justify-between cursor-pointer ${
                          role === 'Warehouse Staff'
                            ? 'border-[#1E40AF] bg-[#1E40AF] text-white shadow-2xs'
                            : 'border-[#E2E8F0] dark:border-slate-700 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <span>Staff</span>
                        <Layers className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setShowOtpReset(true)}
                      className="text-[11px] text-[#1E40AF] dark:text-blue-400 hover:underline cursor-pointer font-medium"
                    >
                      Forgot password? (OTP)
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-[#E2E8F0] dark:border-slate-700 rounded-md focus:ring-1 focus:ring-[#1E40AF] focus:border-[#1E40AF] focus:outline-none dark:text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                <span>{loading ? 'Authenticating...' : mode === 'signin' ? 'Sign In to IMS' : 'Create IMS Account'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>

            <div className="relative my-3.5">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E2E8F0] dark:border-slate-700" />
              </div>
              <div className="relative flex justify-center text-[10px] uppercase">
                <span className="bg-white dark:bg-[#0F172A] px-2 text-slate-400">Or continue with</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-2 border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md font-medium text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Google Account</span>
            </button>
          </div>
        </div>
      </div>

      <OtpResetModal
        isOpen={showOtpReset}
        onClose={() => setShowOtpReset(false)}
        onSuccess={() => {
          setShowOtpReset(false);
          setMode('signin');
        }}
      />
    </>
  );
};
