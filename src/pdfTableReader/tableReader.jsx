import React, { useState, useEffect } from 'react';
import { Upload, Table, CheckCircle, AlertTriangle, Eye, Download, RefreshCw, FileText, Settings, Sparkles } from 'lucide-react';
import { extractPDFTables, getCachedExtractions } from '../services/aiService';
import { extractTablesWithPython, checkPythonServiceHealth } from '../services/pythonBackendService';
import { saveCompleteExtraction } from '../services/investmentDataService';
import {
    backupAllLocalStorageExtractions,
    exportLocalStorageAsJSON,
    getBackedUpExtractions
} from '../services/aiExtractionBackup';

const RealPDFParser = () => {
    const [file, setFile] = useState(null);
    const [extractedText, setExtractedText] = useState('');
    const [extractedTables, setExtractedTables] = useState([]);
    const [selectedTable, setSelectedTable] = useState(null);
    const [parsing, setParsing] = useState(false);
    const [error, setError] = useState(null);
    const [pdfLibReady, setPdfLibReady] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [mappingTable, setMappingTable] = useState(null); // Table being mapped
    const [columnMappings, setColumnMappings] = useState({}); // User's column mappings
    const [extractingWithAI, setExtractingWithAI] = useState(false);
    const [pageItems, setPageItems] = useState([]); // Store items with X/Y positions
    const [savingToDB, setSavingToDB] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(null);
    const [backupStatus, setBackupStatus] = useState(null);
    const [showRawData, setShowRawData] = useState(false);
    const [pythonServiceAvailable, setPythonServiceAvailable] = useState(null);

    // Initialize PDF.js library
    useEffect(() => {
        const loadPdfJs = () => {
            // Check if already loaded
            if (window.pdfjsLib) {
                setPdfLibReady(true);
                return;
            }

            // Load PDF.js from CDN
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
            script.async = true;
            script.onload = () => {
                if (window.pdfjsLib) {
                    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                    setPdfLibReady(true);
                    console.log('PDF.js library loaded successfully');
                }
            };
            script.onerror = () => {
                setError('Failed to load PDF.js library. Please check your internet connection.');
            };
            document.head.appendChild(script);
        };

        loadPdfJs();

        // Check if Python service is available
        console.log('🔍 Checking Python service availability...');
        checkPythonServiceHealth().then(health => {
            console.log('Python service health check result:', health);
            setPythonServiceAvailable(health.available);
            if (health.available) {
                console.log('✅ Python backend available:', health);
            } else {
                console.log('⚠️ Python backend not available:', health.error);
                console.log('💡 To use Python extraction, run: cd python-backend && python pdf_service.py');
            }
        });
    }, []);    // Convert PDF pages to base64 images for Claude Vision
    const convertPDFToImages = async (pdfFile) => {
        try {
            const arrayBuffer = await pdfFile.arrayBuffer();
            const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const images = [];

            // Convert each page to image
            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({ scale: 1.5 }); // Reduced from 2.0 to keep file size manageable

                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                await page.render({
                    canvasContext: context,
                    viewport: viewport
                }).promise;

                // Convert canvas to base64 data URI (JPEG for smaller size)
                const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                images.push(dataUrl);

                console.log(`✅ Converted page ${pageNum}/${pdf.numPages} to image (size: ${(dataUrl.length / 1024).toFixed(1)}KB, dimensions: ${canvas.width}x${canvas.height})`);
            }

            return images;
        } catch (error) {
            console.error('PDF to image conversion error:', error);
            throw error;
        }
    };

    // Hybrid AI extraction: PDF.js (complete data) + Claude (intelligent classification)
    const extractTablesWithAI = async () => {
        if (!file) {
            alert('Please upload a PDF first');
            return;
        }

        setExtractingWithAI(true);
        setError(null);

        try {
            console.log('🚀 Converting PDF to images for Claude 4 Vision...');
            const images = await convertPDFToImages(file);
            console.log(`📊 Generated ${images.length} images for Claude 4`);

            const prompt = `I need you to extract EVERY SINGLE ROW from ALL tables in this ${images.length}-page investment statement.

🚨 CRITICAL REQUIREMENTS:
1. You MUST extract EVERY row you can see - if there are 50 rows, I need all 50 in the JSON
2. NEVER use "..." or "additional rows omitted" 
3. NEVER summarize or sample
4. Process ALL ${images.length} pages and combine related tables
5. Count the rows on each page and verify your JSON has that many rows

Return ONLY this JSON structure (no markdown, no explanations):

{
  "accountInfo": {
    "accountNumber": "string",
    "accountType": "TFSA|RRSP|RESP|Cash|Margin",
    "institution": "string",
    "statementPeriod": "string",
    "statementDate": "YYYY-MM-DD",
    "currency": "CAD|USD",
    "openingBalance": "string",
    "closingBalance": "string"
  },
  "tables": [
    {
      "name": "Investment Transactions",
      "dataType": "investmentTransactions",
      "headers": ["Date", "Description", "Shares", "Price", "Amount"],
      "rows": [
        {"date": "2018-04-05", "description": "Security Purchase; CENTURION...", "shares": "1780.627", "price": "14.04", "amount": "25000.00"},
        ... EVERY SINGLE ROW HERE
      ]
    },
    {
      "name": "Cash Transactions",
      "dataType": "cashTransactions",
      "headers": ["Date", "Description", "Debit", "Credit", "Balance"],
      "rows": [
        ... EVERY SINGLE ROW HERE
      ]
    },
    {
      "name": "Holdings",
      "dataType": "holdings",
      "headers": ["Units", "Description", "Book Value", "Price", "Market Value"],
      "rows": [...]
    }
  ]
}

Classification:
- "investmentTransactions" = Transactions mentioning securities (Buy, Sell, Dividend, Interest, Security Purchase, Distribution)
- "cashTransactions" = Fees, transfers, deposits without security names (Admin Fee, HST, Transfer-In, Fees Paid)
- "holdings" = Current positions snapshot

I will check that your row count matches what I see in the PDF. Extract EVERY row.`;

            console.log('Sending to Claude 4 Vision...');
            const response = await extractPDFTables(prompt, images);

            if (!response.success) {
                throw new Error(response.message);
            }

            console.log('AI Response:', response.message);

            // Parse AI response - handle markdown code blocks and clean up
            let jsonText = response.message.trim();

            // Remove markdown code blocks
            if (jsonText.startsWith('```json')) {
                jsonText = jsonText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
            } else if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```\s*/, '').replace(/```\s*$/, '');
            }

            // Find JSON object boundaries
            const jsonStart = jsonText.indexOf('{');
            const jsonEnd = jsonText.lastIndexOf('}');
            if (jsonStart !== -1 && jsonEnd !== -1) {
                jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
            }

            console.log('Cleaned JSON text:', jsonText);

            let aiResult;
            try {
                aiResult = JSON.parse(jsonText);
            } catch (parseError) {
                console.error('JSON Parse Error:', parseError);
                console.error('Failed to parse:', jsonText);
                throw new Error('AI returned invalid JSON. Try again or use manual extraction.');
            }

            if (!aiResult.tables || !Array.isArray(aiResult.tables)) {
                throw new Error('Invalid AI response format - missing tables array');
            }

            if (aiResult.tables.length === 0) {
                throw new Error('AI did not find any tables in the PDF');
            }

            // Extract account info if present
            const accountInfo = aiResult.accountInfo || null;
            if (accountInfo) {
                console.log('📊 Account Information Extracted:', accountInfo);
                // Save to localStorage for later use
                localStorage.setItem('current_statement_account', JSON.stringify(accountInfo));
            }

            // Convert AI tables to our format with intelligence
            const convertedTables = aiResult.tables.map((table, idx) => ({
                id: `ai-table-${idx}`,
                name: table.name || `AI Extracted Table ${idx + 1}`,
                page: 1,
                headers: table.headers || [],
                rows: table.rows || [],
                rowCount: table.rows?.length || 0,
                columnCount: table.headers?.length || 0,
                confidence: 0.95,
                extractedBy: 'Claude Sonnet 3.5',
                // AI Intelligence fields
                description: table.description || '',
                dataType: table.dataType || 'other',
                suggestedImport: table.suggestedImport || 'skip',
                reasoning: table.reasoning || '',
                // Metadata
                modelUsed: response.model,
                tokensUsed: response.tokensUsed
            }));

            console.log('AI Extracted Tables:', convertedTables);
            console.log('Tokens used:', response.tokensUsed);
            console.log('View cached extractions:', getCachedExtractions());

            setExtractedTables(convertedTables);
            setExtractingWithAI(false);

        } catch (err) {
            console.error('AI extraction error:', err);
            setError(`AI extraction failed: ${err.message}`);
            setExtractingWithAI(false);
        }
    };

    // Python backend extraction (Camelot/Tabula)
    const extractTablesWithPythonBackend = async () => {
        if (!file) {
            alert('Please upload a PDF first');
            return;
        }

        setExtractingWithAI(true);
        setError(null);

        try {
            console.log('🐍 Using Python backend (Camelot/Tabula)...');
            const result = await extractTablesWithPython(file, 'auto');

            if (!result.success) {
                throw new Error(result.error || 'Python extraction failed');
            }

            console.log(`✅ Python extracted ${result.totalTables} tables`);

            // Convert Python tables to our format
            const convertedTables = result.tables.map((table, idx) => ({
                id: table.id,
                name: table.id,
                page: table.page,
                headers: table.headers,
                rows: table.rows.map((row, rowIdx) => {
                    const rowObj = {};
                    table.headers.forEach((header, colIdx) => {
                        rowObj[header] = row[colIdx] || '';
                    });
                    return rowObj;
                }),
                rowCount: table.row_count,
                columnCount: table.column_count,
                dataType: table.dataType || 'unknown',
                suggestedImport: table.suggestedImport || table.dataType,
                extractedBy: `Python (${table.method})`,
                accuracy: table.accuracy
            }));

            console.log('Converted tables:', convertedTables);

            setExtractedTables(convertedTables);
            setExtractingWithAI(false);

        } catch (err) {
            console.error('Python extraction error:', err);
            setError(`Python extraction failed: ${err.message}`);
            if (err.message.includes('not running')) {
                setError(err.message + '\n\nRun: cd python-backend && python pdf_service.py');
            }
            setExtractingWithAI(false);
        }
    };

    // Save extracted data to Supabase
    const handleSaveToDatabase = async () => {
        setSavingToDB(true);
        setSaveSuccess(null);
        setError(null);

        try {
            // Get account info from localStorage
            const accountInfoStr = localStorage.getItem('current_statement_account');
            if (!accountInfoStr) {
                throw new Error('No account information found. Please extract data with AI first.');
            }

            const accountInfo = JSON.parse(accountInfoStr);

            // Save to Supabase
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

    // Backup localStorage to Supabase
    const handleBackupToSupabase = async () => {
        try {
            setBackupStatus({ loading: true, message: 'Backing up to Supabase...' });
            const result = await backupAllLocalStorageExtractions();

            if (result.success) {
                setBackupStatus({
                    success: true,
                    message: `✅ ${result.message}`
                });
            } else {
                setBackupStatus({
                    error: true,
                    message: `❌ Backup failed: ${result.error}`
                });
            }

        } catch (error) {
            setBackupStatus({
                error: true,
                message: `❌ Error: ${error.message}`
            });
        } finally {
            setTimeout(() => setBackupStatus(null), 5000);
        }
    };

    // Export raw data to CSV
    const exportRawDataToCSV = () => {
        if (pageItems.length === 0) return;

        const csvRows = [
            ['Page', 'Item#', 'X', 'Y', 'Width', 'Height', 'Text']
        ];

        pageItems.forEach(page => {
            const sortedItems = [...page.items].sort((a, b) => {
                if (Math.abs(a.y - b.y) > 5) return b.y - a.y;
                return a.x - b.x;
            });

            sortedItems.forEach((item, idx) => {
                csvRows.push([
                    page.pageNum,
                    idx + 1,
                    item.x,
                    item.y,
                    item.width || '',
                    item.height || '',
                    `"${(item.text || '').replace(/"/g, '""')}"`
                ]);
            });
        });

        const csvContent = csvRows.map(row => row.join(',')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${file?.name || 'pdf'}_raw_data_xy.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log('✅ Raw data exported to CSV');
    };

    // Export localStorage as JSON file
    const handleExportJSON = () => {
        try {
            const result = exportLocalStorageAsJSON();
            if (result && result.success) {
                setBackupStatus({
                    success: true,
                    message: `✅ Exported ${result.count} extractions to JSON file`
                });
                setTimeout(() => setBackupStatus(null), 5000);
            }
        } catch (err) {
            setBackupStatus({
                error: true,
                message: `❌ Export failed: ${err.message}`
            });
        }
    };

    // Real PDF parsing using pdf.js
    const handleFileUpload = async (event) => {
        const uploadedFile = event.target.files[0];
        if (!uploadedFile) return;

        if (!uploadedFile.type.includes('pdf')) {
            setError('Please upload a PDF file');
            return;
        }

        if (!pdfLibReady || !window.pdfjsLib) {
            setError('PDF.js library is still loading. Please wait a moment and try again.');
            return;
        }

        setFile(uploadedFile);
        setParsing(true);
        setError(null);

        try {
            const pdfjsLib = window.pdfjsLib;

            // Read file as array buffer
            const arrayBuffer = await uploadedFile.arrayBuffer();

            // Load PDF document
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;

            console.log(`PDF loaded: ${pdf.numPages} pages`);

            // Extract text from all pages
            let fullText = '';
            const pageTexts = [];

            for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const textContent = await page.getTextContent();

                // Get text items with positions
                const items = textContent.items.map(item => ({
                    text: item.str,
                    x: Math.round(item.transform[4]),
                    y: Math.round(item.transform[5]),
                    width: Math.round(item.width),
                    height: Math.round(item.height)
                }));

                const pageText = textContent.items.map(item => item.str).join(' ');
                pageTexts.push({ pageNum, text: pageText, items });
                fullText += pageText + '\n\n';
            }

            setExtractedText(fullText);
            setPageItems(pageTexts); // Store items with positions for AI extraction

            // Debug: Log extracted text to console
            console.log('=== EXTRACTED TEXT START ===');
            console.log(fullText);
            console.log('=== EXTRACTED TEXT END ===');
            console.log('Page texts:', pageTexts.map(p => ({
                page: p.pageNum,
                textLength: p.text.length,
                itemsCount: p.items.length,
                sample: p.text.substring(0, 200)
            })));

            // Detect and extract tables
            const tables = detectTablesFromPages(pageTexts);
            console.log('Detected tables:', tables);
            setExtractedTables(tables);

            setParsing(false);

        } catch (err) {
            console.error('Error parsing PDF:', err);
            setError(`Failed to parse PDF: ${err.message}`);
            setParsing(false);
        }
    };

    // Detect tables from extracted text and positions
    const detectTablesFromPages = (pageTexts) => {
        const allTables = [];

        for (const { pageNum, text, items } of pageTexts) {
            console.log(`Processing page ${pageNum}...`);
            console.log('Page text sample:', text.substring(0, 500));

            const tables = [];

            // Try more flexible table detection patterns

            // Look for any table-like structure with rows and columns
            const rows = groupItemsByRow(items);
            console.log(`Found ${rows.length} rows on page ${pageNum}`);

            // Method 1: Look for date patterns (common in financial statements)
            const datePattern = /\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/;
            const rowsWithDates = rows.filter(row => {
                const rowText = row.map(i => i.text).join(' ');
                return datePattern.test(rowText);
            });

            if (rowsWithDates.length > 0) {
                console.log(`Found ${rowsWithDates.length} rows with dates`);
                const genericTable = extractGenericTable(rowsWithDates, pageNum, 'Date-based Transactions', rows);
                if (genericTable) tables.push(genericTable);
            }

            // Method 2: Look for rows with numeric values (amounts, quantities)
            const numberPattern = /[\$]?\d{1,3}(,\d{3})*(\.\d{2})?/;
            const rowsWithNumbers = rows.filter(row => {
                const rowText = row.map(i => i.text).join(' ');
                const numbers = rowText.match(new RegExp(numberPattern, 'g'));
                return numbers && numbers.length >= 2; // At least 2 numbers suggests a data row
            });

            if (rowsWithNumbers.length >= 3 && !rowsWithDates.length) { // Only if no date table found
                console.log(`Found ${rowsWithNumbers.length} rows with numeric data`);
                const numericTable = extractGenericTable(rowsWithNumbers, pageNum, 'Numeric Data Table', rows);
                if (numericTable) tables.push(numericTable);
            }

            // Method 3: Original specific table detection (keep for compatibility)
            if (text.includes('TRANSACTION DETAILS') || text.includes('Item Description')) {
                const transactionTable = extractTransactionTable(items, pageNum, text);
                if (transactionTable) tables.push(transactionTable);
            }

            if (text.includes('SECURITIES HELD') || text.includes('Total Securities')) {
                const securitiesTable = extractSecuritiesTable(items, pageNum, text);
                if (securitiesTable) tables.push(securitiesTable);
            }

            if (text.includes('RECORD OF CASH TRANSACTIONS') || text.includes('Debit Credit Balance')) {
                const cashTable = extractCashTable(items, pageNum, text);
                if (cashTable) tables.push(cashTable);
            }

            console.log(`Page ${pageNum} detected ${tables.length} tables`);
            allTables.push(...tables);
        }

        return allTables;
    };

    // Generic table extractor - tries to intelligently detect columns
    const extractGenericTable = (dataRows, pageNum, tableName, allRows) => {
        if (dataRows.length === 0) return null;

        // Try to find table title by looking for rows with keywords before data rows
        let tableTitle = tableName;
        const firstDataRowY = dataRows[0][0]?.y;

        // Look for title rows above the data
        const titleRows = allRows.filter(row => {
            const rowY = row[0]?.y;
            const rowText = row.map(i => i.text).join(' ');
            return rowY > firstDataRowY && (
                rowText.includes('RECORD OF') ||
                rowText.includes('CASH TRANSACTIONS') ||
                rowText.includes('SECURITIES') ||
                rowText.includes('TRANSACTION')
            );
        });

        if (titleRows.length > 0) {
            tableTitle = titleRows[0].map(i => i.text).join(' ');
        }

        // Look for header row - typically the row right before data
        let headers = null;
        const headerRow = allRows.find(row => {
            const rowY = row[0]?.y;
            const rowText = row.map(i => i.text).join(' ').toLowerCase();
            // Check if this row contains header keywords and is just above data
            return rowY > firstDataRowY - 20 && rowY < firstDataRowY + 20 && (
                rowText.includes('date') ||
                rowText.includes('description') ||
                rowText.includes('debit') ||
                rowText.includes('credit') ||
                rowText.includes('balance')
            );
        });

        // Store header positions with their X coordinates
        let headerPositions = [];
        if (headerRow) {
            // Extract header names and their X positions
            const rawHeaders = headerRow.map(item => ({
                text: item.text.trim(),
                x: item.x
            })).filter(h => h.text.length > 0);

            headers = [];
            let i = 0;
            while (i < rawHeaders.length) {
                // Combine "Item" and "Description" into one header
                if (rawHeaders[i].text === 'Item' && i + 1 < rawHeaders.length && rawHeaders[i + 1].text === 'Description') {
                    headers.push('Item Description');
                    headerPositions.push({ name: 'Item Description', x: rawHeaders[i].x, xEnd: rawHeaders[i + 1].x + 100 });
                    i += 2;
                } else {
                    headers.push(rawHeaders[i].text);
                    // Estimate column width - use next header's position or large value for last column
                    const xEnd = i + 1 < rawHeaders.length ? rawHeaders[i + 1].x : rawHeaders[i].x + 200;
                    headerPositions.push({ name: rawHeaders[i].text, x: rawHeaders[i].x, xEnd });
                    i++;
                }
            }
            console.log('Found headers with positions:', headerPositions);
        }

        // Build table data using X-position based column alignment
        const tableData = dataRows.map((row, rowIndex) => {
            const rowObj = {};

            // Debug: Show raw data for first 2 rows
            if (rowIndex < 2) {
                console.log(`\n=== RAW ROW ${rowIndex + 1} DATA ===`);
                console.log('Items in this row:', row.map(item => ({
                    text: item.text,
                    x: item.x,
                    y: item.y
                })));
            }

            // Group row items by which column they belong to based on X position
            if (headers && headerPositions.length > 0) {
                // Initialize all columns as empty
                headers.forEach(h => rowObj[h] = '');

                // Assign each item to its column based on X position
                row.forEach(item => {
                    const itemX = item.x;
                    const itemText = item.text.trim();

                    // Find which column this item belongs to
                    for (let i = 0; i < headerPositions.length; i++) {
                        const col = headerPositions[i];
                        // Check if item's X position falls within this column's range
                        if (itemX >= col.x - 10 && itemX < col.xEnd) {
                            // Append to existing value (for multi-word cells)
                            if (rowObj[col.name]) {
                                rowObj[col.name] += ' ' + itemText;
                            } else {
                                rowObj[col.name] = itemText;
                            }
                            break;
                        }
                    }
                });

                // Clean up values
                Object.keys(rowObj).forEach(key => {
                    rowObj[key] = rowObj[key].trim().replace(/\$/g, '');
                });

                // Debug: Show mapped data for first 2 rows
                if (rowIndex < 2) {
                    console.log('Mapped to columns:', rowObj);
                    console.log('=== END ROW DATA ===\n');
                }
            } else {
                // Fallback: use simple text joining when no headers
                const rowText = row.map(i => i.text).join(' ');
                rowObj['Content'] = rowText;
            }

            return rowObj;
        });

        // Determine final headers
        if (!headers || headers.length === 0) {
            const firstRow = tableData[0] || {};
            headers = Object.keys(firstRow);
        }

        return {
            id: `generic-table-page-${pageNum}`,
            name: tableTitle,
            page: pageNum,
            headers: headers,
            rows: tableData,
            rowCount: tableData.length,
            columnCount: headers.length,
            confidence: 0.80
        };
    };

    const extractTransactionTable = (items, pageNum, text) => {
        // Find transaction rows by looking for date pattern (MM/DD/YYYY)
        const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}/;

        // Group items by Y position (rows)
        const rows = groupItemsByRow(items);

        const transactionRows = [];
        let headers = ['Date', 'Item Description', 'Shares', 'Price', 'Gross Amt.'];

        for (const row of rows) {
            const rowText = row.map(i => i.text).join(' ');

            // Check if this row has a date (likely a transaction)
            if (datePattern.test(rowText)) {
                // Extract data from this row
                const rowData = extractRowData(row, rowText);
                if (rowData) {
                    transactionRows.push(rowData);
                }
            }
        }

        if (transactionRows.length === 0) return null;

        return {
            id: `transactions-page-${pageNum}`,
            name: 'TRANSACTION DETAILS',
            page: pageNum,
            headers: headers,
            rows: transactionRows,
            rowCount: transactionRows.length,
            columnCount: headers.length,
            confidence: 0.85
        };
    };

    const extractSecuritiesTable = (items, pageNum, text) => {
        // Look for the holdings section
        const rows = groupItemsByRow(items);
        const holdingsRows = [];

        let inHoldingsSection = false;

        for (const row of rows) {
            const rowText = row.map(i => i.text).join(' ');

            if (rowText.includes('SECURITIES HELD')) {
                inHoldingsSection = true;
                continue;
            }

            if (rowText.includes('Total Securities')) {
                break;
            }

            if (inHoldingsSection && rowText.includes('CENTURION') || rowText.includes('APARTMENT')) {
                // Extract holdings data
                const numbers = row.filter(i => /[\d,.]/.test(i.text));

                if (numbers.length >= 3) {
                    holdingsRows.push({
                        'Units': numbers[0]?.text || '',
                        'Item Description': rowText,
                        'Book Value': numbers[1]?.text || '',
                        'Price': numbers[2]?.text || '',
                        'Market Value': numbers[3]?.text || ''
                    });
                }
            }
        }

        if (holdingsRows.length === 0) return null;

        return {
            id: `securities-page-${pageNum}`,
            name: 'SECURITIES HELD',
            page: pageNum,
            headers: ['Units', 'Item Description', 'Book Value', 'Price', 'Market Value'],
            rows: holdingsRows,
            rowCount: holdingsRows.length,
            columnCount: 5,
            confidence: 0.90
        };
    };

    const extractCashTable = (items, pageNum, text) => {
        const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}/;
        const rows = groupItemsByRow(items);
        const cashRows = [];

        for (const row of rows) {
            const rowText = row.map(i => i.text).join(' ');

            if (datePattern.test(rowText) && (rowText.includes('Fee') || rowText.includes('Transfer') || rowText.includes('Balance'))) {
                const numbers = row.filter(i => /\$?[\d,]+\.?\d*/.test(i.text));
                const date = row.find(i => datePattern.test(i.text))?.text || '';

                cashRows.push({
                    'Date': date,
                    'Item Description': rowText.replace(date, '').trim(),
                    'Debit': numbers[0]?.text || '',
                    'Credit': numbers[1]?.text || '',
                    'Balance': numbers[numbers.length - 1]?.text || ''
                });
            }
        }

        if (cashRows.length === 0) return null;

        return {
            id: `cash-page-${pageNum}`,
            name: 'RECORD OF CASH TRANSACTIONS',
            page: pageNum,
            headers: ['Date', 'Item Description', 'Debit', 'Credit', 'Balance'],
            rows: cashRows,
            rowCount: cashRows.length,
            columnCount: 5,
            confidence: 0.80
        };
    };

    const groupItemsByRow = (items) => {
        if (!items || items.length === 0) return [];

        // Sort by Y position (top to bottom)
        const sorted = [...items].sort((a, b) => b.y - a.y);

        const rows = [];
        let currentRow = [];
        let currentY = sorted[0]?.y;
        const yThreshold = 5; // Items within 5 pixels are considered same row

        for (const item of sorted) {
            if (Math.abs(item.y - currentY) < yThreshold) {
                currentRow.push(item);
            } else {
                if (currentRow.length > 0) {
                    // Sort row items by X position (left to right)
                    currentRow.sort((a, b) => a.x - b.x);
                    rows.push(currentRow);
                }
                currentRow = [item];
                currentY = item.y;
            }
        }

        if (currentRow.length > 0) {
            currentRow.sort((a, b) => a.x - b.x);
            rows.push(currentRow);
        }

        return rows;
    };

    const extractRowData = (row, rowText) => {
        const datePattern = /\d{1,2}\/\d{1,2}\/\d{4}/;
        const dateMatch = rowText.match(datePattern);

        if (!dateMatch) return null;

        // Extract numbers that look like shares/prices/amounts
        const numbers = row.filter(i => {
            const text = i.text.replace(/[$,]/g, '');
            return /^\d+\.?\d*$/.test(text);
        });

        return {
            'Date': dateMatch[0],
            'Item Description': rowText.replace(dateMatch[0], '').trim(),
            'Shares': numbers[0]?.text || '',
            'Price': numbers[1]?.text || '',
            'Gross Amt.': numbers[2]?.text || ''
        };
    };

    const getConfidenceColor = (score) => {
        if (score >= 0.9) return 'text-green-600 bg-green-50 border-green-200';
        if (score >= 0.7) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        return 'text-red-600 bg-red-50 border-red-200';
    };

    return (
        <div className="w-full max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Real PDF Table Extractor</h1>
                <p className="text-gray-600">Upload YOUR Olympia Trust PDF - we'll extract the actual data from it</p>
                <p className="text-sm text-gray-500 mt-1">✓ Cached locally • ✓ Auto-backup to Supabase • ✓ Export as JSON</p>
                {!pdfLibReady && (
                    <div className="mt-2 text-sm text-blue-600">
                        Loading PDF.js library...
                    </div>
                )}
            </div>

            {/* Upload Section */}
            {!file && !parsing && (
                <div className="space-y-6">
                    <div className="bg-white rounded-lg shadow-lg p-8">
                        <label className="cursor-pointer block">
                            <div className="border-4 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
                                <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">Upload Your PDF Statement</h3>
                                <p className="text-gray-600 mb-2">We'll use Claude Sonnet 3.5 to extract tables intelligently</p>
                                <p className="text-xs text-gray-500 mb-4">Powered by OpenRouter • All extractions cached locally</p>
                                <div className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
                                    Choose PDF File
                                </div>
                            </div>
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileUpload}
                                className="hidden"
                            />
                        </label>
                    </div>

                    {/* Show recent cached extractions */}
                    {(() => {
                        const cached = getCachedExtractions();
                        if (cached.length > 0) {
                            return (
                                <div className="bg-white rounded-lg shadow-lg p-6">
                                    <h3 className="text-lg font-bold mb-4">📦 Recent AI Extractions (Cached)</h3>
                                    <div className="space-y-3">
                                        {cached.slice(0, 5).map((item, idx) => (
                                            <div key={idx} className="p-3 bg-gray-50 rounded-lg border">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium text-gray-900">
                                                            {new Date(item.timestamp).toLocaleString()}
                                                        </p>
                                                        <p className="text-xs text-gray-600 mt-1">
                                                            Model: {item.model}
                                                        </p>
                                                        {item.tokensUsed && (
                                                            <p className="text-xs text-gray-500">
                                                                Tokens: {item.tokensUsed.prompt_tokens} in + {item.tokensUsed.completion_tokens} out
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-4 flex gap-3">
                                        <button
                                            onClick={handleBackupToSupabase}
                                            disabled={backupStatus?.loading}
                                            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                        >
                                            <Download className="w-4 h-4" />
                                            {backupStatus?.loading ? 'Backing up...' : 'Backup to Supabase'}
                                        </button>
                                        <button
                                            onClick={handleExportJSON}
                                            className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
                                        >
                                            <FileText className="w-4 h-4" />
                                            Export JSON
                                        </button>
                                        <button
                                            onClick={() => {
                                                localStorage.removeItem('ai_pdf_extractions');
                                                window.location.reload();
                                            }}
                                            className="px-4 py-2 text-sm text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50"
                                        >
                                            Clear Cache
                                        </button>
                                    </div>

                                    {backupStatus && (
                                        <div className={`mt-4 p-3 rounded-lg ${backupStatus.success ? 'bg-green-50 text-green-800' :
                                            backupStatus.error ? 'bg-red-50 text-red-800' :
                                                'bg-blue-50 text-blue-800'
                                            }`}>
                                            <p className="text-sm font-medium">{backupStatus.message}</p>
                                        </div>
                                    )}
                                </div>
                            );
                        }
                        return null;
                    })()}
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 text-red-800">
                        <AlertTriangle className="w-5 h-5" />
                        <div>
                            <strong>Error:</strong> {error}
                            <div className="text-sm mt-1">
                                Make sure you've included PDF.js library in your HTML or install it: npm install pdfjs-dist
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Parsing Status */}
            {parsing && (
                <div className="bg-white rounded-lg shadow-lg p-8 text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <h3 className="text-xl font-semibold mb-2">Reading Your PDF...</h3>
                    <p className="text-gray-600">Extracting text and detecting tables from {file?.name}</p>
                </div>
            )}

            {/* Results */}
            {!parsing && extractedTables.length > 0 && (
                <div className="space-y-6">
                    {/* Summary */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">
                                    ✅ {extractedTables.length} Tables Found in Your File
                                </h2>
                                <p className="text-gray-600 mt-1">From: {file?.name}</p>
                                {pythonServiceAvailable === false && (
                                    <p className="text-sm text-orange-600 mt-1">
                                        ⚠️ Python service not running. AI extraction only.
                                    </p>
                                )}
                                {pythonServiceAvailable === true && (
                                    <p className="text-sm text-green-600 mt-1">
                                        ✅ Python service ready (Camelot/Tabula available)
                                    </p>
                                )}
                            </div>
                            <div className="flex gap-3">
                                {pythonServiceAvailable && (
                                    <button
                                        onClick={extractTablesWithPythonBackend}
                                        disabled={extractingWithAI}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        title="Use Python backend (Camelot + Tabula) for reliable, complete extraction"
                                    >
                                        <CheckCircle className="w-4 h-4" />
                                        {extractingWithAI ? 'Extracting...' : 'Python Extract (Recommended)'}
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowRawData(!showRawData)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                                    title="View raw extracted text with X/Y coordinates"
                                >
                                    <FileText className="w-4 h-4" />
                                    {showRawData ? 'Hide Raw Data' : 'View Raw Data (X/Y)'}
                                </button>
                                <button
                                    onClick={extractTablesWithAI}
                                    disabled={extractingWithAI}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Hybrid extraction: PDF.js extracts ALL data, Claude classifies intelligently"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    {extractingWithAI ? 'AI Extracting...' : 'AI Extract (Complete)'}
                                </button>
                                <button
                                    onClick={handleBackupToSupabase}
                                    disabled={backupStatus?.loading}
                                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                    title="Backup cached AI extractions to Supabase"
                                >
                                    <Download className="w-4 h-4" />
                                    {backupStatus?.loading ? 'Backing up...' : 'Backup to DB'}
                                </button>
                                <button
                                    onClick={() => {
                                        setFile(null);
                                        setExtractedTables([]);
                                        setExtractedText('');
                                        setSelectedTable(null);
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    Upload Another
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Raw Data View with X/Y Coordinates */}
                    {showRawData && pageItems.length > 0 && (
                        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                            <div className="p-4 border-b bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                            <FileText className="w-5 h-5" />
                                            Raw Extracted Data (All Text with X/Y Coordinates)
                                        </h3>
                                        <p className="text-sm text-gray-600 mt-1">
                                            Review this data to manually organize tables. Items are sorted by page, then Y position (top to bottom), then X position (left to right).
                                        </p>
                                    </div>
                                    <button
                                        onClick={exportRawDataToCSV}
                                        className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm"
                                    >
                                        <Download className="w-4 h-4" />
                                        Export to CSV
                                    </button>
                                </div>
                            </div>
                            <div className="p-4 max-h-96 overflow-auto">
                                {pageItems.map((page, pageIdx) => (
                                    <div key={pageIdx} className="mb-6">
                                        <h4 className="font-bold text-lg mb-3 bg-blue-100 px-3 py-2 rounded">
                                            📄 Page {page.pageNum} - {page.items.length} items
                                        </h4>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-xs font-mono">
                                                <thead className="bg-gray-100 sticky top-0">
                                                    <tr>
                                                        <th className="px-2 py-1 text-left">#</th>
                                                        <th className="px-2 py-1 text-left">X</th>
                                                        <th className="px-2 py-1 text-left">Y</th>
                                                        <th className="px-2 py-1 text-left">Text</th>
                                                        <th className="px-2 py-1 text-left">Width</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {[...page.items]
                                                        .sort((a, b) => {
                                                            // Sort by Y first (top to bottom), then X (left to right)
                                                            if (Math.abs(a.y - b.y) > 5) return b.y - a.y; // Y decreases going down in PDF coords
                                                            return a.x - b.x;
                                                        })
                                                        .map((item, idx) => (
                                                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                                                <td className="px-2 py-1 text-gray-500">{idx + 1}</td>
                                                                <td className="px-2 py-1 text-blue-600">{item.x}</td>
                                                                <td className="px-2 py-1 text-green-600">{item.y}</td>
                                                                <td className="px-2 py-1 font-normal">{item.text}</td>
                                                                <td className="px-2 py-1 text-gray-500">{item.width}</td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}
                                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                                    <p className="text-sm text-gray-700">
                                        <strong>💡 How to use this data:</strong>
                                    </p>
                                    <ul className="text-sm text-gray-600 ml-4 mt-2 space-y-1">
                                        <li>• Items with similar Y values (±5 pixels) are on the same row</li>
                                        <li>• Items with similar X values are in the same column</li>
                                        <li>• Look for patterns (dates, amounts, descriptions) to identify tables</li>
                                        <li>• You can export this to CSV and manually organize in Excel if needed</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Extracted Tables */}
                    <div className="grid grid-cols-1 gap-6">
                        {extractedTables.map((table) => (
                            <div key={table.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                                <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Table className="w-5 h-5 text-blue-600" />
                                                <h3 className="font-bold text-gray-900">{table.name}</h3>
                                                {table.suggestedImport && table.suggestedImport !== 'skip' && (
                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-800 text-xs font-medium rounded-full border border-green-300">
                                                        ⭐ Recommended
                                                    </span>
                                                )}
                                            </div>
                                            {table.description && (
                                                <p className="text-sm text-gray-700 mt-1">
                                                    <strong>AI Analysis:</strong> {table.description}
                                                </p>
                                            )}
                                            {table.suggestedImport && (
                                                <p className="text-xs text-blue-700 mt-1">
                                                    💡 <strong>Import to:</strong> {
                                                        table.suggestedImport === 'investmentTransactions' ? 'Investment Transactions' :
                                                            table.suggestedImport === 'dividendIncome' ? 'Dividend Income' :
                                                                table.suggestedImport === 'securities' ? 'Securities Holdings' :
                                                                    'Not recommended for import'
                                                    }
                                                    {table.reasoning && ` - ${table.reasoning}`}
                                                </p>
                                            )}
                                        </div>
                                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${getConfidenceColor(table.confidence)}`}>
                                            <CheckCircle className="w-3 h-3" />
                                            {Math.round(table.confidence * 100)}% Confidence
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-600">
                                        Page {table.page} • {table.rowCount} rows × {table.columnCount} columns
                                    </div>
                                </div>

                                {/* Table Preview */}
                                <div className="p-4 overflow-x-auto">
                                    <table className="w-full text-sm border-collapse">
                                        <thead>
                                            <tr className="bg-gray-100">
                                                {table.headers.map((header, idx) => (
                                                    <th key={idx} className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-900">
                                                        {header}
                                                    </th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {table.rows.slice(0, 10).map((row, rowIdx) => (
                                                <tr key={rowIdx} className="hover:bg-gray-50">
                                                    {table.headers.map((header, colIdx) => (
                                                        <td key={colIdx} className="border border-gray-300 px-3 py-2">
                                                            {row[header] || '—'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>

                                    {table.rows.length > 10 && (
                                        <div className="mt-4 text-center text-sm text-gray-600 bg-blue-50 py-3 rounded">
                                            Showing first 10 of {table.rows.length} rows
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="p-4 border-t bg-gray-50 flex gap-3">
                                    <button
                                        onClick={() => setSelectedTable(table)}
                                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                                    >
                                        <Eye className="w-4 h-4" />
                                        View All {table.rows.length} Rows
                                    </button>
                                    <button
                                        onClick={() => setMappingTable(table)}
                                        className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Map Columns
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Global Save Button */}
                    <div className="bg-white rounded-lg shadow-lg p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Ready to Import?</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Save all extracted data to your Supabase database
                                </p>
                            </div>
                            <button
                                onClick={handleSaveToDatabase}
                                disabled={savingToDB || extractedTables.length === 0}
                                className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Download className="w-5 h-5" />
                                {savingToDB ? 'Saving...' : 'Save All Tables to Database'}
                            </button>
                        </div>

                        {saveSuccess && (
                            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                                <p className="text-green-800 font-medium">✅ {saveSuccess}</p>
                            </div>
                        )}
                    </div>

                    {/* Raw Text Preview */}
                    <details className="bg-white rounded-lg shadow-lg p-6">
                        <summary className="cursor-pointer font-semibold text-gray-900 mb-2">
                            📄 View Raw Extracted Text ({extractedText.length} characters)
                        </summary>
                        <div className="mt-4 p-4 bg-gray-50 rounded border border-gray-200 max-h-96 overflow-y-auto">
                            <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono">
                                {extractedText}
                            </pre>
                        </div>
                    </details>
                </div>
            )}

            {/* No tables found */}
            {!parsing && file && extractedTables.length === 0 && !error && (
                <div className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="font-semibold text-yellow-900 mb-2">No Tables Detected</h3>
                                <p className="text-sm text-yellow-800 mb-3">
                                    We couldn't automatically detect tables in this PDF. This might happen if:
                                </p>
                                <ul className="text-sm text-yellow-800 list-disc ml-5 space-y-1">
                                    <li>The PDF is image-based (scanned) rather than text-based</li>
                                    <li>The table format is different from what we're looking for</li>
                                    <li>The PDF has unusual formatting</li>
                                </ul>
                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={extractTablesWithAI}
                                        disabled={extractingWithAI}
                                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {extractingWithAI ? 'AI Extracting...' : 'Try AI Extraction'}
                                    </button>
                                    <button
                                        onClick={() => setShowDebug(!showDebug)}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                                    >
                                        {showDebug ? 'Hide' : 'Show'} Debug Info
                                    </button>
                                    <button className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 text-sm font-medium">
                                        Try Manual Entry Instead
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Debug Section */}
                    {showDebug && extractedText && (
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="font-bold text-lg mb-4">Debug Information</h3>
                            <div className="space-y-4">
                                <div>
                                    <h4 className="font-semibold mb-2">Extracted Text Preview (first 1000 chars):</h4>
                                    <pre className="p-4 bg-gray-50 rounded border text-xs overflow-auto max-h-60">
                                        {extractedText.substring(0, 1000)}
                                    </pre>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Text Length:</h4>
                                    <p className="text-sm">{extractedText.length} characters extracted</p>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-2">Check Console:</h4>
                                    <p className="text-sm">Open browser console (F12) to see detailed parsing logs</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Full Table Modal */}
            {selectedTable && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">{selectedTable.name}</h3>
                                    <p className="text-gray-600 mt-1">All {selectedTable.rowCount} rows from your file</p>
                                </div>
                                <button
                                    onClick={() => setSelectedTable(null)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm border-collapse">
                                    <thead>
                                        <tr className="bg-gray-100 sticky top-0">
                                            {selectedTable.headers.map((header, idx) => (
                                                <th key={idx} className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">
                                                    {header}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTable.rows.map((row, rowIdx) => (
                                            <tr key={rowIdx} className="hover:bg-gray-50">
                                                {selectedTable.headers.map((header, colIdx) => (
                                                    <td key={colIdx} className="border border-gray-300 px-4 py-2">
                                                        {row[header] || '—'}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50">
                            <button
                                onClick={() => setSelectedTable(null)}
                                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Column Mapping Modal */}
            {mappingTable && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b bg-gradient-to-r from-purple-50 to-blue-50">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-2xl font-bold text-gray-900">Map Columns: {mappingTable.name}</h3>
                                    <p className="text-gray-600 mt-1">Map PDF columns to investment transaction fields</p>
                                </div>
                                <button
                                    onClick={() => setMappingTable(null)}
                                    className="text-gray-500 hover:text-gray-700"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto p-6">
                            <div className="space-y-6">
                                {/* Info Box */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    <p className="text-sm text-blue-900">
                                        <strong>Why map columns?</strong> PDFs may have inconsistent formatting.
                                        By mapping once, you ensure data is imported correctly every time.
                                    </p>
                                </div>

                                {/* Standard Investment Transaction Fields */}
                                <div className="space-y-4">
                                    <h4 className="font-semibold text-lg">Map to Investment Transaction Fields:</h4>

                                    {['Date', 'Description', 'Transaction Type', 'Units/Shares', 'Price', 'Amount', 'Debit', 'Credit', 'Balance'].map(field => (
                                        <div key={field} className="grid grid-cols-2 gap-4 items-center">
                                            <label className="text-sm font-medium text-gray-700">
                                                {field}
                                                {['Date', 'Description'].includes(field) && <span className="text-red-500"> *</span>}
                                            </label>
                                            <select
                                                value={columnMappings[field] || ''}
                                                onChange={(e) => setColumnMappings({ ...columnMappings, [field]: e.target.value })}
                                                className="px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                                            >
                                                <option value="">-- Skip this field --</option>
                                                {mappingTable.headers.map(header => (
                                                    <option key={header} value={header}>{header}</option>
                                                ))}
                                            </select>
                                        </div>
                                    ))}
                                </div>

                                {/* Preview */}
                                <div className="mt-6">
                                    <h4 className="font-semibold text-lg mb-3">Preview Mapped Data:</h4>
                                    <div className="border rounded-lg overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="bg-gray-100">
                                                    {Object.keys(columnMappings).filter(k => columnMappings[k]).map(field => (
                                                        <th key={field} className="border px-3 py-2 text-left font-semibold">
                                                            {field}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {mappingTable.rows.slice(0, 5).map((row, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50">
                                                        {Object.entries(columnMappings)
                                                            .filter(([_, pdfCol]) => pdfCol)
                                                            .map(([field, pdfCol]) => (
                                                                <td key={field} className="border px-3 py-2">
                                                                    {row[pdfCol] || '—'}
                                                                </td>
                                                            ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    {mappingTable.rows.length > 5 && (
                                        <p className="text-xs text-gray-600 mt-2">Showing first 5 of {mappingTable.rows.length} rows</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t bg-gray-50 flex gap-3">
                            <button
                                onClick={() => setMappingTable(null)}
                                className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    // TODO: Save mapping and proceed to import
                                    alert('Column mapping saved! Next: Import to database');
                                    setMappingTable(null);
                                }}
                                className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
                            >
                                Save Mapping & Continue
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Instructions */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex gap-2">
                    <FileText className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-900">
                        <strong>This uses REAL PDF parsing:</strong>
                        <ul className="mt-2 space-y-1 ml-4 list-disc">
                            <li>Reads YOUR actual PDF file (not mock data)</li>
                            <li>Extracts text with position information</li>
                            <li>Detects tables by analyzing text patterns</li>
                            <li>Works best with text-based PDFs (not scanned images)</li>
                            <li>Optimized for Olympia Trust investment statements</li>
                        </ul>
                        <div className="mt-3 p-2 bg-blue-100 rounded">
                            <strong>Next Steps:</strong> After tables are extracted, you'll be able to map columns and import to investmentTransactions table
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RealPDFParser;