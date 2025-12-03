import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import {
    TrendingUp,
    Calendar,
    DollarSign,
    Loader,
    AlertCircle,
    PieChart,
    BarChart3,
    Wallet,
    Building2,
    ArrowUpRight,
    ArrowDownRight
} from 'lucide-react';

export const InvestmentGrowth = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [holdings, setHoldings] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [selectedAccountType, setSelectedAccountType] = useState('all');

    useEffect(() => {
        if (user) {
            loadData();
        }
    }, [user]);

    const loadData = async () => {
        setLoading(true);
        setError(null);

        try {
            // Load accounts
            const { data: accts, error: acctError } = await supabase
                .from('investment_accounts')
                .select('*')
                .eq('user_id', user.id);

            if (acctError) throw acctError;
            setAccounts(accts || []);

            // Load latest holdings for each account
            const { data: holdingsData, error: holdingsError } = await supabase
                .from('holdings')
                .select(`
                    *,
                    investment_accounts!inner(
                        id,
                        account_type,
                        institution,
                        display_name
                    )
                `)
                .eq('user_id', user.id)
                .order('as_of_date', { ascending: false });

            if (holdingsError) throw holdingsError;

            // Get latest holdings per symbol per account
            const latestHoldings = {};
            (holdingsData || []).forEach(h => {
                const key = `${h.account_id}-${h.symbol}`;
                if (!latestHoldings[key]) {
                    latestHoldings[key] = h;
                }
            });

            setHoldings(Object.values(latestHoldings));
        } catch (err) {
            console.error('Error loading investment data:', err);
            setError('Failed to load investment data');
        } finally {
            setLoading(false);
        }
    };

    // Calculate metrics
    const metrics = useMemo(() => {
        let filteredHoldings = holdings;

        if (selectedAccountType !== 'all') {
            filteredHoldings = holdings.filter(h =>
                h.investment_accounts?.account_type === selectedAccountType
            );
        }

        // Total values
        const totalMarketValue = filteredHoldings.reduce((sum, h) =>
            sum + (parseFloat(h.market_value) || 0), 0);
        const totalBookValue = filteredHoldings.reduce((sum, h) =>
            sum + (parseFloat(h.book_value) || 0), 0);
        const totalGainLoss = totalMarketValue - totalBookValue;
        const overallReturn = totalBookValue > 0 ? ((totalGainLoss / totalBookValue) * 100) : 0;

        // By account type
        const byAccountType = {};
        filteredHoldings.forEach(h => {
            const type = h.investment_accounts?.account_type || 'Unknown';
            if (!byAccountType[type]) {
                byAccountType[type] = { marketValue: 0, bookValue: 0, count: 0 };
            }
            byAccountType[type].marketValue += parseFloat(h.market_value) || 0;
            byAccountType[type].bookValue += parseFloat(h.book_value) || 0;
            byAccountType[type].count++;
        });

        const accountTypes = Object.entries(byAccountType).map(([type, data]) => ({
            type,
            ...data,
            gainLoss: data.marketValue - data.bookValue,
            returnPct: data.bookValue > 0 ? ((data.marketValue - data.bookValue) / data.bookValue * 100) : 0,
            allocation: totalMarketValue > 0 ? (data.marketValue / totalMarketValue * 100) : 0
        })).sort((a, b) => b.marketValue - a.marketValue);

        // By asset type/category
        const byAssetType = {};
        filteredHoldings.forEach(h => {
            const type = h.asset_type || h.category || 'Other';
            if (!byAssetType[type]) {
                byAssetType[type] = { marketValue: 0, bookValue: 0, count: 0 };
            }
            byAssetType[type].marketValue += parseFloat(h.market_value) || 0;
            byAssetType[type].bookValue += parseFloat(h.book_value) || 0;
            byAssetType[type].count++;
        });

        const assetTypes = Object.entries(byAssetType).map(([type, data]) => ({
            type,
            ...data,
            gainLoss: data.marketValue - data.bookValue,
            returnPct: data.bookValue > 0 ? ((data.marketValue - data.bookValue) / data.bookValue * 100) : 0,
            allocation: totalMarketValue > 0 ? (data.marketValue / totalMarketValue * 100) : 0
        })).sort((a, b) => b.marketValue - a.marketValue);

        // By institution
        const byInstitution = {};
        filteredHoldings.forEach(h => {
            const inst = h.investment_accounts?.institution || 'Unknown';
            if (!byInstitution[inst]) {
                byInstitution[inst] = { marketValue: 0, bookValue: 0, count: 0 };
            }
            byInstitution[inst].marketValue += parseFloat(h.market_value) || 0;
            byInstitution[inst].bookValue += parseFloat(h.book_value) || 0;
            byInstitution[inst].count++;
        });

        const institutions = Object.entries(byInstitution).map(([name, data]) => ({
            name,
            ...data,
            gainLoss: data.marketValue - data.bookValue,
            returnPct: data.bookValue > 0 ? ((data.marketValue - data.bookValue) / data.bookValue * 100) : 0,
            allocation: totalMarketValue > 0 ? (data.marketValue / totalMarketValue * 100) : 0
        })).sort((a, b) => b.marketValue - a.marketValue);

        // Top holdings
        const topHoldings = filteredHoldings
            .map(h => ({
                symbol: h.symbol,
                name: h.security_name,
                marketValue: parseFloat(h.market_value) || 0,
                bookValue: parseFloat(h.book_value) || 0,
                gainLoss: (parseFloat(h.market_value) || 0) - (parseFloat(h.book_value) || 0),
                units: parseFloat(h.units) || 0,
                accountType: h.investment_accounts?.account_type,
                institution: h.investment_accounts?.institution
            }))
            .sort((a, b) => b.marketValue - a.marketValue)
            .slice(0, 10);

        return {
            totalMarketValue,
            totalBookValue,
            totalGainLoss,
            overallReturn,
            accountTypes,
            assetTypes,
            institutions,
            topHoldings,
            holdingCount: filteredHoldings.length
        };
    }, [holdings, selectedAccountType]);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD'
        }).format(amount || 0);
    };

    const formatPercent = (value) => {
        const sign = value >= 0 ? '+' : '';
        return `${sign}${value.toFixed(2)}%`;
    };

    // Get unique account types
    const accountTypeOptions = useMemo(() => {
        const types = new Set(holdings.map(h => h.investment_accounts?.account_type).filter(Boolean));
        return ['all', ...Array.from(types)];
    }, [holdings]);

    const typeColors = {
        'RRSP': 'bg-blue-500',
        'TFSA': 'bg-green-500',
        'Non-Registered': 'bg-purple-500',
        'RESP': 'bg-yellow-500',
        'LIRA': 'bg-pink-500',
        'RRIF': 'bg-orange-500'
    };

    const assetColors = [
        'bg-indigo-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500',
        'bg-cyan-500', 'bg-violet-500', 'bg-lime-500', 'bg-fuchsia-500'
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="ml-2 text-gray-400">Loading investment data...</span>
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
                        Investment Growth
                    </h1>
                    <p className="text-gray-400 mt-1">
                        Portfolio performance and allocation analysis
                    </p>
                </div>

                {/* Filter */}
                <div className="flex items-center gap-3">
                    <label className="text-sm text-gray-400">Account Type:</label>
                    <select
                        value={selectedAccountType}
                        onChange={(e) => setSelectedAccountType(e.target.value)}
                        className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                    >
                        {accountTypeOptions.map(type => (
                            <option key={type} value={type}>
                                {type === 'all' ? 'All Accounts' : type}
                            </option>
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Market Value</p>
                            <p className="text-2xl font-bold text-white mt-1">
                                {formatCurrency(metrics.totalMarketValue)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center">
                            <Wallet className="w-6 h-6 text-indigo-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Book Cost</p>
                            <p className="text-2xl font-bold text-gray-300 mt-1">
                                {formatCurrency(metrics.totalBookValue)}
                            </p>
                        </div>
                        <div className="w-12 h-12 bg-gray-500/20 rounded-full flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-gray-400" />
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Gain/Loss</p>
                            <p className={`text-2xl font-bold mt-1 ${metrics.totalGainLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatCurrency(metrics.totalGainLoss)}
                            </p>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${metrics.totalGainLoss >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                            {metrics.totalGainLoss >= 0
                                ? <ArrowUpRight className="w-6 h-6 text-green-400" />
                                : <ArrowDownRight className="w-6 h-6 text-red-400" />
                            }
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-400 text-sm">Overall Return</p>
                            <p className={`text-2xl font-bold mt-1 ${metrics.overallReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatPercent(metrics.overallReturn)}
                            </p>
                        </div>
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${metrics.overallReturn >= 0 ? 'bg-green-500/20' : 'bg-red-500/20'
                            }`}>
                            <TrendingUp className="w-6 h-6 text-green-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Allocation Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* By Account Type */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Wallet className="w-5 h-5 text-blue-400" />
                        By Account Type
                    </h2>
                    <div className="space-y-3">
                        {metrics.accountTypes.map((acc, idx) => (
                            <div key={acc.type} className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${typeColors[acc.type] || assetColors[idx % assetColors.length]}`} />
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm text-gray-300">{acc.type}</span>
                                        <div className="text-right">
                                            <span className="text-sm font-medium text-white">
                                                {formatCurrency(acc.marketValue)}
                                            </span>
                                            <span className={`text-xs ml-2 ${acc.returnPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                {formatPercent(acc.returnPct)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${typeColors[acc.type] || assetColors[idx % assetColors.length]}`}
                                            style={{ width: `${acc.allocation}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 w-12 text-right">
                                    {acc.allocation.toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* By Asset Type */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-green-400" />
                        By Asset Type
                    </h2>
                    <div className="space-y-3">
                        {metrics.assetTypes.slice(0, 8).map((asset, idx) => (
                            <div key={asset.type} className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${assetColors[idx % assetColors.length]}`} />
                                <div className="flex-1">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-sm text-gray-300 truncate">{asset.type}</span>
                                        <div className="text-right">
                                            <span className="text-sm font-medium text-white">
                                                {formatCurrency(asset.marketValue)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-700 rounded-full h-2">
                                        <div
                                            className={`h-2 rounded-full ${assetColors[idx % assetColors.length]}`}
                                            style={{ width: `${asset.allocation}%` }}
                                        />
                                    </div>
                                </div>
                                <span className="text-xs text-gray-500 w-12 text-right">
                                    {asset.allocation.toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* By Institution */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-400" />
                    By Institution
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {metrics.institutions.map((inst, idx) => (
                        <div
                            key={inst.name}
                            className="p-4 bg-gray-700/50 rounded-lg"
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="font-medium text-white">{inst.name}</span>
                                <span className="text-xs text-gray-400">{inst.count} holdings</span>
                            </div>
                            <div className="text-xl font-bold text-white">
                                {formatCurrency(inst.marketValue)}
                            </div>
                            <div className="flex justify-between mt-2 text-sm">
                                <span className="text-gray-400">
                                    Cost: {formatCurrency(inst.bookValue)}
                                </span>
                                <span className={inst.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'}>
                                    {formatPercent(inst.returnPct)}
                                </span>
                            </div>
                            <div className="mt-2">
                                <div className="w-full bg-gray-600 rounded-full h-1.5">
                                    <div
                                        className="h-1.5 rounded-full bg-purple-500"
                                        style={{ width: `${inst.allocation}%` }}
                                    />
                                </div>
                                <span className="text-xs text-gray-500">{inst.allocation.toFixed(1)}% of portfolio</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Top Holdings */}
            <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                <h2 className="text-lg font-semibold text-white mb-4">
                    Top 10 Holdings
                </h2>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-700/50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-400">Security</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-400">Account</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-400">Units</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-400">Market Value</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-400">Book Cost</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-400">Gain/Loss</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {metrics.topHoldings.map((holding, idx) => (
                                <tr key={`${holding.symbol}-${idx}`} className="hover:bg-gray-700/30">
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-white">{holding.symbol}</div>
                                        <div className="text-xs text-gray-500 truncate max-w-[200px]">
                                            {holding.name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`px-2 py-1 text-xs rounded ${typeColors[holding.accountType]
                                                ? `${typeColors[holding.accountType]}/20 text-white`
                                                : 'bg-gray-600 text-gray-300'
                                            }`}>
                                            {holding.accountType}
                                        </span>
                                        <div className="text-xs text-gray-500 mt-1">{holding.institution}</div>
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-300">
                                        {holding.units.toFixed(4)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-white font-medium">
                                        {formatCurrency(holding.marketValue)}
                                    </td>
                                    <td className="px-4 py-3 text-right text-gray-400">
                                        {formatCurrency(holding.bookValue)}
                                    </td>
                                    <td className={`px-4 py-3 text-right font-medium ${holding.gainLoss >= 0 ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {formatCurrency(holding.gainLoss)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default InvestmentGrowth;
