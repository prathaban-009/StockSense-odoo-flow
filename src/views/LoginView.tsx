import React, { useState } from 'react';
import {
  Boxes,
  Lock,
  Mail,
  User as UserIcon,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Building2,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { OtpResetModal } from '../components/OtpResetModal.tsx';

interface LoginViewProps {
  onSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = () => {
  const { login, register } = useAuth();

  const [activeTab, setActiveTab] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in both email and password.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('All fields are required for manager registration.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      await register(name.trim(), email.trim(), password, 'Inventory Manager');
    } catch (err: any) {
      setError(err.message || 'Failed to create manager account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-950 to-blue-950 text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Top Brand Bar */}
      <header className="border-b border-slate-800/80 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#2563EB] flex items-center justify-center text-white shadow-sm">
            <Boxes className="w-4 h-4" />
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white">StockSense IMS</span>
            <span className="hidden sm:inline-block ml-2 text-xs text-slate-400 border-l border-slate-700 pl-2">
              Supply Chain &amp; Floor Execution Portal
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>PostgreSQL Ledger Online</span>
        </div>
      </header>

      {/* Main Form Centerpiece */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-lg bg-slate-900/90 rounded-xl border border-blue-900/50 shadow-2xl p-6 sm:p-8 backdrop-blur-lg">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              {activeTab === 'signin' ? 'Welcome to StockSense' : 'Register Warehouse Manager'}
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              {activeTab === 'signin'
                ? 'Sign in with your assigned credentials to access warehouse operations.'
                : 'Create an administrator account to manage warehouses, inventory, and floor employees.'}
            </p>
          </div>

          {/* Tab Switcher */}
          <div className="flex bg-slate-950/80 p-1 rounded-lg border border-slate-800 mb-6">
            <button
              type="button"
              onClick={() => {
                setActiveTab('signin');
                setError(null);
              }}
              className={`flex-1 min-h-10 py-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'signin'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sign In (All Roles)
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setError(null);
              }}
              className={`flex-1 min-h-10 py-2.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-[#2563EB] text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Manager Sign Up
            </button>
          </div>

          {/* Restriction Notice for Staff on Sign-Up tab */}
          {activeTab === 'register' && (
            <div className="mb-5 p-3 bg-blue-950/40 border border-blue-800/60 rounded-lg text-xs text-blue-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold block text-white">Notice for Warehouse Floor Staff:</span>
                <span>
                  Employee accounts are provisioned exclusively by your Inventory Manager. Staff cannot register
                  here. Once created by your manager, your login credentials will be dispatched to your email.
                </span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 rounded-lg text-xs text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          {activeTab === 'signin' ? (
            <form onSubmit={handleSignIn} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Registered Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-medium">Password</label>
                  <button
                    type="button"
                    onClick={() => setShowOtpModal(true)}
                    className="text-[11px] text-blue-400 hover:text-blue-300 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-11 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-md font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-2"
              >
                {loading ? 'Authenticating...' : 'Sign In to Workspace'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Full Name</label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Marcus Vance"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Manager Work Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="manager@yourcompany.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-9 pr-3 py-2.5 bg-slate-950 border border-slate-700 rounded-md text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 rounded-md border border-slate-800 text-[11px] text-slate-400">
                <span className="font-semibold text-slate-300 block mb-0.5">Assigned Role:</span>
                <span>Inventory Manager (Full administrative authority over products, locations, and staff dispatch).</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full min-h-11 py-3 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-md font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-md mt-2"
              >
                {loading ? 'Creating Manager Account...' : 'Complete Manager Registration'}
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>StockSense IMS · Enterprise Logistics &amp; PostgreSQL Inventory Architecture</span>
          <span className="font-mono text-[11px]">Authorized Warehouse Personnel Only</span>
        </div>
      </footer>

      {/* OTP Reset Password Modal */}
      <OtpResetModal
        isOpen={showOtpModal}
        onClose={() => setShowOtpModal(false)}
        onSuccess={() => {
          setShowOtpModal(false);
          setActiveTab('signin');
        }}
      />
    </div>
  );
};
