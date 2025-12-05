/**
 * Show duplicate transaction examples from CSV
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
        const record = { _line: i + 1 };

        headers.forEach((header, index) => {
            record[header] = values[index];
        });

        records.push(record);
    }

    return records;
}

const csvPath = path.join(__dirname, '..', 'src', 'db', 'supabase_personal_finance', 'transactions_rows.csv');
const content = fs.readFileSync(csvPath, 'utf-8');
const csvRecords = parseCSV(content);

// Group by key
const groups = new Map();
csvRecords.forEach((r) => {
    const key = `${r.date}|${r.raw_merchant_name}|${r.amount}|${r.account_id}|${r.type}`;
    if (!groups.has(key)) {
        groups.set(key, []);
    }
    groups.get(key).push(r);
});

// Find duplicates
const duplicates = [];
groups.forEach((records, key) => {
    if (records.length > 1) {
        duplicates.push({ key, records });
    }
});

console.log(`\n📋 Found ${duplicates.length} groups with duplicates (${duplicates.reduce((s, d) => s + d.records.length - 1, 0)} extra rows)\n`);
console.log('='.repeat(80));

// Show first 5 examples
duplicates.slice(0, 5).forEach((dup, i) => {
    console.log(`\n${i + 1}. DUPLICATE GROUP (${dup.records.length} records):`);
    console.log('-'.repeat(60));

    dup.records.forEach((r, j) => {
        console.log(`   [${j + 1}] Line ${r._line}: ID=${r.id?.substring(0, 8)}...`);
        console.log(`       Date: ${r.date}`);
        console.log(`       Merchant: ${r.raw_merchant_name}`);
        console.log(`       Amount: ${r.amount} ${r.currency}`);
        console.log(`       Type: ${r.type}`);
        console.log(`       Account: ${r.account_id}`);
        console.log(`       Status: ${r.status}`);
        console.log(`       Notes: ${r.notes || '(none)'}`);
        console.log('');
    });
});
