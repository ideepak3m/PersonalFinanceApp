// src/pages/Transactions.jsx - Fixed version with proper field mapping

import React, { useEffect, useState } from 'react';
import { TransactionUpload } from '../components/transactions/TransactionUpload';
import { TransactionTable } from '../components/transactions/TransactionTable';
import { SplitModal } from '../components/transactions/SplitModal';
import transactionService from '../services/transactionService';
import {
    supabaseAccountsDB,
    supabaseTransactionsDB,
    supabaseChartOfAccountsDB,
    supabaseTransactionSplitDB,
    supabaseMerchantDB,
    supabaseCategoryDB
} from '../services/supabaseDatabase';

export const Transactions = () => {
    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [refresh, setRefresh] = useState(0);
    const [pendingImports, setPendingImports] = useState([]);
    const [chartOfAccounts, setChartOfAccounts] = useState([]);
    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitModalTxn, setSplitModalTxn] = useState(null);
    const [splitModalCallback, setSplitModalCallback] = useState(() => null);
    const [categories, setCategories] = useState([]);
    const [merchants, setMerchants] = useState([]);
    const [unknownMerchant, setUnknownMerchant] = useState(null);
    const [unknownMerchantIdx, setUnknownMerchantIdx] = useState(null);
    const [categoryPrompt, setCategoryPrompt] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');

    // Load all data
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [accs, txns, coa, cats, merchs] = await Promise.all([
                    supabaseAccountsDB.getAll(),
                    supabaseTransactionsDB.getAllWithRelations(),
                    supabaseChartOfAccountsDB.getAll(),
                    supabaseCategoryDB.getAll(),
                    supabaseMerchantDB.getAll()
                ]);

                setAccounts(accs || []);
                setTransactions(txns || []);
                setChartOfAccounts(coa || []);
                setCategories(cats || []);
                setMerchants(merchs || []);

                console.log('📊 Data loaded:', {
                    accounts: accs?.length,
                    transactions: txns?.length,
                    chartOfAccounts: coa?.length,
                    categories: cats?.length,
                    merchants: merchs?.length
                });
                // Debug log for chart of accounts data
                console.log('Chart of Accounts data:', coa);
            } catch (error) {
                console.error('Error loading data:', error);
                alert('Failed to load data: ' + error.message);
            }
        };
        fetchData();
    }, [refresh]);

    // Helper: UUID validation
    const isValidUUID = (uuid) => {
        if (!uuid || typeof uuid !== 'string') return false;
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(uuid);
    };

    // Helper: find merchant by raw name or alias
    const findMerchant = async (rawName) => {
        if (!rawName) return null;

        // Try normalized_name (case-insensitive)
        let merchant = merchants.find(m =>
            m.normalized_name?.toLowerCase() === rawName.toLowerCase()
        );
        if (merchant) return merchant;

        // Try aliases
        merchant = merchants.find(m =>
            Array.isArray(m.aliases) &&
            m.aliases.map(a => a.toLowerCase()).includes(rawName.toLowerCase())
        );
        if (merchant) return merchant;

        // Try DB fallback
        return await supabaseMerchantDB.getByRawNameOrAlias(rawName);
    };


    // Helper: get category by id
    const getCategoryById = (id) => {
        return categories.find(c => c.id === id);
    };

    // Helper: check if description contains any merchant normalized_name as a whole word
    const descriptionContainsMerchant = (description, merchants) => {
        if (!description) return false;
        for (const merchant of merchants) {
            const name = merchant.normalized_name;
            if (name) {
                // Whole word match, case-insensitive
                const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}\\b`, 'i');
                if (regex.test(description)) {
                    return true;
                }
            }
        }
        return false;
    };

    // Helper: get suggested chart of account by description
    const getSuggestedCoAId = (desc) => {
        if (!desc || !chartOfAccounts.length) return '';
        const lowerDesc = desc.toLowerCase();
        const match = chartOfAccounts.find(coa =>
            lowerDesc.includes(coa.name.toLowerCase()) ||
            (coa.description && lowerDesc.includes(coa.description.toLowerCase()))
        );
        return match ? match.id : '';
    };

    // Normalize transaction for database (snake_case)
    const normalizeTransaction = (txn) => {
        return {
            user_id: txn.user_id,
            date: txn.date,
            raw_merchant_name: txn.description || txn.raw_merchant_name,
            normalized_merchant_id: txn.normalized_merchant_id,
            amount: txn.amount,
            currency: txn.currency || 'USD',
            is_split: txn.is_split || false,
            notes: txn.notes || null,
            account_id: txn.account_id,
            category_id: txn.category_id,
            chart_of_account_id: txn.chart_of_account_id || null,
            split_chart_of_account_id: txn.split_chart_of_account_id || null,
            description: txn.description || txn.raw_merchant_name,
            memo: txn.memo || null,
            product_id: txn.product_id || null,
            type: txn.type || null
        };
    };

    // Main upload handler
    const handleUpload = async (file, accountId) => {
        try {
            console.log('📤 Starting file upload:', file.name);

            const fileName = file.name.toLowerCase();
            let mappedTransactions = [];

            if (fileName.endsWith('.csv')) {
                const csvData = await transactionService.parseCSV(file);
                mappedTransactions = transactionService.mapCSVToTransactions(csvData, accountId);
            } else if (fileName.endsWith('.qbo') || fileName.endsWith('.qfx')) {
                const ofxTxns = await transactionService.parseQBOQFX(file);
                mappedTransactions = transactionService.mapQBOQFXToTransactions(ofxTxns, accountId);
            } else {
                alert('Unsupported file type. Please upload a CSV, QBO, or QFX file.');
                return;
            }

            console.log('📊 Mapped transactions:', mappedTransactions.length);

            // Process each transaction
            await processTransactions(mappedTransactions, 0);
        } catch (error) {
            console.error('❌ Upload error:', error);
            alert('Failed to parse transactions. Please check the file format.');
        }
    };

    // Process transactions recursively
    const processTransactions = async (txns, startIdx) => {
        for (let i = startIdx; i < txns.length; i++) {
            const txn = txns[i];
            const rawName = txn.description?.trim();

            console.log(`Processing ${i + 1}/${txns.length}:`, rawName);

            const merchant = await findMerchant(rawName);

            if (!merchant) {
                console.log('❓ Unknown merchant:', rawName);
                setUnknownMerchant(rawName);
                setUnknownMerchantIdx(i);
                setCategoryPrompt(true);
                setPendingImports(txns);
                return; // Wait for user input
            }

            // Attach merchant/category
            txn.normalized_merchant_id = merchant.id;
            txn.category_id = merchant.category_id;
            txn.account_id = txn.account_id || txn.accountId;
            txn.is_split = false;

            const category = getCategoryById(merchant.category_id);

            if (category && category.is_split_enabled) {
                console.log('🔀 Transaction requires split');
                setSplitModalTxn({ txn, idx: i });
                setSplitModalCallback(() => (splits) =>
                    handleSplitSave(txn, splits, txns, i)
                );
                setShowSplitModal(true);
                setPendingImports(txns);
                return; // Wait for split input
            }

            // Assign chart of account suggestion
            txn.chart_of_account_id = getSuggestedCoAId(txn.description);
        }

        console.log('✅ All transactions processed');
        setPendingImports(txns);
    };

    // Handle saving splits for new transaction
    const handleSplitSave = async (txn, splits, allTxns, currentIdx) => {
        console.log('=== SPLIT SAVE START ===');
        setShowSplitModal(false);

        try {
            // Validate splits
            if (!splits || splits.length === 0) {
                throw new Error('No splits provided');
            }

            const totalPercent = splits.reduce((sum, s) => sum + (parseFloat(s.percent) || 0), 0);
            if (Math.abs(totalPercent - 100) > 0.01) {
                throw new Error(`Splits must total 100% (currently ${totalPercent.toFixed(1)}%)`);
            }

            const invalidSplits = splits.filter(s => !s.chartOfAccountId);
            if (invalidSplits.length > 0) {
                throw new Error('All splits must have a Chart of Account selected');
            }

            // Validate UUIDs
            for (const split of splits) {
                if (!isValidUUID(split.chartOfAccountId)) {
                    throw new Error(`Invalid Chart of Account ID: "${split.chartOfAccountId}"`);
                }
            }

            // Prepare transaction for save
            const txnToSave = normalizeTransaction({
                ...txn,
                is_split: true,
                chart_of_account_id: null,
                split_chart_of_account_id: splits[0].chartOfAccountId
            });

            console.log('💾 Saving transaction:', txnToSave);
            const saved = await supabaseTransactionsDB.add(txnToSave);
            console.log('✅ Transaction saved:', saved.id);

            // Save splits
            const splitRecords = splits.map(split => ({
                transaction_id: saved.id,
                category_id: txn.category_id,
                amount: ((parseFloat(split.percent) || 0) / 100) * Math.abs(txn.amount),
                percentage: parseFloat(split.percent) || 0,
                belief_tag: null,
                chart_of_account_id: split.chartOfAccountId
            }));

            console.log('💾 Saving splits:', splitRecords);
            await supabaseTransactionSplitDB.bulkAdd(splitRecords);
            console.log('✅ Splits saved');

            // Continue processing remaining transactions
            const nextIdx = currentIdx + 1;
            if (nextIdx < allTxns.length) {
                await processTransactions(allTxns, nextIdx);
            } else {
                // All done
                setPendingImports(allTxns);
                setSplitModalTxn(null);
                setSplitModalCallback(() => null);
            }
        } catch (error) {
            console.error('=== SPLIT SAVE ERROR ===', error);
            alert(`Failed to save split: ${error.message}`);
            setShowSplitModal(true); // Re-show modal
        }
    };

    // Handle unknown merchant category assignment
    const handleUnknownMerchantCategory = async () => {
        if (!selectedCategoryId || unknownMerchantIdx == null) return;

        try {
            const merchant = await supabaseMerchantDB.add({
                normalized_name: unknownMerchant,
                category_id: selectedCategoryId,
                aliases: [unknownMerchant]
            });

            console.log('✅ Merchant added:', merchant);

            // Update pending imports
            const updated = [...pendingImports];
            updated[unknownMerchantIdx].normalized_merchant_id = merchant.id;
            updated[unknownMerchantIdx].category_id = selectedCategoryId;

            // Clear prompt
            setUnknownMerchant(null);
            setUnknownMerchantIdx(null);
            setCategoryPrompt(false);
            setSelectedCategoryId('');

            // Refresh merchants
            const merchs = await supabaseMerchantDB.getAll();
            setMerchants(merchs || []);

            // Continue processing
            await processTransactions(updated, unknownMerchantIdx);
        } catch (error) {
            console.error('Error adding merchant:', error);
            alert('Failed to add merchant: ' + error.message);
        }
    };

    // Handle chart of account change
    const handleCoAChange = (idx, value) => {
        setPendingImports(prev => prev.map((txn, i) =>
            i === idx ? { ...txn, chart_of_account_id: value } : txn
        ));
    };

    // Confirm import
    const handleConfirmImport = async () => {
        try {
            const toImport = pendingImports.filter(txn =>
                txn.chart_of_account_id && !txn.is_split
            );

            if (toImport.length === 0) {
                alert('No transactions to import. Please assign Chart of Accounts.');
                return;
            }

            const txnsToSave = toImport.map(txn => normalizeTransaction(txn));

            console.log('Importing transactions:', txnsToSave);
            await supabaseTransactionsDB.bulkAdd(txnsToSave);

            setPendingImports([]);
            setRefresh(r => r + 1);
            alert(`Successfully imported ${txnsToSave.length} transactions!`);
        } catch (error) {
            console.error('Error importing:', error);
            alert('Failed to import: ' + error.message);
        }
    };

    // Delete transaction
    const handleDelete = async (id) => {
        if (window.confirm('Delete this transaction?')) {
            try {
                await supabaseTransactionsDB.delete(id);
                setRefresh(r => r + 1);
                alert('Transaction deleted!');
            } catch (error) {
                console.error('Error deleting:', error);
                alert('Failed to delete: ' + error.message);
            }
        }
    };

    // Edit transaction
    const handleEdit = (transaction) => {
        alert('Edit functionality coming soon!');
    };

    // Split existing transaction
    const handleSplitExisting = (txn) => {
        const category = getCategoryById(txn.category_id);
        if (category && category.is_split_enabled) {
            setSplitModalTxn({ txn, idx: null });
            setSplitModalCallback(() => (splits) =>
                handleSplitSaveExisting(txn, splits)
            );
            setShowSplitModal(true);
        } else {
            alert('This category is not split-enabled.');
        }
    };

    // Save splits for existing transaction
    const handleSplitSaveExisting = async (txn, splits) => {
        setShowSplitModal(false);

        try {
            // Validate
            if (!splits || splits.length === 0) {
                throw new Error('No splits provided');
            }

            const totalPercent = splits.reduce((sum, s) => sum + (parseFloat(s.percent) || 0), 0);
            if (Math.abs(totalPercent - 100) > 0.01) {
                throw new Error(`Splits must total 100%`);
            }

            for (const split of splits) {
                if (!split.chartOfAccountId || !isValidUUID(split.chartOfAccountId)) {
                    throw new Error('Invalid Chart of Account');
                }
            }

            // Update transaction
            await supabaseTransactionsDB.update(txn.id, {
                is_split: true,
                chart_of_account_id: null,
                split_chart_of_account_id: splits[0].chartOfAccountId
            });

            // Delete old splits
            await supabaseTransactionSplitDB.deleteByTransactionId(txn.id);

            // Save new splits
            const splitRecords = splits.map(split => ({
                transaction_id: txn.id,
                category_id: txn.category_id,
                amount: ((parseFloat(split.percent) || 0) / 100) * Math.abs(txn.amount),
                percentage: parseFloat(split.percent) || 0,
                belief_tag: null,
                chart_of_account_id: split.chartOfAccountId
            }));

            await supabaseTransactionSplitDB.bulkAdd(splitRecords);

            setSplitModalTxn(null);
            setSplitModalCallback(() => null);
            setRefresh(r => r + 1);
            alert('Splits updated!');
        } catch (error) {
            console.error('Error updating splits:', error);
            alert(`Failed to update splits: ${error.message}`);
            setShowSplitModal(true);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Transactions</h1>
                <p className="text-gray-600">Upload and manage your financial transactions</p>
            </div>

            <TransactionUpload accounts={accounts} onUpload={handleUpload} />

            {/* Pending Imports */}
            {pendingImports.length > 0 && !categoryPrompt && !showSplitModal && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-900 mb-2">
                        Review & Assign Chart of Account
                    </h3>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-yellow-100">
                                <tr>
                                    <th className="px-4 py-2 text-xs text-yellow-800">Date</th>
                                    <th className="px-4 py-2 text-xs text-yellow-800">Description</th>
                                    <th className="px-4 py-2 text-xs text-yellow-800">Amount</th>
                                    <th className="px-4 py-2 text-xs text-yellow-800">Chart of Account</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pendingImports.map((txn, idx) => {
                                    // Show split button if description contains any merchant normalized_name as a whole word
                                    const showSplitButton = descriptionContainsMerchant(txn.description, merchants);

                                    return (
                                        <tr key={idx} className="border-b">
                                            <td className="px-4 py-2 text-sm">{txn.date}</td>
                                            <td className="px-4 py-2 text-sm">{txn.description}</td>
                                            <td className={`px-4 py-2 text-sm font-semibold ${txn.amount >= 0 ? 'text-green-700' : 'text-red-700'
                                                }`}>
                                                ${Math.abs(txn.amount).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-2 text-sm">
                                                {showSplitButton ? (
                                                    <button
                                                        className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                                                        onClick={() => handleSplitExisting(txn)}
                                                    >
                                                        Split
                                                    </button>
                                                ) : (
                                                    <select
                                                        value={txn.chart_of_account_id || ''}
                                                        onChange={e => handleCoAChange(idx, e.target.value)}
                                                        className="border rounded px-2 py-1 w-full"
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
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                    <button
                        onClick={handleConfirmImport}
                        className="mt-4 px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                    >
                        Confirm Import
                    </button>
                </div>
            )}

            {/* Category Prompt */}
            {categoryPrompt && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-lg p-6 min-w-[350px]">
                        <h2 className="text-lg font-semibold mb-4">Categorize Merchant</h2>
                        <p className="mb-2">
                            Merchant <strong>{unknownMerchant}</strong> not found.
                            Select a category:
                        </p>
                        <select
                            value={selectedCategoryId}
                            onChange={e => setSelectedCategoryId(e.target.value)}
                            className="border rounded px-2 py-1 w-full mb-4"
                        >
                            <option value="">Select category...</option>
                            {categories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                </option>
                            ))}
                        </select>
                        <div className="flex gap-2 justify-end">
                            <button
                                onClick={() => {
                                    setCategoryPrompt(false);
                                    setUnknownMerchant(null);
                                }}
                                className="px-4 py-2 bg-gray-300 rounded"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleUnknownMerchantCategory}
                                className="px-4 py-2 bg-green-600 text-white rounded"
                                disabled={!selectedCategoryId}
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Split Modal */}
            {showSplitModal && splitModalTxn && (
                <SplitModal
                    totalAmount={Math.abs(splitModalTxn.txn.amount)}
                    chartOfAccounts={chartOfAccounts}
                    onSave={splitModalCallback}
                    onClose={() => {
                        setShowSplitModal(false);
                        setSplitModalTxn(null);
                        setSplitModalCallback(() => null);
                    }}
                />
            )}

            {/* Transactions Table */}
            <TransactionTable
                transactions={transactions}
                accounts={accounts}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onSplit={handleSplitExisting}
                splitEnabledChecker={txn => {
                    const cat = getCategoryById(txn.category_id);
                    return cat?.is_split_enabled;
                }}
            />
        </div>
    );
};