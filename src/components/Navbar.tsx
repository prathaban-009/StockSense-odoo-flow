import React, { useState } from 'react';
import {
  Layers,
  LayoutDashboard,
  ArrowLeftRight,
  Package,
  History,
  Settings,
  Database,
  Mail,
  ChevronDown,
  LogOut,
  Shield,
  Code2,
  Sun,
  Moon,
  HardHat,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { useTheme } from '../context/ThemeContext.tsx';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  onOpenAuth: () => void;
  onOpenMailPlans: () => void;
  onOpenFastApiDocs: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenAuth,
  onOpenMailPlans,
  onOpenFastApiDocs,
}) => {
  const { user, logout, switchRole } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const isStaff = user?.role === 'Warehouse Staff';

  // Role-tailored navigation items: Staff gets floor operational workflow, Manager gets executive overview and settings
  const tabs = isStaff
    ? [
        { id: 'operations', label: 'Floor Operations', icon: ArrowLeftRight },
        { id: 'products', label: 'Products & Stock', icon: Package },
        { id: 'moves', label: 'Move History', icon: History },
      ]
    : [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'operations', label: 'Operations', icon: ArrowLeftRight },
        { id: 'products', label: 'Products & Stock', icon: Package },
        { id: 'moves', label: 'Move History', icon: History },
        { id: 'settings', label: 'Settings', icon: Settings },
      ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#1E293B]/95 backdrop-blur-sm border-b border-[#E2E8F0] dark:border-slate-800 shadow-xs transition-colors duration-150">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Left: Corporate Brand Mark, Role Badge & Navigation */}
          <div className="flex items-center gap-5 sm:gap-6">
            <div
              onClick={() => onTabChange(isStaff ? 'operations' : 'dashboard')}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-md bg-[#1E40AF] text-white flex items-center justify-center font-bold shadow-xs transition-transform group-hover:scale-105">
                <Layers className="w-4 h-4" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
                  StockSense
                </span>
                <span className="text-[10px] font-bold text-[#1E40AF] dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/70 border border-blue-200 dark:border-blue-900/60 px-1.5 py-0.5 rounded">
                  IMS
                </span>
              </div>
            </div>

            {/* Restricted Floor Mode Indicator */}
            {isStaff ? (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/80 px-2 py-0.5 rounded-md">
                <HardHat className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                <span>Restricted Floor Mode</span>
              </span>
            ) : null}

            {/* Navigation Tabs - Role-Tailored */}
            <nav className="hidden md:flex items-center gap-1.5">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = currentTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                      isActive
                        ? 'bg-blue-50/90 dark:bg-[#1E40AF]/30 text-[#1E40AF] dark:text-blue-200 border border-blue-200/80 dark:border-blue-700/60 font-semibold shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-slate-800/60 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#1E40AF] dark:text-blue-300' : 'text-slate-400 dark:text-slate-400'}`} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Right: Technical Badges (Manager only), Dark/Light Mode Switcher & User Context */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {!isStaff && (
              <>
                <button
                  onClick={onOpenFastApiDocs}
                  className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-slate-600 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="FastAPI and PostgreSQL Technical Reference"
                >
                  <Database className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>PostgreSQL &amp; FastAPI</span>
                </button>

                <button
                  onClick={onOpenMailPlans}
                  className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-slate-600 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Mail Provider & OTP Setup"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>OTP: Console Active</span>
                </button>
              </>
            )}

            {/* Dark / Light Mode Switcher */}
            <button
              onClick={toggleTheme}
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-md text-xs text-slate-600 dark:text-slate-300 border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle color theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="hidden sm:inline font-medium">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline font-medium">Dark</span>
                </>
              )}
            </button>

            {/* User Profile */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 p-1.5 rounded-md border border-[#E2E8F0] dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left cursor-pointer"
                >
                  <div className="w-6 h-6 rounded bg-[#1E40AF] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                      {user.name}
                    </p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      {user.role}
                    </p>
                  </div>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showUserMenu && (
                  <div className="absolute right-0 mt-1.5 w-60 bg-white dark:bg-[#1E293B] rounded-lg shadow-lg border border-[#E2E8F0] dark:border-slate-800 p-1.5 z-50">
                    <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-semibold text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-[#1E40AF] dark:text-blue-400 font-medium">
                        <Shield className="w-3 h-3 text-[#1E40AF] dark:text-blue-400" />
                        <span>{user.role}</span>
                      </div>
                    </div>

                    <div className="px-2 py-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1 px-1">
                        Role Simulation:
                      </p>
                      <div className="grid grid-cols-2 gap-1 text-xs">
                        <button
                          onClick={() => {
                            switchRole('Inventory Manager');
                            setShowUserMenu(false);
                          }}
                          className={`py-1.5 px-2 rounded font-medium text-center transition-colors cursor-pointer ${
                            user.role === 'Inventory Manager'
                              ? 'bg-[#1E40AF] text-white font-semibold shadow-2xs'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          Manager
                        </button>
                        <button
                          onClick={() => {
                            switchRole('Warehouse Staff');
                            setShowUserMenu(false);
                          }}
                          className={`py-1.5 px-2 rounded font-medium text-center transition-colors cursor-pointer ${
                            user.role === 'Warehouse Staff'
                              ? 'bg-[#1E40AF] text-white font-semibold shadow-2xs'
                              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          Staff (Floor)
                        </button>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800 pt-1">
                      {!isStaff && (
                        <>
                          <button
                            onClick={() => {
                              onOpenMailPlans();
                              setShowUserMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Mail className="w-3.5 h-3.5 text-slate-400" />
                            <span>Mail &amp; OTP Plan</span>
                          </button>
                          <button
                            onClick={() => {
                              onOpenFastApiDocs();
                              setShowUserMenu(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
                          >
                            <Code2 className="w-3.5 h-3.5 text-slate-400" />
                            <span>FastAPI Architecture</span>
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 rounded text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="px-3.5 py-1.5 bg-[#1E40AF] hover:bg-[#1D4ED8] text-white rounded-md text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        <div className="flex md:hidden items-center gap-1.5 overflow-x-auto py-2 border-t border-[#E2E8F0] dark:border-slate-800 no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs whitespace-nowrap font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50/90 dark:bg-[#1E40AF]/30 text-[#1E40AF] dark:text-blue-200 border border-blue-200 dark:border-blue-700 font-semibold'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
