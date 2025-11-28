import React, { useState, useEffect } from 'react';
import { Upload, Table, CheckCircle, AlertTriangle, Eye, Download, RefreshCw, FileText } from 'lucide-react';
import { extractTablesWithPython, checkPythonServiceHealth } from '../services/pythonBackendService';
import { saveCompleteExtraction } from '../services/investmentDataService';

const RealPDFParser = () => {
    const [file, setFile] = useState(null);
    const [extractedTables, setExtractedTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [error, setError] = useState(null);
    const [extracting, setExtracting] = useState(false);
    const [pythonServiceAvailable, setPythonServiceAvailable] = useState(null);
    const [savingToDB, setSavingToDB] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(null);

    // Check Python service on mount
    useEffect(() => {
        console.log('🔍 Checking Python service availability...');
        checkPythonServiceHealth().then(health => {
            console.log('Python service health check result:', health);
            setPythonServiceAvailable(health.available);
            if (health.available) {
                console.log('✅ Python backend available:', health);
            } else {
                console.log('⚠️ Python backend not available:', health.error);
                console.log('💡 To use Python extraction, run: start-python-service.bat');
            }
        });
    }, []);

    // Handle file upload and Python extraction
    const handleFileUpload = async (event) => {
        const uploadedFile = event.target.files[0];
        if (!uploadedFile) return;

        if (!uploadedFile.type.includes('pdf')) {
            setError('Please upload a PDF file');
            return;
        }

        if (!pythonServiceAvailable) {
            setError('Python service is not running. Please start it with: start-python-service.bat');
            return;
        }

        setFile(uploadedFile);
        setExtracting(true);
        setError(null);
        setExtractedTables([]);

        try {
            console.log('🐍 Extracting with Python backend (Camelot/Tabula)...');
            const result = await extractTablesWithPython(uploadedFile);

            if (result.success && result.tables) {
                console.log(`✅ Python extracted ${result.tables.length} tables`);
                
                // Transform Python backend format to our display format
                const transformedTables = result.tables.map(table => ({
                    id: table.id,
                    page: table.page,
                    method: table.method,
                    dataType: table.dataType || 'unknown',
                    suggestedImport: table.suggestedImport || table.dataType || 'unknown',
                    headers: table.headers || [],
                    rows: table.rows || [],
                    rowCount: table.row_count || table.rows?.length || 0,
                    columnCount: table.column_count || table.headers?.length || 0
                }));

                setExtractedTables(transformedTables);
                
                // Store account info if we can infer it from filename
                const accountInfo = {
                    accountNumber: 'UNKNOWN',
                    accountName: uploadedFile.name.replace('.pdf', ''),
                    statementDate: new Date().toISOString().split('T')[0],
                    extractedAt: new Date().toISOString(),
                    extractionMethod: 'python-backend'
                };
                localStorage.setItem('current_statement_account', JSON.stringify(accountInfo));

            } else {
                throw new Error(result.error || 'Failed to extract tables');
            }

        } catch (err) {
            console.error('❌ Python extraction error:', err);
            setError(`Extraction failed: ${err.message}`);
        } finally {
            setExtracting(false);
        }
    };

    // Save to database
    const handleSaveToDatabase = async () => {
        setSavingToDB(true);
        setSaveSuccess(null);
        setError(null);

        try {
            const accountInfoStr = localStorage.getItem('current_statement_account');
            if (!accountInfoStr) {
                throw new Error('No account information found. Please extract data first.');
            }

            const accountInfo = JSON.parse(accountInfoStr);

            console.log('💾 Saving to database...', { accountInfo, tables: extractedTables });
            const result = await saveCompleteExtraction(accountInfo, extractedTables);

            if (result.success) {
                setSaveSuccess(result.message);
                console.log('✅ Save complete:', result.results);
            } else {
                throw new Error(result.message);
            }

        } catch (err) {
            console.error('❌ Save error:', err);
            setError(`Failed to save: ${err.message}`);
        } finally {
            setSavingToDB(false);
        }
    };

    // Update table classification
    const handleUpdateTableType = (tableId, newType) => {
        setExtractedTables(tables =>
            tables.map(t =>
                t.id === tableId
                    ? { ...t, dataType: newType, suggestedImport: newType }
                    : t
            )
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-gray-900 mb-2">
                        📊 Investment PDF Table Extractor
                    </h1>
                    <p className="text-gray-600">
                        Reliable table extraction using Python (Camelot + Tabula)
                    </p>
                    {pythonServiceAvailable === false && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <p className="text-yellow-800 text-sm">
                                ⚠️ Python service not running. Run <code className="bg-yellow-100 px-2 py-1 rounded">start-python-service.bat</code> to enable extraction.
                            </p>
                        </div>
                    )}
                    {pythonServiceAvailable === true && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-800 text-sm">
                                ✅ Python service ready - Camelot & Tabula available for complete data extraction
                            </p>
                        </div>
                    )}
                </div>

                {/* Upload Area */}
                {!file && (
                    <div className="bg-white rounded-lg shadow-lg p-8 mb-6">
                        <label className="block cursor-pointer">
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileUpload}
                                className="hidden"
                                disabled={!pythonServiceAvailable}
                            />
                            <div className="border-4 border-dashed border-blue-300 rounded-xl p-12 text-center hover:border-blue-500 hover:bg-blue-50 transition-all">
                                <Upload className="w-16 h-16 mx-auto text-blue-500 mb-4" />
                                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                                    Upload Your Investment PDF
                                </h2>
                                <p className="text-gray-600 mb-4">
                                    Click to browse or drag and drop your PDF file here
                                </p>
                                <p className="text-sm text-gray-500">
                                    Supports: Olympia Trust, Questrade, and other investment statements
                                </p>
                            </div>
                        </label>
                    </div>
                )}

                {/* Error Message */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                        <div className="flex items-center gap-2 text-red-800">
                            <AlertTriangle className="w-5 h-5" />
                            <div>
                                <strong>Error:</strong> {error}
                            </div>
                        </div>
                    </div>
                )}

                {/* Extracting Status */}
                {extracting && (
                    <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                        <h3 className="text-xl font-semibold mb-2">Extracting Tables...</h3>
                        <p className="text-gray-600">Using Python backend (Camelot + Tabula) to extract from {file?.name}</p>
                    </div>
                )}

                {/* Results */}
                {!extracting && extractedTables.length > 0 && (
                    <div className="space-y-6">
                        {/* Summary */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        ✅ {extractedTables.length} Tables Extracted
                                    </h2>
                                    <p className="text-gray-600 mt-1">From: {file?.name}</p>
                                    <p className="text-sm text-blue-600 mt-1">
                                        Method: Python (Camelot + Tabula)
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleSaveToDatabase}
                                        disabled={savingToDB}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                        <Download className="w-4 h-4" />
                                        {savingToDB ? 'Saving...' : 'Save to Database'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setFile(null);
                                            setExtractedTables([]);
                                            setSelectedTable(null);
                                            setSaveSuccess(null);
                                        }}
                                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Upload Another
                                    </button>
                                </div>
                            </div>

                            {/* Save Success Message */}
                            {saveSuccess && (
                                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                    <p className="text-green-800 font-medium">✅ {saveSuccess}</p>
                                </div>
                            )}
                        </div>

                        {/* Tables List */}
                        <div className="grid grid-cols-1 gap-4">
                            {extractedTables.map((table, idx) => (
                                <div key={table.id || idx} className="bg-white rounded-lg shadow-lg overflow-hidden">
                                    {/* Table Header */}
                                    <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                    <Table className="w-5 h-5 text-blue-600" />
                                                    {table.id || `Table ${idx + 1}`}
                                                </h3>
                                                <div className="flex gap-4 text-sm text-gray-600 mt-1">
                                                    <span>Page {table.page}</span>
                                                    <span>•</span>
                                                    <span>{table.rowCount} rows × {table.columnCount} columns</span>
                                                    <span>•</span>
                                                    <span className="text-blue-600">{table.method}</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <select
                                                    value={table.dataType}
                                                    onChange={(e) => handleUpdateTableType(table.id, e.target.value)}
                                                    className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                >
                                                    <option value="holdings">Holdings</option>
                                                    <option value="investmentTransactions">Investment Transactions</option>
                                                    <option value="cashTransactions">Cash Transactions</option>
                                                    <option value="unknown">Unknown</option>
                                                </select>
                                                <button
                                                    onClick={() => setSelectedTable(selectedTable === table.id ? null : table.id)}
                                                    className="flex items-center gap-2 px-3 py-1 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                    {selectedTable === table.id ? 'Hide' : 'View'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Table Content */}
                                    {selectedTable === table.id && (
                                        <div className="p-4 overflow-x-auto">
                                            <table className="min-w-full text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        {table.headers.map((header, hIdx) => (
                                                            <th key={hIdx} className="px-3 py-2 text-left font-semibold text-gray-700 border-b">
                                                                {header || `Column ${hIdx + 1}`}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {table.rows.map((row, rIdx) => (
                                                        <tr key={rIdx} className={rIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                            {row.map((cell, cIdx) => (
                                                                <td key={cIdx} className="px-3 py-2 border-b text-gray-900">
                                                                    {cell || '—'}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RealPDFParser;
