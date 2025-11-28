import React, { useState, useEffect } from 'react';
import { Upload, Table, CheckCircle, AlertTriangle, Eye, Download, RefreshCw, FileText, Sparkles, Key } from 'lucide-react';
import { extractTablesWithPython, checkPythonServiceHealth } from '../services/pythonBackendService';
import { extractTablesWithVision, getClaudeApiKey, setClaudeApiKey } from '../services/pdfVisionExtractor';
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
    const [extractionMethod, setExtractionMethod] = useState('python'); // 'python' or 'vision'
    const [claudeApiKey, setClaudeApiKeyState] = useState(getClaudeApiKey());
    const [showApiKeyInput, setShowApiKeyInput] = useState(false);
    const [extractionProgress, setExtractionProgress] = useState(null);
    const [rawExtractedData, setRawExtractedData] = useState(null); // Store raw vision data
    const [showHoldingsReview, setShowHoldingsReview] = useState(false);
    const [reviewedHoldings, setReviewedHoldings] = useState([]);

    // Load cached data on mount
    useEffect(() => {
        const cachedTables = localStorage.getItem('cached_extracted_tables');
        const cachedRawData = localStorage.getItem('cached_raw_extracted_data');

        if (cachedTables) {
            try {
                setExtractedTables(JSON.parse(cachedTables));
                console.log('✅ Loaded cached tables from localStorage');
            } catch (e) {
                console.error('Failed to load cached tables:', e);
            }
        }

        if (cachedRawData) {
            try {
                setRawExtractedData(JSON.parse(cachedRawData));
                console.log('✅ Loaded cached raw data from localStorage');
            } catch (e) {
                console.error('Failed to load cached raw data:', e);
            }
        }
    }, []);

    // Check Python service on mount and update Claude API key from env
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

        // Update API key from environment if available
        const envKey = getClaudeApiKey();
        if (envKey) {
            setClaudeApiKeyState(envKey);
            console.log('✅ Claude API key loaded from environment');
        }
    }, []);

    // Handle API key save
    const handleSaveApiKey = () => {
        setClaudeApiKey(claudeApiKey);
        setShowApiKeyInput(false);
        setError(null);
    };

    // Clear cached data
    const handleClearCache = () => {
        localStorage.removeItem('cached_extracted_tables');
        localStorage.removeItem('cached_raw_extracted_data');
        localStorage.removeItem('current_statement_account');
        setExtractedTables([]);
        setRawExtractedData(null);
        setSelectedTable(null);
        setSaveSuccess(null);
        setError(null);
        console.log('🗑️ Cleared all cached data');
    };

    // Parse date from statement period string
    const parseStatementDate = (statementPeriod) => {
        if (!statementPeriod) return new Date().toISOString().split('T')[0];

        // Try to extract end date from "July 1, 2025 to September 30, 2025" format
        const toMatch = statementPeriod.match(/to\s+([A-Za-z]+\s+\d{1,2},\s+\d{4})/);
        if (toMatch) {
            const endDate = new Date(toMatch[1]);
            if (!isNaN(endDate.getTime())) {
                return endDate.toISOString().split('T')[0];
            }
        }

        // Try to parse the whole string as a date
        const date = new Date(statementPeriod);
        if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
        }

        // Fallback to today
        return new Date().toISOString().split('T')[0];
    };

    // Handle file upload and extraction
    const handleFileUpload = async (event) => {
        const uploadedFile = event.target.files[0];
        if (!uploadedFile) return;

        if (!uploadedFile.type.includes('pdf')) {
            setError('Please upload a PDF file');
            return;
        }

        // Check if the selected method is available
        if (extractionMethod === 'python' && !pythonServiceAvailable) {
            setError('Python service is not running. Please start it with: start-python-service.bat or switch to Claude Vision');
            return;
        }

        if (extractionMethod === 'vision' && !claudeApiKey) {
            setError('Please enter your Claude API key to use Vision extraction');
            setShowApiKeyInput(true);
            return;
        }

        setFile(uploadedFile);
        setExtracting(true);
        setError(null);
        setExtractedTables([]);
        setExtractionProgress(null);

        try {
            if (extractionMethod === 'python') {
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
            } else {
                // Claude Vision extraction
                console.log('👁️ Extracting with Claude Vision...');
                const result = await extractTablesWithVision(
                    uploadedFile,
                    claudeApiKey,
                    (progress) => {
                        setExtractionProgress(progress);
                        console.log('Progress:', progress);
                    }
                );

                if (result.success && result.data) {
                    console.log(`✅ Vision extracted data from ${result.pageCount} pages`);

                    // Store raw data for display
                    setRawExtractedData(result.data);

                    // Transform Vision result to table format
                    const transformedTables = [];

                    // Add transactions as a table
                    if (result.data.transactions && result.data.transactions.length > 0) {
                        transformedTables.push({
                            id: 'vision-transactions',
                            page: 'all',
                            method: 'claude-vision',
                            dataType: 'investmentTransactions',
                            suggestedImport: 'investmentTransactions',
                            headers: ['date', 'description', 'type', 'shares', 'price', 'amount'],
                            rows: result.data.transactions,
                            rowCount: result.data.transactions.length,
                            columnCount: 6
                        });
                    }

                    // Add holdings as a table
                    if (result.data.holdings && result.data.holdings.length > 0) {
                        transformedTables.push({
                            id: 'vision-holdings',
                            page: 'all',
                            method: 'claude-vision',
                            dataType: 'holdings',
                            suggestedImport: 'holdings',
                            headers: ['security', 'units', 'price', 'value', 'bookCost'],
                            rows: result.data.holdings,
                            rowCount: result.data.holdings.length,
                            columnCount: 5
                        });
                    }

                    // Add fees as a table
                    if (result.data.fees && result.data.fees.length > 0) {
                        transformedTables.push({
                            id: 'vision-fees',
                            page: 'all',
                            method: 'claude-vision',
                            dataType: 'fees',
                            suggestedImport: 'fees',
                            headers: ['date', 'description', 'amount'],
                            rows: result.data.fees,
                            rowCount: result.data.fees.length,
                            columnCount: 3
                        });
                    }

                    setExtractedTables(transformedTables);

                    // Cache the extracted data
                    localStorage.setItem('cached_extracted_tables', JSON.stringify(transformedTables));
                    localStorage.setItem('cached_raw_extracted_data', JSON.stringify(result.data));
                    console.log('💾 Cached extracted data to localStorage');

                    // Store account info from metadata
                    const accountInfo = {
                        accountNumber: result.data.metadata?.accountNumber || 'UNKNOWN',
                        accountName: result.data.metadata?.institution || uploadedFile.name.replace('.pdf', ''),
                        institution: result.data.metadata?.institution || 'Unknown Institution',
                        accountType: result.data.metadata?.accountType || 'Investment Account',
                        statementDate: parseStatementDate(result.data.metadata?.statementPeriod),
                        openingBalance: result.data.summary?.openingBalance || null,
                        closingBalance: result.data.summary?.totalValue || null,
                        currency: 'CAD',
                        extractedAt: new Date().toISOString(),
                        extractionMethod: 'claude-vision'
                    };
                    localStorage.setItem('current_statement_account', JSON.stringify(accountInfo));

                } else {
                    throw new Error(result.error || 'Failed to extract data with Vision');
                }
            }

        } catch (err) {
            console.error(`❌ ${extractionMethod} extraction error:`, err);
            setError(`Extraction failed: ${err.message}`);
        } finally {
            setExtracting(false);
            setExtractionProgress(null);
        }
    };

    // Open holdings review before saving
    const handleOpenHoldingsReview = () => {
        // Find holdings table
        const holdingsTable = extractedTables.find(t => t.dataType === 'holdings');
        if (!holdingsTable) {
            setError('No holdings found to review');
            return;
        }

        // Only initialize if not already reviewed (preserve user edits)
        if (reviewedHoldings.length === 0) {
            const initialReview = holdingsTable.rows.map((row, idx) => ({
                id: idx,
                security: row.security || '',
                symbol: '',
                securityName: '',
                assetType: '',
                category: '',
                subCategory: '',
                units: row.units || 0,
                price: row.price || 0,
                value: row.value || 0,
                bookCost: row.bookCost || 0
            }));
            setReviewedHoldings(initialReview);
        }

        setShowHoldingsReview(true);
    };

    // Update reviewed holding
    const handleUpdateReviewedHolding = (id, field, value) => {
        setReviewedHoldings(prev =>
            prev.map(h => h.id === id ? { ...h, [field]: value } : h)
        );
    };

    // Save to database after review
    const handleSaveToDatabase = async () => {
        setSavingToDB(true);
        setSaveSuccess(null);
        setError(null);
        setShowHoldingsReview(false);

        try {
            const accountInfoStr = localStorage.getItem('current_statement_account');
            if (!accountInfoStr) {
                throw new Error('No account information found. Please extract data first.');
            }

            const accountInfo = JSON.parse(accountInfoStr);

            // Replace holdings table rows with reviewed holdings that have required fields
            const updatedTables = extractedTables.map(table => {
                if (table.dataType === 'holdings' && reviewedHoldings.length > 0) {
                    // Only include holdings where user provided symbol and security name
                    const validHoldings = reviewedHoldings.filter(h =>
                        h.symbol && h.symbol.trim() !== '' &&
                        h.securityName && h.securityName.trim() !== ''
                    );

                    if (validHoldings.length === 0) {
                        throw new Error('Please provide Symbol and Security Name for at least one holding');
                    }

                    return {
                        ...table,
                        rows: validHoldings.map(h => ({
                            symbol: h.symbol,
                            securityName: h.securityName,
                            assetType: h.assetType,
                            category: h.category,
                            subCategory: h.subCategory,
                            units: h.units,
                            price: h.price,
                            value: h.value,
                            bookCost: h.bookCost
                        }))
                    };
                }
                return table;
            });

            console.log('💾 Saving to database...', { accountInfo, tables: updatedTables, reviewedHoldings });
            const result = await saveCompleteExtraction(accountInfo, updatedTables);

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
                    <p className="text-gray-600 mb-4">
                        Reliable table extraction using Python (Camelot + Tabula) or Claude Vision AI
                    </p>

                    {/* Extraction Method Toggle */}
                    <div className="flex justify-center gap-3 mb-4">
                        <button
                            onClick={() => setExtractionMethod('python')}
                            className={`px-6 py-3 rounded-lg font-medium transition-all ${extractionMethod === 'python'
                                ? 'bg-blue-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            🐍 Python Backend
                        </button>
                        <button
                            onClick={() => {
                                setExtractionMethod('vision');
                                if (!claudeApiKey) setShowApiKeyInput(true);
                            }}
                            className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${extractionMethod === 'vision'
                                ? 'bg-purple-600 text-white shadow-lg'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            <Sparkles className="w-4 h-4" />
                            Claude Vision AI
                        </button>
                    </div>

                    {/* API Key Input */}
                    {extractionMethod === 'vision' && !claudeApiKey && (
                        <div className="mt-4 p-6 bg-purple-50 border border-purple-200 rounded-lg max-w-2xl mx-auto">
                            <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2 justify-center">
                                <Key className="w-5 h-5" />
                                Enter Your Claude API Key
                            </h3>
                            <div className="flex gap-2">
                                <input
                                    type="password"
                                    placeholder="sk-ant-..."
                                    value={claudeApiKey}
                                    onChange={(e) => setClaudeApiKeyState(e.target.value)}
                                    className="flex-1 px-4 py-3 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                                />
                                <button
                                    onClick={handleSaveApiKey}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                                >
                                    Save
                                </button>
                            </div>
                            <p className="text-sm text-purple-700 mt-2 text-left">
                                Get your API key from:{' '}
                                <a
                                    href="https://console.anthropic.com/"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline font-medium"
                                >
                                    console.anthropic.com
                                </a>
                            </p>
                        </div>
                    )}

                    {pythonServiceAvailable === false && extractionMethod === 'python' && (
                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg max-w-2xl mx-auto">
                            <p className="text-yellow-800 text-sm">
                                ⚠️ Python service not running. Run <code className="bg-yellow-100 px-2 py-1 rounded">start-python-service.bat</code> or switch to Claude Vision.
                            </p>
                        </div>
                    )}
                    {pythonServiceAvailable === true && extractionMethod === 'python' && (
                        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg max-w-2xl mx-auto">
                            <p className="text-green-800 text-sm">
                                ✅ Python service ready - Camelot & Tabula available
                            </p>
                        </div>
                    )}
                    {extractionMethod === 'vision' && claudeApiKey && !showApiKeyInput && (
                        <div className="mt-4 p-3 bg-purple-50 border border-purple-200 rounded-lg max-w-2xl mx-auto">
                            <p className="text-purple-800 text-sm flex items-center gap-2 justify-center">
                                <Sparkles className="w-4 h-4" />
                                Claude Vision ready - Extracts ALL tables from any PDF format
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
                    <div className="bg-white rounded-lg shadow-lg p-8">
                        <div className="text-center mb-6">
                            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                            <h3 className="text-xl font-semibold mb-2">
                                {extractionMethod === 'vision' ? 'Analyzing with Claude Vision AI...' : 'Extracting Tables...'}
                            </h3>
                            <p className="text-gray-600">Processing {file?.name}</p>
                        </div>

                        {/* Progress Steps */}
                        {extractionMethod === 'vision' && (
                            <div className="max-w-2xl mx-auto space-y-3">
                                <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${extractionProgress?.step === 'converting' || extractionProgress?.step === 'converted'
                                    ? 'bg-blue-50 border border-blue-200'
                                    : extractionProgress?.step === 'extracting' || extractionProgress?.step === 'complete'
                                        ? 'bg-green-50 border border-green-200'
                                        : 'bg-gray-50 border border-gray-200'
                                    }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${extractionProgress?.step === 'converted' || extractionProgress?.step === 'extracting' || extractionProgress?.step === 'complete'
                                        ? 'bg-green-500 text-white'
                                        : extractionProgress?.step === 'converting'
                                            ? 'bg-blue-500 text-white animate-pulse'
                                            : 'bg-gray-300 text-gray-600'
                                        }`}>
                                        {extractionProgress?.step === 'converted' || extractionProgress?.step === 'extracting' || extractionProgress?.step === 'complete' ? '✓' : '1'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">Converting PDF to images</div>
                                        {extractionProgress?.step === 'converted' && (
                                            <div className="text-sm text-gray-600">{extractionProgress.images?.length || 0} pages converted</div>
                                        )}
                                    </div>
                                </div>

                                <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${extractionProgress?.step === 'extracting'
                                    ? 'bg-blue-50 border border-blue-200'
                                    : extractionProgress?.step === 'complete'
                                        ? 'bg-green-50 border border-green-200'
                                        : 'bg-gray-50 border border-gray-200'
                                    }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${extractionProgress?.step === 'complete'
                                        ? 'bg-green-500 text-white'
                                        : extractionProgress?.step === 'extracting'
                                            ? 'bg-blue-500 text-white animate-pulse'
                                            : 'bg-gray-300 text-gray-600'
                                        }`}>
                                        {extractionProgress?.step === 'complete' ? '✓' : '2'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">Analyzing images with AI</div>
                                        {extractionProgress?.step === 'extracting' && extractionProgress.currentPage && (
                                            <div className="text-sm text-gray-600">
                                                Page {extractionProgress.currentPage} of {extractionProgress.totalPages}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${extractionProgress?.step === 'consolidating' || extractionProgress?.step === 'complete'
                                    ? 'bg-blue-50 border border-blue-200'
                                    : 'bg-gray-50 border border-gray-200'
                                    }`}>
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${extractionProgress?.step === 'complete'
                                        ? 'bg-green-500 text-white'
                                        : extractionProgress?.step === 'consolidating'
                                            ? 'bg-blue-500 text-white animate-pulse'
                                            : 'bg-gray-300 text-gray-600'
                                        }`}>
                                        {extractionProgress?.step === 'complete' ? '✓' : '3'}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-900">Presenting the data</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Results */}
                {!extracting && extractedTables.length > 0 && (
                    <div className="space-y-6">
                        {/* Extraction Summary Statistics */}
                        {rawExtractedData && extractionMethod === 'vision' && (
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <CheckCircle className="w-6 h-6 text-green-600" />
                                    <h2 className="text-2xl font-bold text-gray-900">Extraction Complete</h2>
                                </div>
                                <p className="text-gray-600 mb-4">From: {file?.name} ({rawExtractedData.metadata?.pageNumber || extractedTables.length} pages)</p>

                                <div className="grid grid-cols-4 gap-4">
                                    <div className="bg-blue-50 rounded-lg p-4 text-center">
                                        <div className="text-4xl font-bold text-blue-600">{rawExtractedData.transactions?.length || 0}</div>
                                        <div className="text-sm text-gray-600 mt-1">Transactions</div>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-4 text-center">
                                        <div className="text-4xl font-bold text-green-600">{rawExtractedData.holdings?.length || 0}</div>
                                        <div className="text-sm text-gray-600 mt-1">Holdings</div>
                                    </div>
                                    <div className="bg-purple-50 rounded-lg p-4 text-center">
                                        <div className="text-4xl font-bold text-purple-600">{rawExtractedData.fees?.length || 0}</div>
                                        <div className="text-sm text-gray-600 mt-1">Fees</div>
                                    </div>
                                    <div className="bg-orange-50 rounded-lg p-4 text-center">
                                        <div className="text-4xl font-bold text-orange-600">7</div>
                                        <div className="text-sm text-gray-600 mt-1">Pages</div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Raw JSON Display for Vision Extraction */}
                        {rawExtractedData && extractionMethod === 'vision' && (
                            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                                <div className="p-4 bg-purple-50 border-b border-purple-200">
                                    <h3 className="font-bold text-purple-900 flex items-center gap-2">
                                        <Eye className="w-5 h-5" />
                                        Raw Claude Vision Extraction
                                    </h3>
                                </div>
                                <div className="p-4">
                                    <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                                        {JSON.stringify(rawExtractedData, null, 2)}
                                    </pre>
                                </div>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">
                                        ✅ {extractedTables.length} Tables Extracted
                                    </h2>
                                    <p className="text-gray-600 mt-1">From: {file?.name}</p>
                                    <p className="text-sm text-blue-600 mt-1">
                                        Method: {extractionMethod === 'vision' ? 'Claude Vision AI' : 'Python (Camelot + Tabula)'}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleOpenHoldingsReview}
                                        disabled={savingToDB}
                                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                    >
                                        <Download className="w-4 h-4" />
                                        Review & Save to Database
                                    </button>
                                    <button
                                        onClick={handleClearCache}
                                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                        Clear Cache
                                    </button>
                                    <button
                                        onClick={() => {
                                            setFile(null);
                                            setExtractedTables([]);
                                            setSelectedTable(null);
                                            setSaveSuccess(null);
                                            setRawExtractedData(null);
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
                                                            {Array.isArray(row)
                                                                ? row.map((cell, cIdx) => (
                                                                    <td key={cIdx} className="px-3 py-2 border-b text-gray-900">
                                                                        {cell || '—'}
                                                                    </td>
                                                                ))
                                                                : table.headers.map((header, cIdx) => (
                                                                    <td key={cIdx} className="px-3 py-2 border-b text-gray-900">
                                                                        {row[header] || row[header.toLowerCase()] || '—'}
                                                                    </td>
                                                                ))
                                                            }
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

                {/* Holdings Review Modal */}
                {showHoldingsReview && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                            {/* Modal Header */}
                            <div className="p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600">
                                <h2 className="text-2xl font-bold text-white">Review Holdings Before Saving</h2>
                                <p className="text-blue-100 mt-1">Please verify and complete the information for each holding</p>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="space-y-6">
                                    {reviewedHoldings.map((holding) => (
                                        <div key={holding.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                                            <div className="grid grid-cols-2 gap-4">
                                                {/* Left Column - Extracted Data */}
                                                <div className="space-y-3">
                                                    <h3 className="font-semibold text-gray-900 mb-2">Extracted Information</h3>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Security Description</label>
                                                        <input
                                                            type="text"
                                                            value={holding.security}
                                                            onChange={(e) => handleUpdateReviewedHolding(holding.id, 'security', e.target.value)}
                                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            placeholder="e.g., Canadian Index Fund"
                                                        />
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Units</label>
                                                            <input
                                                                type="number"
                                                                value={holding.units}
                                                                onChange={(e) => handleUpdateReviewedHolding(holding.id, 'units', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Price</label>
                                                            <input
                                                                type="number"
                                                                value={holding.price}
                                                                onChange={(e) => handleUpdateReviewedHolding(holding.id, 'price', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Market Value</label>
                                                            <input
                                                                type="number"
                                                                value={holding.value}
                                                                onChange={(e) => handleUpdateReviewedHolding(holding.id, 'value', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                        <div>
                                                            <label className="block text-sm font-medium text-gray-700 mb-1">Book Cost</label>
                                                            <input
                                                                type="number"
                                                                value={holding.bookCost}
                                                                onChange={(e) => handleUpdateReviewedHolding(holding.id, 'bookCost', e.target.value)}
                                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right Column - Human Input Required */}
                                                <div className="space-y-3 bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                                                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                                                        Required Classification
                                                    </h3>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Symbol *</label>
                                                        <input
                                                            type="text"
                                                            value={holding.symbol}
                                                            onChange={(e) => handleUpdateReviewedHolding(holding.id, 'symbol', e.target.value)}
                                                            className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                                            placeholder="e.g., TDB900"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Security Name *</label>
                                                        <input
                                                            type="text"
                                                            value={holding.securityName}
                                                            onChange={(e) => handleUpdateReviewedHolding(holding.id, 'securityName', e.target.value)}
                                                            className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                                            placeholder="e.g., TD Canadian Index Fund"
                                                        />
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Asset Type *</label>
                                                        <select
                                                            value={holding.assetType}
                                                            onChange={(e) => handleUpdateReviewedHolding(holding.id, 'assetType', e.target.value)}
                                                            className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                                        >
                                                            <option value="">-- Select --</option>
                                                            <option value="GIC">GIC</option>
                                                            <option value="Mutual Fund">Mutual Fund</option>
                                                            <option value="Stock">Stock</option>
                                                            <option value="ETF">ETF</option>
                                                            <option value="Bond">Bond</option>
                                                            <option value="Cash">Cash</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                                                        <select
                                                            value={holding.category}
                                                            onChange={(e) => handleUpdateReviewedHolding(holding.id, 'category', e.target.value)}
                                                            className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                                        >
                                                            <option value="">-- Select --</option>
                                                            <option value="Canadian Equity">Canadian Equity</option>
                                                            <option value="US Equity">US Equity</option>
                                                            <option value="International Equity">International Equity</option>
                                                            <option value="Fixed Income">Fixed Income</option>
                                                            <option value="Money Market">Money Market</option>
                                                            <option value="Balanced">Balanced</option>
                                                        </select>
                                                    </div>

                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 mb-1">Sub-Category</label>
                                                        <input
                                                            type="text"
                                                            value={holding.subCategory}
                                                            onChange={(e) => handleUpdateReviewedHolding(holding.id, 'subCategory', e.target.value)}
                                                            className="w-full px-3 py-2 border border-yellow-300 rounded-lg focus:ring-2 focus:ring-yellow-500"
                                                            placeholder="e.g., Index Fund, Growth Fund"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                                <button
                                    onClick={() => setShowHoldingsReview(false)}
                                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveToDatabase}
                                    disabled={savingToDB}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    {savingToDB ? 'Saving...' : 'Save to Database'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RealPDFParser;
