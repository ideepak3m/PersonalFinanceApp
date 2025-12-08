// src/pages/Transactions.jsx - Transaction listing with filters

import React, { useEffect, useState } from 'react';
import { SplitModal } from '../components/transactions/SplitModal';
import { MerchantSelector } from '../components/transactions/MerchantSelector';
import {
    accountsDB,
    transactionsDB,
    chartOfAccountsDB,
    merchantDB,
    categoryDB
} from '../services/database';
import { Search, Edit2, Trash2, Split } from 'lucide-react';

export const Transactions = () => {
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [chartOfAccounts, setChartOfAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refresh, setRefresh] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('all');

    // Filters - default to last 30 days
    const [selectedAccountType, setSelectedAccountType] = useState('all');
    const [startDate, setStartDate] = useState(() => {
        const date = new Date();
        date.setDate(date.getDate() - 30);
        return date.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => {
        return new Date().toISOString().split('T')[0];
    });
    const [activePreset, setActivePreset] = useState('last30');

    // Split modal
    const [splitTransaction, setSplitTransaction] = useState(null);
    const [showSplitModal, setShowSplitModal] = useState(false);

    // Track if search has been triggered
    const [hasSearched, setHasSearched] = useState(false);

    // Load reference data (accounts, categories, etc.) once
    useEffect(() => {
        loadReferenceData();
    }, []);

    // Handle search button click
    const handleSearch = () => {
        setHasSearched(true);
        loadTransactions();
    };

    const loadReferenceData = async () => {
        try {
            const [accs, coa, cats, merchs] = await Promise.all([
                accountsDB.getAll(),
                chartOfAccountsDB.getAll(),
                categoryDB.getAll(),
                merchantDB.getAll()
            ]);

            setAccounts(accs || []);

            // Sort Chart of Accounts alphabetically by NAME
            const sortedCoa = (coa || []).sort((a, b) => {
                return (a.name || '').localeCompare(b.name || '');
            });
            setChartOfAccounts(sortedCoa);

            setCategories(cats || []);
            setMerchants(merchs || []);
        } catch (error) {
            console.error('Error loading reference data:', error);
        }
    };

    const loadTransactions = async () => {
        try {
            setLoading(true);

            // Build account IDs filter based on account type
            let accountIds = null;
            if (selectedAccountType !== 'all' && selectedAccount === 'all') {
                // Filter by account type - get IDs of matching accounts
                accountIds = accounts
                    .filter(acc => acc.account_type === selectedAccountType)
                    .map(acc => acc.id);

                if (accountIds.length === 0) {
                    setTransactions([]);
                    setLoading(false);
                    return;
                }
            }

            const txns = await transactionsDB.getFiltered({
                startDate: startDate || undefined,
                endDate: endDate || undefined,
                accountId: selectedAccount !== 'all' ? selectedAccount : undefined,
                accountIds: accountIds,
                searchTerm: searchTerm || undefined
            });

            setTransactions(txns || []);
        } catch (error) {
            console.error('Error loading transactions:', error);
            alert('Failed to load transactions');
        } finally {
            setLoading(false);
        }
    };

    // Get suspense account
    const suspenseAccount = chartOfAccounts.find(coa =>
        coa.name.toLowerCase() === 'suspense' ||
        coa.code.toLowerCase() === 'suspense'
    );

    // Check if merchant/category requires split based on description
    const checkIfSplitRequired = (description) => {
        if (!description) return false;

        const descLower = description.toLowerCase().trim();

        // Find matching merchant by checking if description contains merchant name
        const matchingMerchant = merchants.find(merchant => {
            const merchantName = (merchant.name || '').toLowerCase().trim();
            const merchantNormalizedName = (merchant.normalized_name || '').toLowerCase().trim();

            return descLower.includes(merchantName) ||
                descLower.includes(merchantNormalizedName) ||
                merchantName.includes(descLower);
        });

        if (matchingMerchant && matchingMerchant.category_id) {
            const category = categories.find(c => c.id === matchingMerchant.category_id);
            return category?.is_split_enabled === true;
        }

        return false;
    };

    // Handle file upload - DON'T save anything yet
    const handleUpload = async (file, accountId) => {
        try {
            setLoading(true);

            let mappedTransactions = [];
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.csv')) {
                const csvData = await transactionService.parseCSV(file);
                mappedTransactions = transactionService.mapCSVToTransactions(csvData, accountId);
            } else if (fileName.endsWith('.qbo') || fileName.endsWith('.qfx')) {
                const data = await transactionService.parseQBOQFX(file);
                mappedTransactions = transactionService.mapQBOQFXToTransactions(data, accountId);
            } else {
                alert('Unsupported file format');
                return;
            }

            // Enrich and categorize
            const enriched = await transactionLogic.enrichTransactions(
                mappedTransactions,
                merchants,
                categories,
                chartOfAccounts
            );

            // Add temporary IDs for tracking and check split requirement
            const withTempIds = enriched.map((txn, idx) => ({
                ...txn,
                tempId: `temp_${Date.now()}_${idx}`,
                isPending: true,
                requiresSplit: checkIfSplitRequired(txn.description || txn.raw_merchant_name),
                splitData: null // Will hold split information when user completes split
            }));

            // Add to pending list (NOT saved to DB yet)
            setPendingTransactions(prev => [...prev, ...withTempIds]);

            alert(
                `Loaded ${withTempIds.length} transactions. ` +
                `Review and click "Save All" when ready.`
            );

        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Bulk save all pending transactions
    const handleBulkSave = async () => {
        try {
            setLoading(true);

            // Filter: only transactions that don't require split OR have completed split
            const readyToSave = pendingTransactions.filter(txn => {
                if (txn.requiresSplit) {
                    return txn.splitData !== null; // Must have split data
                }
                return txn.chart_of_account_id; // Must have COA assigned
            });

            if (readyToSave.length === 0) {
                alert('No transactions ready to save. Assign Chart of Accounts or complete splits first.');
                return;
            }

            // Prepare transactions for save
            const toSave = readyToSave.map(txn => {
                if (txn.splitData) {
                    // Transaction with split
                    return {
                        ...txn,
                        is_split: true,
                        splits: txn.splitData
                    };
                }
                return txn;
            });

            // Bulk save (you'll need to implement this in transactionLogic)
            const saved = await transactionLogic.bulkSaveTransactions(toSave);

            // Remove saved transactions from pending
            const savedTempIds = new Set(readyToSave.map(t => t.tempId));
            setPendingTransactions(prev =>
                prev.filter(t => !savedTempIds.has(t.tempId))
            );

            setRefresh(r => r + 1);
            alert(`Saved ${saved.length} transactions!`);

        } catch (error) {
            console.error('Bulk save error:', error);
            alert('Failed to save: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    // Handle COA change for pending transaction
    const handleCoAChange = (txn, coaId) => {
        setPendingTransactions(prev =>
            prev.map(t =>
                t.tempId === txn.tempId
                    ? { ...t, chart_of_account_id: coaId }
                    : t
            )
        );
    };

    // Handle split click
    const handleSplitClick = (txn) => {
        setSplitTransaction(txn);
        setShowSplitModal(true);
    };

    // Handle save split - store in variable, don't save to DB yet
    const handleSaveSplit = (splits) => {
        try {
            const txn = splitTransaction;

            if (txn.isPending) {
                // For pending transactions, just store the split data
                setPendingTransactions(prev =>
                    prev.map(t =>
                        t.tempId === txn.tempId
                            ? {
                                ...t,
                                splitData: splits,
                                is_split: true
                            }
                            : t
                    )
                );
                alert('Split saved! Will be written to database when you click "Save All".');
            } else {
                // For existing transactions, update immediately
                // (You can modify this if you want to batch these too)
                transactionLogic.updateSplitTransaction(txn.id, txn, splits);
                setRefresh(r => r + 1);
                alert('Split updated!');
            }

            setShowSplitModal(false);
            setSplitTransaction(null);

        } catch (error) {
            console.error('Split error:', error);
            alert('Failed to save split: ' + error.message);
        }
    };

    // Handle merchant linking
    const handleMerchantSelected = async (transactionId, merchantId) => {
        try {
            await transactionsDB.update(transactionId, {
                normalized_merchant_id: merchantId
            });
            await loadData();
        } catch (error) {
            console.error('Error linking merchant:', error);
            alert('Failed to link merchant');
        }
    };

    const handleCreateMerchant = async (friendlyName, rawName) => {
        try {
            const newMerchant = await merchantDB.add({
                normalized_name: friendlyName,
                aliases: [rawName]
            });
            await loadData();
            return newMerchant;
        } catch (error) {
            console.error('Error creating merchant:', error);
            alert('Failed to create merchant');
            return null;
        }
    };

    // Handle delete
    const handleDelete = async (txn) => {
        if (!window.confirm('Delete this transaction?')) return;

        try {
            if (txn.id) {
                // Saved transaction - delete from DB
                await transactionsDB.delete(txn.id);
                setRefresh(r => r + 1);
            } else {
                // Pending transaction - just remove from list
                setPendingTransactions(prev =>
                    prev.filter(t => t.tempId !== txn.tempId)
                );
            }
        } catch (error) {
            console.error('Delete error:', error);
            alert('Failed to delete');
        }
    };

    // Get row color
    const getRowClassName = (txn) => {
        if (txn.isPending) {
            if (txn.requiresSplit && !txn.splitData) {
                return 'bg-yellow-50 hover:bg-yellow-100 border-l-4 border-yellow-400';
            }
            return 'bg-orange-50 hover:bg-orange-100 border-l-4 border-orange-400';
        }
        if (txn.is_split) {
            return 'bg-purple-50 hover:bg-purple-100';
        }
        const isSuspense = txn.chart_of_account_id === suspenseAccount?.id;
        if (!txn.chart_of_account_id || isSuspense) {
            return 'bg-yellow-50 hover:bg-yellow-100';
        }
        return 'bg-green-50 hover:bg-green-100';
    };

    // Get unique account types for filter dropdown
    const accountTypes = [...new Set(accounts.map(acc => acc.account_type).filter(Boolean))];

    // Date preset handlers
    const handleThisMonth = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        setActivePreset('thisMonth');
    };

    const handleLast30Days = () => {
        const today = new Date();
        const last30 = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        setStartDate(last30.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        setActivePreset('last30');
    };

    const handleThisYear = () => {
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), 0, 1);
        setStartDate(firstDay.toISOString().split('T')[0]);
        setEndDate(today.toISOString().split('T')[0]);
        setActivePreset('thisYear');
    };

    const handleClearAll = () => {
        setStartDate('');
        setEndDate('');
        setSelectedAccount('all');
        setSelectedAccountType('all');
        setSearchTerm('');
        setActivePreset(null);
    };

    // Clear preset when dates are manually changed
    const handleStartDateChange = (e) => {
        setStartDate(e.target.value);
        setActivePreset(null);
    };

    const handleEndDateChange = (e) => {
        setEndDate(e.target.value);
        setActivePreset(null);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-white">All Transactions</h1>
                    <p className="text-gray-300 mt-1">
                        {hasSearched ? `${transactions.length} transactions found` : 'Use filters and click Search to load transactions'}
                    </p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-lg shadow border space-y-4">
                {/* Row 1: Search and Account Type */}
                <div className="flex gap-4 items-center">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg"
                        />
                    </div>
                    <select
                        value={selectedAccountType}
                        onChange={(e) => {
                            setSelectedAccountType(e.target.value);
                            setSelectedAccount('all'); // Reset account when type changes
                        }}
                        className="border rounded-lg px-3 py-2 min-w-[160px]"
                    >
                        <option value="all">All Account Types</option>
                        {accountTypes.map(type => (
                            <option key={type} value={type}>
                                {type}
                            </option>
                        ))}
                    </select>
                    <select
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        className="border rounded-lg px-3 py-2 min-w-[200px]"
                    >
                        <option value="all">All Accounts</option>
                        {accounts
                            .filter(acc => selectedAccountType === 'all' || acc.account_type === selectedAccountType)
                            .map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name}
                                </option>
                            ))}
                    </select>
                </div>

                {/* Row 2: Date Filters */}
                <div className="flex gap-4 items-center">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">From:</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={handleStartDateChange}
                            className="border rounded-lg px-3 py-2"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium text-gray-700">To:</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={handleEndDateChange}
                            className="border rounded-lg px-3 py-2"
                        />
                    </div>
                    {/* Quick date presets */}
                    <div className="flex gap-2 ml-4">
                        <button
                            onClick={handleThisMonth}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${activePreset === 'thisMonth'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                        >
                            This Month
                        </button>
                        <button
                            onClick={handleLast30Days}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${activePreset === 'last30'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                        >
                            Last 30 Days
                        </button>
                        <button
                            onClick={handleThisYear}
                            className={`px-3 py-1 text-sm rounded-lg transition-colors ${activePreset === 'thisYear'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 hover:bg-gray-200'
                                }`}
                        >
                            This Year
                        </button>
                        <button
                            onClick={handleClearAll}
                            className="px-3 py-1 text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
                        >
                            Clear All
                        </button>
                        <button
                            onClick={handleSearch}
                            disabled={loading}
                            className="px-6 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:bg-gray-400 flex items-center gap-2"
                        >
                            <Search className="w-4 h-4" />
                            {loading ? 'Searching...' : 'Search'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-orange-200 border-l-4 border-orange-400"></div>
                    <span>Pending (Not Saved)</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-yellow-200 border-l-4 border-yellow-400"></div>
                    <span>Requires Split</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-green-200 border"></div>
                    <span>Categorized</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-purple-200 border"></div>
                    <span>Split Transaction</span>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Account
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Description (Raw)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Merchant (Friendly)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Chart of Account
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                Amount
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map((txn) => (
                            <tr key={txn.id || txn.tempId} className={getRowClassName(txn)}>
                                <td className="px-4 py-3 text-sm">
                                    {txn.date}
                                </td>

                                <td className="px-4 py-3 text-sm">
                                    {accounts.find(a => a.id === txn.account_id)?.name || '-'}
                                </td>

                                <td className="px-4 py-3 text-sm">
                                    <div className="font-medium text-gray-900">
                                        {txn.description || txn.raw_merchant_name}
                                    </div>
                                    {txn.isPending && (
                                        <span className="inline-block mt-1 px-2 py-0.5 bg-orange-200 text-orange-800 text-xs rounded">
                                            Pending
                                        </span>
                                    )}
                                    {txn.requiresSplit && !txn.splitData && (
                                        <span className="inline-block mt-1 ml-2 px-2 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded">
                                            Split Required
                                        </span>
                                    )}
                                    {txn.splitData && (
                                        <span className="inline-block mt-1 ml-2 px-2 py-0.5 bg-purple-200 text-purple-800 text-xs rounded">
                                            Split Complete
                                        </span>
                                    )}
                                    {txn.memo && (
                                        <div className="text-xs text-gray-500 mt-1">
                                            {txn.memo}
                                        </div>
                                    )}
                                </td>

                                <td className="px-4 py-3 text-sm">
                                    <select
                                        value={txn.normalized_merchant_id || ''}
                                        onChange={(e) => handleMerchantSelected(txn.id, e.target.value || null)}
                                        className="border rounded px-2 py-1 text-sm w-full bg-white"
                                    >
                                        <option value="">-- Select Merchant --</option>
                                        {merchants.map(merchant => (
                                            <option key={merchant.id} value={merchant.id}>
                                                {merchant.normalized_name}
                                            </option>
                                        ))}
                                    </select>
                                </td>

                                <td className="px-4 py-3 text-sm">
                                    {txn.requiresSplit ? (
                                        <span className="text-purple-600 font-medium italic">
                                            {txn.splitData ? 'Split Complete' : 'Pending Split'}
                                        </span>
                                    ) : (
                                        <select
                                            value={txn.chart_of_account_id || ''}
                                            onChange={(e) => handleCoAChange(txn, e.target.value)}
                                            className="border rounded px-2 py-1 text-sm w-full bg-white"
                                            disabled={txn.is_split}
                                        >
                                            <option value="">Select...</option>
                                            {chartOfAccounts.map(coa => (
                                                <option key={coa.id} value={coa.id}>
                                                    {coa.code} - {coa.name}
                                                </option>
                                            ))}
                                        </select>
                                    )}
                                </td>

                                <td className="px-4 py-3 text-sm text-right">
                                    <span className={
                                        txn.amount >= 0
                                            ? 'text-green-600 font-semibold'
                                            : 'text-red-600 font-semibold'
                                    }>
                                        ${Math.abs(txn.amount).toFixed(2)}
                                    </span>
                                </td>

                                <td className="px-4 py-3 text-sm text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        {txn.requiresSplit && (
                                            <button
                                                onClick={() => handleSplitClick(txn)}
                                                className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs font-medium flex items-center gap-1"
                                            >
                                                <Split className="w-3 h-3" />
                                                {txn.splitData ? 'Edit Split' : 'Split'}
                                            </button>
                                        )}
                                        {txn.is_split && !txn.requiresSplit && (
                                            <button
                                                onClick={() => handleSplitClick(txn)}
                                                className="text-purple-600 hover:text-purple-800"
                                                title="Edit Split"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(txn)}
                                            className="text-red-600 hover:text-red-800"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {transactions.length === 0 && hasSearched && (
                    <div className="px-6 py-12 text-center text-gray-500">
                        No transactions found
                    </div>
                )}

                {!hasSearched && (
                    <div className="px-6 py-12 text-center text-gray-500">
                        Click "Search" to load transactions
                    </div>
                )}
            </div>

            {/* Split Modal */}
            {showSplitModal && splitTransaction && (
                <SplitModal
                    totalAmount={Math.abs(splitTransaction.amount)}
                    chartOfAccounts={chartOfAccounts}
                    existingSplits={splitTransaction.splitData || splitTransaction.splits}
                    onSave={handleSaveSplit}
                    onClose={() => {
                        setShowSplitModal(false);
                        setSplitTransaction(null);
                    }}
                />
            )}
        </div>
    );
};
