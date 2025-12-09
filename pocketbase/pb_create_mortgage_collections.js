/**
 * PocketBase Migration - Mortgage Collections (Enhanced with Terms)
 * PocketBase v0.23+ compatible - uses 'fields' format
 * 
 * Run this script to create the mortgage-related collections in PocketBase
 * 
 * Usage: node pb_create_mortgage_collections.js
 */

import PocketBase from 'pocketbase';

const PB_URL = 'http://127.0.0.1:8090';
const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

// Admin credentials
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'ivdeepak@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || '0702Toths001!@#';

// Helper functions for PocketBase v0.23+ field definitions
function textField(name, required = false) {
    return { type: 'text', name, required };
}

function numberField(name, required = false) {
    return { type: 'number', name, required };
}

function boolField(name, required = false) {
    return { type: 'bool', name, required };
}

function dateField(name, required = false) {
    return { type: 'date', name, required };
}

function selectField(name, values, required = false) {
    return { type: 'select', name, required, values };
}

function relationField(name, collectionId, required = false, cascadeDelete = false) {
    return { type: 'relation', name, required, collectionId, cascadeDelete, maxSelect: 1 };
}

async function createCollections() {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('   PocketBase Mortgage Collections Setup (v0.23+ format)');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`\nConnecting to PocketBase at ${PB_URL}...`);

    try {
        await pb.health.check();
        console.log('✓ Connected to PocketBase\n');
    } catch (error) {
        console.error('✗ Could not connect to PocketBase:', error.message);
        process.exit(1);
    }

    // Authenticate as admin
    try {
        await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✓ Authenticated as admin\n');
    } catch (error) {
        console.error('✗ Admin authentication failed:', error.message);
        process.exit(1);
    }

    const collectionIds = {};

    // =====================================================
    // 1. PROPERTIES COLLECTION
    // =====================================================
    console.log('📦 Creating collection: properties');
    try {
        const existing = await pb.collections.getOne('properties');
        console.log(`  ⚠ Already exists (id: ${existing.id})`);
        collectionIds['properties'] = existing.id;
    } catch (e) {
        try {
            const created = await pb.collections.create({
                name: 'properties',
                type: 'base',
                fields: [
                    textField('user_id', true),
                    textField('property_name', true),
                    selectField('property_type', ['primary_residence', 'rental', 'vacation', 'investment', 'commercial'], true),
                    textField('address', false),
                    dateField('purchase_date', true),
                    numberField('purchase_price', true),
                    numberField('down_payment', true),
                    numberField('land_transfer_tax', false),
                    numberField('legal_fees', false),
                    numberField('home_inspection', false),
                    numberField('appraisal_fee', false),
                    numberField('other_closing_costs', false),
                    numberField('current_market_value', false),
                    numberField('property_tax_annual', false),
                    boolField('is_primary_residence', false),
                    textField('notes', false),
                    textField('supabase_id', false)
                ],
                indexes: ['CREATE INDEX idx_properties_user_id ON properties (user_id)'],
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.id != ""',
                deleteRule: '@request.auth.id != ""'
            });
            collectionIds['properties'] = created.id;
            console.log(`  ✓ Created (id: ${created.id})`);
        } catch (err) {
            console.error(`  ✗ Failed:`, err.message);
            if (err.response?.data) console.error('    Details:', JSON.stringify(err.response.data));
        }
    }

    // =====================================================
    // 2. MORTGAGES COLLECTION
    // =====================================================
    console.log('\n📦 Creating collection: mortgages');
    try {
        const existing = await pb.collections.getOne('mortgages');
        console.log(`  ⚠ Already exists (id: ${existing.id})`);
        collectionIds['mortgages'] = existing.id;
    } catch (e) {
        try {
            const created = await pb.collections.create({
                name: 'mortgages',
                type: 'base',
                fields: [
                    textField('user_id', true),
                    relationField('property_id', collectionIds['properties'], true, false),
                    textField('mortgage_name', true),
                    selectField('mortgage_type', ['traditional', 'heloc', 'loc_mortgage', 'reverse', 'hybrid'], true),
                    numberField('original_loan_amount', true),
                    dateField('original_loan_date', true),
                    numberField('original_amortization_years', true),
                    numberField('current_balance', false),
                    textField('linked_account_id', false),
                    boolField('is_active', false),
                    textField('notes', false),
                    textField('supabase_id', false)
                ],
                indexes: [
                    'CREATE INDEX idx_mortgages_user_id ON mortgages (user_id)',
                    'CREATE INDEX idx_mortgages_property_id ON mortgages (property_id)'
                ],
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.id != ""',
                deleteRule: '@request.auth.id != ""'
            });
            collectionIds['mortgages'] = created.id;
            console.log(`  ✓ Created (id: ${created.id})`);
        } catch (err) {
            console.error(`  ✗ Failed:`, err.message);
            if (err.response?.data) console.error('    Details:', JSON.stringify(err.response.data));
        }
    }

    // =====================================================
    // 3. MORTGAGE_TERMS COLLECTION (Renewals/Refinances)
    // =====================================================
    console.log('\n📦 Creating collection: mortgage_terms');
    try {
        const existing = await pb.collections.getOne('mortgage_terms');
        console.log(`  ⚠ Already exists (id: ${existing.id})`);
        collectionIds['mortgage_terms'] = existing.id;
    } catch (e) {
        try {
            const created = await pb.collections.create({
                name: 'mortgage_terms',
                type: 'base',
                fields: [
                    textField('user_id', true),
                    relationField('mortgage_id', collectionIds['mortgages'], true, true),
                    numberField('term_number', true),
                    textField('lender', true),
                    numberField('interest_rate', true),
                    selectField('rate_type', ['fixed', 'variable', 'adjustable', 'prime_plus', 'prime_minus'], true),
                    numberField('prime_rate_offset', false),
                    numberField('term_years', true),
                    dateField('term_start_date', true),
                    dateField('term_end_date', false),
                    selectField('payment_frequency', ['weekly', 'bi_weekly', 'semi_monthly', 'monthly', 'accelerated_bi_weekly', 'accelerated_weekly'], true),
                    numberField('regular_payment_amount', true),
                    selectField('minimum_payment_type', ['principal_and_interest', 'interest_only', 'custom'], false),
                    numberField('balance_at_term_start', false),
                    numberField('balance_at_term_end', false),
                    boolField('is_current_term', false),
                    selectField('renewal_type', ['original', 'renewal', 'refinance', 'transfer'], false),
                    textField('notes', false),
                    textField('supabase_id', false)
                ],
                indexes: [
                    'CREATE INDEX idx_mortgage_terms_user_id ON mortgage_terms (user_id)',
                    'CREATE INDEX idx_mortgage_terms_mortgage_id ON mortgage_terms (mortgage_id)',
                    'CREATE INDEX idx_mortgage_terms_current ON mortgage_terms (is_current_term)'
                ],
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.id != ""',
                deleteRule: '@request.auth.id != ""'
            });
            collectionIds['mortgage_terms'] = created.id;
            console.log(`  ✓ Created (id: ${created.id})`);
        } catch (err) {
            console.error(`  ✗ Failed:`, err.message);
            if (err.response?.data) console.error('    Details:', JSON.stringify(err.response.data));
        }
    }

    // =====================================================
    // 4. MORTGAGE_PAYMENTS COLLECTION
    // =====================================================
    console.log('\n📦 Creating collection: mortgage_payments');
    try {
        const existing = await pb.collections.getOne('mortgage_payments');
        console.log(`  ⚠ Already exists (id: ${existing.id})`);
        collectionIds['mortgage_payments'] = existing.id;
    } catch (e) {
        try {
            const created = await pb.collections.create({
                name: 'mortgage_payments',
                type: 'base',
                fields: [
                    textField('user_id', true),
                    relationField('mortgage_id', collectionIds['mortgages'], true, true),
                    relationField('term_id', collectionIds['mortgage_terms'], false, false),
                    dateField('payment_date', true),
                    numberField('payment_amount', true),
                    numberField('principal_amount', true),
                    numberField('interest_amount', true),
                    numberField('extra_principal', false),
                    selectField('payment_type', ['regular', 'extra', 'lump_sum', 'prepayment', 'interest_only'], false),
                    numberField('balance_after_payment', false),
                    textField('source_transaction_id', false),
                    textField('notes', false),
                    textField('supabase_id', false)
                ],
                indexes: [
                    'CREATE INDEX idx_mortgage_payments_user_id ON mortgage_payments (user_id)',
                    'CREATE INDEX idx_mortgage_payments_mortgage_id ON mortgage_payments (mortgage_id)',
                    'CREATE INDEX idx_mortgage_payments_date ON mortgage_payments (payment_date)'
                ],
                listRule: '@request.auth.id != ""',
                viewRule: '@request.auth.id != ""',
                createRule: '@request.auth.id != ""',
                updateRule: '@request.auth.id != ""',
                deleteRule: '@request.auth.id != ""'
            });
            collectionIds['mortgage_payments'] = created.id;
            console.log(`  ✓ Created (id: ${created.id})`);
        } catch (err) {
            console.error(`  ✗ Failed:`, err.message);
            if (err.response?.data) console.error('    Details:', JSON.stringify(err.response.data));
        }
    }

    // Summary
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('   Setup Complete!');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('\nCollections created:');
    for (const [name, id] of Object.entries(collectionIds)) {
        console.log(`  ✓ ${name}: ${id}`);
    }
    console.log('\n✅ Mortgage tracking tables ready!');
}

createCollections().catch(console.error);
