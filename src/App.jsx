import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import ProtectedRoute from './components/ProtectedRoute';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Accounts } from './pages/Accounts';
import { Transactions } from './pages/Transactions';
import { Analytics } from './pages/Analytics';
import { Knowledge } from './pages/Knowledge';
import { AIAdvisor } from './pages/AIAdvisor';
import { Settings } from './pages/Settings';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import { AccountsDashboard } from './pages/AccountsDashboard';
import { InvestmentAccountsDashboard } from './pages/InvestmentAccountsDashboard';
import { Properties } from './pages/Properties';
import { PropertyDetails } from './pages/PropertyDetails';
import { UncategorizedReceipts } from './components/transactions/UncategorizedReceipts';
import { ImportMapper } from './pages/ImportMapper';
import SubscriptionManager from './components/SubscriptionManager';
import MerchantSplitRules from './components/MerchantSplitRules';
import PDFTableReader from './pdfTableReader/tableReader';

// Phase 3 Components - Settings
import { UserProfileSettings } from './components/settings/UserProfileSettings';
import { RetirementInfoSettings } from './components/settings/RetirementInfoSettings';
import { ChartOfAccounts } from './components/settings/ChartOfAccounts';

// Phase 3 Components - Reports
import { ExpenseAnalysis } from './components/reports/ExpenseAnalysis';
import { IncomeAnalysis } from './components/reports/IncomeAnalysis';
import { InvestmentGrowth } from './components/reports/InvestmentGrowth';

function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected routes */}
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-900 flex">
                    <Sidebar />
                    <div className="flex-1 flex flex-col">
                      <Header
                        title="Personal Finance Dashboard"
                        subtitle="Manage your finances across Canada and India"
                      />
                      <main className="flex-1 overflow-auto p-6">
                        <Routes>
                          {/* Dashboard */}
                          <Route path="/" element={<Dashboard />} />

                          {/* Transactions - Bank/Credit Card accounts */}
                          <Route path="accounts" element={<AccountsDashboard />} />
                          <Route path="transactions" element={<Transactions />} />

                          {/* Investments - Shows accounts table with import/performance */}
                          <Route path="investments" element={<InvestmentAccountsDashboard />} />
                          <Route path="properties" element={<Properties />} />
                          <Route path="properties/:propertyId" element={<PropertyDetails />} />
                          <Route path="pdf-reader" element={<PDFTableReader />} />

                          {/* Reports */}
                          <Route path="reports/expenses" element={<ExpenseAnalysis />} />
                          <Route path="reports/income" element={<IncomeAnalysis />} />
                          <Route path="reports/investments" element={<InvestmentGrowth />} />
                          <Route path="analytics" element={<Analytics />} />

                          {/* AI Chat */}
                          <Route path="ai-advisor" element={<AIAdvisor />} />

                          {/* Settings */}
                          <Route path="settings" element={<Settings />} />
                          <Route path="settings/profile" element={<UserProfileSettings />} />
                          <Route path="settings/retirement" element={<RetirementInfoSettings />} />
                          <Route path="settings/chart-of-accounts" element={<ChartOfAccounts />} />
                          <Route path="subscriptions" element={<SubscriptionManager />} />
                          <Route path="split-rules" element={<MerchantSplitRules />} />

                          {/* Other existing routes */}
                          <Route path="knowledge" element={<Knowledge />} />
                          <Route path="uncategorized-receipts/:accountId" element={<UncategorizedReceipts />} />
                          <Route path="import-mapper/:accountId" element={<ImportMapper />} />
                        </Routes>
                      </main>
                    </div>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </FinanceProvider>
    </AuthProvider>
  );
}

export default App;