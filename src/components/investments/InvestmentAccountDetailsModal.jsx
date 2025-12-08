// src/components/investments/InvestmentAccountDetailsModal.jsx
import React, { useState, useEffect } from 'react';
import { X, TrendingUp, Receipt, PieChart, Calendar, Filter, Download, ChevronDown, ChevronUp, Building2, Clock, Plus, Minus, DollarSign } from 'lucide-react';
import {
    holdingsDB,
    investmentTransactionsDB,
    cashTransactionsDB
} from '../../services/database';

const InvestmentAccountDetailsModal = ({ account, onClose }) => {
    const [activeTab, setActiveTab] = useState('holdings');
    const [holdings, setHoldings] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [cashTransactions, setCashTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateFilter, setDateFilter] = useState('all');
    const [customDateRange, setCustomDateRange] = useState({ from: '', to: '' });
    const [transactionTypeFilter, setTransactionTypeFilter] = useState('all');
    const [expandedHolding, setExpandedHolding] = useState(null); // Track which holding timeline is expanded

    useEffect(() => {
        loadAccountData();
    }, [account.id]);

    const loadAccountData = async () => {
        try {
            setLoading(true);

            // Use supabase_id for matching since holdings reference old Supabase UUIDs
            const accountId = account.supabase_id || account.id;

            // Load holdings for this account
            const allHoldings = await holdingsDB.getAll();
            const holdingsData = (allHoldings || []).filter(h =>
                h.account_id === accountId || h.account_id === account.id
            ).sort((a, b) => new Date(b.as_of_date) - new Date(a.as_of_date));
            setHoldings(holdingsData);

            // Load investment transactions for this account
            const allTxns = await investmentTransactionsDB.getAll();
            const txnData = (allTxns || []).filter(t =>
                t.account_id === accountId || t.account_id === account.id
            ).sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
            setTransactions(txnData);

            // Load cash transactions (fees, etc.) for this account
            const allCashTxns = await cashTransactionsDB.getAll();
            const cashData = (allCashTxns || []).filter(t =>
                t.account_id === accountId || t.account_id === account.id
            ).sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));
            setCashTransactions(cashData);

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

    // Helper to normalize text for matching (lowercase, remove extra spaces)
    const normalizeText = (text) => {
        if (!text) return '';
        return text.toLowerCase().trim().replace(/\s+/g, ' ');
    };

    // Extract security name from transaction description
    // e.g., "Security Purchase: SKYLINE COMMERCIAL REAL ESTATE..." -> "skyline commercial real estate..."
    const extractSecurityFromDescription = (description) => {
        if (!description) return '';
        const desc = description.toLowerCase();

        // Common patterns in transaction descriptions
        const patterns = [
            /security purchase:\s*(.+)/i,
            /security sale:\s*(.+)/i,
            /buy:\s*(.+)/i,
            /sell:\s*(.+)/i,
            /purchase:\s*(.+)/i,
            /distribution:\s*(.+)/i,
            /dividend:\s*(.+)/i,
            /reinvestment:\s*(.+)/i,
        ];

        for (const pattern of patterns) {
            const match = description.match(pattern);
            if (match && match[1]) {
                // Clean up the extracted name - remove "TRUST UNITS", "CLASS A", etc. at the end
                let name = match[1].trim();
                name = name.replace(/\s+(trust units?|class [a-z]|units?)$/i, '');
                return normalizeText(name);
            }
        }

        return normalizeText(description);
    };

    // Check if two security names match (fuzzy matching)
    const securityNamesMatch = (txnText, holdingSecurityName) => {
        if (!txnText || !holdingSecurityName) return false;

        // Normalize the holding security name
        const holdingName = normalizeText(holdingSecurityName);

        // Try to extract security name from transaction text (could be description or security_name)
        const txnName = extractSecurityFromDescription(txnText);

        // Also try direct normalization
        const txnNameDirect = normalizeText(txnText);

        // Exact match
        if (holdingName === txnName || holdingName === txnNameDirect) return true;

        // One contains the other
        if (holdingName.includes(txnName) || txnName.includes(holdingName)) return true;
        if (holdingName.includes(txnNameDirect) || txnNameDirect.includes(holdingName)) return true;

        // Key word matching - check if the main identifying words match
        // e.g., "skyline industrial" should match "SKYLINE INDUSTRIAL REIT CLASS A TRUST UNITS"
        const holdingWords = holdingName.split(' ').filter(w => w.length > 2);
        const txnWords = txnName.split(' ').filter(w => w.length > 2);

        // If the first 2 significant words match, it's likely the same security
        if (holdingWords.length >= 2 && txnWords.length >= 2) {
            if (holdingWords[0] === txnWords[0] && holdingWords[1] === txnWords[1]) {
                return true;
            }
        }

        // Single word match for short names (e.g., "Centurion")
        if (holdingWords[0] && txnWords[0] && holdingWords[0].length > 5) {
            if (holdingWords[0] === txnWords[0]) return true;
        }

        return false;
    };

    // Get timeline for a specific holding (match by symbol OR security_name OR description)
    const getHoldingTimeline = (holding) => {
        const symbol = holding.symbol;
        const securityName = holding.security_name;

        const matched = transactions.filter(t => {
            // Match by symbol if both have it
            if (t.symbol && symbol && normalizeText(t.symbol) === normalizeText(symbol)) {
                return true;
            }
            // Match by security_name field
            if (t.security_name && securityNamesMatch(t.security_name, securityName)) {
                return true;
            }
            // Match by description field (e.g., "Security Purchase: SKYLINE...")
            if (t.description && securityNamesMatch(t.description, securityName)) {
                return true;
            }
            // Try extracting security from description and match
            if (t.description) {
                const extracted = extractSecurityFromDescription(t.description);
                if (extracted && securityNamesMatch(extracted, securityName)) {
                    return true;
                }
            }
            return false;
        });

        // Debug: log matching for first few holdings
        if (matched.length === 0 && transactions.length > 0) {
            console.log(`[Timeline Debug] No matches for "${securityName}" (symbol: ${symbol})`);
            console.log(`  Sample transactions:`, transactions.slice(0, 3).map(t => ({
                type: t.transaction_type,
                symbol: t.symbol,
                security_name: t.security_name,
                description: t.description?.substring(0, 80)
            })));
        }

        return matched.sort((a, b) => new Date(a.transaction_date) - new Date(b.transaction_date));
    };

    // Get first purchase date for a holding
    const getFirstPurchaseDate = (holding) => {
        const timeline = getHoldingTimeline(holding);
        const firstBuy = timeline.find(t =>
            t.transaction_type?.toLowerCase().includes('buy') ||
            t.transaction_type?.toLowerCase().includes('purchase') ||
            t.transaction_type?.toLowerCase().includes('contribution')
        );
        return firstBuy?.transaction_date;
    };

    // Calculate total invested for a holding
    const getTotalInvested = (holding) => {
        const timeline = getHoldingTimeline(holding);
        return timeline
            .filter(t =>
                t.transaction_type?.toLowerCase().includes('buy') ||
                t.transaction_type?.toLowerCase().includes('purchase') ||
                t.transaction_type?.toLowerCase().includes('contribution')
            )
            .reduce((sum, t) => sum + Math.abs(parseFloat(t.amount) || 0), 0);
    };

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
                                                    <th className="px-4 py-3 text-left font-medium text-gray-700 w-8"></th>
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
                                                    const timeline = getHoldingTimeline(holding);
                                                    const firstPurchase = getFirstPurchaseDate(holding);
                                                    const isExpanded = expandedHolding === (holding.id || holding.symbol);

                                                    return (
                                                        <React.Fragment key={holding.id || idx}>
                                                            {/* Main Holding Row */}
                                                            <tr
                                                                className={`hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-indigo-50' : ''}`}
                                                                onClick={() => setExpandedHolding(isExpanded ? null : (holding.id || holding.symbol))}
                                                            >
                                                                <td className="px-4 py-3">
                                                                    {timeline.length > 0 ? (
                                                                        <button className="text-gray-400 hover:text-indigo-600">
                                                                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                                                        </button>
                                                                    ) : (
                                                                        <span className="text-gray-300 text-xs">-</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <div className="font-medium text-gray-900">{holding.symbol}</div>
                                                                    <div className="text-xs text-gray-500">{holding.security_name}</div>
                                                                    {firstPurchase && (
                                                                        <div className="flex items-center gap-1 text-xs text-indigo-600 mt-1">
                                                                            <Clock className="w-3 h-3" />
                                                                            Since {formatDate(firstPurchase)}
                                                                        </div>
                                                                    )}
                                                                    {!firstPurchase && timeline.length === 0 && (
                                                                        <div className="text-xs text-gray-400 mt-1 italic">
                                                                            No transaction history
                                                                        </div>
                                                                    )}
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

                                                            {/* Expanded Timeline Row */}
                                                            {isExpanded && timeline.length > 0 && (
                                                                <tr>
                                                                    <td colSpan="8" className="px-4 py-4 bg-gradient-to-r from-indigo-50 to-purple-50">
                                                                        <div className="ml-8">
                                                                            <div className="flex items-center gap-2 mb-3">
                                                                                <Clock className="w-4 h-4 text-indigo-600" />
                                                                                <h4 className="font-semibold text-gray-800">Investment Timeline</h4>
                                                                                <span className="text-xs text-gray-500">({timeline.length} transactions)</span>
                                                                            </div>

                                                                            {/* Timeline */}
                                                                            <div className="relative pl-4 border-l-2 border-indigo-200 space-y-3">
                                                                                {timeline.map((txn, txnIdx) => {
                                                                                    const isBuy = txn.transaction_type?.toLowerCase().includes('buy') ||
                                                                                        txn.transaction_type?.toLowerCase().includes('purchase');
                                                                                    const isSell = txn.transaction_type?.toLowerCase().includes('sell');
                                                                                    const isDividend = txn.transaction_type?.toLowerCase().includes('dividend') ||
                                                                                        txn.transaction_type?.toLowerCase().includes('distribution');

                                                                                    return (
                                                                                        <div key={txn.id || txnIdx} className="relative">
                                                                                            {/* Timeline dot */}
                                                                                            <div className={`absolute -left-[21px] w-4 h-4 rounded-full border-2 border-white ${isBuy ? 'bg-green-500' :
                                                                                                isSell ? 'bg-red-500' :
                                                                                                    isDividend ? 'bg-purple-500' :
                                                                                                        'bg-gray-400'
                                                                                                }`}>
                                                                                                {isBuy && <Plus className="w-2.5 h-2.5 text-white absolute top-0.5 left-0.5" />}
                                                                                                {isSell && <Minus className="w-2.5 h-2.5 text-white absolute top-0.5 left-0.5" />}
                                                                                                {isDividend && <DollarSign className="w-2.5 h-2.5 text-white absolute top-0.5 left-0.5" />}
                                                                                            </div>

                                                                                            {/* Timeline content */}
                                                                                            <div className="bg-white rounded-lg p-3 shadow-sm border ml-2">
                                                                                                <div className="flex items-center justify-between">
                                                                                                    <div className="flex items-center gap-3">
                                                                                                        <span className="text-xs text-gray-500 w-24">
                                                                                                            {formatDate(txn.transaction_date)}
                                                                                                        </span>
                                                                                                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${isBuy ? 'bg-green-100 text-green-800' :
                                                                                                            isSell ? 'bg-red-100 text-red-800' :
                                                                                                                isDividend ? 'bg-purple-100 text-purple-800' :
                                                                                                                    'bg-gray-100 text-gray-800'
                                                                                                            }`}>
                                                                                                            {txn.transaction_type}
                                                                                                        </span>
                                                                                                        {txn.units && (
                                                                                                            <span className="text-sm text-gray-600">
                                                                                                                {parseFloat(txn.units).toFixed(4)} units
                                                                                                            </span>
                                                                                                        )}
                                                                                                        {txn.price && (
                                                                                                            <span className="text-sm text-gray-500">
                                                                                                                @ {formatCurrency(txn.price)}
                                                                                                            </span>
                                                                                                        )}
                                                                                                    </div>
                                                                                                    <span className={`font-semibold ${parseFloat(txn.amount) >= 0 ? 'text-green-600' : 'text-red-600'
                                                                                                        }`}>
                                                                                                        {formatCurrency(Math.abs(txn.amount))}
                                                                                                    </span>
                                                                                                </div>
                                                                                                {txn.description && (
                                                                                                    <div className="text-xs text-gray-500 mt-1 ml-24">
                                                                                                        {txn.description}
                                                                                                    </div>
                                                                                                )}
                                                                                            </div>
                                                                                        </div>
                                                                                    );
                                                                                })}
                                                                            </div>

                                                                            {/* Summary */}
                                                                            <div className="mt-4 pt-3 border-t border-indigo-200 flex items-center gap-6 text-sm">
                                                                                <div>
                                                                                    <span className="text-gray-500">Total Invested:</span>
                                                                                    <span className="ml-2 font-semibold text-gray-800">{formatCurrency(getTotalInvested(holding))}</span>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-gray-500">Current Value:</span>
                                                                                    <span className="ml-2 font-semibold text-gray-800">{formatCurrency(holding.market_value)}</span>
                                                                                </div>
                                                                                <div>
                                                                                    <span className="text-gray-500">Return:</span>
                                                                                    <span className={`ml-2 font-semibold ${gainLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                                                        {formatCurrency(gainLoss)} ({((gainLoss / (parseFloat(holding.book_value) || 1)) * 100).toFixed(2)}%)
                                                                                    </span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}

                                                            {/* No timeline message */}
                                                            {isExpanded && timeline.length === 0 && (
                                                                <tr>
                                                                    <td colSpan="8" className="px-4 py-4 bg-gray-50">
                                                                        <div className="ml-8 text-gray-500 text-sm italic">
                                                                            No transaction history available for this holding
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
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
