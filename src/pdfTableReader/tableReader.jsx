import React, { useState, useEffect } from 'react';
import { Upload, Table, CheckCircle, AlertTriangle, Eye, Download, RefreshCw, FileText, Sparkles, Key, Plus, Database } from 'lucide-react';
import { extractTablesWithPython, checkPythonServiceHealth } from '../services/pythonBackendService';
import { extractTablesWithVision, getClaudeApiKey, setClaudeApiKey } from '../services/pdfVisionExtractor';
import { saveCompleteExtraction, getInvestmentAccounts, getInvestmentManagers, createInvestmentManager, findAccountByNumber, getHoldingsForAccount, getCashTransactionsForAccount, getInvestmentTransactionsForAccount } from '../services/investmentDataService';

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

    // Investment account and manager state
    const [investmentAccounts, setInvestmentAccounts] = useState([]);
    const [investmentManagers, setInvestmentManagers] = useState([]);
    const [selectedAccountId, setSelectedAccountId] = useState('');
    const [selectedManagerId, setSelectedManagerId] = useState('');
    const [accountDisplayName, setAccountDisplayName] = useState('');
    const [showNewManagerModal, setShowNewManagerModal] = useState(false);
    const [newManagerName, setNewManagerName] = useState('');
    const [newManagerType, setNewManagerType] = useState('Advisor');

    // Manual account info fields (for Python extraction or missing data)
    const [manualAccountNumber, setManualAccountNumber] = useState('');
    const [manualInstitution, setManualInstitution] = useState('');
    const [manualAccountType, setManualAccountType] = useState('');
    const [manualCountry, setManualCountry] = useState('');

    // Existing data from database
    const [existingData, setExistingData] = useState({
        account: null,
        holdings: [],
        cashTransactions: [],
        investmentTransactions: []
    });
    const [loadingExistingData, setLoadingExistingData] = useState(false);

    // Load investment accounts and managers on mount
    useEffect(() => {
        const loadAccountsAndManagers = async () => {
            try {
                const [accountsResult, managersResult] = await Promise.all([
                    getInvestmentAccounts(),
                    getInvestmentManagers()
                ]);

                if (accountsResult.success) {
                    setInvestmentAccounts(accountsResult.accounts);
                    console.log('✅ Loaded investment accounts:', accountsResult.accounts.length);
                }

                if (managersResult.success) {
                    setInvestmentManagers(managersResult.managers);
                    console.log('✅ Loaded investment managers:', managersResult.managers.length);
                }
            } catch (error) {
                console.error('Error loading accounts/managers:', error);
            }
        };

        loadAccountsAndManagers();
    }, []);

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

    // Handle creating a new investment manager
    const handleCreateManager = async () => {
        if (!newManagerName.trim()) {
            setError('Please enter a manager name');
            return;
        }

        try {
            const result = await createInvestmentManager({
                name: newManagerName.trim(),
                managerType: newManagerType
            });

            if (result.success) {
                setInvestmentManagers([...investmentManagers, result.manager]);
                setSelectedManagerId(result.manager.id);
                setShowNewManagerModal(false);
                setNewManagerName('');
                setNewManagerType('Advisor');
                console.log('✅ Created new manager:', result.manager);
            } else {
                setError('Failed to create manager: ' + result.error);
            }
        } catch (error) {
            setError('Error creating manager: ' + error.message);
        }
    };

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
    const handleOpenHoldingsReview = async () => {
        // Find holdings table - check for both classified and unclassified tables
        let holdingsTable = extractedTables.find(t => t.dataType === 'holdings');

        // If no holdings table found, check if any table might be holdings (for Python extraction)
        if (!holdingsTable) {
            // Look for tables with columns that suggest holdings data
            holdingsTable = extractedTables.find(t => {
                const headers = (t.headers || []).map(h => h.toLowerCase());
                return headers.some(h =>
                    h.includes('security') || h.includes('symbol') ||
                    h.includes('units') || h.includes('shares') ||
                    h.includes('market value') || h.includes('book')
                );
            });

            // If found, mark it as holdings
            if (holdingsTable) {
                holdingsTable = { ...holdingsTable, dataType: 'holdings' };
            }
        }

        // If still no holdings table, allow opening modal for account setup only
        if (!holdingsTable) {
            console.log('⚠️ No holdings table found, opening modal for account setup only');
            // Create empty holdings table placeholder
            holdingsTable = { rows: [] };
        }

        // Pre-populate manual account fields from localStorage
        const accountInfoStr = localStorage.getItem('current_statement_account');
        if (accountInfoStr) {
            const accountInfo = JSON.parse(accountInfoStr);
            setManualAccountNumber(accountInfo.accountNumber || '');
            setManualInstitution(accountInfo.institution || '');
            setManualAccountType(accountInfo.accountType || '');
        }

        // Try to load existing data from database based on account info
        setLoadingExistingData(true);
        try {
            if (accountInfoStr) {
                const accountInfo = JSON.parse(accountInfoStr);
                const accountResult = await findAccountByNumber(accountInfo.accountNumber, accountInfo.institution);

                if (accountResult.success && accountResult.account) {
                    const account = accountResult.account;

                    // Load existing data for this account
                    const [holdingsResult, cashResult, invResult] = await Promise.all([
                        getHoldingsForAccount(account.id),
                        getCashTransactionsForAccount(account.id),
                        getInvestmentTransactionsForAccount(account.id)
                    ]);

                    const existingHoldings = holdingsResult.holdings || [];

                    setExistingData({
                        account: account,
                        holdings: existingHoldings,
                        cashTransactions: cashResult.transactions || [],
                        investmentTransactions: invResult.transactions || []
                    });

                    // Auto-fill display name and manager if account exists
                    if (account.display_name) {
                        setAccountDisplayName(account.display_name);
                    }
                    if (account.manager_id) {
                        setSelectedManagerId(account.manager_id);
                    }
                    // Also fill manual fields from existing account
                    setManualAccountNumber(account.account_number || '');
                    setManualInstitution(account.institution || '');
                    setManualAccountType(account.account_type || '');
                    setManualCountry(account.country || '');

                    // Initialize reviewed holdings with existing data matched by security name
                    if (reviewedHoldings.length === 0 && holdingsTable.rows.length > 0) {
                        const initialReview = holdingsTable.rows.map((row, idx) => {
                            const securityName = row.security || row.securityName || '';

                            // Try to find matching existing holding by security name (case-insensitive partial match)
                            const matchingExisting = existingHoldings.find(existing =>
                                existing.security_name && securityName &&
                                (existing.security_name.toLowerCase().includes(securityName.toLowerCase().substring(0, 20)) ||
                                    securityName.toLowerCase().includes(existing.security_name.toLowerCase().substring(0, 20)))
                            );

                            return {
                                id: idx,
                                security: securityName,
                                // Auto-populate from existing holding if found
                                symbol: matchingExisting?.symbol || row.symbol || '',
                                securityName: matchingExisting?.security_name || securityName,
                                assetType: matchingExisting?.asset_type || row.assetType || '',
                                category: matchingExisting?.category || row.category || '',
                                subCategory: matchingExisting?.sub_category || row.subCategory || '',
                                units: row.units || 0,
                                price: row.price || 0,
                                value: row.value || 0,
                                bookCost: row.bookCost || 0
                            };
                        });
                        setReviewedHoldings(initialReview);
                    }

                    console.log('✅ Loaded existing data:', {
                        holdings: existingHoldings.length,
                        cashTransactions: cashResult.transactions?.length || 0,
                        investmentTransactions: invResult.transactions?.length || 0
                    });
                } else {
                    setExistingData({ account: null, holdings: [], cashTransactions: [], investmentTransactions: [] });

                    // Initialize without existing data
                    if (reviewedHoldings.length === 0) {
                        const initialReview = holdingsTable.rows.map((row, idx) => ({
                            id: idx,
                            security: row.security || row.securityName || '',
                            symbol: row.symbol || '',
                            securityName: row.security || row.securityName || '',
                            assetType: row.assetType || '',
                            category: row.category || '',
                            subCategory: row.subCategory || '',
                            units: row.units || 0,
                            price: row.price || 0,
                            value: row.value || 0,
                            bookCost: row.bookCost || 0
                        }));
                        setReviewedHoldings(initialReview);
                    }
                }
            }
        } catch (err) {
            console.error('Error loading existing data:', err);
        } finally {
            setLoadingExistingData(false);
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
        // Validate required fields
        if (!accountDisplayName || !accountDisplayName.trim()) {
            setError('Please provide a Display Name for this account');
            return;
        }
        if (!manualAccountNumber || !manualAccountNumber.trim()) {
            setError('Please provide an Account Number');
            return;
        }
        if (!manualInstitution || !manualInstitution.trim()) {
            setError('Please provide an Institution name');
            return;
        }
        if (!manualAccountType || !manualAccountType.trim()) {
            setError('Please select an Account Type');
            return;
        }
        if (!manualCountry || !manualCountry.trim()) {
            setError('Please select a Country');
            return;
        }

        setSavingToDB(true);
        setSaveSuccess(null);
        setError(null);
        setShowHoldingsReview(false);

        try {
            // Build account info from manual fields (works for both Python and Vision extraction)
            const accountInfo = {
                accountNumber: manualAccountNumber.trim(),
                institution: manualInstitution.trim(),
                accountType: manualAccountType.trim(),
                country: manualCountry.trim() || null,
                displayName: accountDisplayName.trim(),
                managerId: selectedManagerId || null,
                statementDate: new Date().toISOString().split('T')[0],
                currency: 'CAD'
            };

            // Try to get additional info from localStorage if available
            const storedInfoStr = localStorage.getItem('current_statement_account');
            if (storedInfoStr) {
                const storedInfo = JSON.parse(storedInfoStr);
                accountInfo.statementDate = storedInfo.statementDate || accountInfo.statementDate;
                accountInfo.openingBalance = storedInfo.openingBalance || null;
                accountInfo.closingBalance = storedInfo.closingBalance || null;
            }

            // Check if there are other tables besides holdings (fees, transactions)
            const hasOtherTables = extractedTables.some(t =>
                t.dataType !== 'holdings' && t.rows && t.rows.length > 0
            );

            // Replace holdings table rows with reviewed holdings that have required fields
            const updatedTables = extractedTables.map(table => {
                if (table.dataType === 'holdings' && reviewedHoldings.length > 0) {
                    // Only include holdings where user provided symbol and security name
                    // Allow partial save - only save holdings that are complete
                    const validHoldings = reviewedHoldings.filter(h =>
                        h.symbol && h.symbol.trim() !== '' &&
                        h.securityName && h.securityName.trim() !== ''
                    );

                    // Log what we're saving
                    const skippedCount = reviewedHoldings.length - validHoldings.length;
                    if (skippedCount > 0) {
                        console.log(`⚠️ Skipping ${skippedCount} holdings without symbol/security name`);
                    }
                    console.log(`✅ Saving ${validHoldings.length} valid holdings`);

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

            // Check if there's anything to save
            const hasValidHoldings = updatedTables.some(t => t.dataType === 'holdings' && t.rows && t.rows.length > 0);
            if (!hasValidHoldings && !hasOtherTables) {
                throw new Error('Nothing to save. Please fill in at least one holding (Symbol + Security Name), or ensure there are fees/transactions to import.');
            }

            console.log('💾 Saving to database...', { accountInfo, tables: updatedTables, reviewedHoldings });
            const result = await saveCompleteExtraction(accountInfo, updatedTables);

            if (result.success) {
                setSaveSuccess(result.message);
                // Reset account selection state
                setAccountDisplayName('');
                setSelectedManagerId('');
                setSelectedAccountId('');
                setManualAccountNumber('');
                setManualInstitution('');
                setManualAccountType('');
                setManualCountry('');
                setReviewedHoldings([]);
                setExistingData({ account: null, holdings: [], cashTransactions: [], investmentTransactions: [] });
                // Reload accounts list
                const accountsResult = await getInvestmentAccounts();
                if (accountsResult.success) {
                    setInvestmentAccounts(accountsResult.accounts);
                }
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
                                disabled={extractionMethod === 'python' && !pythonServiceAvailable}
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
                                {/* Account & Manager Selection Section */}
                                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <h3 className="font-semibold text-blue-900 mb-4 flex items-center gap-2">
                                        <FileText className="w-5 h-5" />
                                        Account Information
                                    </h3>

                                    {/* Row 1: Core Account Details */}
                                    <div className="grid grid-cols-4 gap-4 mb-4">
                                        {/* Account Number */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Account Number *
                                            </label>
                                            <input
                                                type="text"
                                                value={manualAccountNumber}
                                                onChange={(e) => setManualAccountNumber(e.target.value)}
                                                placeholder="e.g., 12345678"
                                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        {/* Institution */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Institution *
                                            </label>
                                            <input
                                                type="text"
                                                value={manualInstitution}
                                                onChange={(e) => setManualInstitution(e.target.value)}
                                                placeholder="e.g., Olympia Trust"
                                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>

                                        {/* Account Type */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Account Type *
                                            </label>
                                            <select
                                                value={manualAccountType}
                                                onChange={(e) => setManualAccountType(e.target.value)}
                                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">-- Select Type --</option>
                                                <option value="RRSP">RRSP</option>
                                                <option value="TFSA">TFSA</option>
                                                <option value="RESP">RESP</option>
                                                <option value="LIRA">LIRA</option>
                                                <option value="LIF">LIF</option>
                                                <option value="RRIF">RRIF</option>
                                                <option value="Non-Registered">Non-Registered</option>
                                                <option value="Margin">Margin Account</option>
                                                <option value="Corporate">Corporate Account</option>
                                            </select>
                                        </div>

                                        {/* Display Name */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Display Name *
                                            </label>
                                            <input
                                                type="text"
                                                value={accountDisplayName}
                                                onChange={(e) => setAccountDisplayName(e.target.value)}
                                                placeholder="e.g., Olympia RRSP"
                                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {/* Row 2: Country, Manager and Link */}
                                    <div className="grid grid-cols-4 gap-4">
                                        {/* Country */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Country *
                                            </label>
                                            <select
                                                value={manualCountry}
                                                onChange={(e) => setManualCountry(e.target.value)}
                                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">-- Select Country --</option>
                                                <option value="Malaysia">Malaysia</option>
                                                <option value="Singapore">Singapore</option>
                                                <option value="USA">USA</option>
                                                <option value="Canada">Canada</option>
                                                <option value="Australia">Australia</option>
                                                <option value="UK">UK</option>
                                                <option value="India">India</option>
                                                <option value="Hong Kong">Hong Kong</option>
                                            </select>
                                        </div>

                                        {/* Managed By */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Managed By
                                            </label>
                                            <div className="flex gap-2">
                                                <select
                                                    value={selectedManagerId}
                                                    onChange={(e) => setSelectedManagerId(e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                                >
                                                    <option value="">-- Select Manager --</option>
                                                    {investmentManagers.map(manager => (
                                                        <option key={manager.id} value={manager.id}>
                                                            {manager.name} ({manager.manager_type})
                                                        </option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={() => setShowNewManagerModal(true)}
                                                    className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                                    title="Add new manager"
                                                >
                                                    <Plus className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-1">Investment advisor or custodian</p>
                                        </div>

                                        {/* Existing Account (if linking to one) */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Link to Existing Account
                                            </label>
                                            <select
                                                value={selectedAccountId}
                                                onChange={(e) => {
                                                    setSelectedAccountId(e.target.value);
                                                    // Auto-fill from selected account
                                                    const account = investmentAccounts.find(a => a.id === e.target.value);
                                                    if (account) {
                                                        setAccountDisplayName(account.display_name || `${account.institution} ${account.account_type}`);
                                                        setManualAccountNumber(account.account_number || '');
                                                        setManualInstitution(account.institution || '');
                                                        setManualAccountType(account.account_type || '');
                                                        setManualCountry(account.country || '');
                                                        if (account.manager_id) {
                                                            setSelectedManagerId(account.manager_id);
                                                        }
                                                    }
                                                }}
                                                className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">-- Create New --</option>
                                                {investmentAccounts.map(account => (
                                                    <option key={account.id} value={account.id}>
                                                        {account.display_name || `${account.institution} - ${account.account_type}`}
                                                    </option>
                                                ))}
                                            </select>
                                            <p className="text-xs text-gray-500 mt-1">Or create new account</p>
                                        </div>

                                        {/* Extraction Method Info */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Extraction Info
                                            </label>
                                            <div className="px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600">
                                                {extractionMethod === 'vision' ? '👁️ Claude Vision AI' : '🐍 Python Backend'}
                                                <div className="text-xs mt-1">{file?.name}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Existing Data Summary */}
                                {loadingExistingData ? (
                                    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                                        <div className="flex items-center gap-2 text-gray-600">
                                            <RefreshCw className="w-5 h-5 animate-spin" />
                                            Loading existing data...
                                        </div>
                                    </div>
                                ) : existingData.account && (
                                    <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                                        <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                                            <Database className="w-5 h-5" />
                                            Existing Data in Database
                                        </h3>
                                        <div className="grid grid-cols-4 gap-4 text-sm">
                                            <div className="bg-white p-3 rounded border">
                                                <div className="text-2xl font-bold text-green-600">{existingData.holdings.length}</div>
                                                <div className="text-gray-600">Holdings</div>
                                                {existingData.holdings.length > 0 && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Latest: {new Date(existingData.holdings[0].as_of_date).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="bg-white p-3 rounded border">
                                                <div className="text-2xl font-bold text-purple-600">{existingData.cashTransactions.length}</div>
                                                <div className="text-gray-600">Fees/Cash Txns</div>
                                                {existingData.cashTransactions.length > 0 && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Latest: {new Date(existingData.cashTransactions[0].transaction_date).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="bg-white p-3 rounded border">
                                                <div className="text-2xl font-bold text-blue-600">{existingData.investmentTransactions.length}</div>
                                                <div className="text-gray-600">Investment Txns</div>
                                                {existingData.investmentTransactions.length > 0 && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        Latest: {new Date(existingData.investmentTransactions[0].transaction_date).toLocaleDateString()}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="bg-white p-3 rounded border">
                                                <div className="text-lg font-medium text-gray-700">{existingData.account.display_name || 'No display name'}</div>
                                                <div className="text-gray-600 text-xs">{existingData.account.institution}</div>
                                                <div className="text-xs text-gray-500 mt-1">
                                                    {existingData.account.account_type}
                                                </div>
                                            </div>
                                        </div>
                                        <p className="text-xs text-green-700 mt-3">
                                            ✓ Duplicate records will be automatically skipped during import
                                        </p>
                                    </div>
                                )}

                                {/* Holdings List */}
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
                                                            <option value="REIT">REIT</option>
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
                                                            <option value="Real Estate">Real Estate</option>
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
                                    disabled={savingToDB || !accountDisplayName}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                                >
                                    <Download className="w-4 h-4" />
                                    {savingToDB ? 'Saving...' : 'Save to Database'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* New Manager Modal */}
                {showNewManagerModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
                        <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Investment Manager</h3>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Manager Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={newManagerName}
                                        onChange={(e) => setNewManagerName(e.target.value)}
                                        placeholder="e.g., Olympia Trust, CI Assante"
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Manager Type
                                    </label>
                                    <select
                                        value={newManagerType}
                                        onChange={(e) => setNewManagerType(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="Advisor">Advisor</option>
                                        <option value="Dealer">Dealer</option>
                                        <option value="Custodian">Custodian</option>
                                        <option value="Self-Directed">Self-Directed</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={() => {
                                        setShowNewManagerModal(false);
                                        setNewManagerName('');
                                        setNewManagerType('Advisor');
                                    }}
                                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleCreateManager}
                                    disabled={!newManagerName.trim()}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                >
                                    Create Manager
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
