/**
 * UUID to PocketBase ID Migration Script
 * 
 * This script converts all Supabase UUID references to PocketBase IDs.
 * Run this after exporting data from PocketBase with supabase_id fields.
 * 
 * Usage:
 * 1. Export collections from PocketBase Admin UI as JSON
 * 2. Place exports in ./pb_exports/ folder
 * 3. Run: node migrate_uuids_to_pb_ids.js
 * 4. Re-import the updated JSON files
 */

import PocketBase from 'pocketbase';
import fs from 'fs';

const PB_URL = 'http://127.0.0.1:8090';
const pb = new PocketBase(PB_URL);

// Disable auto-cancellation for batch operations
pb.autoCancellation(false);

/**
 * Tables that have supabase_id field (parent/lookup tables)
 */
const PARENT_TABLES = [
    'accounts',
    'investment_accounts',
    'investment_managers',
    'chart_of_accounts',
    'category',
    'merchant',
    'profiles',
    'transactions',
    'products'
];

/**
 * Tables with foreign key fields that need conversion
 * Format: { table: 'tableName', fields: [{ field: 'field_name', refTable: 'referenced_table' }] }
 */
const FK_MAPPINGS = [
    {
        table: 'transactions',
        fields: [
            { field: 'account_id', refTable: 'accounts' },
            { field: 'normalized_merchant_id', refTable: 'merchant' },
            { field: 'category_id', refTable: 'category' },
            { field: 'chart_of_account_id', refTable: 'chart_of_accounts' },
            { field: 'split_chart_of_account_id', refTable: 'chart_of_accounts' }
        ]
    },
    {
        table: 'transaction_split',
        fields: [
            { field: 'transaction_id', refTable: 'transactions' },
            { field: 'category_id', refTable: 'category' },
            { field: 'chart_of_account_id', refTable: 'chart_of_accounts' }
        ]
    },
    {
        table: 'merchant',
        fields: [
            { field: 'category_id', refTable: 'category' }
        ]
    },
    {
        table: 'holdings',
        fields: [
            { field: 'account_id', refTable: 'investment_accounts' }
        ]
    },
    {
        table: 'holding_snapshots',
        fields: [
            { field: 'account_id', refTable: 'investment_accounts' }
        ]
    },
    {
        table: 'investment_transactions',
        fields: [
            { field: 'account_id', refTable: 'investment_accounts' }
        ]
    },
    {
        table: 'cash_transactions',
        fields: [
            { field: 'account_id', refTable: 'investment_accounts' }
        ]
    },
    {
        table: 'investment_accounts',
        fields: [
            { field: 'manager_id', refTable: 'investment_managers' }
        ]
    },
    {
        table: 'chart_of_accounts',
        fields: [
            { field: 'parent_id', refTable: 'chart_of_accounts' }
        ]
    },
    {
        table: 'import_staging',
        fields: [
            { field: 'account_id', refTable: 'accounts' }
        ]
    }
];

/**
 * Build lookup maps from supabase_id -> pocketbase_id for all parent tables
 */
async function buildLookupMaps() {
    console.log('\n📚 Building lookup maps from supabase_id -> PocketBase ID...\n');

    const lookupMaps = {};

    for (const tableName of PARENT_TABLES) {
        try {
            const records = await pb.collection(tableName).getFullList({
                fields: 'id,supabase_id'
            });

            const map = {};
            for (const record of records) {
                if (record.supabase_id) {
                    map[record.supabase_id] = record.id;
                }
            }

            lookupMaps[tableName] = map;
            console.log(`  ✓ ${tableName}: ${Object.keys(map).length} mappings`);
        } catch (error) {
            console.log(`  ⚠ ${tableName}: ${error.message}`);
            lookupMaps[tableName] = {};
        }
    }

    return lookupMaps;
}

/**
 * Check if a value looks like a Supabase UUID (36 chars with dashes)
 */
function isSupabaseUUID(value) {
    if (!value || typeof value !== 'string') return false;
    // UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/**
 * Check if a value is already a PocketBase ID (15 alphanumeric chars)
 */
function isPocketBaseId(value) {
    if (!value || typeof value !== 'string') return false;
    return /^[a-z0-9]{15}$/i.test(value);
}

/**
 * Migrate a single table's foreign key references
 */
async function migrateTable(tableName, fields, lookupMaps) {
    console.log(`\n🔄 Migrating ${tableName}...`);

    let records;
    try {
        records = await pb.collection(tableName).getFullList();
    } catch (error) {
        console.log(`  ⚠ Could not fetch ${tableName}: ${error.message}`);
        return { updated: 0, skipped: 0, errors: 0 };
    }

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const record of records) {
        const updates = {};
        let needsUpdate = false;

        for (const { field, refTable } of fields) {
            const currentValue = record[field];

            // Skip if empty
            if (!currentValue) continue;

            // Skip if already a PocketBase ID
            if (isPocketBaseId(currentValue)) {
                continue;
            }

            // Check if it's a Supabase UUID that needs conversion
            if (isSupabaseUUID(currentValue)) {
                const lookupMap = lookupMaps[refTable];
                if (!lookupMap) {
                    console.log(`  ⚠ No lookup map for ${refTable}`);
                    continue;
                }

                const newId = lookupMap[currentValue];
                if (newId) {
                    updates[field] = newId;
                    needsUpdate = true;
                } else {
                    console.log(`  ⚠ ${tableName}.${field}: No PB ID found for UUID ${currentValue}`);
                }
            } else {
                // Might be an integer ID (like accounts.id = 3, 4, 5)
                // Try to find by supabase_id that might be the string version
                const lookupMap = lookupMaps[refTable];
                if (lookupMap && lookupMap[currentValue]) {
                    updates[field] = lookupMap[currentValue];
                    needsUpdate = true;
                }
            }
        }

        if (needsUpdate) {
            try {
                await pb.collection(tableName).update(record.id, updates);
                updated++;
                if (updated % 100 === 0) {
                    console.log(`  ... updated ${updated} records`);
                }
            } catch (error) {
                console.log(`  ✗ Error updating ${record.id}: ${error.message}`);
                errors++;
            }
        } else {
            skipped++;
        }
    }

    console.log(`  ✓ Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);
    return { updated, skipped, errors };
}

/**
 * Main migration function
 */
async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   UUID to PocketBase ID Migration');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\nConnecting to PocketBase at ${PB_URL}...`);

    try {
        // Test connection
        await pb.health.check();
        console.log('✓ Connected to PocketBase\n');
    } catch (error) {
        console.error('✗ Could not connect to PocketBase:', error.message);
        console.error('  Make sure PocketBase is running: ./pocketbase serve');
        process.exit(1);
    }

    // Build lookup maps
    const lookupMaps = await buildLookupMaps();

    // Show summary of mappings
    console.log('\n📊 Lookup Map Summary:');
    for (const [table, map] of Object.entries(lookupMaps)) {
        const count = Object.keys(map).length;
        if (count > 0) {
            console.log(`  ${table}: ${count} UUID->ID mappings`);
        }
    }

    // Migrate each table
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   Starting Migration');
    console.log('═══════════════════════════════════════════════════════════════');

    const totals = { updated: 0, skipped: 0, errors: 0 };

    for (const { table, fields } of FK_MAPPINGS) {
        const result = await migrateTable(table, fields, lookupMaps);
        totals.updated += result.updated;
        totals.skipped += result.skipped;
        totals.errors += result.errors;
    }

    // Final summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   Migration Complete!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\n  Total Updated: ${totals.updated}`);
    console.log(`  Total Skipped: ${totals.skipped}`);
    console.log(`  Total Errors:  ${totals.errors}`);

    if (totals.errors > 0) {
        console.log('\n⚠ Some records had errors. Check the log above for details.');
    }

    console.log('\n✅ You can now remove the supabase_id || id fallback code from your components!');
}

// Run the migration
main().catch(console.error);
