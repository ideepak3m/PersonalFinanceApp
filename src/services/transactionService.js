// src/services/transactionService.js

import Papa from 'papaparse';

export const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                resolve(results.data);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};

// Enhanced QBO/QFX parser
export const parseQBOQFX = (file) => {
    return new Promise((resolve, reject) => {
        if (!file || typeof FileReader === 'undefined') {
            reject(new Error('Invalid file or FileReader not available'));
            return;
        }

        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target.result;
                console.log('📄 File loaded successfully, size:', text.length);

                // Parse OFX/QBO format
                const transactions = parseOFXContent(text);
                console.log('✅ Parsed transactions:', transactions.length);

                if (transactions.length === 0) {
                    console.warn('⚠️ No transactions found in file');
                }

                resolve(transactions);
            } catch (err) {
                console.error('❌ Error parsing QBO/QFX:', err);
                reject(err);
            }
        };

        reader.onerror = (err) => {
            console.error('❌ FileReader error:', err);
            reject(err);
        };

        reader.readAsText(file);
    });
};

// Parse OFX content - handles both SGML and XML formats
const parseOFXContent = (text) => {
    console.log('🔍 Starting OFX parse...');

    // Remove OFX headers (everything before <OFX>)
    const ofxStart = text.indexOf('<OFX>');
    if (ofxStart === -1) {
        throw new Error('Invalid OFX file: <OFX> tag not found');
    }

    let ofxContent = text.substring(ofxStart);
    console.log('📦 OFX content length:', ofxContent.length);

    // Convert SGML-style tags to XML (add closing tags)
    ofxContent = convertSGMLToXML(ofxContent);

    // Parse with DOMParser
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(ofxContent, 'text/xml');

    // Check for parsing errors
    const parserError = xmlDoc.querySelector('parsererror');
    if (parserError) {
        console.error('XML Parse Error:', parserError.textContent);
        // Try alternative parsing method
        return parseOFXManually(text);
    }

    // Extract account information
    const acctId = xmlDoc.querySelector('ACCTID')?.textContent || 'Unknown';
    const currency = xmlDoc.querySelector('CURDEF')?.textContent || 'CAD';
    console.log('💳 Account:', acctId, 'Currency:', currency);

    // Extract transactions
    const stmtTrnNodes = xmlDoc.querySelectorAll('STMTTRN');
    console.log('📊 Found transaction nodes:', stmtTrnNodes.length);

    const transactions = Array.from(stmtTrnNodes).map((node, index) => {
        const trnType = node.querySelector('TRNTYPE')?.textContent || 'DEBIT';
        const dtPosted = node.querySelector('DTPOSTED')?.textContent || '';
        const trnAmt = node.querySelector('TRNAMT')?.textContent || '0';
        const fitId = node.querySelector('FITID')?.textContent || '';
        const name = node.querySelector('NAME')?.textContent || '';
        const memo = node.querySelector('MEMO')?.textContent || '';

        // Parse date (format: YYYYMMDDHHMMSS)
        let date = new Date().toISOString().split('T')[0];
        if (dtPosted && dtPosted.length >= 8) {
            const year = dtPosted.substring(0, 4);
            const month = dtPosted.substring(4, 6);
            const day = dtPosted.substring(6, 8);
            date = `${year}-${month}-${day}`;
        }

        // Parse amount
        const amount = parseFloat(trnAmt);

        console.log(`  Transaction ${index + 1}:`, {
            date,
            name,
            amount,
            type: trnType
        });

        return {
            TRNTYPE: trnType,
            DTPOSTED: dtPosted,
            TRNAMT: trnAmt,
            FITID: fitId,
            NAME: name,
            MEMO: memo,
            parsedDate: date,
            parsedAmount: amount,
            parsedDescription: name || memo || 'Transaction'
        };
    });

    console.log('✅ Successfully parsed', transactions.length, 'transactions');
    return transactions;
};

// Convert SGML-style OFX to proper XML
const convertSGMLToXML = (sgml) => {
    console.log('🔄 Converting SGML to XML...');

    // Remove line breaks for easier processing
    let xml = sgml.replace(/\r?\n/g, ' ');

    // Pattern to match: <TAG>value (without closing tag)
    // But not if the value starts with 
    const tagPattern = /<([A-Z][A-Z0-9._]*?)>([^<>]+?)(?=<|$)/g;

    xml = xml.replace(tagPattern, (match, tagName, value) => {
        // Don't add closing tag if value is empty or just whitespace
        if (!value.trim()) {
            return `<${tagName}></${tagName}>`;
        }
        return `<${tagName}>${value.trim()}</${tagName}>`;
    });

    // Clean up any double-closing tags
    xml = xml.replace(/<\/([A-Z][A-Z0-9._]*?)><\/\1>/g, '</$1>');

    return xml;
};

// Fallback: Manual parsing without XML parser
const parseOFXManually = (text) => {
    console.log('🔧 Using manual OFX parser (fallback)...');

    const transactions = [];
    const stmtTrnPattern = /<STMTTRN>(.*?)<\/STMTTRN>/gs;
    const matches = text.matchAll(stmtTrnPattern);

    for (const match of matches) {
        const txnBlock = match[1];

        const trnType = extractTag(txnBlock, 'TRNTYPE');
        const dtPosted = extractTag(txnBlock, 'DTPOSTED');
        const trnAmt = extractTag(txnBlock, 'TRNAMT');
        const fitId = extractTag(txnBlock, 'FITID');
        const name = extractTag(txnBlock, 'NAME');
        const memo = extractTag(txnBlock, 'MEMO');

        // Parse date
        let date = new Date().toISOString().split('T')[0];
        if (dtPosted && dtPosted.length >= 8) {
            date = `${dtPosted.substring(0, 4)}-${dtPosted.substring(4, 6)}-${dtPosted.substring(6, 8)}`;
        }

        transactions.push({
            TRNTYPE: trnType,
            DTPOSTED: dtPosted,
            TRNAMT: trnAmt,
            FITID: fitId,
            NAME: name,
            MEMO: memo,
            parsedDate: date,
            parsedAmount: parseFloat(trnAmt || 0),
            parsedDescription: name || memo || 'Transaction'
        });
    }

    console.log('✅ Manual parse found', transactions.length, 'transactions');
    return transactions;
};

// Helper to extract tag value
const extractTag = (text, tagName) => {
    const pattern = new RegExp(`<${tagName}>([^<]*)`);
    const match = text.match(pattern);
    return match ? match[1].trim() : '';
};

// Map OFX transactions to app format
export const mapQBOQFXToTransactions = (ofxTxns, accountId) => {
    console.log('🗺️ Mapping', ofxTxns.length, 'OFX transactions to app format');

    return ofxTxns.map((txn, index) => {
        const amount = txn.parsedAmount || parseFloat(txn.TRNAMT || 0);
        const date = txn.parsedDate || new Date().toISOString().split('T')[0];
        const description = txn.parsedDescription || txn.NAME || txn.MEMO || 'Transaction';

        // Categorize based on merchant name
        //const category = categorizeTransaction(description, amount);

        return {
            id: txn.FITID || `txn_${Date.now()}_${index}`,
            accountId: accountId,
            productId: null, // Can be linked to a product later
            date: date,
            amount: amount,
            type: amount >= 0 ? 'credit' : 'debit',
            //category: category,
            category_id: null, // To be set based on category mapping
            description: description,
            memo: txn.MEMO || '',
            //originalData: txn // Keep original for reference
        };
    });
};

// Smart categorization based on merchant name
const categorizeTransaction = (description, amount) => {
    const desc = description.toUpperCase();

    // Income
    if (amount > 0 && (desc.includes('PAYMENT') || desc.includes('SALARY') || desc.includes('DEPOSIT'))) {
        return 'Income';
    }

    // Groceries
    if (desc.includes('COSTCO') || desc.includes('WAL-MART') || desc.includes('WALMART') ||
        desc.includes('FRESHCO') || desc.includes('GROCERY') || desc.includes('FOOD BASICS')) {
        return 'Food';
    }

    // Restaurants
    if (desc.includes('RESTAURANT') || desc.includes('PIZZA') || desc.includes('TIM HORTONS') ||
        desc.includes('BOSTON PIZZA') || desc.includes('ANNALAKSHMI') || desc.includes('TANDOORI')) {
        return 'Food';
    }

    // Transportation
    if (desc.includes('TESLA') || desc.includes('GAS') || desc.includes('PETRO') ||
        desc.includes('SHELL') || desc.includes('VIA RAIL') || desc.includes('UBER')) {
        return 'Transportation';
    }

    // Utilities
    if (desc.includes('ENERCARE') || desc.includes('HYDRO') || desc.includes('ENBRIDGE') ||
        desc.includes('BELL') || desc.includes('ROGERS') || desc.includes('TELUS')) {
        return 'Utilities';
    }

    // Entertainment
    if (desc.includes('NETFLIX') || desc.includes('SPOTIFY') || desc.includes('AMAZON PRIME') ||
        desc.includes('QUIZLET') || desc.includes('THEATRE') || desc.includes('CINEMA')) {
        return 'Entertainment';
    }

    // Healthcare
    if (desc.includes('PHARMACY') || desc.includes('SHOPPERS DRUG') || desc.includes('VETERINARY') ||
        desc.includes('HOSPITAL') || desc.includes('MEDICAL') || desc.includes('DENTAL')) {
        return 'Healthcare';
    }

    // Shopping
    if (desc.includes('AMAZON') || desc.includes('TEMU') || desc.includes('DOLLAR') ||
        desc.includes('CANADIAN TIRE') || desc.includes('GODADDY')) {
        return 'Shopping';
    }

    // Education
    if (desc.includes('UNIVERSITY') || desc.includes('COLLEGE') || desc.includes('SCHOOL') ||
        desc.includes('YORK U') || desc.includes('TUITION')) {
        return 'Education';
    }

    return 'Other';
};

// Map CSV to transactions
export const mapCSVToTransactions = (csvData, accountId) => {
    return csvData.map((row, index) => ({
        id: `csv_${Date.now()}_${index}`,
        accountId: accountId,
        productId: null,
        date: row.date || row.Date || row.DATE || new Date().toISOString().split('T')[0],
        description: row.description || row.Description || row.DESCRIPTION || '',
        amount: parseFloat(row.amount || row.Amount || row.AMOUNT || 0),
        //category: row.category || row.Category || row.CATEGORY || 'Other',
        category_id: null, // To be set based on category mapping
        type: parseFloat(row.amount || row.Amount || row.AMOUNT || 0) >= 0 ? 'credit' : 'debit',
        memo: row.memo || row.Memo || ''
    }));
};

// Validate transaction
export const validateTransaction = (transaction) => {
    const errors = [];

    if (!transaction.accountId) {
        errors.push('Account ID is required');
    }

    if (!transaction.date) {
        errors.push('Date is required');
    }

    if (transaction.amount === undefined || transaction.amount === null) {
        errors.push('Amount is required');
    }

    if (isNaN(transaction.amount)) {
        errors.push('Amount must be a valid number');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

// Export transactions to CSV
export const exportTransactionsToCSV = (transactions) => {
    const csv = Papa.unparse(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export default {
    parseCSV,
    parseQBOQFX,
    mapCSVToTransactions,
    mapQBOQFXToTransactions,
    validateTransaction,
    exportTransactionsToCSV
};
