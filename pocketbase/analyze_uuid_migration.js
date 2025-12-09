/**
 * UUID Migration Analysis Script
 * 
 * This script analyzes the data to show what needs to be converted
 * WITHOUT making any changes. Run this first to see the scope.
 * 
 * Usage: node analyze_uuid_migration.js
 */

import PocketBase from 'pocketbase';

const PB_URL = 'http://127.0.0.1:8090';
const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

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

function isSupabaseUUID(value) {
    if (!value || typeof value !== 'string') return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function isPocketBaseId(value) {
    if (!value || typeof value !== 'string') return false;
    return /^[a-z0-9]{15}$/i.test(value);
}

async function buildLookupMaps() {
    console.log('\n📚 Building lookup maps...\n');
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
            lookupMaps[tableName] = {};
        }
    }

    return lookupMaps;
}

async function analyzeTable(tableName, fields, lookupMaps) {
    console.log(`\n📋 Analyzing ${tableName}...`);

    let records;
    try {
        records = await pb.collection(tableName).getFullList();
    } catch (error) {
        console.log(`  ⚠ Could not fetch: ${error.message}`);
        return;
    }

    const analysis = {};
    for (const { field, refTable } of fields) {
        analysis[field] = {
            total: 0,
            empty: 0,
            alreadyPbId: 0,
            needsConversion: 0,
            canConvert: 0,
            cannotConvert: 0,
            samples: []
        };
    }

    for (const record of records) {
        for (const { field, refTable } of fields) {
            const stats = analysis[field];
            const value = record[field];
            stats.total++;

            if (!value) {
                stats.empty++;
            } else if (isPocketBaseId(value)) {
                stats.alreadyPbId++;
            } else if (isSupabaseUUID(value)) {
                stats.needsConversion++;
                const lookupMap = lookupMaps[refTable];
                if (lookupMap && lookupMap[value]) {
                    stats.canConvert++;
                } else {
                    stats.cannotConvert++;
                    if (stats.samples.length < 3) {
                        stats.samples.push(value);
                    }
                }
            } else {
                // Check if it's some other format (like integer string)
                const lookupMap = lookupMaps[refTable];
                if (lookupMap && lookupMap[value]) {
                    stats.needsConversion++;
                    stats.canConvert++;
                } else {
                    stats.needsConversion++;
                    stats.cannotConvert++;
                    if (stats.samples.length < 3) {
                        stats.samples.push(`${value} (non-UUID)`);
                    }
                }
            }
        }
    }

    // Print results
    for (const { field, refTable } of fields) {
        const stats = analysis[field];
        console.log(`\n  ${field} → ${refTable}:`);
        console.log(`    Total records: ${stats.total}`);
        console.log(`    Empty/null: ${stats.empty}`);
        console.log(`    Already PocketBase ID: ${stats.alreadyPbId}`);
        console.log(`    Needs conversion: ${stats.needsConversion}`);
        if (stats.needsConversion > 0) {
            console.log(`      ✓ Can convert: ${stats.canConvert}`);
            console.log(`      ✗ Cannot convert (no mapping): ${stats.cannotConvert}`);
            if (stats.samples.length > 0) {
                console.log(`      Sample unmapped values: ${stats.samples.join(', ')}`);
            }
        }
    }

    return analysis;
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   UUID Migration Analysis');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\nConnecting to PocketBase at ${PB_URL}...`);

    try {
        await pb.health.check();
        console.log('✓ Connected\n');
    } catch (error) {
        console.error('✗ Could not connect:', error.message);
        process.exit(1);
    }

    const lookupMaps = await buildLookupMaps();

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   Analysis Results');
    console.log('═══════════════════════════════════════════════════════════════');

    let totalNeedsConversion = 0;
    let totalCanConvert = 0;
    let totalCannotConvert = 0;

    for (const { table, fields } of FK_MAPPINGS) {
        await analyzeTable(table, fields, lookupMaps);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   Summary');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nIf all looks good, run: node migrate_uuids_to_pb_ids.js');
}

main().catch(console.error);
