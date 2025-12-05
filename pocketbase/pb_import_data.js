/**
 * PocketBase Data Import Script
 * Imports CSV data from Supabase exports
 * 
 * Usage: node pb_import_data.js
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

// CSV files mapped to collection names
const CSV_TO_COLLECTION = {
    'accounts_rows (1).csv': 'accounts',
    'ai_extraction_logs_rows.csv': 'ai_extraction_logs',
    'cash_transactions_rows.csv': 'cash_transactions',
    'category_rows (1).csv': 'category',
    'chart_of_accounts_rows (1).csv': 'chart_of_accounts',
    'column_mappings_rows.csv': 'column_mappings',
    'government_benefits_rows.csv': 'government_benefits',
    'holdings_rows.csv': 'holdings',
    'holding_snapshots_rows.csv': 'holding_snapshots',
    'import_raw_data_rows.csv': 'import_raw_data',
    'import_staging_rows.csv': 'import_staging',
    'investment_accounts_rows.csv': 'investment_accounts',
    'investment_managers_rows.csv': 'investment_managers',
    'investment_transactions_rows.csv': 'investment_transactions',
    'merchant_rows (1).csv': 'merchant',
    'merchant_split_rules_rows.csv': 'merchant_split_rules',
    'profiles_rows (2).csv': 'profiles',
    'transactions_rows.csv': 'transactions',
    'transaction_split_rows.csv': 'transaction_split',
    'user_profile_rows.csv': 'user_profile',
};

// Parse CSV content
function parseCSV(content) {
    // Handle Windows line endings
    const normalizedContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = normalizedContent.split('\n');
    if (lines.length < 2) return [];

    // Parse header - trim each header to remove any whitespace
    const headers = parseCSVLine(lines[0]).map(h => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line);
        const record = {};

        headers.forEach((header, index) => {
            let value = values[index];

            // Skip 'id' field - let PocketBase generate new ones
            if (header === 'id') return;

            // Skip timestamp fields that PocketBase manages
            if (header === 'created_at' || header === 'updated_at' || header === 'inserted_at') return;

            // Handle null/empty values
            if (value === '' || value === 'null' || value === undefined) {
                return; // Skip null values
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

            // Handle numeric fields
            if (!isNaN(value) && value !== '' && !header.includes('date') &&
                !header.includes('_id') && header !== 'user_id' && header !== 'account_number' &&
                header !== 'symbol' && header !== 'code' && header !== 'currency') {
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

async function importData() {
    console.log('\n📦 PocketBase Data Import\n');
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

    let totalImported = 0;
    let totalSkipped = 0;
    let totalFailed = 0;

    for (const [csvFile, collectionName] of Object.entries(CSV_TO_COLLECTION)) {
        const filePath = path.join(dataDir, csvFile);

        if (!fs.existsSync(filePath)) {
            console.log(`⏭️  Skipping ${csvFile} (file not found)`);
            continue;
        }

        console.log(`\n📄 Importing ${csvFile} → ${collectionName}`);

        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            const records = parseCSV(content);

            if (records.length === 0) {
                console.log(`   ⚠️  No records found`);
                continue;
            }

            let imported = 0;
            let failed = 0;

            for (const record of records) {
                try {
                    await pb.collection(collectionName).create(record);
                    imported++;
                } catch (error) {
                    failed++;
                    if (failed <= 3) {
                        console.log(`   ❌ Error: ${error.message}`);
                    }
                }
            }

            console.log(`   ✅ Imported: ${imported}, Failed: ${failed}`);
            totalImported += imported;
            totalFailed += failed;

        } catch (error) {
            console.log(`   ❌ Error reading file: ${error.message}`);
            totalSkipped++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Import Summary:`);
    console.log(`   Total Imported: ${totalImported}`);
    console.log(`   Total Failed: ${totalFailed}`);
    console.log(`   Files Skipped: ${totalSkipped}`);
    console.log('');
}

importData().catch(console.error);
