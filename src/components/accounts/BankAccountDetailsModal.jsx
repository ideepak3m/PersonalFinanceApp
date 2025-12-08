// src/components/accounts/BankAccountDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Receipt, PieChart, Calendar, Filter, ChevronDown, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { transactionsDB } from '../../services/database';

const BankAccountDetailsModal = ({ account, onClose }) => {
    const [activeTab, setActiveTab] = useState('transactions');
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateRange, setDateRange] = useState({ from: '', to: '' });

    useEffect(() => {
        loadTransactions();
    }, [account.id]);

    const loadTransactions = async () => {
        try {
            setLoading(true);
            const { data, error } = await transactionsDB.table()
                .select('*')
                .eq('account_id', account.id)
                .order('date', { ascending: false });

            if (!error) {
                setTransactions(data || []);
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '-';
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: account.currency || 'CAD',
            minimumFractionDigits: 2
        }).format(Math.abs(value));
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Filter transactions
    const filteredTransactions = transactions.filter(txn => {
        if (statusFilter !== 'all' && txn.status !== statusFilter) return false;
        if (typeFilter !== 'all' && txn.type !== typeFilter) return false;
        if (dateRange.from && new Date(txn.date) < new Date(dateRange.from)) return false;
        if (dateRange.to && new Date(txn.date) > new Date(dateRange.to)) return false;
        return true;
    });

    // Calculate summary stats
    const totalCredits = transactions
        .filter(t => t.type === 'credit')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0);

    const totalDebits = transactions
        .filter(t => t.type === 'debit')
        .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0);

    const uncategorizedCount = transactions.filter(t => t.status === 'uncategorized').length;
    const categorizedCount = transactions.filter(t => t.status === 'categorized' || t.status === 'split').length;

    // Get unique statuses
    const statuses = [...new Set(transactions.map(t => t.status))];

    const tabs = [
        { id: 'transactions', label: 'Transactions', icon: TrendingUp, count: transactions.length },
        { id: 'summary', label: 'Summary', icon: PieChart, count: null }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-indigo-600">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{account.name}</h2>
                            <div className="flex items-center gap-4 mt-2 text-blue-100">
                                <span className="px-2 py-0.5 bg-white/20 rounded text-sm">
                                    {account.type || 'Bank Account'}
                                </span>
                                <span className="text-sm">
                                    {account.institution || 'Unknown Institution'}
                                </span>
                                {account.account_number && (
                                    <span className="text-sm">
                                        •••• {account.account_number.slice(-4)}
                                    </span>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white/80 hover:text-white p-1"
                        >
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-4 gap-4 mt-4">
                        <div className="bg-white/10 rounded-lg p-3">
                            <div className="text-xs text-blue-200">Total Transactions</div>
                            <div className="text-xl font-bold text-white">{transactions.length}</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3">
                            <div className="text-xs text-blue-200">Total Credits</div>
                            <div className="text-xl font-bold text-green-300">{formatCurrency(totalCredits)}</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3">
                            <div className="text-xs text-blue-200">Total Debits</div>
                            <div className="text-xl font-bold text-red-300">{formatCurrency(totalDebits)}</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3">
                            <div className="text-xs text-blue-200">Uncategorized</div>
                            <div className="text-xl font-bold text-yellow-300">{uncategorizedCount}</div>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b bg-gray-50">
                    <div className="flex">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-3 border-b-2 transition-colors ${activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600 bg-white'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                    {tab.count !== null && (
                                        <span className="ml-1 px-2 py-0.5 text-xs bg-gray-200 rounded-full">
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-3 text-gray-500">Loading transactions...</span>
                        </div>
                    ) : (
                        <>
                            {/* Transactions Tab */}
                            {activeTab === 'transactions' && (
                                <div className="space-y-4">
                                    {/* Filters */}
                                    <div className="flex flex-wrap items-center gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Status</label>
                                            <select
                                                value={statusFilter}
                                                onChange={(e) => setStatusFilter(e.target.value)}
                                                className="px-3 py-2 border rounded-lg text-sm"
                                            >
                                                <option value="all">All Status</option>
                                                {statuses.map(status => (
                                                    <option key={status} value={status}>{status}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">Type</label>
                                            <select
                                                value={typeFilter}
                                                onChange={(e) => setTypeFilter(e.target.value)}
                                                className="px-3 py-2 border rounded-lg text-sm"
                                            >
                                                <option value="all">All Types</option>
                                                <option value="credit">Credits</option>
                                                <option value="debit">Debits</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">From Date</label>
                                            <input
                                                type="date"
                                                value={dateRange.from}
                                                onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
                                                className="px-3 py-2 border rounded-lg text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">To Date</label>
                                            <input
                                                type="date"
                                                value={dateRange.to}
                                                onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
                                                className="px-3 py-2 border rounded-lg text-sm"
                                            />
                                        </div>
                                        <div className="ml-auto">
                                            <label className="block text-xs text-gray-500 mb-1">&nbsp;</label>
                                            <button
                                                onClick={() => {
                                                    setStatusFilter('all');
                                                    setTypeFilter('all');
                                                    setDateRange({ from: '', to: '' });
                                                }}
                                                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                                            >
                                                Clear Filters
                                            </button>
                                        </div>
                                    </div>

                                    <div className="text-sm text-gray-500 mb-2">
                                        Showing {filteredTransactions.length} of {transactions.length} transactions
                                    </div>

                                    {filteredTransactions.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            No transactions found
                                        </div>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                                                    <th className="px-4 py-3 text-left font-medium text-gray-700">Description</th>
                                                    <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                                                    <th className="px-4 py-3 text-right font-medium text-gray-700">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {filteredTransactions.slice(0, 100).map((txn, idx) => (
                                                    <tr key={txn.id || idx} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3">{formatDate(txn.date)}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium text-gray-900">{txn.description}</div>
                                                            {txn.raw_merchant_name && txn.raw_merchant_name !== txn.description && (
                                                                <div className="text-xs text-gray-500">{txn.raw_merchant_name}</div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 text-xs rounded ${txn.status === 'categorized' ? 'bg-green-100 text-green-800' :
                                                                txn.status === 'uncategorized' ? 'bg-yellow-100 text-yellow-800' :
                                                                    txn.status === 'split' ? 'bg-purple-100 text-purple-800' :
                                                                        'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {txn.status}
                                                            </span>
                                                        </td>
                                                        <td className={`px-4 py-3 text-right font-medium flex items-center justify-end gap-1 ${txn.type === 'credit' ? 'text-green-600' : 'text-red-600'
                                                            }`}>
                                                            {txn.type === 'credit' ? (
                                                                <ArrowDownLeft className="w-4 h-4" />
                                                            ) : (
                                                                <ArrowUpRight className="w-4 h-4" />
                                                            )}
                                                            {formatCurrency(txn.amount)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {filteredTransactions.length > 100 && (
                                        <div className="text-center py-4 text-gray-500 text-sm">
                                            Showing first 100 transactions. Use filters to narrow down.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Summary Tab */}
                            {activeTab === 'summary' && (
                                <div className="space-y-6">
                                    {/* Status Breakdown */}
                                    <div className="bg-gray-50 rounded-lg p-6">
                                        <h3 className="font-semibold text-gray-900 mb-4">Transaction Status</h3>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div className="bg-white rounded-lg p-4 border">
                                                <div className="text-sm text-gray-500">Categorized</div>
                                                <div className="text-2xl font-bold text-green-600">{categorizedCount}</div>
                                                <div className="text-xs text-gray-400">
                                                    {transactions.length > 0 ? ((categorizedCount / transactions.length) * 100).toFixed(1) : 0}%
                                                </div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border">
                                                <div className="text-sm text-gray-500">Uncategorized</div>
                                                <div className="text-2xl font-bold text-yellow-600">{uncategorizedCount}</div>
                                                <div className="text-xs text-gray-400">
                                                    {transactions.length > 0 ? ((uncategorizedCount / transactions.length) * 100).toFixed(1) : 0}%
                                                </div>
                                            </div>
                                            <div className="bg-white rounded-lg p-4 border">
                                                <div className="text-sm text-gray-500">Split</div>
                                                <div className="text-2xl font-bold text-purple-600">
                                                    {transactions.filter(t => t.status === 'split').length}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Monthly Summary */}
                                    <div className="bg-gray-50 rounded-lg p-6">
                                        <h3 className="font-semibold text-gray-900 mb-4">Monthly Summary</h3>
                                        <div className="space-y-2">
                                            {Object.entries(
                                                transactions.reduce((acc, txn) => {
                                                    const month = txn.date ? txn.date.substring(0, 7) : 'Unknown';
                                                    if (!acc[month]) acc[month] = { credits: 0, debits: 0, count: 0 };
                                                    acc[month].count++;
                                                    if (txn.type === 'credit') {
                                                        acc[month].credits += Math.abs(parseFloat(txn.amount) || 0);
                                                    } else {
                                                        acc[month].debits += Math.abs(parseFloat(txn.amount) || 0);
                                                    }
                                                    return acc;
                                                }, {})
                                            )
                                                .sort((a, b) => b[0].localeCompare(a[0]))
                                                .slice(0, 12)
                                                .map(([month, data]) => (
                                                    <div key={month} className="flex items-center justify-between bg-white rounded-lg p-3 border">
                                                        <div className="font-medium">{month}</div>
                                                        <div className="flex items-center gap-6">
                                                            <span className="text-sm text-gray-500">{data.count} txns</span>
                                                            <span className="text-green-600">+{formatCurrency(data.credits)}</span>
                                                            <span className="text-red-600">-{formatCurrency(data.debits)}</span>
                                                            <span className={`font-medium ${data.credits - data.debits >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                Net: {formatCurrency(data.credits - data.debits)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-between">
                    <div className="text-sm text-gray-500">
                        Account created: {formatDate(account.created_at)}
                    </div>
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default BankAccountDetailsModal;
