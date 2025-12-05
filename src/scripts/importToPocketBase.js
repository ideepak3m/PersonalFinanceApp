/**
 * PocketBase Data Import Script
 * 
 * This script imports CSV data exported from Supabase into PocketBase.
 * Run this after creating your admin account in PocketBase.
 * 
 * Usage:
 * 1. Start PocketBase: cd pocketbase && ./pocketbase.exe serve
 * 2. Create admin account at http://127.0.0.1:8090/_/
 * 3. Import collections from pb_schema.json in the PocketBase Admin UI
 * 4. Run this script: node --experimental-modules src/scripts/importToPocketBase.js
 */

import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const POCKETBASE_URL = 'http://127.0.0.1:8090';
const CSV_DIR = './src/db/supabase_personal_finance';

// Admin credentials (set these after creating admin account)
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'your-password-here';

const pb = new PocketBase(POCKETBASE_URL);

// Map CSV files to collection names
const CSV_TO_COLLECTION = {
    'accounts_rows (1).csv': 'accounts',
    'transactions_rows.csv': 'transactions',
    'chart_of_accounts_rows (1).csv': 'chart_of_accounts',
    'category_rows (1).csv': 'category',
    'merchant_rows (1).csv': 'merchant',
    'merchant_split_rules_rows.csv': 'merchant_split_rules',
    'transaction_split_rows.csv': 'transaction_split',
    'holdings_rows.csv': 'holdings',
    'holding_snapshots_rows.csv': 'holding_snapshots',
    'investment_accounts_rows.csv': 'investment_accounts',
    'investment_managers_rows.csv': 'investment_managers',
    'investment_transactions_rows.csv': 'investment_transactions',
    'cash_transactions_rows.csv': 'cash_transactions',
    'import_staging_rows.csv': 'import_staging',
    'import_raw_data_rows.csv': 'import_raw_data',
    'column_mappings_rows.csv': 'column_mappings',
    'user_profile_rows.csv': 'user_profile',
    'government_benefits_rows.csv': 'government_benefits',
    'profiles_rows (2).csv': 'profiles',
    'ai_extraction_logs_rows.csv': 'ai_extraction_logs',
};

// Fields to rename (Supabase field -> PocketBase field)
const FIELD_RENAMES = {
    'id': 'supabase_id',
    'inserted_at': 'created',
    'created_at': 'created',
    'updated_at': 'updated',
};

// Parse CSV value
function parseValue(value, fieldName) {
    if (value === '' || value === null || value === undefined || value === 'null') {
        return null;
    }

    // Handle JSON fields
    if (fieldName === 'aliases' || fieldName === 'splits' ||
        fieldName === 'column_names' || fieldName === 'raw_data' ||
        fieldName === 'mapping_config' || fieldName === 'extraction_data') {
        try {
            return JSON.parse(value);
        } catch {
            return value;
        }
    }

    // Handle boolean
    if (value === 'true' || value === 't') return true;
    if (value === 'false' || value === 'f') return false;

    return value;
}

// Transform row for PocketBase
function transformRow(row) {
    const transformed = {};

    for (const [key, value] of Object.entries(row)) {
        let newKey = FIELD_RENAMES[key] || key;
        transformed[newKey] = parseValue(value, newKey);
    }

    return transformed;
}

// Import a CSV file to a collection
async function importCSV(csvFile, collectionName) {
    const csvPath = path.join(CSV_DIR, csvFile);

    if (!fs.existsSync(csvPath)) {
        console.log(`⚠️  Skipping ${csvFile} - file not found`);
        return { imported: 0, errors: 0 };
    }

    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
    });

    console.log(`📦 Importing ${records.length} records to ${collectionName}...`);

    let imported = 0;
    let errors = 0;

    for (const record of records) {
        try {
            const data = transformRow(record);
            await pb.collection(collectionName).create(data);
            imported++;
        } catch (error) {
            errors++;
            if (errors <= 3) {
                console.error(`   Error: ${error.message}`);
            }
        }
    }

    console.log(`   ✓ Imported: ${imported}, Errors: ${errors}`);
    return { imported, errors };
}

// Main import function
async function runImport() {
    console.log('🚀 Starting PocketBase Data Import\n');

    // Authenticate as admin
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✓ Authenticated as admin\n');
    } catch (error) {
        console.error('❌ Failed to authenticate. Please check credentials.');
        console.error('   Make sure to update ADMIN_EMAIL and ADMIN_PASSWORD in this script.');
        process.exit(1);
    }

    const results = {
        totalImported: 0,
        totalErrors: 0,
        collections: [],
    };

    // Import in order (to handle dependencies)
    const importOrder = [
        'category_rows (1).csv',
        'profiles_rows (2).csv',
        'accounts_rows (1).csv',
        'chart_of_accounts_rows (1).csv',
        'merchant_rows (1).csv',
        'merchant_split_rules_rows.csv',
        'investment_managers_rows.csv',
        'investment_accounts_rows.csv',
        'column_mappings_rows.csv',
        'user_profile_rows.csv',
        'government_benefits_rows.csv',
        'transactions_rows.csv',
        'transaction_split_rows.csv',
        'holdings_rows.csv',
        'holding_snapshots_rows.csv',
        'investment_transactions_rows.csv',
        'cash_transactions_rows.csv',
        'import_staging_rows.csv',
        'import_raw_data_rows.csv',
        'ai_extraction_logs_rows.csv',
    ];

    for (const csvFile of importOrder) {
        const collectionName = CSV_TO_COLLECTION[csvFile];
        if (collectionName) {
            const result = await importCSV(csvFile, collectionName);
            results.totalImported += result.imported;
            results.totalErrors += result.errors;
            results.collections.push({ collection: collectionName, ...result });
        }
    }

    console.log('\n========================================');
    console.log('📊 Import Summary');
    console.log('========================================');
    console.log(`Total Records Imported: ${results.totalImported}`);
    console.log(`Total Errors: ${results.totalErrors}`);
    console.log('\n✅ Import complete!');
}

// Run the import
runImport().catch(console.error);
