// src/components/investments/ImportHoldingsForm.jsx
// Bulk import investment transactions from spreadsheet/PDF data with customizable separator

import React, { useState, useEffect, useMemo } from 'react';
import { X, Upload, FileSpreadsheet, AlertCircle, CheckCircle, ChevronDown, ChevronUp, Trash2, Edit2, Save, RefreshCw } from 'lucide-react';
import { investmentTransactionsDB, investmentAccountsDB } from '../../services/database';

// Default column mappings for auto-detection
const COLUMN_MAPPINGS = {
    transaction_date: ['date', 'transaction date', 'trade date', 'settle date', 'settlement date'],
    symbol: ['symbol', 'ticker', 'code', 'stock', 'fund code', 'security code'],
    security_name: ['security name', 'name', 'description', 'security', 'fund name', 'investment name', 'holding', 'item description'],
    transaction_type: ['transaction type', 'transaction_type', 'type', 'action', 'activity', 'txn type', 'transaction'],
    units: ['units', 'shares', 'quantity', 'qty', 'number of units', 'number of shares'],
    amount: ['amount', 'value', 'net amount', 'gross amount', 'total', 'proceeds', 'gross amt'],
    price: ['price', 'unit price', 'share price', 'price per unit', 'nav'],
    fees: ['fees', 'commission', 'charges', 'fee'],
};

// Security type detection keywords
const SECURITY_TYPE_KEYWORDS = {
    reit: ['reit', 'real estate', 'property trust'],
    etf: ['etf', 'exchange traded', 'index fund', 'ishares', 'vanguard etf'],
    mutual_fund: ['fund', 'class a', 'class f', 'series a', 'series f', 'mutual'],
    bond: ['bond', 'fixed income', 'debenture'],
    gic: ['gic', 'term deposit', 'guaranteed'],
    crypto: ['bitcoin', 'btc', 'eth', 'crypto'],
};

const ImportHoldingsForm = ({ isOpen, onClose, onImportComplete, accountId = null }) => {
    const [accounts, setAccounts] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState(accountId || '');
    const [rawData, setRawData] = useState('');
    const [separator, setSeparator] = useState('\t'); // Default to tab
    const [separatorDisplay, setSeparatorDisplay] = useState('Tab');
    const [hasHeader, setHasHeader] = useState(true);
    const [parsedRows, setParsedRows] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [columnMappings, setColumnMappings] = useState({});
    const [defaultDate, setDefaultDate] = useState(new Date().toISOString().split('T')[0]);
    const [currency, setCurrency] = useState('CAD');
    const [importing, setImporting] = useState(false);
    const [importResults, setImportResults] = useState(null);
    const [step, setStep] = useState(1); // 1: Paste data, 2: Map columns, 3: Review & Import
    const [editingRow, setEditingRow] = useState(null);
    const [errors, setErrors] = useState([]);

    // Load accounts on mount
    useEffect(() => {
        loadAccounts();
    }, []);

    useEffect(() => {
        if (accountId) {
            setSelectedAccountId(accountId);
        }
    }, [accountId]);

    const loadAccounts = async () => {
        try {
            const accountsList = await investmentAccountsDB.getAll();
            setAccounts(accountsList || []);
        } catch (error) {
            console.error('Error loading accounts:', error);
        }
    };

    // Common separator options
    const separatorOptions = [
        { label: 'Tab', value: '\t' },
        { label: 'Comma', value: ',' },
        { label: 'Semicolon', value: ';' },
        { label: 'Pipe', value: '|' },
        { label: 'Space', value: ' ' },
        { label: 'Custom', value: 'custom' },
    ];

    const handleSeparatorChange = (e) => {
        const val = e.target.value;
        if (val === 'custom') {
            setSeparatorDisplay('Custom');
            // Keep current separator until custom is entered
        } else {
            const opt = separatorOptions.find(o => o.value === val);
            setSeparator(val);
            setSeparatorDisplay(opt?.label || val);
        }
    };

    const handleCustomSeparator = (e) => {
        const val = e.target.value;
        setSeparator(val);
        setSeparatorDisplay(`Custom: "${val}"`);
    };

    // Parse the raw data when separator or data changes
    const parseData = () => {
        if (!rawData.trim()) {
            setParsedRows([]);
            setHeaders([]);
            return;
        }

        const lines = rawData.trim().split('\n').filter(line => line.trim());
        if (lines.length === 0) return;

        const parsedLines = lines.map(line => {
            // Handle the separator - could be regex special char
            const escapedSep = separator.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            return line.split(new RegExp(escapedSep)).map(cell => cell.trim());
        });

        if (hasHeader && parsedLines.length > 0) {
            setHeaders(parsedLines[0]);
            setParsedRows(parsedLines.slice(1));
            // Auto-detect column mappings
            autoDetectMappings(parsedLines[0]);
        } else {
            // Generate generic headers
            const maxCols = Math.max(...parsedLines.map(row => row.length));
            const genericHeaders = Array.from({ length: maxCols }, (_, i) => `Column ${i + 1}`);
            setHeaders(genericHeaders);
            setParsedRows(parsedLines);
        }
    };

    // Auto-detect column mappings based on header names
    const autoDetectMappings = (headerRow) => {
        const newMappings = {};

        headerRow.forEach((header, index) => {
            const headerLower = header.toLowerCase().trim();

            for (const [field, keywords] of Object.entries(COLUMN_MAPPINGS)) {
                if (keywords.some(keyword => headerLower.includes(keyword) || keyword.includes(headerLower))) {
                    if (!newMappings[field]) {
                        newMappings[field] = index;
                    }
                }
            }
        });

        setColumnMappings(newMappings);
    };

    // Detect security type from name
    const detectSecurityType = (name) => {
        if (!name) return 'stock';
        const lowerName = name.toLowerCase();

        for (const [type, keywords] of Object.entries(SECURITY_TYPE_KEYWORDS)) {
            if (keywords.some(kw => lowerName.includes(kw))) {
                return type;
            }
        }
        return 'stock';
    };

    // Parse number from string (handles currency symbols, commas, parentheses for negative)
    const parseNumber = (value) => {
        if (!value || value === '-' || value === '') return null;

        // Check for parentheses (negative number)
        const isNegative = value.includes('(') && value.includes(')');

        // Remove currency symbols, commas, spaces, parentheses
        let cleaned = value.replace(/[$€£₹,\s()]/g, '');

        const num = parseFloat(cleaned);
        if (isNaN(num)) return null;

        return isNegative ? -num : num;
    };

    // Parse date from string
    const parseDate = (value) => {
        if (!value) return null;

        // Try various date formats
        const formats = [
            /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
            /(\d{2})\/(\d{2})\/(\d{4})/, // MM/DD/YYYY
            /(\d{2})-(\d{2})-(\d{4})/, // DD-MM-YYYY
            /(\w+)\s+(\d{1,2}),?\s+(\d{4})/, // Month DD, YYYY
        ];

        const date = new Date(value);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }

        return null;
    };

    // Convert parsed rows to transaction objects
    const holdingsData = useMemo(() => {
        return parsedRows.map((row, index) => {
            const getValue = (field) => {
                const colIndex = columnMappings[field];
                return colIndex !== undefined ? row[colIndex] : null;
            };

            const symbol = getValue('symbol') || '';
            const securityName = getValue('security_name') || '';
            const transactionType = getValue('transaction_type') || '';
            const units = parseNumber(getValue('units'));
            const amount = parseNumber(getValue('amount'));
            const price = parseNumber(getValue('price'));
            const fees = parseNumber(getValue('fees'));
            const dateValue = parseDate(getValue('transaction_date'));

            // Calculate price if not provided (amount / units)
            const calculatedPrice = price || (amount && units ? Math.abs(amount / units) : null);

            return {
                _rowIndex: index,
                _isValid: (symbol || securityName) && transactionType && dateValue,
                symbol: symbol.toUpperCase(),
                security_name: securityName,
                transaction_type: transactionType,
                transaction_date: dateValue || defaultDate,
                units: units || 0,
                amount: amount || 0,
                price: calculatedPrice,
                fees: fees || 0,
                currency: currency,
                _raw: row,
            };
        });
    }, [parsedRows, columnMappings, defaultDate, currency]);

    // Validation
    const validateData = () => {
        const errs = [];

        console.log('Validating transaction data...');
        console.log('Selected account ID:', selectedAccountId);
        console.log('Transactions data length:', holdingsData.length);

        if (!selectedAccountId) {
            errs.push('Please select an investment account');
        }

        if (holdingsData.length === 0) {
            errs.push('No transaction data found');
        }

        holdingsData.forEach((transaction, idx) => {
            console.log(`Row ${idx + 1}:`, {
                symbol: transaction.symbol,
                security_name: transaction.security_name,
                transaction_type: transaction.transaction_type,
                transaction_date: transaction.transaction_date
            });

            if (!transaction.symbol && !transaction.security_name) {
                errs.push(`Row ${idx + 1}: Missing symbol or security name`);
            }

            if (!transaction.transaction_type) {
                errs.push(`Row ${idx + 1}: Missing transaction type`);
            }

            if (!transaction.transaction_date) {
                errs.push(`Row ${idx + 1}: Missing transaction date`);
            }
        });

        console.log('Validation errors:', errs);
        setErrors(errs);
        return errs.length === 0;
    };

    // Handle import
    const handleImport = async () => {
        console.log('Import button clicked');
        console.log('Holdings data:', holdingsData);
        console.log('Selected account ID:', selectedAccountId);

        if (!validateData()) {
            console.log('Validation failed');
            return;
        }

        setImporting(true);
        setImportResults(null);

        try {
            const results = { success: 0, failed: 0, errors: [] };

            for (const transaction of holdingsData) {
                if (!transaction._isValid) continue;

                try {
                    console.log('Adding transaction:', transaction);
                    await investmentTransactionsDB.add({
                        account_id: selectedAccountId,
                        symbol: transaction.symbol,
                        security_name: transaction.security_name,
                        transaction_type: transaction.transaction_type,
                        transaction_date: transaction.transaction_date,
                        units: transaction.units,
                        amount: transaction.amount,
                        price: transaction.price,
                        fees: transaction.fees,
                        currency: transaction.currency,
                    });
                    results.success++;
                    console.log('Successfully added transaction');
                } catch (error) {
                    console.error('Error adding transaction:', error);
                    results.failed++;
                    results.errors.push(`${transaction.symbol || transaction.security_name}: ${error.message}`);
                }
            }

            console.log('Import results:', results);
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

    // Update a row's data
    const updateRow = (index, field, value) => {
        const newRows = [...parsedRows];
        const colIndex = columnMappings[field];
        if (colIndex !== undefined) {
            newRows[index][colIndex] = value;
            setParsedRows(newRows);
        }
    };

    // Delete a row
    const deleteRow = (index) => {
        const newRows = parsedRows.filter((_, i) => i !== index);
        setParsedRows(newRows);
    };

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '-';
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: currency,
        }).format(value);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-hidden border border-slate-700 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <FileSpreadsheet className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">Import Investment Transactions</h2>
                            <p className="text-sm text-slate-400">
                                Paste transaction data from spreadsheet, PDF, or statement
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Steps indicator */}
                <div className="px-6 py-3 bg-slate-900/50 border-b border-slate-700">
                    <div className="flex items-center gap-4">
                        {[1, 2, 3].map((s) => (
                            <button
                                key={s}
                                onClick={() => s < step && setStep(s)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${step === s
                                    ? 'bg-blue-600 text-white'
                                    : step > s
                                        ? 'bg-slate-700 text-slate-300 hover:bg-slate-600 cursor-pointer'
                                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                    }`}
                                disabled={s > step}
                            >
                                <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-sm">
                                    {step > s ? '✓' : s}
                                </span>
                                <span className="text-sm font-medium">
                                    {s === 1 ? 'Paste Data' : s === 2 ? 'Map Columns' : 'Review & Import'}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step 1: Paste Data */}
                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Account Selection */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Investment Account *
                                </label>
                                <select
                                    value={selectedAccountId}
                                    onChange={(e) => setSelectedAccountId(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select an account...</option>
                                    {accounts.map(acc => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.display_name || `${acc.institution} - ${acc.account_type}`}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Separator Selection */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Column Separator
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            value={separatorOptions.find(o => o.value === separator)?.value || 'custom'}
                                            onChange={handleSeparatorChange}
                                            className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                                        >
                                            {separatorOptions.map(opt => (
                                                <option key={opt.label} value={opt.value}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                        {separatorDisplay.startsWith('Custom') && (
                                            <input
                                                type="text"
                                                value={separator === '\t' ? '' : separator}
                                                onChange={handleCustomSeparator}
                                                placeholder="Enter separator"
                                                className="w-32 px-3 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                                            />
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-end gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={hasHeader}
                                            onChange={(e) => setHasHeader(e.target.checked)}
                                            className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-blue-500 focus:ring-blue-500"
                                        />
                                        <span className="text-sm text-slate-300">First row is header</span>
                                    </label>
                                </div>
                            </div>

                            {/* Default values */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-2">
                                        Default Date (for rows without date)
                                    </label>
                                    <input
                                        type="date"
                                        value={defaultDate}
                                        onChange={(e) => setDefaultDate(e.target.value)}
                                        className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
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

                            {/* Paste Area */}
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Paste your data here
                                </label>
                                <textarea
                                    value={rawData}
                                    onChange={(e) => setRawData(e.target.value)}
                                    placeholder="Copy from Excel, Google Sheets, PDF, or any table and paste here...

Example (Tab separated):
Symbol	Security Name	Units	Price	Book Value	Market Value
AAPL	Apple Inc.	100	175.50	15000	17550
VFV.TO	Vanguard S&P 500 ETF	50	120.00	5500	6000"
                                    rows={10}
                                    className="w-full px-4 py-3 bg-slate-900 border border-slate-600 rounded-lg text-white font-mono text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                                />
                            </div>

                            {/* Parse button */}
                            <div className="flex justify-end">
                                <button
                                    onClick={() => {
                                        parseData();
                                        if (rawData.trim()) setStep(2);
                                    }}
                                    disabled={!rawData.trim() || !selectedAccountId}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Upload className="w-4 h-4" />
                                    Parse Data
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Map Columns */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <h3 className="text-sm font-medium text-slate-300 mb-4">
                                    Map your columns to transaction fields
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {Object.entries(COLUMN_MAPPINGS).map(([field, _]) => (
                                        <div key={field}>
                                            <label className="block text-xs text-slate-400 mb-1 capitalize">
                                                {field.replace(/_/g, ' ')}
                                                {['transaction_date', 'transaction_type', 'symbol', 'security_name'].includes(field) && ' *'}
                                            </label>
                                            <select
                                                value={columnMappings[field] ?? ''}
                                                onChange={(e) => setColumnMappings({
                                                    ...columnMappings,
                                                    [field]: e.target.value === '' ? undefined : parseInt(e.target.value)
                                                })}
                                                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">Not mapped</option>
                                                {headers.map((header, idx) => (
                                                    <option key={idx} value={idx}>
                                                        {header}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            <div>
                                <h3 className="text-sm font-medium text-slate-300 mb-2">
                                    Preview ({parsedRows.length} rows)
                                </h3>
                                <div className="overflow-x-auto bg-slate-900/50 rounded-lg border border-slate-700">
                                    <table className="w-full text-sm">
                                        <thead className="bg-slate-800">
                                            <tr>
                                                {headers.map((header, idx) => (
                                                    <th key={idx} className="px-3 py-2 text-left text-slate-300 font-medium">
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {parsedRows.slice(0, 5).map((row, rowIdx) => (
                                                <tr key={rowIdx} className="border-t border-slate-700">
                                                    {row.map((cell, cellIdx) => (
                                                        <td key={cellIdx} className="px-3 py-2 text-slate-400">
                                                            {cell || '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {parsedRows.length > 5 && (
                                        <div className="px-3 py-2 text-center text-slate-500 text-sm border-t border-slate-700">
                                            ... and {parsedRows.length - 5} more rows
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <button
                                    onClick={() => setStep(1)}
                                    className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={() => setStep(3)}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors"
                                >
                                    Review Transactions
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 3: Review & Import */}
                    {step === 3 && (
                        <div className="space-y-6">
                            {errors.length > 0 && (
                                <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-red-400 mb-2">
                                        <AlertCircle className="w-5 h-5" />
                                        <span className="font-medium">Validation Errors</span>
                                    </div>
                                    <ul className="list-disc list-inside text-sm text-red-300 space-y-1">
                                        {errors.slice(0, 5).map((err, idx) => (
                                            <li key={idx}>{err}</li>
                                        ))}
                                        {errors.length > 5 && (
                                            <li>... and {errors.length - 5} more errors</li>
                                        )}
                                    </ul>
                                </div>
                            )}

                            {importResults && (
                                <div className={`rounded-lg p-4 ${importResults.failed === 0
                                    ? 'bg-emerald-500/20 border border-emerald-500/50'
                                    : 'bg-yellow-500/20 border border-yellow-500/50'
                                    }`}>
                                    <div className="flex items-center gap-2 mb-2">
                                        <CheckCircle className={`w-5 h-5 ${importResults.failed === 0 ? 'text-emerald-400' : 'text-yellow-400'
                                            }`} />
                                        <span className={`font-medium ${importResults.failed === 0 ? 'text-emerald-400' : 'text-yellow-400'
                                            }`}>
                                            Import Complete
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300">
                                        Successfully imported {importResults.success} holdings.
                                        {importResults.failed > 0 && ` Failed: ${importResults.failed}`}
                                    </p>
                                </div>
                            )}

                            {/* Transactions Preview Table */}
                            <div className="overflow-x-auto bg-slate-900/50 rounded-lg border border-slate-700">
                                <table className="w-full text-sm">
                                    <thead className="bg-slate-800">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-slate-300 font-medium">Date</th>
                                            <th className="px-3 py-2 text-left text-slate-300 font-medium">Symbol</th>
                                            <th className="px-3 py-2 text-left text-slate-300 font-medium">Security Name</th>
                                            <th className="px-3 py-2 text-left text-slate-300 font-medium">Type</th>
                                            <th className="px-3 py-2 text-right text-slate-300 font-medium">Units</th>
                                            <th className="px-3 py-2 text-right text-slate-300 font-medium">Price</th>
                                            <th className="px-3 py-2 text-right text-slate-300 font-medium">Amount</th>
                                            <th className="px-3 py-2 text-right text-slate-300 font-medium">Fees</th>
                                            <th className="px-3 py-2 text-center text-slate-300 font-medium w-20">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {holdingsData.map((holding, idx) => (
                                            <tr
                                                key={idx}
                                                className={`border-t border-slate-700 ${!holding._isValid ? 'bg-red-900/20' : ''
                                                    }`}
                                            >
                                                <td className="px-3 py-2 text-slate-300">
                                                    {holding.transaction_date || '-'}
                                                </td>
                                                <td className="px-3 py-2 text-white font-medium">
                                                    {holding.symbol || '-'}
                                                </td>
                                                <td className="px-3 py-2 text-slate-300 max-w-xs truncate">
                                                    {holding.security_name || '-'}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <span className="px-2 py-1 text-xs bg-slate-700 text-slate-300 rounded">
                                                        {holding.transaction_type || '-'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-right text-slate-300">
                                                    {holding.units?.toFixed(4) || '-'}
                                                </td>
                                                <td className="px-3 py-2 text-right text-slate-300">
                                                    {formatCurrency(holding.price)}
                                                </td>
                                                <td className="px-3 py-2 text-right text-white font-medium">
                                                    {formatCurrency(holding.amount)}
                                                </td>
                                                <td className="px-3 py-2 text-right text-slate-300">
                                                    {formatCurrency(holding.fees)}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <button
                                                        onClick={() => deleteRow(idx)}
                                                        className="p-1 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded transition-colors"
                                                        title="Remove row"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Summary */}
                            <div className="bg-slate-900/50 rounded-lg p-4">
                                <div className="grid grid-cols-4 gap-4 text-center">
                                    <div>
                                        <div className="text-2xl font-bold text-white">{holdingsData.length}</div>
                                        <div className="text-sm text-slate-400">Total Transactions</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">
                                            {formatCurrency(holdingsData.reduce((sum, h) => sum + (h.amount || 0), 0))}
                                        </div>
                                        <div className="text-sm text-slate-400">Total Amount</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">
                                            {holdingsData.reduce((sum, h) => sum + (h.units || 0), 0).toFixed(2)}
                                        </div>
                                        <div className="text-sm text-slate-400">Total Units</div>
                                    </div>
                                    <div>
                                        <div className="text-2xl font-bold text-white">
                                            {formatCurrency(holdingsData.reduce((sum, h) => sum + (h.fees || 0), 0))}
                                        </div>
                                        <div className="text-sm text-slate-400">Total Fees</div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between">
                                <button
                                    onClick={() => setStep(2)}
                                    className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={importing || holdingsData.length === 0}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {importing ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="w-4 h-4" />
                                            Import {holdingsData.length} Transactions
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ImportHoldingsForm;
