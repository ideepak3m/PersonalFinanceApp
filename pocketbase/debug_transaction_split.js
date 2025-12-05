/**
 * Debug script for transaction_split import issues
 */

import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pb = new PocketBase('http://127.0.0.1:8090');

const ADMIN_EMAIL = 'ivdeepak@gmail.com';
const ADMIN_PASSWORD = '0702Toths001!@#';

// Parse CSV line handling quoted fields
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);
    return result;
}

// Parse CSV content
function parseCSV(content) {
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedContent.split('\n');
    if (lines.length < 2) return [];

    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        const record = { _original_id: values[headers.indexOf('id')], _line: i + 1 };

        headers.forEach((header, index) => {
            let value = values[index];

            // Skip 'id' field
            if (header === 'id') return;
            // Skip timestamp fields
            if (header === 'created_at' || header === 'updated_at' || header === 'inserted_at') return;

            // Handle null/empty
            if (value === '' || value === 'null' || value === undefined) return;

            // Handle boolean
            if (value === 'true' || value === 't') { record[header] = true; return; }
            if (value === 'false' || value === 'f') { record[header] = false; return; }

            // Handle numeric fields
            if (!isNaN(value) && value !== '' && !header.includes('date') &&
                !header.includes('_id') && header !== 'user_id' && header !== 'account_number' &&
                header !== 'symbol' && header !== 'code' && header !== 'currency') {
                record[header] = parseFloat(value);
                return;
            }

            record[header] = value;
        });

        records.push(record);
    }

    return records;
}

async function debugTransactionSplit() {
    console.log('\n🔍 Debug Transaction Split Import\n');

    try {
        await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated\n');
    } catch (error) {
        console.error('❌ Auth failed:', error.message);
        return;
    }

    const csvPath = path.join(__dirname, '..', 'src', 'db', 'supabase_personal_finance', 'transaction_split_rows.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const records = parseCSV(content);

    console.log(`📊 Total records in CSV: ${records.length}\n`);

    // Get existing
    const existingRecords = await pb.collection('transaction_split').getFullList();
    console.log(`📦 Already in PocketBase: ${existingRecords.length}\n`);

    // Try importing and log failures
    let successCount = 0;
    let failures = [];

    for (const record of records) {
        const originalId = record._original_id;
        const line = record._line;
        delete record._original_id;
        delete record._line;

        try {
            await pb.collection('transaction_split').create(record);
            successCount++;
        } catch (error) {
            failures.push({
                line,
                originalId,
                error: error.message,
                response: error.response?.data || error.response || 'No response data',
                record: JSON.stringify(record, null, 2).substring(0, 500)
            });
        }
    }

    console.log(`✅ New imports: ${successCount}`);
    console.log(`❌ Failures: ${failures.length}\n`);

    if (failures.length > 0) {
        console.log('='.repeat(60));
        console.log('FAILURE DETAILS:\n');

        for (const f of failures) {
            console.log(`Line ${f.line} (ID: ${f.originalId}):`);
            console.log('Error:', JSON.stringify(f.response, null, 2));
            console.log('Record:', f.record);
            console.log('');
        }
    }
}

debugTransactionSplit().catch(console.error);
