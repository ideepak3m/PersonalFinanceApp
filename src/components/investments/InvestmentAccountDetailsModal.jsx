// src/components/investments/InvestmentAccountDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Receipt, PieChart, Calendar, Filter, Download, ChevronDown, Building2 } from 'lucide-react';
import { supabase } from '../../services/supabaseClient';

const InvestmentAccountDetailsModal = ({ account, onClose }) => {
    const [activeTab, setActiveTab] = useState('holdings');
    const [holdings, setHoldings] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [cashTransactions, setCashTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState('all');
    const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });
    const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');

    useEffect(() => {
        loadAccountData();
    }, [account.id]);

    const loadAccountData = async () => {
        try {
            setLoading(true);

            // Load holdings
            const { data: holdingsData, error: holdingsError } = await supabase
                .from('holdings')
                .select('*')
                .eq('account_id', account.id)
                .order('as_of_date', { ascending: false });

            if (!holdingsError) {
                setHoldings(holdingsData || []);
            }

            // Load investment transactions
            const { data: txnData, error: txnError } = await supabase
                .from('investment_transactions')
                .select('*')
                .eq('account_id', account.id)
                .order('transaction_date', { ascending: false });

            if (!txnError) {
                setTransactions(txnData || []);
            }

            // Load cash transactions (fees, etc.)
            const { data: cashData, error: cashError } = await supabase
                .from('cash_transactions')
                .select('*')
                .eq('account_id', account.id)
                .order('transaction_date', { ascending: false });

            if (!cashError) {
                setCashTransactions(cashData || []);
            }

        } catch (error) {
            console.error('Error loading account data:', error);
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
        }).format(value);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Get unique dates from holdings for date filter
    const holdingsDates = [...new Set(holdings.map(h => h.as_of_date))].sort().reverse();

    // Filter holdings by selected date
    const filteredHoldings = dateFilter === 'all'
        ? holdings
        : holdings.filter(h => h.as_of_date === dateFilter);

    // Get unique holding dates for latest snapshot
    const latestHoldingsDate = holdingsDates[0];
    const latestHoldings = holdings.filter(h => h.as_of_date === latestHoldingsDate);

    // Filter transactions
    const filteredTransactions = transactions.filter(txn => {
        if (transactionTypeFilter !== 'all' && txn.transaction_type !== transactionTypeFilter) {
            return false;
        }
        return true;
    });

    // Get unique transaction types
    const transactionTypes = [...new Set(transactions.map(t => t.transaction_type))];

    // Calculate totals
    const totalMarketValue = latestHoldings.reduce((sum, h) => sum + (parseFloat(h.market_value) || 0), 0);
    const totalBookValue = latestHoldings.reduce((sum, h) => sum + (parseFloat(h.book_value) || 0), 0);
    const totalGainLoss = totalMarketValue - totalBookValue;
    const gainLossPercent = totalBookValue > 0 ? ((totalGainLoss / totalBookValue) * 100) : 0;

    // Calculate fees total
    const totalFees = cashTransactions
        .filter(t => t.transaction_type === 'Fee')
        .reduce((sum, t) => sum + (parseFloat(t.debit) || 0), 0);

    const tabs = [
        { id: 'holdings', label: 'Holdings', icon: PieChart, count: latestHoldings.length },
        { id: 'transactions', label: 'Transactions', icon: TrendingUp, count: transactions.length },
        { id: 'fees', label: 'Fees & Cash', icon: Receipt, count: cashTransactions.length }
    ];

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Modal Header */}
                <div className="p-6 border-b bg-gradient-to-r from-indigo-600 to-purple-600">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-white">
                                {account.display_name || `${account.institution} ${account.account_type}`}
                            </h2>
                            <div className="flex items-center gap-4 mt-2 text-indigo-100">
                                <span className="flex items-center gap-1">
                                    <Building2 className="w-4 h-4" />
                                    {account.institution}
                                </span>
                                <span className="px-2 py-0.5 bg-white/20 rounded text-sm">
                                    {account.account_type}
                                </span>
                                <span className="text-sm">
                                    Account: {account.account_number}
                                </span>
                            </div>
                            {account.manager && (
                                <div className="mt-1 text-indigo-200 text-sm">
                                    Managed by: {account.manager.name} ({account.manager.manager_type})
                                </div>
                            )}
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
                            <div className="text-xs text-indigo-200">Market Value</div>
                            <div className="text-xl font-bold text-white">{formatCurrency(totalMarketValue)}</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3">
                            <div className="text-xs text-indigo-200">Book Value</div>
                            <div className="text-xl font-bold text-white">{formatCurrency(totalBookValue)}</div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3">
                            <div className="text-xs text-indigo-200">Gain/Loss</div>
                            <div className={`text-xl font-bold ${totalGainLoss >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                {formatCurrency(totalGainLoss)} ({gainLossPercent.toFixed(2)}%)
                            </div>
                        </div>
                        <div className="bg-white/10 rounded-lg p-3">
                            <div className="text-xs text-indigo-200">Total Fees</div>
                            <div className="text-xl font-bold text-orange-300">{formatCurrency(totalFees)}</div>
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
                                            ? 'border-indigo-600 text-indigo-600 bg-white'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                    <span className="ml-1 px-2 py-0.5 text-xs bg-gray-200 rounded-full">
                                        {tab.count}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Tab Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                            <span className="ml-3 text-gray-500">Loading data...</span>
                        </div>
                    ) : (
                        <>
                            {/* Holdings Tab */}
                            {activeTab === 'holdings' && (
                                <div className="space-y-4">
                                    {/* Date Filter */}
                                    <div className="flex items-center gap-4 mb-4">
                                        <label className="text-sm font-medium text-gray-700">As of Date:</label>
                                        <select
                                            value={dateFilter}
                                            onChange={(e) => setDateFilter(e.target.value)}
                                            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="all">All Dates</option>
                                            {holdingsDates.map(date => (
                                                <option key={date} value={date}>{formatDate(date)}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {filteredHoldings.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            No holdings data available
                                        </div>
                                    ) : (
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left font-medium text-gray-700">Security</th>
                                                    <th className="px-4 py-3 text-left font-medium text-gray-700">Asset Type</th>
                                                    <th className="px-4 py-3 text-right font-medium text-gray-700">Units</th>
                                                    <th className="px-4 py-3 text-right font-medium text-gray-700">Price</th>
                                                    <th className="px-4 py-3 text-right font-medium text-gray-700">Market Value</th>
                                                    <th className="px-4 py-3 text-right font-medium text-gray-700">Book Value</th>
                                                    <th className="px-4 py-3 text-right font-medium text-gray-700">Gain/Loss</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {filteredHoldings.map((holding, idx) => {
                                                    const gainLoss = (parseFloat(holding.market_value) || 0) - (parseFloat(holding.book_value) || 0);
                                                    return (
                                                        <tr key={holding.id || idx} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3">
                                                                <div className="font-medium text-gray-900">{holding.symbol}</div>
                                                                <div className="text-xs text-gray-500">{holding.security_name}</div>
                                                            </td>
                                                            <td className="px-4 py-3">
                                                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                                                                    {holding.asset_type || '-'}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right">{parseFloat(holding.units || 0).toFixed(4)}</td>
                                                            <td className="px-4 py-3 text-right">{formatCurrency(holding.price)}</td>
                                                            <td className="px-4 py-3 text-right font-medium">{formatCurrency(holding.market_value)}</td>
                                                            <td className="px-4 py-3 text-right">{formatCurrency(holding.book_value)}</td>
                                                            <td className={`px-4 py-3 text-right font-medium ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                {formatCurrency(gainLoss)}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {/* Transactions Tab */}
                            {activeTab === 'transactions' && (
                                <div className="space-y-4">
                                    {/* Filters */}
                                    <div className="flex items-center gap-4 mb-4">
                                        <label className="text-sm font-medium text-gray-700">Type:</label>
                                        <select
                                            value={transactionTypeFilter}
                                            onChange={(e) => setTransactionTypeFilter(e.target.value)}
                                            className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="all">All Types</option>
                                            {transactionTypes.map(type => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
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
                                                    <th className="px-4 py-3 text-left font-medium text-gray-700">Type</th>
                                                    <th className="px-4 py-3 text-left font-medium text-gray-700">Security</th>
                                                    <th className="px-4 py-3 text-right font-medium text-gray-700">Units</th>
                                                    <th className="px-4 py-3 text-right font-medium text-gray-700">Price</th>
                                                    <th className="px-4 py-3 text-right font-medium text-gray-700">Amount</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {filteredTransactions.map((txn, idx) => (
                                                    <tr key={txn.id || idx} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3">{formatDate(txn.transaction_date)}</td>
                                                        <td className="px-4 py-3">
                                                            <span className={`px-2 py-1 text-xs rounded ${txn.transaction_type?.includes('Buy') ? 'bg-green-100 text-green-800' :
                                                                    txn.transaction_type?.includes('Sell') ? 'bg-red-100 text-red-800' :
                                                                        txn.transaction_type?.includes('Dividend') ? 'bg-purple-100 text-purple-800' :
                                                                            'bg-gray-100 text-gray-800'
                                                                }`}>
                                                                {txn.transaction_type}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            <div className="font-medium">{txn.symbol || '-'}</div>
                                                            <div className="text-xs text-gray-500">{txn.security_name}</div>
                                                        </td>
                                                        <td className="px-4 py-3 text-right">{txn.units ? parseFloat(txn.units).toFixed(4) : '-'}</td>
                                                        <td className="px-4 py-3 text-right">{txn.price ? formatCurrency(txn.price) : '-'}</td>
                                                        <td className={`px-4 py-3 text-right font-medium ${parseFloat(txn.amount) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                            {formatCurrency(txn.amount)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            )}

                            {/* Fees & Cash Tab */}
                            {activeTab === 'fees' && (
                                <div className="space-y-4">
                                    {cashTransactions.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            No fee or cash transactions found
                                        </div>
                                    ) : (
                                        <>
                                            {/* Fee Summary */}
                                            <div className="grid grid-cols-3 gap-4 mb-6">
                                                <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                                                    <div className="text-sm text-orange-600">Total Fees</div>
                                                    <div className="text-2xl font-bold text-orange-700">{formatCurrency(totalFees)}</div>
                                                </div>
                                                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                                    <div className="text-sm text-green-600">Total Deposits</div>
                                                    <div className="text-2xl font-bold text-green-700">
                                                        {formatCurrency(cashTransactions.filter(t => t.transaction_type === 'Deposit').reduce((sum, t) => sum + (parseFloat(t.credit) || 0), 0))}
                                                    </div>
                                                </div>
                                                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                                                    <div className="text-sm text-red-600">Total Withdrawals</div>
                                                    <div className="text-2xl font-bold text-red-700">
                                                        {formatCurrency(cashTransactions.filter(t => t.transaction_type === 'Withdrawal').reduce((sum, t) => sum + (parseFloat(t.debit) || 0), 0))}
                                                    </div>
                                                </div>
                                            </div>

                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left font-medium text-gray-700">Date</th>
                                                        <th className="px-4 py-3 text-left font-medium text-gray-700">Description</th>
                                                        <th className="px-4 py-3 text-left font-medium text-gray-700">Type</th>
                                                        <th className="px-4 py-3 text-right font-medium text-gray-700">Debit</th>
                                                        <th className="px-4 py-3 text-right font-medium text-gray-700">Credit</th>
                                                        <th className="px-4 py-3 text-right font-medium text-gray-700">Balance</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y">
                                                    {cashTransactions.map((txn, idx) => (
                                                        <tr key={txn.id || idx} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3">{formatDate(txn.transaction_date)}</td>
                                                            <td className="px-4 py-3">{txn.description}</td>
                                                            <td className="px-4 py-3">
                                                                <span className={`px-2 py-1 text-xs rounded ${txn.transaction_type === 'Fee' ? 'bg-orange-100 text-orange-800' :
                                                                        txn.transaction_type === 'Deposit' ? 'bg-green-100 text-green-800' :
                                                                            txn.transaction_type === 'Withdrawal' ? 'bg-red-100 text-red-800' :
                                                                                'bg-gray-100 text-gray-800'
                                                                    }`}>
                                                                    {txn.transaction_type}
                                                                </span>
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-red-600">
                                                                {parseFloat(txn.debit) > 0 ? formatCurrency(txn.debit) : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right text-green-600">
                                                                {parseFloat(txn.credit) > 0 ? formatCurrency(txn.credit) : '-'}
                                                            </td>
                                                            <td className="px-4 py-3 text-right font-medium">
                                                                {txn.balance ? formatCurrency(txn.balance) : '-'}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-4 border-t bg-gray-50 flex justify-between">
                    <div className="text-sm text-gray-500">
                        Last updated: {formatDate(account.updated_at)}
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

export default InvestmentAccountDetailsModal;
