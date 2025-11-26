// src/components/transactions/ColumnMapper.jsx
import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';

export const ColumnMapper = ({ file, onComplete, onCancel }) => {
    const [csvColumns, setCsvColumns] = useState([]);
    const [previewData, setPreviewData] = useState([]);
    const [columnMappings, setColumnMappings] = useState({});
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);
    const [totalRows, setTotalRows] = useState(0);
    const [processedRows, setProcessedRows] = useState(0);

    // Required transaction fields based on our database schema
    const transactionFields = [
        { key: 'date', label: 'Date *', required: true },
        { key: 'description', label: 'Description *', required: true },
        { key: 'amount', label: 'Amount *', required: true },
        { key: 'type', label: 'Transaction Type', required: false },
        { key: 'memo', label: 'Memo', required: false },
        { key: 'currency', label: 'Currency', required: false },
    ];

    useEffect(() => {
        if (file) {
            parseFile();
        }
    }, [file]);

    const parseFile = () => {
        setLoading(true);
        Papa.parse(file, {
            header: true,
            preview: 5, // Read first 5 rows for preview
            skipEmptyLines: true,
            complete: (results) => {
                const columns = results.meta.fields || [];
                setCsvColumns(columns);
                setPreviewData(results.data);
                
                // Auto-detect mappings based on common column names
                const autoMappings = autoDetectMappings(columns);
                setColumnMappings(autoMappings);
                
                setLoading(false);
            },
            error: (error) => {
                console.error('Error parsing CSV:', error);
                alert('Failed to parse file: ' + error.message);
                setLoading(false);
            }
        });

        // Get total row count
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                setTotalRows(results.data.length);
            }
        });
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
            
            // Amount detection (look for balance, debit, credit, or amount)
            if ((colLower.includes('amount') || colLower.includes('balance') || 
                 colLower === 'debit' || colLower === 'credit') && !mappings.amount) {
                mappings.amount = col;
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

    const handleConfirm = async () => {
        // Validate required fields are mapped
        const missingRequired = transactionFields
            .filter(field => field.required && !columnMappings[field.key])
            .map(field => field.label);
        
        if (missingRequired.length > 0) {
            alert(`Please map the following required fields:\n${missingRequired.join('\n')}`);
            return;
        }

        setProcessing(true);
        setProcessedRows(0);

        try {
            // Parse the full file with the mappings
            await new Promise((resolve, reject) => {
                Papa.parse(file, {
                    header: true,
                    skipEmptyLines: true,
                    chunk: (results, parser) => {
                        // Update progress as chunks are processed
                        setProcessedRows(prev => prev + results.data.length);
                    },
                    complete: (results) => {
                        try {
                            const mappedTransactions = results.data.map((row, index) => {
                                const mapped = {
                                    id: `csv_${Date.now()}_${index}`,
                                };
                                
                                // Apply mappings
                                Object.entries(columnMappings).forEach(([txnField, csvCol]) => {
                                    if (csvCol && row[csvCol] !== undefined) {
                                        mapped[txnField] = row[csvCol];
                                    }
                                });
                                
                                // Parse amount to float
                                if (mapped.amount) {
                                    // Remove any currency symbols and commas
                                    const cleanAmount = String(mapped.amount).replace(/[$,]/g, '');
                                    mapped.amount = parseFloat(cleanAmount) || 0;
                                }
                                
                                // Ensure date format
                                if (mapped.date) {
                                    // Try to parse and standardize the date
                                    const date = new Date(mapped.date);
                                    if (!isNaN(date.getTime())) {
                                        mapped.date = date.toISOString().split('T')[0];
                                    }
                                }
                                
                                // Set default values if not mapped
                                if (!mapped.currency) {
                                    mapped.currency = 'CAD';
                                }
                                
                                if (!mapped.type) {
                                    // Auto-detect type based on amount
                                    mapped.type = mapped.amount >= 0 ? 'credit' : 'debit';
                                }
                                
                                return mapped;
                            });
                            
                            resolve(mappedTransactions);
                        } catch (error) {
                            reject(error);
                        }
                    },
                    error: (error) => {
                        reject(error);
                    }
                });
            }).then((mappedTransactions) => {
                onComplete(mappedTransactions, columnMappings);
            });
        } catch (error) {
            console.error('Error parsing full file:', error);
            alert('Failed to parse file: ' + error.message);
            setProcessing(false);
        }
    };

    if (loading) {
        return (
            <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Reading file...</p>
                {totalRows > 0 && (
                    <p className="text-sm text-gray-500 mt-2">Found {totalRows} rows</p>
                )}
            </div>
        );
    }

    if (processing) {
        const progress = totalRows > 0 ? Math.round((processedRows / totalRows) * 100) : 0;
        return (
            <div className="p-6 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Processing transactions...</p>
                <p className="text-sm text-gray-500 mt-2">
                    {processedRows} / {totalRows} rows ({progress}%)
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-4 max-w-md mx-auto">
                    <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-bold mb-2">Map CSV Columns to Transaction Fields</h3>
                <p className="text-sm text-gray-600">
                    Match the columns from your CSV file to the transaction fields below. 
                    Fields marked with * are required.
                </p>
                {totalRows > 0 && (
                    <p className="text-sm text-blue-600 font-medium mt-2">
                        📊 {totalRows} transactions ready to import
                    </p>
                )}
            </div>

            {/* Column Mappings */}
            <div className="space-y-3">
                {transactionFields.map(field => (
                    <div key={field.key} className="grid grid-cols-2 gap-4 items-center">
                        <label className="text-sm font-medium text-gray-700">
                            {field.label}
                        </label>
                        <select
                            value={columnMappings[field.key] || ''}
                            onChange={(e) => handleMappingChange(field.key, e.target.value)}
                            className={`px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                                field.required && !columnMappings[field.key] 
                                    ? 'border-red-300 bg-red-50' 
                                    : 'border-gray-300'
                            }`}
                        >
                            <option value="">-- Select CSV Column --</option>
                            {csvColumns.map(col => (
                                <option key={col} value={col}>{col}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>

            {/* Preview Section */}
            {previewData.length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b">
                        <h4 className="font-medium text-sm">Preview (First 5 rows)</h4>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-100">
                                <tr>
                                    {csvColumns.map(col => (
                                        <th key={col} className="px-3 py-2 text-left text-xs font-medium text-gray-700">
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {previewData.map((row, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        {csvColumns.map(col => (
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
                    onClick={onCancel}
                    disabled={processing}
                    className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Cancel
                </button>
                <button
                    onClick={handleConfirm}
                    disabled={processing}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {processing ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            Processing...
                        </>
                    ) : (
                        'Import Transactions'
                    )}
                </button>
            </div>
        </div>
    );
};
