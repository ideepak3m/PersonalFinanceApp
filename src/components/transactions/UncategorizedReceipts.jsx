// src/components/transactions/UncategorizedReceipts.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Search, ChevronLeft, Loader2 } from 'lucide-react';
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
    supabaseTransactionSplitDB,
    supabaseMerchantSplitRulesDB
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
    const [merchantSplitRules, setMerchantSplitRules] = useState([]);
    const [suspenseAccount, setSuspenseAccount] = useState(null);

    const [selectedAll, setSelectedAll] = useState(false);
    const [selectedTxns, setSelectedTxns] = useState(new Set());
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [merchantSearch, setMerchantSearch] = useState({});
    const [showMerchantDropdown, setShowMerchantDropdown] = useState({});

    // Modals
    const [editModalTxn, setEditModalTxn] = useState(null);
    const [splitModalTxn, setSplitModalTxn] = useState(null);

    // Bulk update progress
    const [bulkUpdating, setBulkUpdating] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, status: '' });

    useEffect(() => {
        loadData();
    }, [accountId]);

    const loadData = async () => {
        try {
            setLoading(true);

            const [acc, coa, cats, merchs, splitRules] = await Promise.all([
                supabaseAccountsDB.getById(accountId),
                supabaseChartOfAccountsDB.getAll(),
                supabaseCategoryDB.getAll(),
                supabaseMerchantDB.getAll(),
                supabaseMerchantSplitRulesDB.getAll()
            ]);

            setAccount(acc);

            // Sort COA by name
            const sortedCoa = (coa || []).sort((a, b) =>
                (a.name || '').localeCompare(b.name || '')
            );
            setChartOfAccounts(sortedCoa);

            setCategories(cats || []);

            // Remove duplicates and sort merchants alphabetically
            const uniqueMerchants = Array.from(
                new Map((merchs || []).map(m => [m.id, m])).values()
            ).sort((a, b) =>
                (a.normalized_name || '').localeCompare(b.normalized_name || '')
            );
            setMerchants(uniqueMerchants);
            setMerchantSplitRules(splitRules || []);

            // Find suspense account
            const suspense = sortedCoa.find(c =>
                c.name?.toLowerCase() === 'suspense'
            );
            setSuspenseAccount(suspense);

            // Load uncategorized transactions with enrichment
            await loadTransactions(merchs || [], cats || [], sortedCoa, splitRules || []);

        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const loadTransactions = async (merchantsData = null, categoriesData = null, coaData = null, splitRulesData = null) => {
        try {
            const { data, error } = await supabaseTransactionsDB.table()
                .select(`
                    *,
                    merchant:normalized_merchant_id (
                        id,
                        normalized_name,
                        aliases
                    )
                `)
                .eq('account_id', accountId)
                .eq('status', 'uncategorized')
                .order('date', { ascending: false });

            if (error) throw error;

            //console.log('Loaded transactions:', data?.length, 'First txn:', data?.[0]);

            // Use passed data or fall back to state
            const merchantsList = merchantsData || merchants;
            const categoriesList = categoriesData || categories;
            const coaList = coaData || chartOfAccounts;
            const splitRulesList = splitRulesData || merchantSplitRules;

            // Enrich with suggestions AND suggested merchant
            const enriched = (data || []).map(txn => {
                const suggestion = getSuggestion(txn, merchantsList, categoriesList, coaList);

                // Find suggested merchant based on description
                const suggestedMerchant = findMatchingMerchant(txn.description, merchantsList);

                // Check if merchant has default split rule
                let defaultSplitRule = null;
                const merchantNameToCheck = txn.merchant?.normalized_name || suggestedMerchant?.normalized_name;

                if (merchantNameToCheck) {
                    defaultSplitRule = splitRulesList.find(rule =>
                        rule.merchant_friendly_name === merchantNameToCheck
                    );
                    console.log('Checking split rule for:', merchantNameToCheck, 'Found:', defaultSplitRule ? 'YES' : 'NO');
                    if (defaultSplitRule) {
                        console.log('Split rule details:', defaultSplitRule);
                    }
                } else {
                    console.log('Transaction has no merchant linked or suggested:', txn.description);
                }

                return {
                    ...txn,
                    suggestion,
                    suggestedMerchantId: suggestedMerchant?.id || null,
                    suggestedMerchantName: suggestedMerchant?.normalized_name || null,
                    defaultSplitRule: defaultSplitRule || null
                };
            });

            console.log('Split rules available:', splitRulesList?.length || 0);
            console.log('Enriched transactions:', enriched.filter(t => t.defaultSplitRule).length, 'with split rules');

            setTransactions(enriched);
        } catch (error) {
            console.error('Error loading transactions:', error);
        }
    };

    // Helper function to find matching merchant
    const findMatchingMerchant = (description, merchantsList) => {
        if (!description || !merchantsList || merchantsList.length === 0) return null;

        const descLower = description.toLowerCase();

        // Try to find merchant by checking if description contains merchant name or aliases
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

        return merchant || null;
    };

    const getSuggestion = (txn, merchantsList, categoriesList, coaList) => {
        if (!txn.description || !merchantsList || merchantsList.length === 0) return null;

        const descLower = txn.description.toLowerCase();

        //console.log('Checking suggestion for:', txn.description, 'against', merchantsList.length, 'merchants');

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
            //console.log('No merchant match found for:', txn.description);
            return null;
        }

        //console.log('Merchant found:', merchant.normalized_name);

        const category = categoriesList.find(c => c.id === merchant.category_id);

        if (category?.is_split_enabled) {
            //console.log('Split enabled for category:', category.name);
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

    // Helper to check if user manually selected a COA (not Suspense)
    const hasManualCoaSelection = (t) => {
        if (!t.chart_of_account_id) return false;
        const coa = chartOfAccounts.find(c => c.id === t.chart_of_account_id);
        // If COA is Suspense, it's not a manual selection
        if (coa?.name?.toLowerCase() === 'suspense') return false;
        return true;
    };

    const handleSelectAll = () => {
        if (selectedAll) {
            setSelectedTxns(new Set());
        } else {
            // Only select transactions that are valid for bulk update
            const validTransactions = transactions.filter(t => {
                // Include split transactions
                if (t.splitReady) return true;

                // Include transactions where user manually selected a COA
                if (hasManualCoaSelection(t)) return true;

                // Include transactions with default split rule available
                if (t.defaultSplitRule && t.defaultSplitRule.splits?.length > 0) return true;

                // Include transactions with COA suggestions that are NOT Suspense
                if (t.suggestion?.type === 'coa') {
                    const coaId = t.suggestion.chartOfAccountId;
                    const coa = chartOfAccounts.find(c => c.id === coaId);
                    if (coa?.name?.toLowerCase() === 'suspense') return false;
                    return true;
                }

                return false;
            });

            setSelectedTxns(new Set(validTransactions.map(t => t.id)));
        }
        setSelectedAll(!selectedAll);
    };

    const handleBulkUpdate = async () => {
        try {
            const selectedTransactions = transactions.filter(t => selectedTxns.has(t.id));

            // Filter transactions that have a valid COA (not Suspense), are split ready, or have default split available
            const validTransactions = selectedTransactions.filter(t => {
                // Include split transactions that are manually ready
                if (t.splitReady) return true;

                // Include transactions where user manually selected a COA (takes precedence over default split)
                if (hasManualCoaSelection(t)) return true;

                // Include transactions with default split rule available (only if no manual COA selected)
                if (t.defaultSplitRule && t.defaultSplitRule.splits?.length > 0) return true;

                // Include transactions with COA suggestions that are NOT Suspense
                if (t.suggestion?.type === 'coa') {
                    const coaId = t.suggestion.chartOfAccountId;
                    const coa = chartOfAccounts.find(c => c.id === coaId);
                    // Exclude if COA is Suspense
                    if (coa?.name?.toLowerCase() === 'suspense') return false;
                    return true;
                }

                return false;
            });

            if (validTransactions.length === 0) {
                alert('No valid transactions ready to update. Please ensure transactions have a Chart of Account selected (not Suspense), are split ready, or have a default split available.');
                return;
            }

            // Count transactions by type for confirmation message
            // Manual COA selection takes precedence over default split
            const splitReadyCount = validTransactions.filter(t => t.splitReady).length;
            const manualCoaCount = validTransactions.filter(t => !t.splitReady && hasManualCoaSelection(t)).length;
            const defaultSplitCount = validTransactions.filter(t => !t.splitReady && !hasManualCoaSelection(t) && t.defaultSplitRule).length;
            const suggestedCoaCount = validTransactions.length - splitReadyCount - manualCoaCount - defaultSplitCount;

            // Show confirmation with detailed count
            const confirmMsg = `Ready to categorize ${validTransactions.length} transaction(s):\n` +
                `• ${splitReadyCount} manually split\n` +
                `• ${manualCoaCount} with manually selected COA\n` +
                `• ${defaultSplitCount} using default split rules\n` +
                `• ${suggestedCoaCount} with suggested COA\n\nContinue?`;
            const confirm = window.confirm(confirmMsg);
            if (!confirm) return;

            // Show progress modal
            setBulkUpdating(true);
            setBulkProgress({ current: 0, total: validTransactions.length, status: 'Starting...' });

            const successCount = { updated: 0, failed: 0 };

            // Process each transaction
            for (let i = 0; i < validTransactions.length; i++) {
                const txn = validTransactions[i];
                setBulkProgress({
                    current: i + 1,
                    total: validTransactions.length,
                    status: `Processing: ${txn.description?.substring(0, 30) || 'Transaction'}...`
                });

                try {
                    // Check if user manually selected a COA - this takes precedence over default split
                    const userSelectedCoa = hasManualCoaSelection(txn);

                    // Determine if this transaction should be split
                    // Only use default split if: manually split ready OR (has default split AND user hasn't manually selected a COA)
                    const shouldSplit = txn.splitReady || (!userSelectedCoa && txn.defaultSplitRule && txn.defaultSplitRule.splits?.length > 0);

                    // Get splits: either from manual split or from default rule (only if not using manual COA)
                    const splitsToUse = txn.splitReady
                        ? txn.splits
                        : (!userSelectedCoa && txn.defaultSplitRule?.splits || []).map(s => ({
                            chartOfAccountId: s.chart_of_account_id || s.chartOfAccountId,
                            percent: s.percentage || s.percent,
                            amount: (parseFloat(s.percentage || s.percent) / 100) * Math.abs(txn.amount),
                            description: s.description || null
                        }));

                    const updates = {
                        chart_of_account_id: shouldSplit ? null : (txn.chart_of_account_id || txn.suggestion?.chartOfAccountId),
                        status: shouldSplit ? 'split' : 'categorized',
                        is_split: shouldSplit,
                        normalized_merchant_id: txn.suggestedMerchantId || txn.normalized_merchant_id
                    };

                    // Update transaction status and COA
                    await supabaseTransactionsDB.update(txn.id, updates);

                    // If it's a split transaction (manual or default), save the split records
                    if (shouldSplit && splitsToUse && splitsToUse.length > 0) {
                        // Delete existing splits first (in case of re-edit)
                        await supabaseTransactionSplitDB.deleteByTransactionId(txn.id);

                        // Prepare split records for database
                        const splitRecords = splitsToUse.map(s => ({
                            transaction_id: txn.id,
                            chart_of_account_id: s.chartOfAccountId,
                            percentage: parseFloat(s.percent) || 0,
                            amount: parseFloat(s.amount) || (parseFloat(s.percent) / 100) * Math.abs(txn.amount),
                            description: s.description || null
                        }));

                        // Save all splits
                        for (const splitRecord of splitRecords) {
                            await supabaseTransactionSplitDB.add(splitRecord);
                        }

                        // Only create merchant split rule if this was a manual split (not using default)
                        if (txn.splitReady && txn.suggestedMerchantName) {
                            const existingRule = await supabaseMerchantSplitRulesDB.getByMerchantName(txn.suggestedMerchantName);

                            if (!existingRule) {
                                // Create new merchant split rule
                                const ruleRecord = {
                                    merchant_friendly_name: txn.suggestedMerchantName,
                                    splits: splitsToUse.map(s => ({
                                        chartOfAccountId: s.chartOfAccountId,
                                        percent: parseFloat(s.percent) || 0,
                                        description: s.description || null
                                    }))
                                };

                                await supabaseMerchantSplitRulesDB.add(ruleRecord);
                                console.log('Created new split rule for merchant:', txn.suggestedMerchantName);
                            } else {
                                console.log('Split rule already exists for merchant:', txn.suggestedMerchantName);
                            }
                        }
                    }

                    successCount.updated++;

                } catch (error) {
                    console.error('Failed to process transaction:', txn.id, error);
                    successCount.failed++;
                }
            }

            setBulkProgress({ current: validTransactions.length, total: validTransactions.length, status: 'Reloading...' });

            // Reload transactions
            await loadTransactions();
            setSelectedTxns(new Set());
            setSelectedAll(false);

            // Close progress modal
            setBulkUpdating(false);

            const message = successCount.failed > 0
                ? `Categorized ${successCount.updated} transactions. ${successCount.failed} failed.`
                : `Successfully categorized ${successCount.updated} transactions.`;

            alert(message);

        } catch (error) {
            console.error('Bulk update error:', error);
            setBulkUpdating(false);
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

    const handleSplitSave = async (splits) => {
        const transaction = splitModalTxn;

        // Store split data with transaction (not saved to DB yet)
        setTransactions(prev =>
            prev.map(t =>
                t.id === transaction.id
                    ? { ...t, splitReady: true, splits }
                    : t
            )
        );

        // Check if this merchant has a normalized_merchant_id and merchant name
        const merchantId = transaction.normalized_merchant_id;
        // Get merchant name from linked merchant OR from suggested merchant name
        const merchantName = transaction.merchant?.normalized_name || transaction.suggestedMerchantName;

        console.log('Split save - merchantId:', merchantId, 'merchantName:', merchantName);

        if (merchantName) {
            // Check if a split rule already exists for this merchant
            const existingRule = await supabaseMerchantSplitRulesDB.getByMerchantName(merchantName);

            if (!existingRule) {
                // Ask user if they want to save as default
                const saveAsDefault = confirm(
                    `Would you like to save this split as the default for "${merchantName}"?\n\n` +
                    `This will automatically suggest this split configuration for future transactions from this merchant.`
                );

                if (saveAsDefault) {
                    try {
                        // Convert splits to the format expected by merchant_split_rules table
                        const splitRules = splits
                            .filter(s => s.chartOfAccountId && s.percent > 0)
                            .map(s => ({
                                chart_of_account_id: s.chartOfAccountId,
                                percentage: parseFloat(s.percent)
                            }));

                        const newRule = await supabaseMerchantSplitRulesDB.add({
                            merchant_friendly_name: merchantName,
                            splits: splitRules
                        });

                        console.log('Created split rule:', newRule);

                        // Update other transactions with the same merchant to show default split available
                        if (newRule) {
                            setTransactions(prev => {
                                const updated = prev.map(t => {
                                    // Skip the current transaction (already marked as splitReady)
                                    if (t.id === transaction.id) return t;

                                    // Check if this transaction has the same merchant (by linked merchant OR suggested name)
                                    const txnMerchantName = t.merchant?.normalized_name || t.suggestedMerchantName;
                                    console.log('Comparing:', txnMerchantName, 'with', merchantName, 'splitReady:', t.splitReady);

                                    if (txnMerchantName === merchantName && !t.splitReady) {
                                        console.log('Updating transaction:', t.id, 'with default split rule');
                                        return {
                                            ...t,
                                            defaultSplitRule: {
                                                ...newRule,
                                                splits: splitRules
                                            }
                                        };
                                    }
                                    return t;
                                });
                                console.log('Updated transactions count:', updated.filter(t => t.defaultSplitRule).length);
                                return updated;
                            });

                            // Also update the merchantSplitRules state
                            setMerchantSplitRules(prev => [...prev, newRule]);
                        }

                        alert(`✓ Default split rule saved for "${merchantName}". Other transactions from this merchant have been updated.`);
                    } catch (error) {
                        console.error('Error saving default split rule:', error);
                        alert('Failed to save default split rule: ' + error.message);
                    }
                }
            }
        }

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

            {/* Bulk Update Progress Modal */}
            {bulkUpdating && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-96">
                        <div className="flex items-center gap-3 mb-4">
                            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                            <h3 className="text-lg font-semibold text-gray-900">Bulk Update in Progress</h3>
                        </div>
                        <div className="mb-3">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                                <span>Processing transactions...</span>
                                <span>{bulkProgress.current} / {bulkProgress.total}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                        <p className="text-sm text-gray-500 truncate">{bulkProgress.status}</p>
                    </div>
                </div>
            )}

            {/* Bulk Update Button */}
            {selectedTxns.size > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <span className="text-blue-900 font-medium">
                            {selectedTxns.size} transaction(s) selected
                        </span>
                        <button
                            onClick={handleBulkUpdate}
                            disabled={bulkUpdating}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {bulkUpdating && <Loader2 className="w-4 h-4 animate-spin" />}
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
                                Description (Raw)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Merchant (Friendly)
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                Default Split
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
                                    {/* Show suggested merchant if found */}
                                    {/* {txn.suggestedMerchantName && !txn.normalized_merchant_id && (
                                        <div className="text-xs text-green-600 mb-1 flex items-center gap-1">
                                            💡 Suggested: <strong>{txn.suggestedMerchantName}</strong>
                                        </div>
                                    )} */}
                                    {/* Debug info */}
                                    {/* <div className="text-xs text-gray-500 mb-1">
                                        Linked: {txn.normalized_merchant_id ? txn.merchant?.normalized_name || 'Yes' : 'No'} |
                                        Suggested: {txn.suggestedMerchantName || 'None'}
                                    </div> */}

                                    {/* Searchable Merchant Input */}
                                    <div className="relative">
                                        <input
                                            type="text"
                                            value={merchantSearch[txn.id] ??
                                                (txn.normalized_merchant_id
                                                    ? merchants.find(m => m.id === txn.normalized_merchant_id)?.normalized_name
                                                    : txn.suggestedMerchantName) ?? ''}
                                            onChange={(e) => {
                                                setMerchantSearch({ ...merchantSearch, [txn.id]: e.target.value });
                                                setShowMerchantDropdown({ ...showMerchantDropdown, [txn.id]: true });
                                            }}
                                            onFocus={() => setShowMerchantDropdown({ ...showMerchantDropdown, [txn.id]: true })}
                                            onBlur={() => {
                                                // Delay to allow clicking on dropdown items
                                                setTimeout(() => {
                                                    setShowMerchantDropdown(prev => ({ ...prev, [txn.id]: false }));
                                                }, 200);
                                            }}
                                            placeholder="Search or add merchant..."
                                            className={`border rounded px-2 py-1 text-sm w-full ${txn.normalized_merchant_id
                                                ? 'bg-green-50 border-green-300'
                                                : txn.suggestedMerchantId
                                                    ? 'bg-yellow-50 border-yellow-300'
                                                    : 'bg-white'
                                                }`}
                                        />

                                        {/* Dropdown */}
                                        {showMerchantDropdown[txn.id] && (
                                            <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                                {(() => {
                                                    const searchValue = (merchantSearch[txn.id] || '').toLowerCase();
                                                    const filtered = merchants.filter(m =>
                                                        m.normalized_name?.toLowerCase().includes(searchValue)
                                                    );

                                                    return (
                                                        <>
                                                            {filtered.length > 0 ? (
                                                                filtered.map(merchant => (
                                                                    <button
                                                                        key={merchant.id}
                                                                        onClick={async () => {
                                                                            try {
                                                                                await supabaseTransactionsDB.update(txn.id, {
                                                                                    normalized_merchant_id: merchant.id
                                                                                });
                                                                                setMerchantSearch({ ...merchantSearch, [txn.id]: merchant.normalized_name });
                                                                                setShowMerchantDropdown({ ...showMerchantDropdown, [txn.id]: false });
                                                                                await loadTransactions();
                                                                            } catch (error) {
                                                                                console.error('Error linking merchant:', error);
                                                                                alert('Failed to link merchant');
                                                                            }
                                                                        }}
                                                                        className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm border-b"
                                                                    >
                                                                        {merchant.normalized_name}
                                                                        {merchant.id === txn.suggestedMerchantId && ' ⭐'}
                                                                    </button>
                                                                ))
                                                            ) : (
                                                                <div className="px-3 py-2 text-sm text-gray-500">
                                                                    No merchants found
                                                                </div>
                                                            )}

                                                            {/* Add new merchant option */}
                                                            {merchantSearch[txn.id] && merchantSearch[txn.id].trim().length > 0 && (
                                                                <button
                                                                    onClick={async () => {
                                                                        try {
                                                                            const newMerchant = await supabaseMerchantDB.add({
                                                                                normalized_name: merchantSearch[txn.id].trim(),
                                                                                aliases: [txn.description]
                                                                            });
                                                                            await supabaseTransactionsDB.update(txn.id, {
                                                                                normalized_merchant_id: newMerchant.id
                                                                            });
                                                                            setShowMerchantDropdown({ ...showMerchantDropdown, [txn.id]: false });
                                                                            await loadData();
                                                                        } catch (error) {
                                                                            console.error('Error creating merchant:', error);
                                                                            alert('Failed to create merchant');
                                                                        }
                                                                    }}
                                                                    className="w-full text-left px-3 py-2 bg-blue-50 hover:bg-blue-100 text-sm font-medium text-blue-700 border-t-2"
                                                                >
                                                                    ➕ Add "{merchantSearch[txn.id].trim()}"
                                                                </button>
                                                            )}
                                                        </>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-sm">
                                    {txn.defaultSplitRule ? (
                                        <div className="text-xs">
                                            {txn.defaultSplitRule.splits.map((split, idx) => {
                                                const coa = chartOfAccounts.find(c => c.id === (split.chart_of_account_id || split.category_id));
                                                return (
                                                    <div key={idx} className="text-purple-600">
                                                        {coa?.name || 'Unknown'}: {split.percentage}%
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (txn.suggestion?.type === 'split' || txn.defaultSplitRule) ? (
                                        <div className="text-xs text-gray-400">
                                            No default split
                                        </div>
                                    ) : null}
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
                                        ) : hasManualCoaSelection(txn) ? (
                                            <div className="text-green-600 font-medium">
                                                ✓ {chartOfAccounts.find(c => c.id === txn.chart_of_account_id)?.name}
                                            </div>
                                        ) : txn.defaultSplitRule ? (
                                            <div className="text-purple-600 font-medium">
                                                💡 Default Split Available
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
                                <td className={`px-4 py-3 text-sm text-right font-medium ${txn.amount > 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    <div>
                                        <div>{txn.amount > 0 ? '+' : '-'}${Math.abs(txn.amount).toFixed(2)}</div>
                                        {txn.amount > 0 && (
                                            <div className="text-xs text-green-600 font-normal">Refund</div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex flex-col gap-1">
                                        {txn.splitReady ? (
                                            <button
                                                onClick={() => setSplitModalTxn(txn)}
                                                className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200"
                                            >
                                                Edit Split
                                            </button>
                                        ) : (txn.suggestion?.type === 'split' || txn.defaultSplitRule) ? (
                                            <>
                                                <button
                                                    onClick={() => setSplitModalTxn(txn)}
                                                    className="px-2 py-1 bg-purple-600 text-white rounded text-xs hover:bg-purple-700"
                                                >
                                                    Split
                                                </button>
                                                <button
                                                    onClick={() => setEditModalTxn(txn)}
                                                    className="px-2 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
                                                >
                                                    Select COA
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => setEditModalTxn(txn)}
                                                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                                            >
                                                Select
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
                    onSave={async (coaId) => {
                        try {
                            const coaName = chartOfAccounts.find(c => c.id === coaId)?.name;
                            const merchantName = editModalTxn.merchant?.normalized_name || editModalTxn.suggestedMerchantName;

                            // Save to database
                            await supabaseTransactionsDB.update(editModalTxn.id, {
                                chart_of_account_id: coaId
                            });

                            // Update local state for this transaction
                            setTransactions(prev =>
                                prev.map(t =>
                                    t.id === editModalTxn.id
                                        ? {
                                            ...t,
                                            chart_of_account_id: coaId,
                                            suggestion: {
                                                type: 'coa',
                                                chartOfAccountId: coaId,
                                                chartOfAccountName: coaName
                                            }
                                        }
                                        : t
                                )
                            );

                            // If there's a merchant, ask if they want to apply to other transactions
                            if (merchantName) {
                                // Count other transactions with the same merchant
                                const otherTxns = transactions.filter(t =>
                                    t.id !== editModalTxn.id &&
                                    !t.splitReady &&
                                    !t.defaultSplitRule &&
                                    (t.merchant?.normalized_name === merchantName || t.suggestedMerchantName === merchantName)
                                );

                                if (otherTxns.length > 0) {
                                    const applyToOthers = confirm(
                                        `Found ${otherTxns.length} other transaction(s) from "${merchantName}".\n\n` +
                                        `Would you like to suggest "${coaName}" for those transactions too?`
                                    );

                                    if (applyToOthers) {
                                        // Update suggestions for other transactions with the same merchant
                                        setTransactions(prev =>
                                            prev.map(t => {
                                                if (t.id === editModalTxn.id) return t; // Already updated
                                                if (t.splitReady || t.defaultSplitRule) return t; // Skip split transactions

                                                const txnMerchantName = t.merchant?.normalized_name || t.suggestedMerchantName;
                                                if (txnMerchantName === merchantName) {
                                                    console.log('Updating suggestion for transaction:', t.id);
                                                    return {
                                                        ...t,
                                                        suggestion: {
                                                            type: 'coa',
                                                            chartOfAccountId: coaId,
                                                            chartOfAccountName: coaName
                                                        }
                                                    };
                                                }
                                                return t;
                                            })
                                        );
                                    }
                                }
                            }

                            setEditModalTxn(null);
                        } catch (error) {
                            console.error('Error saving COA:', error);
                            alert('Failed to save Chart of Account');
                        }
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
                    existingSplits={splitModalTxn.splits || (splitModalTxn.defaultSplitRule ? splitModalTxn.defaultSplitRule.splits : null)}
                    onSave={handleSplitSave}
                    onClose={() => setSplitModalTxn(null)}
                />
            )}
        </div>
    );
};