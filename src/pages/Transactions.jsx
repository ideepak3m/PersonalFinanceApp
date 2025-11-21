// Helper: check if description contains any merchant normalized_name (case-insensitive substring)
const descriptionContainsMerchant = (description, merchants) => {
    if (!description) return false;
    const descLower = description.toLowerCase();
    for (const merchant of merchants) {
        const name = merchant.normalized_name;
        if (name && descLower.includes(name.toLowerCase())) {
            return true;
        }
    }
    return false;
};
// src/pages/Transactions.jsx

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

    const PAGE_SIZE = 10;

    const [accounts, setAccounts] = useState([]);
    const [transactions, setTransactions] = useState([]);
    const [refresh, setRefresh] = useState(0);

    const [pendingImports, setPendingImports] = useState([]);
    const [chartOfAccounts, setChartOfAccounts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [merchants, setMerchants] = useState([]);

    const [showSplitModal, setShowSplitModal] = useState(false);
    const [splitModalTxn, setSplitModalTxn] = useState(null);
    const [splitModalCallback, setSplitModalCallback] = useState(() => null);

    const [categoryPrompt, setCategoryPrompt] = useState(false);
    const [unknownMerchant, setUnknownMerchant] = useState(null);
    const [unknownMerchantIdx, setUnknownMerchantIdx] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');

    // --------------------------------------------------
    // LOAD INITIAL DATA
    // --------------------------------------------------
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
            } catch (err) {
                console.error(err);
                alert('Failed to load data.');
            }
        };

        fetchData();
    }, [refresh]);


    // --------------------------------------------------
    // HELPERS
    // --------------------------------------------------
    const isValidUUID = (uuid) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);

    const findMerchant = async (rawName) => {
        if (!rawName) return null;

        const lower = rawName.toLowerCase();

        let merchant =
            merchants.find(m => m.normalized_name?.toLowerCase() === lower) ||
            merchants.find(
                m => Array.isArray(m.aliases) && m.aliases.map(a => a.toLowerCase()).includes(lower)
            );

        if (merchant) return merchant;

        return await supabaseMerchantDB.getByRawNameOrAlias(rawName);
    };

    const getCategoryById = (id) => categories.find(c => c.id === id);

    const getSuggestedCoAId = (desc) => {
        if (!desc || !chartOfAccounts.length) return '';
        const lower = desc.toLowerCase();
        const match = chartOfAccounts.find(coa =>
            lower.includes(coa.name.toLowerCase()) ||
            (coa.description && lower.includes(coa.description.toLowerCase()))
        );
        return match ? match.id : '';
    };

    const normalizeTransaction = (txn) => ({
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
        description: txn.description,
        memo: txn.memo || null,
        product_id: txn.product_id || null,
        type: txn.type || null
    });


    // --------------------------------------------------
    // FILE UPLOAD
    // --------------------------------------------------
    const handleUpload = async (file, accountId) => {
        try {
            let mapped = [];

            if (file.name.toLowerCase().endsWith('.csv')) {
                const csv = await transactionService.parseCSV(file);
                mapped = transactionService.mapCSVToTransactions(csv, accountId);
            } else if (file.name.endsWith('.qbo') || file.name.endsWith('.qfx')) {
                const data = await transactionService.parseQBOQFX(file);
                mapped = transactionService.mapQBOQFXToTransactions(data, accountId);
            } else {
                alert("Unsupported file format.");
                return;
            }

            await processTransactions(mapped, 0);

        } catch (err) {
            console.error(err);
            alert("File parsing error.");
        }
    };


    // --------------------------------------------------
    // PROCESS IMPORTED TRANSACTIONS
    // --------------------------------------------------
    const processTransactions = async (txns, startIdx) => {
        for (let i = startIdx; i < txns.length; i++) {
            const txn = txns[i];
            const rawName = txn.description?.trim();
            const merchant = await findMerchant(rawName);

            if (!merchant) {
                setUnknownMerchant(rawName);
                setUnknownMerchantIdx(i);
                setCategoryPrompt(true);
                setPendingImports(txns);
                return;
            }

            txn.normalized_merchant_id = merchant.id;
            txn.category_id = merchant.category_id;
            txn.account_id = txn.account_id || txn.accountId;
            txn.is_split = false;

            const category = getCategoryById(merchant.category_id);

            // Only open split modal if explicitly triggered, not on page load
            // (No auto-open here)

            txn.chart_of_account_id = getSuggestedCoAId(txn.description);
        }

        setPendingImports(txns);
    };


    // --------------------------------------------------
    // SAVE SPLIT FOR A NEW TRANSACTION
    // --------------------------------------------------
    const handleSplitSave = async (txn, splits, allTxns, idx) => {
        try {
            if (!splits.length) throw new Error("No splits provided");

            const total = splits.reduce((s, x) => s + (parseFloat(x.percent) || 0), 0);
            if (Math.abs(total - 100) > 0.01) throw new Error("Splits must total 100%");

            splits.forEach(s => {
                if (!isValidUUID(s.chartOfAccountId))
                    throw new Error("Invalid Chart of Account");
            });

            const txnToSave = normalizeTransaction({
                ...txn,
                is_split: true,
                chart_of_account_id: null,
                split_chart_of_account_id: splits[0].chartOfAccountId
            });

            const saved = await supabaseTransactionsDB.add(txnToSave);

            const splitRecords = splits.map(s => ({
                transaction_id: saved.id,
                category_id: txn.category_id,
                percentage: parseFloat(s.percent),
                amount: parseFloat(s.percent) / 100 * Math.abs(txn.amount),
                chart_of_account_id: s.chartOfAccountId,
                belief_tag: null
            }));

            await supabaseTransactionSplitDB.bulkAdd(splitRecords);

            const next = idx + 1;

            if (next < allTxns.length) {
                await processTransactions(allTxns, next);
            }

            setShowSplitModal(false);
            setSplitModalTxn(null);

        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    };


    // --------------------------------------------------
    // SAVE SPLITS FOR EXISTING TRANSACTION
    // --------------------------------------------------
    const handleSplitSaveExisting = async (txn, splits) => {
        try {
            if (!splits.length) throw new Error("No splits provided");

            const total = splits.reduce((s, x) => s + (parseFloat(x.percent) || 0), 0);
            if (Math.abs(total - 100) > 0.01) throw new Error("Splits must total 100%");

            for (const s of splits)
                if (!isValidUUID(s.chartOfAccountId))
                    throw new Error("Invalid Chart of Account");

            await supabaseTransactionsDB.update(txn.id, {
                is_split: true,
                chart_of_account_id: null,
                split_chart_of_account_id: splits[0].chartOfAccountId
            });

            await supabaseTransactionSplitDB.deleteByTransactionId(txn.id);

            const splitRecords = splits.map(s => ({
                transaction_id: txn.id,
                percentage: parseFloat(s.percent),
                amount: parseFloat(s.percent) / 100 * Math.abs(txn.amount),
                category_id: txn.category_id,
                chart_of_account_id: s.chartOfAccountId,
                belief_tag: null
            }));

            await supabaseTransactionSplitDB.bulkAdd(splitRecords);

            setShowSplitModal(false);
            setRefresh(r => r + 1);
            alert("Splits updated!");

        } catch (err) {
            alert(err.message);
        }
    };


    // --------------------------------------------------
    // UNKNOWN MERCHANT CATEGORY
    // --------------------------------------------------
    const handleUnknownMerchantCategory = async () => {
        if (!selectedCategoryId || unknownMerchantIdx == null) return;

        try {
            const merchant = await supabaseMerchantDB.add({
                normalized_name: unknownMerchant,
                category_id: selectedCategoryId,
                aliases: [unknownMerchant]
            });

            const updated = [...pendingImports];
            updated[unknownMerchantIdx].normalized_merchant_id = merchant.id;
            updated[unknownMerchantIdx].category_id = selectedCategoryId;

            setCategoryPrompt(false);
            setUnknownMerchant(null);
            setUnknownMerchantIdx(null);
            setSelectedCategoryId('');

            const merchs = await supabaseMerchantDB.getAll();
            setMerchants(merchs);

            await processTransactions(updated, unknownMerchantIdx);

        } catch (err) {
            alert(err.message);
        }
    };


    // --------------------------------------------------
    // CONFIRM IMPORT
    // --------------------------------------------------
    const handleConfirmImport = async () => {
        try {
            const valid = pendingImports.filter(
                txn => txn.chart_of_account_id && !txn.is_split
            );

            if (!valid.length) {
                alert("Assign Chart of Account to continue.");
                return;
            }

            const payload = valid.map(normalizeTransaction);

            await supabaseTransactionsDB.bulkAdd(payload);

            alert("Transactions imported!");
            setPendingImports([]);
            setRefresh(r => r + 1);

        } catch (err) {
            alert(err.message);
        }
    };


    // --------------------------------------------------
    // TABLE ACTIONS
    // --------------------------------------------------
    const handleDelete = async (id) => {
        await supabaseTransactionsDB.delete(id);
        setRefresh(r => r + 1);
    };

    const handleEdit = (txn) => {
        alert("Edit modal not implemented yet.");
    };

    const handleSplitExisting = (txn) => {
        const category = getCategoryById(txn.category_id);
        if (!category?.is_split_enabled) {
            alert("This category is not split-enabled.");
            return;
        }

        setSplitModalTxn({ txn });
        setSplitModalCallback(() =>
            (splits) => handleSplitSaveExisting(txn, splits)
        );
        setShowSplitModal(true);
    };


    // --------------------------------------------------
    // RENDER
    // --------------------------------------------------
    return (
        <div className="space-y-6">

            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Transactions</h1>
                <p className="text-gray-600">Upload and manage your financial transactions</p>
            </div>

            <TransactionUpload accounts={accounts} onUpload={handleUpload} />

            {/* PENDING IMPORTS TABLE */}
            {pendingImports.length > 0 && !categoryPrompt && !showSplitModal && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-900 mb-2">Review & Assign Chart of Account</h3>

                    <table className="w-full">
                        <thead className="bg-yellow-100">
                            <tr>
                                <th className="px-4 py-2 text-xs">Date</th>
                                <th className="px-4 py-2 text-xs">Description</th>
                                <th className="px-4 py-2 text-xs">Amount</th>
                                <th className="px-4 py-2 text-xs">Chart of Account</th>
                            </tr>
                        </thead>

                        <tbody>
                            {pendingImports.map((txn, idx) => (
                                <tr key={idx} className="border-b">
                                    <td className="px-4 py-2">{txn.date}</td>
                                    <td className="px-4 py-2">{txn.description}</td>
                                    <td className="px-4 py-2">
                                        ${Math.abs(txn.amount).toFixed(2)}
                                    </td>

                                    <td className="px-4 py-2">
                                        <select
                                            value={txn.chart_of_account_id || ''}
                                            onChange={(e) =>
                                                setPendingImports(prev =>
                                                    prev.map((t, i) =>
                                                        i === idx ? { ...t, chart_of_account_id: e.target.value } : t
                                                    )
                                                )
                                            }
                                            className="border rounded px-2 py-1 w-full"
                                        >
                                            <option value="">Select...</option>
                                            {chartOfAccounts.map(coa => (
                                                <option key={coa.id} value={coa.id}>
                                                    {coa.code} - {coa.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <button
                        onClick={handleConfirmImport}
                        className="mt-4 px-6 py-2 bg-green-600 text-white rounded"
                    >
                        Confirm Import
                    </button>
                </div>
            )}

            {/* UNKNOWN MERCHANT CATEGORY PROMPT */}
            {categoryPrompt && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center">
                    <div className="bg-white rounded p-6 shadow-lg min-w-[350px]">
                        <h2 className="text-lg font-semibold mb-4">Categorize Merchant</h2>

                        <p className="mb-2">
                            Merchant <strong>{unknownMerchant}</strong> not found.
                            Select a category:
                        </p>

                        <select
                            value={selectedCategoryId}
                            onChange={(e) => setSelectedCategoryId(e.target.value)}
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
                                onClick={() => setCategoryPrompt(false)}
                                className="px-4 py-2 bg-gray-300 rounded"
                            >
                                Cancel
                            </button>

                            <button
                                onClick={handleUnknownMerchantCategory}
                                disabled={!selectedCategoryId}
                                className="px-4 py-2 bg-green-600 text-white rounded"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SPLIT MODAL */}
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

            {/* TRANSACTION TABLE */}
            <TransactionTable
                transactions={transactions}
                accounts={accounts}
                onDelete={handleDelete}
                onEdit={handleEdit}
                onSplit={handleSplitExisting}
                splitEnabledChecker={(txn) => {
                    const cat = getCategoryById(txn.category_id);
                    return cat?.is_split_enabled;
                }}
            />

        </div>
    );
};
