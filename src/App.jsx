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
import { UncategorizedReceipts } from './components/transactions/UncategorizedReceipts';
import { ImportMapper } from './pages/ImportMapper';
import SubscriptionManager from './components/SubscriptionManager';
import MerchantSplitRules from './components/MerchantSplitRules';
import PDFTableReader from './pdfTableReader/tableReader';

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
                        {/* Use a single-level Routes for main content */}
                        <Routes>
                          <Route path="/" element={<Dashboard />} />
                          {/* <Route path="accounts" element={<Accounts />} /> */}
                          <Route path="transactions" element={<Transactions />} />
                          <Route path="analytics" element={<Analytics />} />
                          <Route path="knowledge" element={<Knowledge />} />
                          <Route path="ai-advisor" element={<AIAdvisor />} />
                          <Route path="settings" element={<Settings />} />
                          <Route path="accounts" element={<AccountsDashboard />} />
                          <Route path="investments" element={<InvestmentAccountsDashboard />} />
                          <Route path="uncategorized-receipts/:accountId" element={<UncategorizedReceipts />} />
                          <Route path="import-mapper/:accountId" element={<ImportMapper />} />
                          <Route path="subscriptions" element={<SubscriptionManager />} />
                          <Route path="split-rules" element={<MerchantSplitRules />} />
                          <Route path="pdf-reader" element={<PDFTableReader />} />
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