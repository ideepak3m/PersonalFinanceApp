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

// Placeholder component for pages not yet built
const PlaceholderPage = ({ title, description }) => (
  <div className="flex items-center justify-center h-full">
    <div className="text-center p-8 bg-gray-800 rounded-lg border border-gray-700 max-w-md">
      <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <span className="text-3xl">🚧</span>
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
      <p className="text-gray-400">{description || 'This page is coming soon!'}</p>
    </div>
  </div>
);

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
                          <Route path="pdf-reader" element={<PDFTableReader />} />

                          {/* Reports */}
                          <Route path="reports/expenses" element={
                            <PlaceholderPage
                              title="Expense Analysis"
                              description="Monthly breakdown, category charts, year-over-year comparison"
                            />
                          } />
                          <Route path="reports/income" element={
                            <PlaceholderPage
                              title="Income Analysis"
                              description="Income trends and sources over time"
                            />
                          } />
                          <Route path="reports/investments" element={
                            <PlaceholderPage
                              title="Investment Growth"
                              description="Portfolio growth charts by account and time period"
                            />
                          } />
                          <Route path="analytics" element={<Analytics />} />

                          {/* AI Chat */}
                          <Route path="ai-advisor" element={<AIAdvisor />} />

                          {/* Settings */}
                          <Route path="settings" element={<Settings />} />
                          <Route path="settings/profile" element={
                            <PlaceholderPage
                              title="User Profile"
                              description="Date of birth, province, employment info, tax details"
                            />
                          } />
                          <Route path="settings/retirement" element={
                            <PlaceholderPage
                              title="Retirement Info"
                              description="CPP/OAS estimates, pension details, retirement goals"
                            />
                          } />
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