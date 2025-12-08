import React, { useState, useEffect, useMemo } from 'react';
import {
    transactionsDB,
    categoryDB,
    chartOfAccountsDB
} from '../../services/database';
import {
    PieChart,
    BarChart3,
    TrendingDown,
    Calendar,
    DollarSign,
    Loader,
    AlertCircle,
    Filter,
    ChevronDown,
    ArrowUpRight,
    ArrowDownRight,
    X,
    Edit2,
    Check,
    XCircle
} from 'lucide-react';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const ExpenseAnalysis = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(null); // null = all months
    const [viewMode, setViewMode] = useState('category'); // 'category' | 'monthly' | 'yoy'
    const [selectedCategory, setSelectedCategory] = useState(null); // For drill-down modal
    const [chartOfAccounts, setChartOfAccounts] = useState([]); // For COA dropdown
    const [editingTxnId, setEditingTxnId] = useState(null); // Transaction being edited
    const [editingCoaId, setEditingCoaId] = useState(null); // Selected COA for edit

    useEffect(() => {
        loadData();
    }, [selectedYear]);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('ExpenseAnalysis: Starting to load data...');

            // Load categories and chart of accounts first (for lookups)
            const cats = await categoryDB.getAll();
            console.log('ExpenseAnalysis: Categories loaded:', cats?.length);
            setCategories(cats || []);

            const coa = await chartOfAccountsDB.getAll();
            console.log('ExpenseAnalysis: Chart of Accounts loaded:', coa?.length);
            // Sort COA alphabetically by name
            const sortedCoa = (coa || []).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            setChartOfAccounts(sortedCoa);

            // Create lookup maps using supabase_id (original UUID) as the key
            // This is needed because transaction foreign keys reference original Supabase UUIDs
            const categoryMap = {};
            (cats || []).forEach(c => {
                if (c.supabase_id) categoryMap[c.supabase_id] = c;
                categoryMap[c.id] = c; // Also map by PocketBase ID for new records
            });

            const coaMap = {};
            (coa || []).forEach(c => {
                if (c.supabase_id) coaMap[c.supabase_id] = c;
                coaMap[c.id] = c; // Also map by PocketBase ID for new records
            });

            // Load transactions for the selected year
            const startDate = `${selectedYear}-01-01`;
            const endDate = `${selectedYear}-12-31`;
            console.log('ExpenseAnalysis: Loading transactions for', startDate, 'to', endDate);

            const allTxns = await transactionsDB.getAll();
            console.log('ExpenseAnalysis: All transactions loaded:', allTxns?.length);

            // Filter by date range and user
            const txns = (allTxns || []).filter(t => {
                return t.date >= startDate && t.date <= endDate;
            });

            // Enrich transactions with category and COA data
            const enrichedTxns = txns.map(t => ({
                ...t,
                category: categoryMap[t.category_id] || null,
                chart_of_account: coaMap[t.chart_of_account_id] || null
            }));

            // Sort by date descending
            enrichedTxns.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Debug: Log account types to understand data
            const accountTypes = [...new Set(enrichedTxns.map(t => t.chart_of_account?.account_type))];
            console.log('Available account_types:', accountTypes);
            console.log('Total transactions loaded:', enrichedTxns.length);
            console.log('Sample transaction:', enrichedTxns[0]);

            // Filter for expense transactions - only include those with Expense account type
            // Exclude Suspense, Transfer, and any non-expense account types
            const expenses = enrichedTxns.filter(t => {
                const accountType = t.chart_of_account?.account_type?.toLowerCase();
                const accountName = t.chart_of_account?.name?.toLowerCase();

                // Exclude Suspense account
                if (accountName === 'suspense') return false;

                // Exclude Transfer type (e.g., Credit Card Payments)
                if (accountType === 'transfer') return false;

                // Only include Expense account type
                return accountType === 'expense';
            });

            console.log('Filtered expense transactions:', expenses.length);

            setTransactions(expenses);

        } catch (err) {
            console.error('Error loading expense data:', err);
            setError('Failed to load expense data');
        } finally {
            setLoading(false);
        }
    };

    // Update transaction COA
    const updateTransactionCoa = async (txnId, newCoaId) => {
        try {
            // Find the COA by either PocketBase id or supabase_id
            const newCoa = chartOfAccounts.find(c => c.id === newCoaId || c.supabase_id === newCoaId);

            // Use supabase_id if available (for consistency with existing FK references), otherwise use PocketBase id
            const coaIdForTransaction = newCoa?.supabase_id || newCoaId;

            // Get the PocketBase ID for the transaction (it might be passed as supabase_id)
            const txnPbId = transactions.find(t => t.id === txnId || t.supabase_id === txnId)?.id || txnId;

            await transactionsDB.update(txnPbId, { chart_of_account_id: coaIdForTransaction });

            // Update local state
            setTransactions(prev => prev.map(t => {
                if (t.id === txnId || t.supabase_id === txnId) {
                    return {
                        ...t,
                        chart_of_account_id: coaIdForTransaction,
                        chart_of_account: newCoa
                    };
                }
                return t;
            }));

            setEditingTxnId(null);
            setEditingCoaId(null);
        } catch (err) {
            console.error('Error updating transaction COA:', err);
        }
    };

    // Cancel editing
    const cancelEdit = () => {
        setEditingTxnId(null);
        setEditingCoaId(null);
    };

    // Start editing a transaction
    const startEdit = (txn) => {
        setEditingTxnId(txn.id);
        setEditingCoaId(txn.chart_of_account_id);
    };

    // Calculate metrics
    const metrics = useMemo(() => {
        let filteredTxns = transactions;

        if (selectedMonth !== null) {
            filteredTxns = transactions.filter(t => {
                const month = new Date(t.date).getMonth();
                return month === selectedMonth;
            });
        }

        // Total expenses (absolute value)
        const totalExpenses = filteredTxns.reduce((sum, t) =>
            sum + Math.abs(parseFloat(t.amount) || 0), 0);

        // By category - use chart_of_account name for expense categorization
        const byCategory = {};
        filteredTxns.forEach(t => {
            // For expense report, use chart_of_account name as the category
            const catName = t.chart_of_account?.name || t.category?.name || 'Other';
            byCategory[catName] = (byCategory[catName] || 0) + Math.abs(parseFloat(t.amount) || 0);
        });

        // Sort by amount
        const sortedCategories = Object.entries(byCategory)
            .map(([name, amount]) => ({
                name,
                amount,
                percentage: totalExpenses > 0 ? (amount / totalExpenses * 100) : 0
            }))
            .sort((a, b) => b.amount - a.amount);

        // By month
        const byMonth = Array(12).fill(0);
        transactions.forEach(t => {
            const month = new Date(t.date).getMonth();
            byMonth[month] += Math.abs(parseFloat(t.amount) || 0);
        });

        // Average monthly
        const monthsWithData = byMonth.filter(m => m > 0).length;
        const avgMonthly = monthsWithData > 0 ? totalExpenses / monthsWithData : 0;

        // Top merchants
        const byMerchant = {};
        filteredTxns.forEach(t => {
            const merchant = t.raw_merchant_name || 'Unknown';
            byMerchant[merchant] = (byMerchant[merchant] || 0) + Math.abs(parseFloat(t.amount) || 0);
        });
        const topMerchants = Object.entries(byMerchant)
            .map(([name, amount]) => ({ name, amount }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 10);

        return {
            totalExpenses,
            avgMonthly,
            byCategory: sortedCategories,
            byMonth,
            topMerchants,
            transactionCount: filteredTxns.length
        };
    }, [transactions, selectedMonth]);

    // Generate colors for categories
    const categoryColors = [
        'bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
        'bg-pink-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500', 'bg-cyan-500'
    ];

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD'
        }).format(amount || 0);
    };

    // Get available years
    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
    }, []);

    // Calculate max bar height for chart
    const maxMonthlyExpense = Math.max(...metrics.byMonth, 1);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="ml-2 text-gray-400">Loading expense data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <TrendingDown className="w-7 h-7 text-red-400" />
                        Expense Analysis
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Understand where your money goes
                    </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3">
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        {availableYears.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                    <select
                        value={selectedMonth ?? ''}
                        onChange={(e) => setSelectedMonth(e.target.value === '' ? null : parseInt(e.target.value))}
                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Months</option>
                        {MONTHS.map((month, idx) => (
                            <option key={idx} value={idx}>{month}</option>
                        ))}
                    </select>
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2 text-red-200">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Total Expenses</p>
                            <p className="text-2xl font-bold text-red-400 mt-1">
                                {formatCurrency(metrics.totalExpenses)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-red-400" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        {selectedMonth !== null ? MONTHS[selectedMonth] : 'Year'} {selectedYear}
                    </p>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Monthly Average</p>
                            <p className="text-2xl font-bold text-yellow-400 mt-1">
                                {formatCurrency(metrics.avgMonthly)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-yellow-400" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        Per month average
                    </p>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Transactions</p>
                            <p className="text-2xl font-bold text-blue-400 mt-1">
                                {metrics.transactionCount}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <BarChart3 className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        Expense transactions
                    </p>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Bar Chart */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-indigo-400" />
                        Monthly Expenses
                    </h2>
                    <div className="flex items-end justify-between gap-1" style={{ height: '192px' }}>
                        {metrics.byMonth.map((amount, idx) => {
                            const barHeight = maxMonthlyExpense > 0
                                ? Math.max((amount / maxMonthlyExpense) * 160, amount > 0 ? 4 : 0)
                                : 0;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                                    <div
                                        className={`w-full rounded-t transition-all cursor-pointer hover:opacity-80 ${selectedMonth === idx ? 'bg-indigo-500' : 'bg-indigo-500/60'
                                            }`}
                                        style={{
                                            height: `${barHeight}px`,
                                        }}
                                        onClick={() => setSelectedMonth(selectedMonth === idx ? null : idx)}
                                        title={`${MONTHS[idx]}: ${formatCurrency(amount)}`}
                                    />
                                    <span className="text-xs text-gray-500 mt-1">
                                        {MONTHS[idx].substring(0, 1)}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-sm text-gray-400">
                            Click a bar to filter by month
                        </p>
                    </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-green-400" />
                        By Category
                    </h2>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {metrics.byCategory.slice(0, 10).map((cat, idx) => (
                            <div key={cat.name} className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${categoryColors[idx % categoryColors.length]}`} />
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm text-gray-300 truncate">{cat.name}</span>
                                        <span className="text-sm font-medium text-white">
                                            {formatCurrency(cat.amount)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${categoryColors[idx % categoryColors.length]}`}
                                            style={{ width: `${cat.percentage}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 w-12 text-right">
                                    {cat.percentage.toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Top Merchants */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-white mb-4">
                    Top 10 Merchants
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {metrics.topMerchants.map((merchant, idx) => (
                        <div
                            key={merchant.name}
                            className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                        >
                            <div className="flex items-center gap-3">
                                <span className="text-lg font-bold text-gray-500">#{idx + 1}</span>
                                <span className="text-gray-300 truncate max-w-[200px]">
                                    {merchant.name}
                                </span>
                            </div>
                            <span className="text-red-400 font-medium">
                                {formatCurrency(merchant.amount)}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Detailed Category Table */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-white mb-4">
                    All Categories
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-400">Category</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-400">Amount</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-400">% of Total</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-400">Distribution</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {metrics.byCategory.map((cat, idx) => (
                                <tr
                                    key={cat.name}
                                    className="hover:bg-gray-700/30 cursor-pointer"
                                    onClick={() => setSelectedCategory(cat.name)}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${categoryColors[idx % categoryColors.length]}`} />
                                            <span className="text-gray-300 hover:text-indigo-400">{cat.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-white font-medium">
                                        {formatCurrency(cat.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-400">
                                        {cat.percentage.toFixed(1)}%
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${categoryColors[idx % categoryColors.length]}`}
                                                style={{ width: `${cat.percentage}%` }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-700/30">
                            <tr>
                                <td className="px-4 py-3 font-medium text-white">Total</td>
                                <td className="px-4 py-3 text-right font-bold text-red-400">
                                    {formatCurrency(metrics.totalExpenses)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-400">100%</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Category Transactions Modal */}
            {selectedCategory && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedCategory(null)}>
                    <div
                        className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[80vh] overflow-hidden m-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-700">
                            <div>
                                <h3 className="text-lg font-semibold text-white">{selectedCategory}</h3>
                                <p className="text-sm text-gray-400">
                                    {transactions.filter(t => (t.chart_of_account?.name || t.category?.name || 'Other') === selectedCategory).length} transactions
                                    {selectedMonth !== null ? ` in ${MONTHS[selectedMonth]}` : ''} {selectedYear}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedCategory(null)}
                                className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-gray-400" />
                            </button>
                        </div>

                        {/* Modal Body - Transaction List */}
                        <div className="overflow-y-auto max-h-[calc(80vh-120px)]">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-700/50 sticky top-0">
                                    <tr>
                                        <th className="px-4 py-3 text-left font-medium text-gray-400">Date</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-400">Description</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-400">Merchant</th>
                                        <th className="px-4 py-3 text-left font-medium text-gray-400">COA</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-400">Amount</th>
                                        <th className="px-4 py-3 text-center font-medium text-gray-400 w-20">Edit</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {transactions
                                        .filter(t => {
                                            const catName = t.chart_of_account?.name || t.category?.name || 'Other';
                                            if (catName !== selectedCategory) return false;
                                            if (selectedMonth !== null) {
                                                const month = new Date(t.date).getMonth();
                                                return month === selectedMonth;
                                            }
                                            return true;
                                        })
                                        .sort((a, b) => new Date(b.date) - new Date(a.date))
                                        .map(txn => (
                                            <tr key={txn.id} className="hover:bg-gray-700/30">
                                                <td className="px-4 py-3 text-gray-300 whitespace-nowrap">
                                                    {new Date(txn.date).toLocaleDateString('en-CA')}
                                                </td>
                                                <td className="px-4 py-3 text-gray-300 max-w-xs truncate" title={txn.description}>
                                                    {txn.description}
                                                </td>
                                                <td className="px-4 py-3 text-gray-400">
                                                    {txn.raw_merchant_name || '-'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {editingTxnId === txn.id ? (
                                                        <select
                                                            value={editingCoaId || ''}
                                                            onChange={(e) => setEditingCoaId(e.target.value)}
                                                            className="w-full px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white focus:ring-2 focus:ring-indigo-500"
                                                            autoFocus
                                                        >
                                                            <option value="">Select COA...</option>
                                                            {chartOfAccounts
                                                                .filter(c => c.account_type?.toLowerCase() === 'expense')
                                                                .map(coa => (
                                                                    <option key={coa.id} value={coa.id}>
                                                                        {coa.name}
                                                                    </option>
                                                                ))
                                                            }
                                                        </select>
                                                    ) : (
                                                        <span className="text-indigo-400">
                                                            {txn.chart_of_account?.name || '-'}
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right text-red-400 font-medium whitespace-nowrap">
                                                    {formatCurrency(Math.abs(parseFloat(txn.amount)))}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {editingTxnId === txn.id ? (
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                onClick={() => updateTransactionCoa(txn.id, editingCoaId)}
                                                                className="p-1 hover:bg-green-600/20 rounded text-green-400"
                                                                title="Save"
                                                                disabled={!editingCoaId}
                                                            >
                                                                <Check className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={cancelEdit}
                                                                className="p-1 hover:bg-red-600/20 rounded text-red-400"
                                                                title="Cancel"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => startEdit(txn)}
                                                            className="p-1 hover:bg-gray-600 rounded text-gray-400 hover:text-white"
                                                            title="Edit COA"
                                                        >
                                                            <Edit2 className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                                <tfoot className="bg-gray-700/30">
                                    <tr>
                                        <td colSpan="4" className="px-4 py-3 font-medium text-white">Total</td>
                                        <td className="px-4 py-3 text-right font-bold text-red-400">
                                            {formatCurrency(
                                                transactions
                                                    .filter(t => {
                                                        const catName = t.chart_of_account?.name || t.category?.name || 'Other';
                                                        if (catName !== selectedCategory) return false;
                                                        if (selectedMonth !== null) {
                                                            const month = new Date(t.date).getMonth();
                                                            return month === selectedMonth;
                                                        }
                                                        return true;
                                                    })
                                                    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0)
                                            )}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ExpenseAnalysis;
