/**
 * Verify transactions - compare CSV to PocketBase
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
        const record = {};

        headers.forEach((header, index) => {
            record[header] = values[index];
        });

        records.push(record);
    }

    return records;
}

async function verify() {
    console.log('\n🔍 Verifying Transactions\n');

    try {
        await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated\n');
    } catch (error) {
        console.error('❌ Auth failed:', error.message);
        return;
    }

    // Read CSV
    const csvPath = path.join(__dirname, '..', 'src', 'db', 'supabase_personal_finance', 'transactions_rows.csv');
    const content = fs.readFileSync(csvPath, 'utf-8');
    const csvRecords = parseCSV(content);

    console.log(`📊 CSV records: ${csvRecords.length}`);

    // Get PocketBase records
    const pbRecords = await pb.collection('transactions').getFullList();
    console.log(`📦 PocketBase records: ${pbRecords.length}`);
    console.log(`📉 Missing: ${csvRecords.length - pbRecords.length}\n`);

    // Create a key from CSV records to find which are missing
    const csvKeys = new Map();
    csvRecords.forEach((r, i) => {
        const key = `${r.date}|${r.raw_merchant_name}|${r.amount}|${r.account_id}|${r.type}`;
        if (csvKeys.has(key)) {
            csvKeys.get(key).push(i + 2); // line numbers (1-indexed + header)
        } else {
            csvKeys.set(key, [i + 2]);
        }
    });

    // Check for duplicates in CSV
    let csvDupes = 0;
    csvKeys.forEach((lines, key) => {
        if (lines.length > 1) {
            csvDupes += lines.length - 1;
        }
    });

    console.log(`📋 Unique keys in CSV: ${csvKeys.size}`);
    console.log(`📋 Duplicate rows in CSV: ${csvDupes}`);
    console.log(`📋 Expected unique records: ${csvKeys.size}`);

    if (csvKeys.size === pbRecords.length) {
        console.log('\n✅ PocketBase has all unique records!');
    } else {
        console.log(`\n⚠️  Difference: ${csvKeys.size - pbRecords.length}`);
    }
}

verify().catch(console.error);
