import React, { useState, useEffect, useMemo } from 'react';
import {
    transactionsDB,
    categoryDB,
    chartOfAccountsDB,
    accountsDB
} from '../../services/database';
import { getBaseCountry } from '../../services/settingsService';
import {
    TrendingUp,
    Calendar,
    DollarSign,
    Loader,
    AlertCircle,
    Briefcase,
    PiggyBank,
    BarChart3,
    X,
    Home,
    Building2,
    Coins
} from 'lucide-react';

const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Income categories - these indicate income (positive cash flow)
const INCOME_INDICATORS = [
    'salary', 'wage', 'income', 'deposit', 'transfer in', 'refund',
    'dividend', 'interest', 'rental', 'payment received', 'payroll'
];

export const IncomeAnalysis = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [selectedMonth, setSelectedMonth] = useState(null);
    const [selectedCountry, setSelectedCountry] = useState(null); // null until initialized
    const [availableCountries, setAvailableCountries] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [selectedSource, setSelectedSource] = useState(null); // For drill-down modal
    const [initialized, setInitialized] = useState(false);

    // Initialize with base country from settings
    useEffect(() => {
        const initCountry = async () => {
            const accts = await accountsDB.getAll();
            const countries = [...new Set((accts || []).map(a => a.country).filter(Boolean))].sort();
            setAvailableCountries(countries);
            setAccounts(accts || []);

            // Get base country from settings, fallback to first available
            const baseCountry = getBaseCountry();
            if (baseCountry && countries.includes(baseCountry)) {
                setSelectedCountry(baseCountry);
            } else if (countries.length > 0) {
                setSelectedCountry(countries[0]);
            } else {
                setSelectedCountry('all');
            }
            setInitialized(true);
        };
        initCountry();
    }, []);

    useEffect(() => {
        if (initialized) {
            loadData();
        }
    }, [selectedYear, selectedCountry, initialized]);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Get account IDs for selected country
            let countryAccountIds = null;
            if (selectedCountry && selectedCountry !== 'all') {
                countryAccountIds = new Set(
                    accounts
                        .filter(a => a.country === selectedCountry)
                        .map(a => a.id)
                );
            }

            // Load categories and chart of accounts first (for lookups)
            const cats = await categoryDB.getAll();
            const coa = await chartOfAccountsDB.getAll();

            // Create lookup maps using supabase_id (original UUID) as the key
            // This is needed because transaction foreign keys reference original Supabase UUIDs
            const categoryMap = {};
            (cats || []).forEach(c => {
                if (c.supabase_id) categoryMap[c.supabase_id] = c;
                categoryMap[c.id] = c;
            });

            const coaMap = {};
            (coa || []).forEach(c => {
                if (c.supabase_id) coaMap[c.supabase_id] = c;
                coaMap[c.id] = c;
            });

            // Load transactions for the selected year
            const startDate = `${selectedYear}-01-01`;
            const endDate = `${selectedYear}-12-31`;

            const allTxns = await transactionsDB.getAll();

            // Filter by date range and optionally by country
            const txns = (allTxns || []).filter(t => {
                if (t.date < startDate || t.date > endDate) return false;
                if (countryAccountIds && t.account_id) {
                    if (!countryAccountIds.has(t.account_id)) return false;
                }
                return true;
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
            console.log('Income - Available account_types:', accountTypes);
            console.log('Income - Total transactions loaded:', enrichedTxns.length);

            // Filter for income transactions - only include those with Income account type
            // Exclude Suspense, Transfer, and any non-income account types
            const income = enrichedTxns.filter(t => {
                const accountType = t.chart_of_account?.account_type?.toLowerCase();
                const accountName = t.chart_of_account?.name?.toLowerCase();

                // Exclude Suspense account
                if (accountName === 'suspense') return false;

                // Exclude Transfer type (e.g., Credit Card Payments)
                if (accountType === 'transfer') return false;

                // Only include Income account type
                return accountType === 'income';
            });

            console.log('Income - Filtered income transactions:', income.length);

            setTransactions(income);
        } catch (err) {
            console.error('Error loading income data:', err);
            setError('Failed to load income data');
        } finally {
            setLoading(false);
        }
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

        // Total income
        const totalIncome = filteredTxns.reduce((sum, t) =>
            sum + Math.abs(parseFloat(t.amount) || 0), 0);

        // By source - use chart_of_account name for income categorization
        const bySource = {};
        filteredTxns.forEach(t => {
            // For income report, use chart_of_account name as the source
            const source = t.chart_of_account?.name || t.category?.name || 'Other Income';
            bySource[source] = (bySource[source] || 0) + Math.abs(parseFloat(t.amount) || 0);
        });

        // Sort by amount
        const sortedSources = Object.entries(bySource)
            .map(([name, amount]) => ({
                name,
                amount,
                percentage: totalIncome > 0 ? (amount / totalIncome * 100) : 0
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
        const avgMonthly = monthsWithData > 0 ? totalIncome / monthsWithData : 0;

        // Group by type (guess based on category names)
        const incomeTypes = {
            'Employment': 0,
            'Investments': 0,
            'Business': 0,
            'Rental': 0,
            'Other': 0
        };

        filteredTxns.forEach(t => {
            const source = (t.category?.name || t.chart_of_account?.name || t.raw_merchant_name || '').toLowerCase();
            const amount = Math.abs(parseFloat(t.amount) || 0);

            if (source.includes('salary') || source.includes('wage') || source.includes('payroll')) {
                incomeTypes['Employment'] += amount;
            } else if (source.includes('dividend') || source.includes('interest') || source.includes('investment')) {
                incomeTypes['Investments'] += amount;
            } else if (source.includes('business') || source.includes('self-employ')) {
                incomeTypes['Business'] += amount;
            } else if (source.includes('rental') || source.includes('rent')) {
                incomeTypes['Rental'] += amount;
            } else {
                incomeTypes['Other'] += amount;
            }
        });

        return {
            totalIncome,
            avgMonthly,
            bySource: sortedSources,
            byMonth,
            incomeTypes,
            transactionCount: filteredTxns.length
        };
    }, [transactions, selectedMonth]);

    // Country to currency/locale mapping
    const countryCurrencyMap = {
        'Canada': { currency: 'CAD', locale: 'en-CA' },
        'India': { currency: 'INR', locale: 'en-IN' },
        'USA': { currency: 'USD', locale: 'en-US' },
        'United States': { currency: 'USD', locale: 'en-US' },
        'UK': { currency: 'GBP', locale: 'en-GB' },
        'United Kingdom': { currency: 'GBP', locale: 'en-GB' },
        'Australia': { currency: 'AUD', locale: 'en-AU' },
        'default': { currency: 'USD', locale: 'en-US' }
    };

    const formatCurrency = (amount) => {
        const countryConfig = countryCurrencyMap[selectedCountry] || countryCurrencyMap['default'];
        return new Intl.NumberFormat(countryConfig.locale, {
            style: 'currency',
            currency: countryConfig.currency
        }).format(amount || 0);
    };

    const availableYears = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
    }, []);

    const maxMonthlyIncome = Math.max(...metrics.byMonth, 1);

    const sourceColors = [
        'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-blue-500',
        'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500'
    ];

    const typeIcons = {
        'Employment': <Briefcase className="w-5 h-5" />,
        'Investments': <TrendingUp className="w-5 h-5" />,
        'Business': <DollarSign className="w-5 h-5" />,
        'Rental': <PiggyBank className="w-5 h-5" />,
        'Other': <BarChart3 className="w-5 h-5" />
    };

    const typeColors = {
        'Employment': 'text-blue-400 bg-blue-500/20',
        'Investments': 'text-green-400 bg-green-500/20',
        'Business': 'text-purple-400 bg-purple-500/20',
        'Rental': 'text-yellow-400 bg-yellow-500/20',
        'Other': 'text-gray-400 bg-gray-500/20'
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="ml-2 text-gray-400">Loading income data...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <TrendingUp className="w-7 h-7 text-green-400" />
                        Income Analysis
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Track your income sources and trends
                    </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-3 flex-wrap">
                    <select
                        value={selectedCountry || ''}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        {availableCountries.map(country => (
                            <option key={country} value={country}>{country}</option>
                        ))}
                    </select>
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
                            <p className="text-gray-400 text-sm">Total Income</p>
                            <p className="text-2xl font-bold text-green-400 mt-1">
                                {formatCurrency(metrics.totalIncome)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                            <TrendingUp className="w-6 h-6 text-green-400" />
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
                            <p className="text-2xl font-bold text-blue-400 mt-1">
                                {formatCurrency(metrics.avgMonthly)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-blue-400" />
                        </div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                        Per month average
                    </p>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <p className="text-gray-400 text-sm mb-3">Income Breakdown</p>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                                    <Briefcase className="w-3 h-3 text-blue-400" />
                                </div>
                                <span className="text-gray-300 text-xs">Salary</span>
                            </div>
                            <span className="text-blue-400 font-semibold text-sm">
                                {formatCurrency(metrics.incomeTypes['Employment'])}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center">
                                    <Home className="w-3 h-3 text-green-400" />
                                </div>
                                <span className="text-gray-300 text-xs">Rental</span>
                            </div>
                            <span className="text-green-400 font-semibold text-sm">
                                {formatCurrency(metrics.incomeTypes['Rental'])}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-purple-500/20 rounded-full flex items-center justify-center">
                                    <TrendingUp className="w-3 h-3 text-purple-400" />
                                </div>
                                <span className="text-gray-300 text-xs">Investment</span>
                            </div>
                            <span className="text-purple-400 font-semibold text-sm">
                                {formatCurrency(metrics.incomeTypes['Investments'])}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 bg-gray-500/20 rounded-full flex items-center justify-center">
                                    <Coins className="w-3 h-3 text-gray-400" />
                                </div>
                                <span className="text-gray-300 text-xs">Other</span>
                            </div>
                            <span className="text-gray-400 font-semibold text-sm">
                                {formatCurrency(metrics.incomeTypes['Other'] + metrics.incomeTypes['Business'])}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Income by Type */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-white mb-4">Income by Type</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    {Object.entries(metrics.incomeTypes).map(([type, amount]) => (
                        <div
                            key={type}
                            className="p-4 bg-gray-700/50 rounded-lg text-center"
                        >
                            <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center ${typeColors[type]}`}>
                                {typeIcons[type]}
                            </div>
                            <p className="text-gray-400 text-sm mt-2">{type}</p>
                            <p className="text-white font-semibold mt-1">
                                {formatCurrency(amount)}
                            </p>
                            {metrics.totalIncome > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                    {((amount / metrics.totalIncome) * 100).toFixed(1)}%
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Bar Chart */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-green-400" />
                        Monthly Income
                    </h2>
                    <div className="flex items-end justify-between gap-1" style={{ height: '192px' }}>
                        {metrics.byMonth.map((amount, idx) => {
                            const barHeight = maxMonthlyIncome > 0
                                ? Math.max((amount / maxMonthlyIncome) * 160, amount > 0 ? 4 : 0)
                                : 0;
                            return (
                                <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full">
                                    <div
                                        className={`w-full rounded-t transition-all cursor-pointer hover:opacity-80 ${selectedMonth === idx ? 'bg-green-500' : 'bg-green-500/60'
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

                {/* Income Sources */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4">
                        Income Sources
                    </h2>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                        {metrics.bySource.slice(0, 10).map((source, idx) => (
                            <div
                                key={source.name}
                                className="flex items-center gap-3 cursor-pointer hover:bg-gray-700/50 p-2 rounded-lg transition-colors"
                                onClick={() => setSelectedSource(source.name)}
                            >
                                <div className={`w-3 h-3 rounded-full ${sourceColors[idx % sourceColors.length]}`} />
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm text-gray-300 truncate">{source.name}</span>
                                        <span className="text-sm font-medium text-white">
                                            {formatCurrency(source.amount)}
                                        </span>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${sourceColors[idx % sourceColors.length]}`}
                                            style={{ width: `${source.percentage}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 w-12 text-right">
                                    {source.percentage.toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-3 text-center">Click a source to see details</p>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-white mb-4">
                    All Income Sources
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-400">Source</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-400">Amount</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-400">% of Total</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-400">Distribution</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {metrics.bySource.map((source, idx) => (
                                <tr
                                    key={source.name}
                                    className="hover:bg-gray-700/30 cursor-pointer"
                                    onClick={() => setSelectedSource(source.name)}
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${sourceColors[idx % sourceColors.length]}`} />
                                            <span className="text-gray-300">{source.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-white font-medium">
                                        {formatCurrency(source.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-400">
                                        {source.percentage.toFixed(1)}%
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="w-full bg-gray-700 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full ${sourceColors[idx % sourceColors.length]}`}
                                                style={{ width: `${source.percentage}%` }}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-700/30">
                            <tr>
                                <td className="px-4 py-3 font-medium text-white">Total</td>
                                <td className="px-4 py-3 text-right font-bold text-green-400">
                                    {formatCurrency(metrics.totalIncome)}
                                </td>
                                <td className="px-4 py-3 text-right text-gray-400">100%</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* Income Source Transactions Modal */}
            {selectedSource && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setSelectedSource(null)}>
                    <div
                        className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-4xl max-h-[80vh] overflow-hidden m-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between p-4 border-b border-gray-700">
                            <div>
                                <h3 className="text-lg font-semibold text-white">{selectedSource}</h3>
                                <p className="text-sm text-gray-400">
                                    {transactions.filter(t => (t.chart_of_account?.name || t.category?.name || 'Other Income') === selectedSource).length} transactions
                                    {selectedMonth !== null ? ` in ${MONTHS[selectedMonth]}` : ''} {selectedYear}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedSource(null)}
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
                                        <th className="px-4 py-3 text-left font-medium text-gray-400">Source</th>
                                        <th className="px-4 py-3 text-right font-medium text-gray-400">Amount</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-700">
                                    {transactions
                                        .filter(t => {
                                            const sourceName = t.chart_of_account?.name || t.category?.name || 'Other Income';
                                            if (sourceName !== selectedSource) return false;
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
                                                    {txn.description || txn.raw_merchant_name || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-400">
                                                    {txn.chart_of_account?.name || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-right text-green-400 font-medium whitespace-nowrap">
                                                    {formatCurrency(Math.abs(parseFloat(txn.amount)))}
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                                <tfoot className="bg-gray-700/30">
                                    <tr>
                                        <td colSpan="3" className="px-4 py-3 font-medium text-white">Total</td>
                                        <td className="px-4 py-3 text-right font-bold text-green-400">
                                            {formatCurrency(
                                                transactions
                                                    .filter(t => {
                                                        const sourceName = t.chart_of_account?.name || t.category?.name || 'Other Income';
                                                        if (sourceName !== selectedSource) return false;
                                                        if (selectedMonth !== null) {
                                                            const month = new Date(t.date).getMonth();
                                                            return month === selectedMonth;
                                                        }
                                                        return true;
                                                    })
                                                    .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0)
                                            )}
                                        </td>
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

export default IncomeAnalysis;
