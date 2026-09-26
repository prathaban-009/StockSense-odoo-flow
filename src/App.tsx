import React, { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { ThemeProvider } from './context/ThemeContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { DashboardView } from './views/DashboardView.tsx';
import { OperationsView } from './views/OperationsView.tsx';
import { ProductsView } from './views/ProductsView.tsx';
import { MoveHistoryView } from './views/MoveHistoryView.tsx';
import { SettingsView } from './views/SettingsView.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { MailProviderPlanModal } from './components/MailProviderPlanModal.tsx';
import { FastApiModal } from './components/FastApiModal.tsx';
import { LoginView } from './views/LoginView.tsx';
import { Operation, OperationType } from './types.ts';

function MainApp() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  const [opsInitialType, setOpsInitialType] = useState<OperationType>('receipt');
  const [opsInitialStatus, setOpsInitialStatus] = useState<string | undefined>(undefined);
  const [prodsInitialFilter, setProdsInitialFilter] = useState<string | undefined>(undefined);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showMailPlansModal, setShowMailPlansModal] = useState<boolean>(false);
  const [showFastApiModal, setShowFastApiModal] = useState<boolean>(false);

  const isStaff = user?.role === 'Warehouse Staff';

  // Role-tailored automatic routing: Staff lands on Floor Operations, and is barred from Settings/Dashboard
  useEffect(() => {
    if (isStaff) {
      if (currentTab === 'dashboard' || currentTab === 'settings') {
        setCurrentTab('operations');
      }
    } else if (user) {
      // If manager logged in and on operations by default, can stay or switch
    }
  }, [isStaff, user]);

  // Mandatory Full-Screen Login First
  if (!user) {
    return <LoginView />;
  }

  const handleNavigateToOperations = (type?: string, status?: string) => {
    if (type) setOpsInitialType(type as OperationType);
    if (status) setOpsInitialStatus(status);
    setSelectedOp(null);
    setCurrentTab('operations');
  };

  const handleNavigateToProducts = (filter?: string) => {
    setProdsInitialFilter(filter);
    setCurrentTab('products');
  };

  const handleSelectOperation = (op: Operation) => {
    setSelectedOp(op);
    setOpsInitialType(op.operationType);
    setCurrentTab('operations');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#020617] text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-[#1E40AF] selection:text-white transition-colors duration-150">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setSelectedOp(null);
          // Block staff from navigating to settings or dashboard
          if (isStaff && (tab === 'settings' || tab === 'dashboard')) {
            setCurrentTab('operations');
            return;
          }
          setCurrentTab(tab);
        }}
        onOpenAuth={() => setShowAuthModal(true)}
        onOpenMailPlans={() => setShowMailPlansModal(true)}
        onOpenFastApiDocs={() => setShowFastApiModal(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && !isStaff && (
          <DashboardView
            onNavigateToOperations={handleNavigateToOperations}
            onNavigateToProducts={handleNavigateToProducts}
            onSelectOperation={handleSelectOperation}
          />
        )}

        {currentTab === 'operations' && (
          <OperationsView
            initialType={opsInitialType}
            initialStatus={opsInitialStatus}
            selectedOperationFromDashboard={selectedOp}
            onClearSelectedOperation={() => setSelectedOp(null)}
          />
        )}

        {currentTab === 'products' && (
          <ProductsView
            initialFilter={prodsInitialFilter}
            onNavigateToOperations={handleNavigateToOperations}
          />
        )}

        {currentTab === 'moves' && <MoveHistoryView />}

        {currentTab === 'settings' && !isStaff && <SettingsView />}
      </main>

      {/* Standard Corporate Footer */}
      <footer className="border-t border-[#E2E8F0] dark:border-slate-800 py-3.5 bg-white dark:bg-[#0F172A] text-slate-500 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800 dark:text-slate-200">StockSense IMS</span>
            <span className="text-slate-400">·</span>
            <span>Supply Chain Enterprise Standard</span>
            <span className="text-slate-400">·</span>
            <span>Cloud SQL PostgreSQL</span>
            {isStaff && (
              <>
                <span className="text-slate-400">·</span>
                <span className="text-amber-600 dark:text-amber-400 font-medium">Floor Mode Active</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-4 text-xs">
            {!isStaff ? (
              <>
                <button
                  onClick={() => setShowMailPlansModal(true)}
                  className="text-slate-600 dark:text-slate-400 hover:text-[#1E40AF] dark:hover:text-blue-400 underline-offset-4 hover:underline cursor-pointer"
                >
                  Email &amp; OTP Specs
                </button>
                <button
                  onClick={() => setShowFastApiModal(true)}
                  className="text-slate-600 dark:text-slate-400 hover:text-[#1E40AF] dark:hover:text-blue-400 underline-offset-4 hover:underline cursor-pointer"
                >
                  FastAPI Schema &amp; Docs
                </button>
              </>
            ) : (
              <span className="text-slate-400">Floor Operations &amp; Stock Count Access</span>
            )}
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
      <MailProviderPlanModal isOpen={showMailPlansModal} onClose={() => setShowMailPlansModal(false)} />
      <FastApiModal isOpen={showFastApiModal} onClose={() => setShowFastApiModal(false)} />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ThemeProvider>
  );
}
