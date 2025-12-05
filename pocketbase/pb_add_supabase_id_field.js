/**
 * Add supabase_id field to all PocketBase collections
 * 
 * This script adds a 'supabase_id' text field to each collection
 * to store the original Supabase UUID.
 * 
 * Usage: node pb_add_supabase_id_field.js
 */

import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

const ADMIN_EMAIL = 'ivdeepak@gmail.com';
const ADMIN_PASSWORD = '0702Toths001!@#';

// Collections that need supabase_id field
const COLLECTIONS = [
    'accounts',
    'ai_extraction_logs',
    'cash_transactions',
    'category',
    'chart_of_accounts',
    'column_mappings',
    'government_benefits',
    'holdings',
    'holding_snapshots',
    'import_raw_data',
    'import_staging',
    'investment_accounts',
    'investment_managers',
    'investment_transactions',
    'merchant',
    'merchant_split_rules',
    'profiles',
    'transactions',
    'transaction_split',
    'user_profile',
];

async function addSupabaseIdField() {
    console.log('\n🔧 Adding supabase_id field to PocketBase collections\n');
    console.log('='.repeat(60));

    // Authenticate
    try {
        await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated as admin\n');
    } catch (error) {
        console.error('❌ Authentication failed:', error.message);
        return;
    }

    for (const collectionName of COLLECTIONS) {
        try {
            // Get the collection schema
            const collection = await pb.collections.getOne(collectionName);

            // Check if supabase_id field already exists
            const hasSupabaseId = collection.fields?.some(f => f.name === 'supabase_id');

            if (hasSupabaseId) {
                console.log(`⏭️  ${collectionName}: supabase_id already exists`);
                continue;
            }

            // Add supabase_id field
            const newField = {
                name: 'supabase_id',
                type: 'text',
                required: false,
                system: false,
                hidden: false,
                presentable: false,
                min: 0,
                max: 0,
                pattern: ''
            };

            // Update collection with new field
            const updatedFields = [...(collection.fields || []), newField];

            await pb.collections.update(collectionName, {
                fields: updatedFields
            });

            console.log(`✅ ${collectionName}: supabase_id field added`);

        } catch (error) {
            console.log(`❌ ${collectionName}: ${error.message}`);
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log('Done!\n');
}

addSupabaseIdField().catch(console.error);
