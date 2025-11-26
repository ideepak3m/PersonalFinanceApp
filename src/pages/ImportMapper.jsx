// src/pages/ImportMapper.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import {
    supabaseImportStagingDB,
    supabaseImportRawDataDB,
    supabaseColumnMappingsDB,
    supabaseAccountsDB,
    supabaseTransactionsDB,
    supabaseChartOfAccountsDB
} from '../services/supabaseDatabase';

export const ImportMapper = () => {
    const { accountId } = useParams();
    const navigate = useNavigate();

    const [account, setAccount] = useState(null);
    const [stagingRecords, setStagingRecords] = useState([]);
    const [selectedStaging, setSelectedStaging] = useState(null);
    const [rawData, setRawData] = useState([]);
    const [columnMappings, setColumnMappings] = useState({});
    const [savedMappings, setSavedMappings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [suspenseAccount, setSuspenseAccount] = useState(null);

    // Transaction fields that can be mapped
    const transactionFields = [
        { key: 'date', label: 'Date *', required: true },
        { key: 'description', label: 'Description *', required: true },
        { key: 'amount', label: 'Amount *', required: true },
        { key: 'type', label: 'Transaction Type', required: false },
        { key: 'memo', label: 'Memo', required: false },
        { key: 'currency', label: 'Currency', required: false },
    ];

    useEffect(() => {
        loadData();
    }, [accountId]);

    const loadData = async () => {
        try {
            setLoading(true);

            const [acc, staging, mappings, coa] = await Promise.all([
                supabaseAccountsDB.getById(accountId),
                supabaseImportStagingDB.getPendingByAccount(accountId),
                supabaseColumnMappingsDB.getByAccountAndType(accountId, 'csv'),
                supabaseChartOfAccountsDB.getAll()
            ]);

            setAccount(acc);
            setStagingRecords(staging || []);
            setSavedMappings(mappings || []);

            const suspense = (coa || []).find(c => c.name?.toLowerCase() === 'suspense');
            setSuspenseAccount(suspense);

            // Auto-select first staging record
            if (staging && staging.length > 0) {
                await selectStaging(staging[0]);
            }
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load import data');
        } finally {
            setLoading(false);
        }
    };

    const selectStaging = async (staging) => {
        try {
            setSelectedStaging(staging);

            // Load raw data
            const data = await supabaseImportRawDataDB.getByStagingId(staging.id);
            setRawData(data || []);

            // Try to load default mapping
            const defaultMapping = await supabaseColumnMappingsDB.getDefaultMapping(
                accountId,
                staging.file_type
            );

            if (defaultMapping) {
                setColumnMappings(defaultMapping.mapping_config);
            } else {
                // Auto-detect mappings
                const autoMappings = autoDetectMappings(staging.column_names);
                setColumnMappings(autoMappings);
            }
        } catch (error) {
            console.error('Error loading staging data:', error);
            alert('Failed to load file data');
        }
    };

    const autoDetectMappings = (columns) => {
        const mappings = {};

        columns.forEach(col => {
            const colLower = col.toLowerCase();

            // Date detection
            if (colLower.includes('date') && !mappings.date) {
                mappings.date = col;
            }

            // Description detection
            if ((colLower.includes('description') || colLower.includes('merchant') ||
                colLower.includes('name') || colLower === 'client name') && !mappings.description) {
                mappings.description = col;
            }

            // Amount detection - prioritize specific columns
            if (!mappings.amount) {
                if (colLower === 'balance' || colLower === 'amount') {
                    mappings.amount = col;
                } else if (colLower === 'debit' || colLower === 'credit') {
                    mappings.amount = col;
                }
            }

            // Type detection
            if ((colLower.includes('type') || colLower.includes('transaction type')) && !mappings.type) {
                mappings.type = col;
            }

            // Memo detection
            if ((colLower.includes('memo') || colLower.includes('note')) && !mappings.memo) {
                mappings.memo = col;
            }

            // Currency detection
            if (colLower.includes('currency') && !mappings.currency) {
                mappings.currency = col;
            }
        });

        return mappings;
    };

    const handleMappingChange = (transactionField, csvColumn) => {
        setColumnMappings(prev => ({
            ...prev,
            [transactionField]: csvColumn
        }));
    };

    const handleSaveMapping = async () => {
        try {
            const name = prompt('Enter a name for this mapping configuration:');
            if (!name) return;

            await supabaseColumnMappingsDB.add({
                account_id: accountId,
                file_type: selectedStaging.file_type,
                name: name,
                mapping_config: columnMappings
            });

            alert('Mapping saved successfully!');
            const mappings = await supabaseColumnMappingsDB.getByAccountAndType(accountId, selectedStaging.file_type);
            setSavedMappings(mappings || []);
        } catch (error) {
            console.error('Error saving mapping:', error);
            alert('Failed to save mapping');
        }
    };

    const handleLoadMapping = async (mappingId) => {
        try {
            const mapping = await supabaseColumnMappingsDB.getById(mappingId);
            setColumnMappings(mapping.mapping_config);
        } catch (error) {
            console.error('Error loading mapping:', error);
            alert('Failed to load mapping');
        }
    };

    const handleApplyMapping = async () => {
        try {
            // Validate required fields
            const missingRequired = transactionFields
                .filter(field => field.required && !columnMappings[field.key])
                .map(field => field.label);

            if (missingRequired.length > 0) {
                alert(`Please map the following required fields:\n${missingRequired.join('\n')}`);
                return;
            }

            setProcessing(true);

            // Transform data using mappings
            const transactions = rawData.map((row, index) => {
                const mapped = {};

                // Apply mappings
                Object.entries(columnMappings).forEach(([txnField, csvCol]) => {
                    if (csvCol && row[csvCol] !== undefined) {
                        mapped[txnField] = row[csvCol];
                    }
                });

                // Parse amount
                if (mapped.amount) {
                    const cleanAmount = String(mapped.amount).replace(/[$,]/g, '');
                    mapped.amount = parseFloat(cleanAmount) || 0;
                }

                // Parse date - handle various formats
                if (mapped.date) {
                    try {
                        // Remove any timezone suffixes like [-5:EST]
                        let cleanDate = String(mapped.date).replace(/\[.*?\]/g, '').trim();

                        // Handle YYYYMMDD format
                        if (/^\d{8}/.test(cleanDate)) {
                            const year = cleanDate.substring(0, 4);
                            const month = cleanDate.substring(4, 6);
                            const day = cleanDate.substring(6, 8);
                            cleanDate = `${year}-${month}-${day}`;
                        }

                        const date = new Date(cleanDate);
                        if (!isNaN(date.getTime())) {
                            // Format as YYYY-MM-DD for PostgreSQL date type
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            mapped.date = `${year}-${month}-${day}`;
                        } else {
                            // If parsing fails, use current date
                            mapped.date = new Date().toISOString().split('T')[0];
                        }
                    } catch (e) {
                        console.warn('Failed to parse date:', mapped.date, e);
                        mapped.date = new Date().toISOString().split('T')[0];
                    }
                }

                // Set defaults
                return {
                    account_id: accountId,
                    date: mapped.date || new Date().toISOString().split('T')[0],
                    raw_merchant_name: mapped.description || 'Unknown',
                    description: mapped.description || 'Unknown',
                    amount: mapped.amount || 0,
                    currency: mapped.currency || 'CAD',
                    type: mapped.type || (mapped.amount >= 0 ? 'credit' : 'debit'),
                    memo: mapped.memo || '',
                    chart_of_account_id: suspenseAccount?.id,
                    status: 'uncategorized',
                    is_split: false
                };
            });

            // Bulk insert to transactions table
            await supabaseTransactionsDB.bulkAdd(transactions);

            // Update staging status
            await supabaseImportStagingDB.updateStatus(selectedStaging.id, 'imported');

            // Prompt to save mapping if not already saved
            const shouldSaveMapping = window.confirm(
                'Import successful! Would you like to save this column mapping for future use?'
            );

            if (shouldSaveMapping) {
                const mappingName = window.prompt('Enter a name for this mapping:', selectedStaging.file_name.replace(/\.[^/.]+$/, ''));
                if (mappingName) {
                    try {
                        await supabaseColumnMappingsDB.add({
                            account_id: accountId,
                            file_type: selectedStaging.file_type,
                            name: mappingName,
                            mapping_config: columnMappings
                        });
                        console.log('Mapping saved successfully');
                    } catch (error) {
                        console.error('Failed to save mapping:', error);
                        // Don't block navigation if mapping save fails
                    }
                }
            }

            alert(`Successfully imported ${transactions.length} transactions!`);
            navigate(`/accounts`);
        } catch (error) {
            console.error('Error applying mapping:', error);
            alert('Failed to import transactions: ' + error.message);
            await supabaseImportStagingDB.updateStatus(
                selectedStaging.id,
                'failed',
                error.message
            );
        } finally {
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (stagingRecords.length === 0) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <button
                    onClick={() => navigate('/accounts')}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Back to Accounts
                </button>
                <div className="bg-white rounded-lg shadow p-8 text-center">
                    <p className="text-gray-600">No pending imports for this account.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => navigate('/accounts')}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Accounts
                    </button>
                    <h1 className="text-3xl font-bold text-gray-900">
                        Map Import Columns - {account?.name}
                    </h1>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                {/* Left sidebar - Staging files list */}
                <div className="col-span-3 space-y-2">
                    <h3 className="font-semibold text-sm text-gray-700 mb-2">Pending Imports:</h3>
                    {stagingRecords.map(staging => (
                        <button
                            key={staging.id}
                            onClick={() => selectStaging(staging)}
                            className={`w-full text-left p-3 rounded-lg border transition-colors ${selectedStaging?.id === staging.id
                                ? 'bg-blue-50 border-blue-300'
                                : 'bg-white border-gray-200 hover:bg-gray-50'
                                }`}
                        >
                            <p className="font-medium text-sm truncate">{staging.file_name}</p>
                            <p className="text-xs text-gray-500">{staging.row_count} rows</p>
                            <p className="text-xs text-gray-400">{new Date(staging.uploaded_at).toLocaleDateString()}</p>
                        </button>
                    ))}
                </div>

                {/* Main content */}
                <div className="col-span-9 bg-white rounded-lg shadow p-6 space-y-6">
                    {selectedStaging && (
                        <>
                            {/* Saved mappings */}
                            {savedMappings.length > 0 && (
                                <div className="border-b pb-4">
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Load Saved Mapping:
                                    </label>
                                    <select
                                        onChange={(e) => e.target.value && handleLoadMapping(e.target.value)}
                                        className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">-- Select a saved mapping --</option>
                                        {savedMappings.map(mapping => (
                                            <option key={mapping.id} value={mapping.id}>
                                                {mapping.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            {/* Column Mappings */}
                            <div>
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="font-semibold text-lg">Map Columns</h3>
                                    <button
                                        onClick={handleSaveMapping}
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        Save Mapping
                                    </button>
                                </div>
                                <div className="space-y-3">
                                    {transactionFields.map(field => (
                                        <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                                            <label className="text-sm font-medium text-gray-700">
                                                {field.label}
                                            </label>
                                            <select
                                                value={columnMappings[field.key] || ''}
                                                onChange={(e) => handleMappingChange(field.key, e.target.value)}
                                                className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${field.required && !columnMappings[field.key]
                                                    ? 'border-red-300 bg-red-50'
                                                    : 'border-gray-300'
                                                    }`}
                                            >
                                                <option value="">-- Select CSV Column --</option>
                                                {selectedStaging.column_names.map(col => (
                                                    <option key={col} value={col}>{col}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Preview */}
                            {rawData.length > 0 && (
                                <div className="border rounded-lg overflow-hidden">
                                    <div className="bg-gray-50 px-4 py-2 border-b">
                                        <h4 className="font-medium text-sm">Preview (First 5 rows)</h4>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-100">
                                                <tr>
                                                    {selectedStaging.column_names.map(col => (
                                                        <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                                                            {col}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y">
                                                {rawData.slice(0, 5).map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        {selectedStaging.column_names.map(col => (
                                                            <td key={col} className="px-3 py-2 text-gray-900 whitespace-nowrap">
                                                                {row[col]}
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4 border-t">
                                <button
                                    onClick={() => navigate('/accounts')}
                                    disabled={processing}
                                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleApplyMapping}
                                    disabled={processing}
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {processing ? (
                                        <>
                                            <span className="animate-spin">⏳</span>
                                            Importing...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="w-4 h-4" />
                                            Import {selectedStaging.row_count} Transactions
                                        </>
                                    )}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
