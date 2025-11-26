// src/pages/Transactions.jsx - Updated with merchant/category split logic

import React, { useEffect, useState } from 'react';
import { TransactionUpload } from '../components/transactions/TransactionUpload';
import { SplitModal } from '../components/transactions/SplitModal';
import { MerchantSelector } from '../components/transactions/MerchantSelector';
import transactionService from '../services/transactionService';
import { transactionLogic } from '../services/transactionBusinessLogic';
import {
    supabaseAccountsDB,
    supabaseTransactionsDB,
    supabaseChartOfAccountsDB,
    supabaseMerchantDB,
    supabaseCategoryDB
} from '../services/supabaseDatabase';
import { Search, Edit2, Trash2, Save, Split } from 'lucide-react';

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

    // Pending transactions (not saved to DB yet)
    const [pendingTransactions, setPendingTransactions] = useState([]);

    // Split modal
    const [splitTransaction, setSplitTransaction] = useState(null);
    const [showSplitModal, setShowSplitModal] = useState(false);

    // Load data
    useEffect(() => {
        loadData();
    }, [refresh]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [accs, txns, coa, cats, merchs] = await Promise.all([
                supabaseAccountsDB.getAll(),
                supabaseTransactionsDB.getAllWithRelations(),
                supabaseChartOfAccountsDB.getAll(),
                supabaseCategoryDB.getAll(),
                supabaseMerchantDB.getAll()
            ]);

            setAccounts(accs || []);
            setTransactions(txns || []);

            // Sort Chart of Accounts alphabetically by NAME
            const sortedCoa = (coa || []).sort((a, b) => {
                return (a.name || '').localeCompare(b.name || '');
            });
            setChartOfAccounts(sortedCoa);

            setCategories(cats || []);
            setMerchants(merchs || []);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load data');
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
            await supabaseTransactionsDB.update(transactionId, {
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
            const newMerchant = await supabaseMerchantDB.add({
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
                await supabaseTransactionsDB.delete(txn.id);
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

    // Combine pending and saved transactions for display
    const allTransactions = [...pendingTransactions, ...transactions];

    // Filter transactions
    const filteredTransactions = allTransactions.filter(txn => {
        if (selectedAccount !== 'all' && txn.account_id !== selectedAccount) {
            return false;
        }
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            return (
                txn.description?.toLowerCase().includes(lower) ||
                txn.raw_merchant_name?.toLowerCase().includes(lower) ||
                txn.merchant?.normalized_name?.toLowerCase().includes(lower)
            );
        }
        return true;
    });

    // Count pending transactions that are ready to save
    const readyToSaveCount = pendingTransactions.filter(txn => {
        if (txn.requiresSplit) {
            return txn.splitData !== null;
        }
        return txn.chart_of_account_id;
    }).length;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Transactions</h1>
                    <p className="text-gray-600 mt-1">
                        {filteredTransactions.length} transactions
                        {pendingTransactions.length > 0 && (
                            <span className="ml-2 text-orange-600 font-medium">
                                ({pendingTransactions.length} pending)
                            </span>
                        )}
                    </p>
                </div>
                <div className="flex gap-3">
                    {pendingTransactions.length > 0 && (
                        <button
                            onClick={handleBulkSave}
                            disabled={readyToSaveCount === 0}
                            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                        >
                            <Save className="w-5 h-5" />
                            Save All ({readyToSaveCount})
                        </button>
                    )}
                    <TransactionUpload
                        accounts={accounts}
                        onUpload={handleUpload}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center bg-white p-4 rounded-lg shadow border">
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
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="border rounded-lg px-3 py-2"
                >
                    <option value="all">All Accounts</option>
                    {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                            {acc.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Legend */}
            <div className="flex gap-4 text-sm">
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

            {/* Info banner for pending transactions */}
            {pendingTransactions.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-orange-900">
                                {pendingTransactions.length} transactions pending
                            </h3>
                            <p className="text-sm text-orange-700 mt-1">
                                Assign Chart of Accounts or complete splits, then click "Save All" to save to database.
                                {readyToSaveCount > 0 && (
                                    <span className="font-medium"> {readyToSaveCount} ready to save.</span>
                                )}
                            </p>
                        </div>
                        <button
                            onClick={handleBulkSave}
                            disabled={readyToSaveCount === 0}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed font-medium"
                        >
                            Save All ({readyToSaveCount})
                        </button>
                    </div>
                </div>
            )}

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
                        {filteredTransactions.map((txn) => (
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

                {filteredTransactions.length === 0 && (
                    <div className="px-6 py-12 text-center text-gray-500">
                        No transactions found
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