import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { FinanceProvider } from './context/FinanceContext';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Accounts } from './pages/Accounts';
import { Transactions } from './pages/Transactions';
import { Analytics } from './pages/Analytics';
import { Knowledge } from './pages/Knowledge';
import { AIAdvisor } from './pages/AIAdvisor';

function App() {
  return (
    <FinanceProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-900 flex">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header
              title="Personal Finance Dashboard"
              subtitle="Manage your finances across Canada and India"
            />
            <main className="flex-1 overflow-auto p-6">
              <Routes>
                <Route path="/" element={<Accounts />} />
                <Route path="/transactions" element={<Transactions />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/knowledge" element={<Knowledge />} />
                <Route path="/ai-advisor" element={<AIAdvisor />} />
              </Routes>
            </main>
          </div>
        </div>
      </BrowserRouter>
    </FinanceProvider>
  );
}

export default App;