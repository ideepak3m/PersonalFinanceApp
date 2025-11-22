// src/components/transactions/UncategorizedReceipts.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft } from 'lucide-react';
import { TransactionUpload } from './TransactionUpload';
import { EditCoAModal } from './EditCoAModal';
import { ImprovedSplitModal } from './ImprovedSplitModal';
import transactionService from '../../services/transactionService';
import {
    supabaseAccountsDB,
    supabaseTransactionsDB,
    supabaseChartOfAccountsDB,
    supabaseMerchantDB,
    supabaseCategoryDB,
    supabaseTransactionSplitDB
} from '../../services/supabaseDatabase';
import { transactionLogic } from '../../services/transactionBusinessLogic';

export const UncategorizedReceipts = () => {
    const { accountId } = useParams();
    const navigate = useNavigate();

    const [account, setAccount] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [chartOfAccounts, setChartOfAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [merchants, setMerchants] = useState([]);
    const [suspenseAccount, setSuspenseAccount] = useState(null);

    const [selectedAll, setSelectedAll] = useState(false);
    const [selectedTxns, setSelectedTxns] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);

    // Modals
    const [editModalTxn, setEditModalTxn] = useState(null);
    const [splitModalTxn, setSplitModalTxn] = useState(null);

    useEffect(() => {
        loadData();
    }, [accountId]);

    const loadData = async () => {
        try {
            setLoading(true);

            const [acc, coa, cats, merchs] = await Promise.all([
                supabaseAccountsDB.getById(accountId),
                supabaseChartOfAccountsDB.getAll(),
                supabaseCategoryDB.getAll(),
                supabaseMerchantDB.getAll()
            ]);

            setAccount(acc);

            // Sort COA by name
            const sortedCoa = (coa || []).sort((a, b) =>
                (a.name || '').localeCompare(b.name || '')
            );
            setChartOfAccounts(sortedCoa);

            setCategories(cats || []);
            setMerchants(merchs || []);

            // Find suspense account
            const suspense = sortedCoa.find(c =>
                c.name?.toLowerCase() === 'suspense'
            );
            setSuspenseAccount(suspense);

            // Load uncategorized transactions with enrichment
            await loadTransactions(merchs || [], cats || [], sortedCoa);

        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const loadTransactions = async (merchantsData = null, categoriesData = null, coaData = null) => {
        try {
            const { data, error } = await supabaseTransactionsDB.table()
                .select('*')
                .eq('account_id', accountId)
                .eq('status', 'uncategorized')
                .order('date', { ascending: false });

            if (error) throw error;

            // Use passed data or fall back to state
            const merchantsList = merchantsData || merchants;
            const categoriesList = categoriesData || categories;
            const coaList = coaData || chartOfAccounts;

            // Enrich with suggestions
            const enriched = (data || []).map(txn => {
                const suggestion = getSuggestion(txn, merchantsList, categoriesList, coaList);
                return { ...txn, suggestion };
            });

            setTransactions(enriched);
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    };

    const getSuggestion = (txn, merchantsList, categoriesList, coaList) => {
        if (!txn.description || !merchantsList || merchantsList.length === 0) return null;

        const descLower = txn.description.toLowerCase();

        console.log('Checking suggestion for:', txn.description, 'against', merchantsList.length, 'merchants');

        // Try to find merchant - check if description contains merchant name or aliases
        const merchant = merchantsList.find(m => {
            // Check normalized_name
            if (m.normalized_name && descLower.includes(m.normalized_name.toLowerCase())) {
                return true;
            }
            // Check aliases
            if (Array.isArray(m.aliases)) {
                return m.aliases.some(alias =>
                    alias && descLower.includes(alias.toLowerCase())
                );
            }
            return false;
        });

        if (!merchant) {
            console.log('No merchant match found for:', txn.description);
            return null;
        }

        console.log('Merchant found:', merchant.normalized_name);

        const category = categoriesList.find(c => c.id === merchant.category_id);

        if (category?.is_split_enabled) {
            console.log('Split enabled for category:', category.name);
            return {
                type: 'split',
                message: 'Pending Split',
                merchantName: merchant.normalized_name,
                categoryName: category.name
            };
        }

        // Find default COA for this category (simplified - you can improve this)
        const suggestedCoa = coaList.find(coa =>
            coa.name?.toLowerCase().includes(category?.name?.toLowerCase())
        );

        if (suggestedCoa) {
            return {
                type: 'coa',
                chartOfAccountId: suggestedCoa.id,
                chartOfAccountName: suggestedCoa.name,
                reason: `Based on merchant: ${merchant.normalized_name}`
            };
        }

        return null;
    };

    const handleUpload = async (file) => {
        try {
            setLoading(true);

            let mapped = [];
            if (file.name.toLowerCase().endsWith('.csv')) {
                const csv = await transactionService.parseCSV(file);
                mapped = transactionService.mapCSVToTransactions(csv, accountId);
            } else if (file.name.endsWith('.qbo') || file.name.endsWith('.qfx')) {
                const data = await transactionService.parseQBOQFX(file);
                mapped = transactionService.mapQBOQFXToTransactions(data, accountId);
            } else {
                alert('Unsupported format');
                return;
            }

            // Save all with suspense
            const toSave = mapped.map(txn => ({
                ...txn,
                chart_of_account_id: suspenseAccount?.id,
                status: 'uncategorized'
            }));

            await transactionLogic.bulkSaveTransactions(toSave);
            await loadTransactions();

            alert(`Uploaded ${toSave.length} transactions`);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed');
        } finally {
            setLoading(false);
        }
    };

    const handleCheckboxChange = (txnId) => {
        const newSelected = new Set(selectedTxns);
        if (newSelected.has(txnId)) {
            newSelected.delete(txnId);
        } else {
            newSelected.add(txnId);
        }
        setSelectedTxns(newSelected);
        setSelectedAll(newSelected.size === transactions.length);
    };

    const handleSelectAll = () => {
        if (selectedAll) {
            setSelectedTxns(new Set());
        } else {
            setSelectedTxns(new Set(transactions.map(t => t.id)));
        }
        setSelectedAll(!selectedAll);
    };

    const handleBulkUpdate = async () => {
        try {
            const selectedTransactions = transactions.filter(t => selectedTxns.has(t.id));
            const updates = selectedTransactions
                .filter(t => t.suggestion?.type === 'coa' || t.splitReady)
                .map(t => ({
                    id: t.id,
                    chart_of_account_id: t.splitReady ? null : t.suggestion.chartOfAccountId,
                    status: t.splitReady ? 'split' : 'categorized',
                    is_split: t.splitReady || false,
                    splits: t.splits || null
                }));

            if (updates.length === 0) {
                alert('No transactions ready to update');
                return;
            }

            // Process each transaction
            for (const update of updates) {
                // Update transaction
                await supabaseTransactionsDB.update(update.id, {
                    chart_of_account_id: update.chart_of_account_id,
                    status: update.status,
                    is_split: update.is_split
                });

                // If it's a split transaction, save the split records
                if (update.is_split && update.splits && update.splits.length > 0) {
                    // Delete existing splits first (in case of re-edit)
                    await supabaseTransactionSplitDB.deleteByTransactionId(update.id);

                    // Prepare split records for database
                    const splitRecords = update.splits.map(s => ({
                        transaction_id: update.id,
                        chart_of_account_id: s.chartOfAccountId,
                        percentage: parseFloat(s.percent) || 0,
                        amount: parseFloat(s.amount) || 0,
                        description: s.description || null
                    }));

                    // Save all splits
                    for (const splitRecord of splitRecords) {
                        await supabaseTransactionSplitDB.add(splitRecord);
                    }
                }
            }

            alert(`Updated ${updates.length} transactions`);
            await loadTransactions();
            setSelectedTxns(new Set());
            setSelectedAll(false);

        } catch (error) {
            console.error('Bulk update error:', error);
            alert('Failed to update: ' + error.message);
        }
    };

    const handleDelete = async (txn) => {
        if (txn.splitReady) {
            // Ask if delete split or transaction
            const choice = window.confirm(
                'This transaction has splits. Click OK to delete entire transaction, Cancel to remove split only.'
            );

            if (choice) {
                // Delete transaction
                await supabaseTransactionsDB.delete(txn.id);
            } else {
                // Remove split data
                setTransactions(prev =>
                    prev.map(t => t.id === txn.id ? { ...t, splitReady: false, splits: null } : t)
                );
                return;
            }
        } else {
            if (!window.confirm('Delete this transaction?')) return;
            await supabaseTransactionsDB.delete(txn.id);
        }

        await loadTransactions();
    };

    const handleSplitSave = (splits) => {
        // Store split data with transaction (not saved to DB yet)
        setTransactions(prev =>
            prev.map(t =>
                t.id === splitModalTxn.id
                    ? { ...t, splitReady: true, splits }
                    : t
            )
        );
        setSplitModalTxn(null);
    };

    const filteredTransactions = transactions.filter(t =>
        t.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm">
                <button
                    onClick={() => navigate('/accounts')}
                    className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Bank and Cash Accounts
                </button>
                <span className="text-gray-400">›</span>
                <span className="text-gray-600">Uncategorized Receipts</span>
            </div>

            {/* Header */}
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900">
                    Uncategorized Receipts
                </h1>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-lg"
                        />
                    </div>
                    <TransactionUpload
                        accounts={[account].filter(Boolean)}
                        onUpload={(file) => handleUpload(file)}
                        loading={loading}
                    />
                </div>
            </div>

            {/* Bulk Update Button */}
            {selectedTxns.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-blue-900 font-medium">
                            {selectedTxns.size} transaction(s) selected
                        </span>
                        <button
                            onClick={handleBulkUpdate}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                        >
                            Bulk Update Selected
                        </button>
                    </div>
                </div>
            )}

            {/* Transactions Table */}
            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-4 py-3 text-center w-12">
                                <input
                                    type="checkbox"
                                    checked={selectedAll}
                                    onChange={handleSelectAll}
                                    className="rounded"
                                />
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-24">

                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Date
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Description
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Account
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                Amount
                            </th>
                            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {filteredTransactions.map((txn) => (
                            <tr key={txn.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-center">
                                    <input
                                        type="checkbox"
                                        checked={selectedTxns.has(txn.id)}
                                        onChange={() => handleCheckboxChange(txn.id)}
                                        className="rounded"
                                    />
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => setEditModalTxn(txn)}
                                            className="text-blue-600 hover:text-blue-800 text-left"
                                        >
                                            Edit
                                        </button>
                                        <button className="text-gray-600 hover:text-gray-800 text-left">
                                            View
                                        </button>
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {txn.date}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {txn.description}
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    <div className="space-y-1">
                                        <div className="line-through text-gray-400">
                                            {suspenseAccount?.name || 'Suspense'}
                                        </div>
                                        {txn.splitReady ? (
                                            <div className="text-green-600 font-medium">
                                                ✓ Split Ready
                                            </div>
                                        ) : txn.suggestion?.type === 'split' ? (
                                            <div className="text-orange-600">
                                                💡 {txn.suggestion.message}
                                            </div>
                                        ) : txn.suggestion?.type === 'coa' ? (
                                            <div className="text-blue-600">
                                                💡 {txn.suggestion.chartOfAccountName}
                                            </div>
                                        ) : (
                                            <div className="text-yellow-600">
                                                ⚠️ Please select
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm text-right font-medium">
                                    ${Math.abs(txn.amount).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col gap-1">
                                        {txn.suggestion?.type === 'split' && !txn.splitReady && (
                                            <button
                                                onClick={() => setSplitModalTxn(txn)}
                                                className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                                            >
                                                Split
                                            </button>
                                        )}
                                        {txn.splitReady && (
                                            <button
                                                onClick={() => setSplitModalTxn(txn)}
                                                className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
                                            >
                                                Edit Split
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDelete(txn)}
                                            className="px-2 py-1 text-red-600 hover:text-red-800 text-xs"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {filteredTransactions.length === 0 && (
                    <div className="px-6 py-12 text-center text-gray-500">
                        No uncategorized transactions
                    </div>
                )}
            </div>

            {/* Edit COA Modal */}
            {editModalTxn && (
                <EditCoAModal
                    transaction={editModalTxn}
                    chartOfAccounts={chartOfAccounts}
                    onSave={(coaId) => {
                        // Update suggestion
                        setTransactions(prev =>
                            prev.map(t =>
                                t.id === editModalTxn.id
                                    ? {
                                        ...t,
                                        suggestion: {
                                            type: 'coa',
                                            chartOfAccountId: coaId,
                                            chartOfAccountName: chartOfAccounts.find(c => c.id === coaId)?.name
                                        }
                                    }
                                    : t
                            )
                        );
                        setEditModalTxn(null);
                    }}
                    onClose={() => setEditModalTxn(null)}
                />
            )}

            {/* Split Modal */}
            {splitModalTxn && (
                <ImprovedSplitModal
                    transaction={splitModalTxn}
                    totalAmount={Math.abs(splitModalTxn.amount)}
                    chartOfAccounts={chartOfAccounts}
                    existingSplits={splitModalTxn.splits}
                    onSave={handleSplitSave}
                    onClose={() => setSplitModalTxn(null)}
                />
            )}
        </div>
    );
};