
import React, { useEffect, useState } from 'react';
import { PortfolioCard } from '../components/analytics/PortfolioCard';
import { CategoryChart } from '../components/analytics/CategoryChart';
import { DollarSign, TrendingUp, PiggyBank } from 'lucide-react';
import { calculateTotalBalance } from '../utils/calculations';
import { accountsDB, transactionsDB } from '../services/database';

export const Analytics = () => {
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const accs = await accountsDB.getAll();
            setAccounts(accs);
            const txns = await transactionsDB.getAll();
            setTransactions(txns);
            setLoading(false);
        };
        fetchData();
    }, []);

    const totalBalance = calculateTotalBalance(accounts);
    const canadaTotal = accounts.filter(a => a.country === 'canada').reduce((sum, a) => sum + (a.balance || 0), 0);
    const indiaTotal = accounts.filter(a => a.country === 'india').reduce((sum, a) => sum + (a.balance || 0), 0);

    const totalIncome = transactions
        .filter(txn => txn.amount > 0)
        .reduce((sum, txn) => sum + txn.amount, 0);

    const totalExpenses = Math.abs(
        transactions
            .filter(txn => txn.amount < 0)
            .reduce((sum, txn) => sum + txn.amount, 0)
    );

    const netSavings = totalIncome - totalExpenses;

    if (loading) {
        return <div className="text-center py-12 text-gray-500">Loading analytics...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
                <p className="text-gray-600">Visualize your financial data and track your progress</p>
            </div>

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <PortfolioCard
                    title="Total Portfolio"
                    amount={totalBalance}
                    change={5.2}
                    icon={DollarSign}
                />
                <PortfolioCard
                    title="Canada Accounts"
                    amount={canadaTotal}
                    change={3.8}
                    country="Canada"
                />
                <PortfolioCard
                    title="India Accounts"
                    amount={indiaTotal}
                    change={-1.2}
                    country="India"
                />
                <PortfolioCard
                    title="Net Savings"
                    amount={netSavings}
                    change={12.5}
                    icon={PiggyBank}
                />
            </div>

            {/* Income & Expenses Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Income vs Expenses</h3>
                    <div className="space-y-4">
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600">Total Income</span>
                                <span className="text-green-600 font-semibold">
                                    ${totalIncome.toFixed(2)}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-green-500 h-3 rounded-full"
                                    style={{ width: '100%' }}
                                ></div>
                            </div>
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-gray-600">Total Expenses</span>
                                <span className="text-red-600 font-semibold">
                                    ${totalExpenses.toFixed(2)}
                                </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                                <div
                                    className="bg-red-500 h-3 rounded-full"
                                    style={{
                                        width: `${totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0}%`
                                    }}
                                ></div>
                            </div>
                        </div>
                    </div>
                </div>

                <CategoryChart transactions={transactions} />
            </div>

            {/* Account Distribution */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Account Distribution</h3>
                <div className="space-y-3">
                    {accounts.map(account => {
                        const percentage = totalBalance > 0 ? (account.balance / totalBalance) * 100 : 0;
                        return (
                            <div key={account.id}>
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-gray-700 font-medium">{account.name}</span>
                                    <span className="text-gray-600">
                                        ${account.balance?.toFixed(2) || '0.00'} ({percentage.toFixed(1)}%)
                                    </span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full"
                                        style={{ width: `${percentage}%` }}
                                    ></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
