/**
 * PocketBase Data Import Script - With Supabase IDs
 * Imports CSV data from Supabase exports, preserving original IDs as supabase_id
 * 
 * This script:
 * 1. Clears existing data from all collections
 * 2. Imports data with original Supabase IDs stored as 'supabase_id'
 * 
 * Usage: node pb_import_with_original_id.js
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

// CSV files mapped to collection names (import order matters for foreign keys)
// Import in dependency order: independent tables first, then dependent tables
const CSV_TO_COLLECTION = [
    // Independent tables (no foreign keys to other app tables)
    ['category_rows (1).csv', 'category'],
    ['chart_of_accounts_rows (1).csv', 'chart_of_accounts'],
    ['user_profile_rows.csv', 'user_profile'],
    ['profiles_rows (2).csv', 'profiles'],
    ['investment_managers_rows.csv', 'investment_managers'],
    ['column_mappings_rows.csv', 'column_mappings'],
    ['government_benefits_rows.csv', 'government_benefits'],

    // Tables with foreign keys to independent tables
    ['accounts_rows (1).csv', 'accounts'],
    ['merchant_rows (1).csv', 'merchant'],
    ['investment_accounts_rows.csv', 'investment_accounts'],

    // Tables with foreign keys to second-level tables  
    ['transactions_rows.csv', 'transactions'],
    ['merchant_split_rules_rows.csv', 'merchant_split_rules'],
    ['holdings_rows.csv', 'holdings'],
    ['holding_snapshots_rows.csv', 'holding_snapshots'],
    ['investment_transactions_rows.csv', 'investment_transactions'],
    ['cash_transactions_rows.csv', 'cash_transactions'],
    ['import_staging_rows.csv', 'import_staging'],
    ['import_raw_data_rows.csv', 'import_raw_data'],

    // Tables with foreign keys to transactions
    ['transaction_split_rows.csv', 'transaction_split'],
    ['ai_extraction_logs_rows.csv', 'ai_extraction_logs'],
];

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
        const record = {};

        headers.forEach((header, index) => {
            let value = values[index];

            // IMPORTANT: Preserve the 'id' field as 'supabase_id'
            if (header === 'id') {
                if (value && value !== '' && value !== 'null') {
                    record['supabase_id'] = value;
                }
                return;
            }

            // Skip timestamp fields that PocketBase manages
            if (header === 'created_at' || header === 'updated_at' || header === 'inserted_at') return;

            // Handle null/empty values
            if (value === '' || value === 'null' || value === undefined) {
                return;
            }

            // Handle JSON fields
            if (header === 'aliases' || header === 'splits' || header === 'mapping_config' ||
                header === 'raw_data' || header === 'extraction_data' || header === 'column_names' ||
                header === 'preferred_split_json') {
                try {
                    if (value.startsWith('{') || value.startsWith('[')) {
                        record[header] = JSON.parse(value);
                    } else {
                        record[header] = value;
                    }
                } catch (e) {
                    record[header] = value;
                }
                return;
            }

            // Handle boolean fields
            if (value === 'true' || value === 't') {
                record[header] = true;
                return;
            }
            if (value === 'false' || value === 'f') {
                record[header] = false;
                return;
            }

            // Handle numeric fields (but not IDs, dates, or string-like fields)
            if (!isNaN(value) && value !== '' && !header.includes('date') &&
                !header.includes('_id') && header !== 'user_id' && header !== 'account_number' &&
                header !== 'symbol' && header !== 'code' && header !== 'currency' &&
                header !== 'supabase_id') {
                record[header] = parseFloat(value);
                return;
            }

            record[header] = value;
        });

        if (Object.keys(record).length > 0) {
            records.push(record);
        }
    }

    return records;
}

// Parse a single CSV line handling quoted values
function parseCSVLine(line) {
    const values = [];
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
            values.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    values.push(current.trim());

    return values;
}

// Clear all records from a collection
async function clearCollection(collectionName) {
    try {
        const records = await pb.collection(collectionName).getFullList();
        let deleted = 0;
        for (const record of records) {
            await pb.collection(collectionName).delete(record.id);
            deleted++;
        }
        return deleted;
    } catch (error) {
        console.log(`   ⚠️  Could not clear ${collectionName}: ${error.message}`);
        return 0;
    }
}

async function importData() {
    console.log('\n📦 PocketBase Data Import (with Original IDs)\n');
    console.log('='.repeat(60));

    // Authenticate
    try {
        await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated as admin\n');
    } catch (error) {
        console.error('❌ Authentication failed:', error.message);
        return;
    }

    const dataDir = path.join(__dirname, '..', 'src', 'db', 'supabase_personal_finance');

    // First, clear all collections in reverse order (to handle foreign keys)
    console.log('🗑️  Clearing existing data...\n');
    for (let i = CSV_TO_COLLECTION.length - 1; i >= 0; i--) {
        const [_, collectionName] = CSV_TO_COLLECTION[i];
        const deleted = await clearCollection(collectionName);
        if (deleted > 0) {
            console.log(`   Cleared ${deleted} records from ${collectionName}`);
        }
    }

    console.log('\n📥 Importing data...\n');

    let totalImported = 0;
    let totalFailed = 0;

    for (const [csvFile, collectionName] of CSV_TO_COLLECTION) {
        const filePath = path.join(dataDir, csvFile);

        if (!fs.existsSync(filePath)) {
            console.log(`⏭️  Skipping ${csvFile} (file not found)`);
            continue;
        }

        console.log(`📄 Importing ${csvFile} → ${collectionName}`);

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const records = parseCSV(content);

            if (records.length === 0) {
                console.log(`   ⚠️  No records found`);
                continue;
            }

            let imported = 0;
            let failed = 0;
            let errors = [];

            for (const record of records) {
                try {
                    await pb.collection(collectionName).create(record);
                    imported++;
                } catch (error) {
                    failed++;
                    if (errors.length < 3) {
                        errors.push(error.message);
                    }
                }
            }

            console.log(`   ✅ Imported: ${imported}/${records.length}`);
            if (failed > 0) {
                console.log(`   ❌ Failed: ${failed}`);
                errors.forEach(e => console.log(`      - ${e}`));
            }
            totalImported += imported;
            totalFailed += failed;

        } catch (error) {
            console.log(`   ❌ Error reading file: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Import Summary:`);
    console.log(`   Total Imported: ${totalImported}`);
    console.log(`   Total Failed: ${totalFailed}`);
    console.log('');
}

importData().catch(console.error);
