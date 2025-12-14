
import React, { useEffect, useState, useMemo } from 'react';
import { TrendingUp, PiggyBank, Globe, Calendar, Briefcase, Home, Coins, ShoppingCart } from 'lucide-react';
import { accountsDB, transactionsDB, chartOfAccountsDB } from '../services/database';

// Country to currency/locale mapping
const countryCurrencyMap = {
    'Canada': { currency: 'CAD', locale: 'en-CA', symbol: 'C$' },
    'India': { currency: 'INR', locale: 'en-IN', symbol: '₹' },
    'USA': { currency: 'USD', locale: 'en-US', symbol: '$' },
    'United States': { currency: 'USD', locale: 'en-US', symbol: '$' },
    'UK': { currency: 'GBP', locale: 'en-GB', symbol: '£' },
    'United Kingdom': { currency: 'GBP', locale: 'en-GB', symbol: '£' },
    'Australia': { currency: 'AUD', locale: 'en-AU', symbol: 'A$' },
    'Malaysia': { currency: 'MYR', locale: 'en-MY', symbol: 'RM' },
    'Singapore': { currency: 'SGD', locale: 'en-SG', symbol: 'S$' },
    'default': { currency: 'USD', locale: 'en-US', symbol: '$' }
};

const formatCurrencyForCountry = (amount, country) => {
    const config = countryCurrencyMap[country] || countryCurrencyMap['default'];
    return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
};

export const Analytics = () => {
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [chartOfAccounts, setChartOfAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

    // Generate year options (current year and 5 years back)
    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 6 }, (_, i) => currentYear - i);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const accs = await accountsDB.getAll();
            setAccounts(accs || []);
            const txns = await transactionsDB.getAll();
            setTransactions(txns || []);
            const coa = await chartOfAccountsDB.getAll();
            setChartOfAccounts(coa || []);
            setLoading(false);
        };
        fetchData();
    }, []);

    // Create chart of accounts lookup map
    const coaMap = useMemo(() => {
        const map = {};
        chartOfAccounts.forEach(c => {
            if (c.supabase_id) map[c.supabase_id] = c;
            map[c.id] = c;
        });
        return map;
    }, [chartOfAccounts]);

    // Group data by country with proper income/expense classification
    const countryData = useMemo(() => {
        const countries = [...new Set(accounts.map(a => a.country).filter(Boolean))];
        const startDate = `${selectedYear}-01-01`;
        const endDate = `${selectedYear}-12-31`;

        return countries.map(country => {
            const countryAccounts = accounts.filter(a => a.country === country);
            const accountIds = new Set(countryAccounts.map(a => a.id));

            // Filter transactions by country accounts and year
            const countryTransactions = transactions.filter(t => {
                if (!t.date || t.date < startDate || t.date > endDate) return false;
                return accountIds.has(t.account_id);
            });

            // Enrich with chart of accounts data
            const enrichedTxns = countryTransactions.map(t => ({
                ...t,
                chart_of_account: coaMap[t.chart_of_account_id] || null
            }));

            // Calculate income - only transactions with account_type === 'Income'
            // Exclude Suspense and Transfer
            const incomeTxns = enrichedTxns.filter(t => {
                const accountType = t.chart_of_account?.account_type?.toLowerCase();
                const accountName = t.chart_of_account?.name?.toLowerCase();
                if (accountName === 'suspense') return false;
                if (accountType === 'transfer') return false;
                return accountType === 'income';
            });
            const totalIncome = incomeTxns.reduce((sum, t) =>
                sum + Math.abs(parseFloat(t.amount) || 0), 0);

            // Income breakdown by type
            const incomeBreakdown = {
                salary: 0,
                rental: 0,
                investment: 0,
                other: 0
            };
            incomeTxns.forEach(t => {
                const source = (t.chart_of_account?.name || '').toLowerCase();
                const amount = Math.abs(parseFloat(t.amount) || 0);
                if (source.includes('salary') || source.includes('wage') || source.includes('payroll') || source.includes('employment')) {
                    incomeBreakdown.salary += amount;
                } else if (source.includes('rental') || source.includes('rent')) {
                    incomeBreakdown.rental += amount;
                } else if (source.includes('dividend') || source.includes('interest') || source.includes('investment')) {
                    incomeBreakdown.investment += amount;
                } else {
                    incomeBreakdown.other += amount;
                }
            });

            // Calculate expenses - only transactions with account_type === 'Expense'
            // Exclude Suspense and Transfer
            const expenseTxns = enrichedTxns.filter(t => {
                const accountType = t.chart_of_account?.account_type?.toLowerCase();
                const accountName = t.chart_of_account?.name?.toLowerCase();
                if (accountName === 'suspense') return false;
                if (accountType === 'transfer') return false;
                return accountType === 'expense';
            });
            const totalExpenses = expenseTxns.reduce((sum, t) =>
                sum + Math.abs(parseFloat(t.amount) || 0), 0);

            // Expense breakdown: Mortgage vs Non-Mortgage
            let mortgageExpenses = 0;
            let nonMortgageExpenses = 0;
            expenseTxns.forEach(t => {
                const coaName = (t.chart_of_account?.name || '').toLowerCase();
                const amount = Math.abs(parseFloat(t.amount) || 0);
                if (coaName.includes('mortgage')) {
                    mortgageExpenses += amount;
                } else {
                    nonMortgageExpenses += amount;
                }
            });

            const netSavings = totalIncome - totalExpenses;

            return {
                country,
                accounts: countryAccounts,
                totalIncome,
                totalExpenses,
                netSavings,
                incomeBreakdown,
                mortgageExpenses,
                nonMortgageExpenses,
                config: countryCurrencyMap[country] || countryCurrencyMap['default']
            };
        }).sort((a, b) => b.totalIncome - a.totalIncome);
    }, [accounts, transactions, coaMap, selectedYear]);

    if (loading) {
        return <div className="text-center py-12 text-gray-400">Loading analytics...</div>;
    }

    if (countryData.length === 0) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
                    <p className="text-gray-400">Visualize your financial data and track your progress</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-8 text-center">
                    <Globe className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400">No accounts found. Add accounts with country information to see analytics.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header with Year Selector */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
                    <p className="text-gray-400">Financial overview by country - each in its own currency</p>
                </div>
                <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        {yearOptions.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Render a section for each country */}
            {countryData.map(({ country, totalIncome, totalExpenses, netSavings, incomeBreakdown, mortgageExpenses, nonMortgageExpenses, config }) => (
                <div key={country} className="space-y-4">
                    {/* Country Header */}
                    <div className="flex items-center gap-3 border-b border-gray-700 pb-2">
                        <Globe className="w-6 h-6 text-indigo-400" />
                        <h2 className="text-xl font-bold text-white">{country}</h2>
                        <span className="text-sm text-gray-400">({config.currency})</span>
                    </div>

                    {/* Overview Cards - 2 columns with breakdowns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Income Card with Breakdown */}
                        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-gray-400 text-sm">Total Income</p>
                                    <p className="text-2xl font-bold text-green-400 mt-1">
                                        {formatCurrencyForCountry(totalIncome, country)}
                                    </p>
                                </div>
                                <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-green-400" />
                                </div>
                            </div>
                            <div className="border-t border-gray-700 pt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Briefcase className="w-3 h-3 text-blue-400" />
                                        <span className="text-gray-400 text-xs">Salary</span>
                                    </div>
                                    <span className="text-blue-400 text-xs font-medium">
                                        {formatCurrencyForCountry(incomeBreakdown.salary, country)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Home className="w-3 h-3 text-green-400" />
                                        <span className="text-gray-400 text-xs">Rental</span>
                                    </div>
                                    <span className="text-green-400 text-xs font-medium">
                                        {formatCurrencyForCountry(incomeBreakdown.rental, country)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp className="w-3 h-3 text-purple-400" />
                                        <span className="text-gray-400 text-xs">Investment</span>
                                    </div>
                                    <span className="text-purple-400 text-xs font-medium">
                                        {formatCurrencyForCountry(incomeBreakdown.investment, country)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Coins className="w-3 h-3 text-gray-400" />
                                        <span className="text-gray-400 text-xs">Other</span>
                                    </div>
                                    <span className="text-gray-400 text-xs font-medium">
                                        {formatCurrencyForCountry(incomeBreakdown.other, country)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Expenses Card with Breakdown */}
                        <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <p className="text-gray-400 text-sm">Total Expenses</p>
                                    <p className="text-2xl font-bold text-red-400 mt-1">
                                        {formatCurrencyForCountry(totalExpenses, country)}
                                    </p>
                                </div>
                                <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                                    <TrendingUp className="w-5 h-5 text-red-400 rotate-180" />
                                </div>
                            </div>
                            <div className="border-t border-gray-700 pt-3 space-y-2">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Home className="w-3 h-3 text-blue-400" />
                                        <span className="text-gray-400 text-xs">Mortgage</span>
                                    </div>
                                    <span className="text-blue-400 text-xs font-medium">
                                        {formatCurrencyForCountry(mortgageExpenses, country)}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShoppingCart className="w-3 h-3 text-orange-400" />
                                        <span className="text-gray-400 text-xs">Non-Mortgage</span>
                                    </div>
                                    <span className="text-orange-400 text-xs font-medium">
                                        {formatCurrencyForCountry(nonMortgageExpenses, country)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Net Savings */}
                    <div className="bg-gray-800 rounded-lg p-5 border border-gray-700">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-gray-400 text-sm">Net Savings</p>
                                <p className={`text-2xl font-bold mt-1 ${netSavings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrencyForCountry(netSavings, country)}
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Year {selectedYear}</p>
                            </div>
                            <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                                <PiggyBank className="w-5 h-5 text-purple-400" />
                            </div>
                        </div>
                        {/* Progress bar showing savings rate */}
                        {totalIncome > 0 && (
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-gray-500 mb-1">
                                    <span>Savings Rate</span>
                                    <span>{((netSavings / totalIncome) * 100).toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-700 rounded-full h-2">
                                    <div
                                        className={`h-2 rounded-full ${netSavings >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
                                        style={{ width: `${Math.min(Math.abs((netSavings / totalIncome) * 100), 100)}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};
