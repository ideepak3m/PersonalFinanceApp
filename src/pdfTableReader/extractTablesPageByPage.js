import { extractPDFTables } from '../services/aiService';

/**
 * Extract tables from PDF by processing each page separately, then combining results.
 * This ensures Claude extracts ALL rows instead of summarizing.
 */
export const extractTablesPageByPage = async (images) => {
    console.log(`📊 Processing ${images.length} pages separately for complete extraction...`);

    let allTables = [];
    let accountInfo = null;

    for (let i = 0; i < images.length; i++) {
        console.log(`\n🔍 Processing page ${i + 1}/${images.length}...`);

        const pagePrompt = `Extract ALL data from page ${i + 1} of this investment statement. Extract EVERY SINGLE ROW you can see on this page.

Your response must be ONLY valid JSON (no markdown, no explanations):

{
  "accountInfo": {
    "accountNumber": "string or null",
    "accountType": "string or null",
    "institution": "string or null",
    "statementPeriod": "string or null",
    "statementDate": "YYYY-MM-DD or null",
    "currency": "CAD|USD or null",
    "openingBalance": "string or null",
    "closingBalance": "string or null"
  },
  "tables": [
    {
      "name": "table name",
      "dataType": "cashTransactions|investmentTransactions|holdings|taxWithholdings",
      "headers": ["col1", "col2", ...],
      "rows": [
        {"col1": "val1", "col2": "val2"},
        ... EXTRACT EVERY ROW VISIBLE ON THIS PAGE
      ]
    }
  ]
}

Classification:
- "investmentTransactions" = Transactions with security names (Buy, Sell, Dividend, Interest, Distribution)
- "cashTransactions" = Fees, transfers without securities (Admin Fee, HST, Transfer-In)
- "holdings" = Current positions
- "taxWithholdings" = Tax deductions

IMPORTANT: Extract EVERY row you see on this specific page. Do not skip or summarize.`;

        const response = await extractPDFTables(pagePrompt, [images[i]]);

        if (!response.success) {
            console.warn(`⚠️ Failed to extract page ${i + 1}: ${response.message}`);
            continue;
        }

        // Parse response
        let jsonText = response.message.trim();
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }

        const jsonStart = jsonText.indexOf('{');
        const jsonEnd = jsonText.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1) {
            jsonText = jsonText.substring(jsonStart, jsonEnd + 1);
        }

        let pageResult;
        try {
            pageResult = JSON.parse(jsonText);
        } catch (parseError) {
            console.error(`❌ Failed to parse page ${i + 1}:`, parseError);
            continue;
        }

        // Extract account info from first page if present
        if (i === 0 && pageResult.accountInfo && pageResult.accountInfo.accountNumber) {
            accountInfo = pageResult.accountInfo;
        }

        // Add tables from this page
        if (pageResult.tables && Array.isArray(pageResult.tables)) {
            pageResult.tables.forEach(table => {
                table.page = i + 1; // Track which page this came from
                allTables.push(table);
            });
            console.log(`✅ Page ${i + 1}: Found ${pageResult.tables.length} table(s), ${pageResult.tables.reduce((sum, t) => sum + (t.rows?.length || 0), 0)} total rows`);
        }
    }

    if (allTables.length === 0) {
        throw new Error('No tables extracted from any page');
    }

    // Combine tables with same dataType
    const combinedTables = {};
    allTables.forEach(table => {
        const key = table.dataType || 'unknown';
        if (!combinedTables[key]) {
            combinedTables[key] = {
                name: table.name,
                dataType: table.dataType,
                headers: table.headers,
                rows: [],
                pagesCovered: []
            };
        }
        // Merge rows
        if (table.rows && Array.isArray(table.rows)) {
            combinedTables[key].rows.push(...table.rows);
            combinedTables[key].pagesCovered.push(table.page);
        }
    });

    const finalTables = Object.values(combinedTables);
    console.log(`\n📊 Combined Results: ${finalTables.length} table types, ${finalTables.reduce((sum, t) => sum + (t.rows?.length || 0), 0)} total rows`);

    finalTables.forEach(table => {
        console.log(`  - ${table.dataType}: ${table.rows.length} rows from pages ${[...new Set(table.pagesCovered)].join(', ')}`);
    });

    return {
        accountInfo,
        tables: finalTables
    };
};
