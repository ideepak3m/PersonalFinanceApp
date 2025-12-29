// src/components/investments/ImportCashTransactionsForm.jsx
// Simple import for cash transactions (fees, purchases, transfers) from flat file

import React, { useState, useEffect } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { cashTransactionsDB, investmentAccountsDB } from '../../services/database';

const ImportCashTransactionsForm = ({ isOpen, onClose, onImportComplete, accountId = null }) => {
    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState(accountId || '');
    const [rawData, setRawData] = useState('');
    const [separator, setSeparator] = useState(';');
    const [currency, setCurrency] = useState('CAD');
    const [importing, setImporting] = useState(false);
    const [importResults, setImportResults] = useState(null);
    const [errors, setErrors] = useState([]);

    // Load accounts on mount
    useEffect(() => {
        const loadAccounts = async () => {
            try {
                const accountsList = await investmentAccountsDB.getAll();
                setAccounts(accountsList || []);
                if (accountId) {
                    setSelectedAccountId(accountId);
                }
            } catch (error) {
                console.error('Error loading accounts:', error);
            }
        };
        if (isOpen) {
            loadAccounts();
        }
    }, [isOpen, accountId]);

    // Parse number from string
    const parseNumber = (value) => {
        if (!value || value === '-' || value === '' || value.trim() === '') return null;
        const cleaned = value.replace(/[$€£₹,\s]/g, '');
        const num = parseFloat(cleaned);
        return isNaN(num) ? null : num;
    };

    // Parse date from string
    const parseDate = (value) => {
        if (!value) return null;
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }
        return null;
    };

    // Handle import
    const handleImport = async () => {
        const errs = [];

        if (!selectedAccountId) {
            errs.push('Please select an investment account');
        }

        if (!rawData.trim()) {
            errs.push('Please paste transaction data');
        }

        if (errs.length > 0) {
            setErrors(errs);
            return;
        }

        setImporting(true);
        setImportResults(null);
        setErrors([]);

        try {
            const lines = rawData.trim().split('\n');

            // Skip header row (assuming first row is header)
            const dataRows = lines.slice(1).filter(line => line.trim());

            if (dataRows.length === 0) {
                setErrors(['No data rows found']);
                setImporting(false);
                return;
            }

            const results = { success: 0, failed: 0, errors: [] };

            for (const line of dataRows) {
                const columns = line.split(separator).map(col => col.trim());

                // Expected columns: Date, Transaction_Type, Item Description, Debit, Credit, Balance
                if (columns.length < 6) {
                    results.failed++;
                    results.errors.push(`Skipped row - insufficient columns: ${line.substring(0, 50)}`);
                    continue;
                }

                const [dateStr, transactionType, description, debitStr, creditStr, balanceStr] = columns;

                const transactionDate = parseDate(dateStr);
                const debit = parseNumber(debitStr);
                const credit = parseNumber(creditStr);
                const balance = parseNumber(balanceStr);

                if (!transactionDate) {
                    results.failed++;
                    results.errors.push(`Invalid date: ${dateStr}`);
                    continue;
                }

                if (!description || !transactionType) {
                    results.failed++;
                    results.errors.push(`Missing description or type: ${line.substring(0, 50)}`);
                    continue;
                }

                try {
                    await cashTransactionsDB.add({
                        account_id: selectedAccountId,
                        transaction_date: transactionDate,
                        transaction_type: transactionType,
                        description: description,
                        debit: debit || 0,
                        credit: credit || 0,
                        balance: balance,
                        currency: currency,
                    });
                    results.success++;
                } catch (error) {
                    console.error('Error adding cash transaction:', error);
                    results.failed++;
                    results.errors.push(`${description}: ${error.message}`);
                }
            }

            setImportResults(results);

            if (results.success > 0 && onImportComplete) {
                onImportComplete(results);
            }
        } catch (error) {
            console.error('Import error:', error);
            setErrors([error.message]);
        } finally {
            setImporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden border border-slate-700 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <FileText className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">Import Cash Transactions</h2>
                            <p className="text-sm text-slate-400">
                                Import fees, purchases, and transfers from flat file
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Account Selection */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Investment Account *
                        </label>
                        <select
                            value={selectedAccountId}
                            onChange={(e) => setSelectedAccountId(e.target.value)}
                            className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                            disabled={!!accountId}
                        >
                            <option value="">Select an account...</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.display_name} ({acc.institution})
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Settings */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Column Separator
                            </label>
                            <input
                                type="text"
                                value={separator}
                                onChange={(e) => setSeparator(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                                placeholder=";"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Currency
                            </label>
                            <select
                                value={currency}
                                onChange={(e) => setCurrency(e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="CAD">CAD - Canadian Dollar</option>
                                <option value="USD">USD - US Dollar</option>
                                <option value="INR">INR - Indian Rupee</option>
                            </select>
                        </div>
                    </div>

                    {/* Format Info */}
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                        <p className="text-sm text-blue-300 mb-2">
                            <strong>Expected format:</strong>
                        </p>
                        <code className="text-xs text-blue-200 block">
                            Date; Transaction_Type; Item Description; Debit; Credit; Balance
                        </code>
                        <p className="text-xs text-blue-300 mt-2">
                            First row should be headers (will be skipped)
                        </p>
                    </div>

                    {/* Paste Area */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Paste Transaction Data *
                        </label>
                        <textarea
                            value={rawData}
                            onChange={(e) => setRawData(e.target.value)}
                            placeholder="Date; Transaction_Type; Item Description; Debit; Credit; Balance&#10;2024-12-01; Fee; Management Fee; 50.00; ; 10000.00&#10;2024-12-15; Deposit; Cash Deposit; ; 1000.00; 11000.00"
                            className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                            rows={12}
                        />
                        <p className="text-xs text-slate-400 mt-1">
                            {rawData.split('\n').filter(l => l.trim()).length - 1} rows (excluding header)
                        </p>
                    </div>

                    {/* Errors */}
                    {errors.length > 0 && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-red-400 mb-2">
                                <AlertCircle className="w-5 h-5" />
                                <span className="font-medium">Errors</span>
                            </div>
                            <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                                {errors.map((err, idx) => (
                                    <li key={idx}>{err}</li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Import Results */}
                    {importResults && (
                        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-emerald-400 mb-3">
                                <CheckCircle className="w-5 h-5" />
                                <span className="font-medium">Import Complete</span>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <span className="text-slate-400">Successful:</span>
                                    <span className="ml-2 text-emerald-400 font-medium">{importResults.success}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400">Failed:</span>
                                    <span className="ml-2 text-red-400 font-medium">{importResults.failed}</span>
                                </div>
                            </div>
                            {importResults.errors.length > 0 && (
                                <div className="mt-3 pt-3 border-t border-slate-700">
                                    <p className="text-xs text-slate-400 mb-2">Errors:</p>
                                    <ul className="list-disc list-inside text-xs text-slate-400 space-y-1 max-h-32 overflow-y-auto">
                                        {importResults.errors.slice(0, 10).map((err, idx) => (
                                            <li key={idx}>{err}</li>
                                        ))}
                                        {importResults.errors.length > 10 && (
                                            <li>... and {importResults.errors.length - 10} more</li>
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center p-6 border-t border-slate-700">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={importing || !rawData.trim() || !selectedAccountId}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {importing ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Upload className="w-4 h-4" />
                                Import Transactions
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ImportCashTransactionsForm;
