/**
 * PocketBase Collection Setup Script
 * Creates all collections programmatically via API
 * Much more reliable than JSON import!
 */

const PocketBase = require('pocketbase').default;

const pb = new PocketBase('http://127.0.0.1:8090');

// Admin credentials - update these!
const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'your-admin-password';

async function createCollection(name, fields) {
    try {
        // Check if collection already exists
        try {
            await pb.collections.getOne(name);
            console.log(`⏭️  Collection '${name}' already exists, skipping...`);
            return;
        } catch (e) {
            // Collection doesn't exist, create it
        }

        const collection = await pb.collections.create({
            name: name,
            type: 'base',
            listRule: '',
            viewRule: '',
            createRule: '',
            updateRule: '',
            deleteRule: '',
            schema: fields
        });
        console.log(`✅ Created collection: ${name}`);
        return collection;
    } catch (error) {
        console.error(`❌ Error creating '${name}':`, error.message);
        if (error.response?.data) {
            console.error('   Details:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

async function setupCollections() {
    console.log('\n🚀 PocketBase Collection Setup\n');
    console.log('='.repeat(50));

    // Authenticate as admin
    try {
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated as admin\n');
    } catch (error) {
        console.error('❌ Admin authentication failed:', error.message);
        console.log('\n📝 Please update ADMIN_EMAIL and ADMIN_PASSWORD in this script');
        console.log('   Or create an admin at: http://127.0.0.1:8090/_/\n');
        return;
    }

    // Define collections
    const collections = [
        {
            name: 'currencies',
            fields: [
                { name: 'code', type: 'text', required: true },
                { name: 'name', type: 'text', required: true },
                { name: 'symbol', type: 'text', required: false }
            ]
        },
        {
            name: 'countries',
            fields: [
                { name: 'code', type: 'text', required: true },
                { name: 'name', type: 'text', required: true }
            ]
        },
        {
            name: 'chart_of_accounts',
            fields: [
                { name: 'code', type: 'text', required: true },
                { name: 'name', type: 'text', required: true },
                { name: 'type', type: 'text', required: true },
                { name: 'category', type: 'text', required: false },
                { name: 'subcategory', type: 'text', required: false },
                { name: 'description', type: 'text', required: false },
                { name: 'parent_id', type: 'text', required: false },
                { name: 'is_active', type: 'bool', required: false },
                { name: 'user_id', type: 'text', required: false }
            ]
        },
        {
            name: 'institutions',
            fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'type', type: 'text', required: false },
                { name: 'country_id', type: 'text', required: false },
                { name: 'website', type: 'url', required: false },
                { name: 'notes', type: 'text', required: false },
                { name: 'is_active', type: 'bool', required: false },
                { name: 'user_id', type: 'text', required: false }
            ]
        },
        {
            name: 'accounts',
            fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'account_number', type: 'text', required: false },
                { name: 'institution_id', type: 'text', required: false },
                { name: 'coa_id', type: 'text', required: false },
                { name: 'currency_id', type: 'text', required: false },
                { name: 'country_id', type: 'text', required: false },
                { name: 'opening_balance', type: 'number', required: false },
                { name: 'current_balance', type: 'number', required: false },
                { name: 'opening_date', type: 'date', required: false },
                { name: 'is_active', type: 'bool', required: false },
                { name: 'notes', type: 'text', required: false },
                { name: 'user_id', type: 'text', required: false }
            ]
        },
        {
            name: 'transactions',
            fields: [
                { name: 'transaction_date', type: 'date', required: true },
                { name: 'description', type: 'text', required: false },
                { name: 'amount', type: 'number', required: true },
                { name: 'account_id', type: 'text', required: false },
                { name: 'coa_id', type: 'text', required: false },
                { name: 'transaction_type', type: 'text', required: false },
                { name: 'reference', type: 'text', required: false },
                { name: 'notes', type: 'text', required: false },
                { name: 'is_reconciled', type: 'bool', required: false },
                { name: 'user_id', type: 'text', required: false }
            ]
        },
        {
            name: 'investments',
            fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'symbol', type: 'text', required: false },
                { name: 'investment_type', type: 'text', required: false },
                { name: 'account_id', type: 'text', required: false },
                { name: 'currency_id', type: 'text', required: false },
                { name: 'quantity', type: 'number', required: false },
                { name: 'cost_basis', type: 'number', required: false },
                { name: 'current_value', type: 'number', required: false },
                { name: 'purchase_date', type: 'date', required: false },
                { name: 'notes', type: 'text', required: false },
                { name: 'is_active', type: 'bool', required: false },
                { name: 'user_id', type: 'text', required: false }
            ]
        },
        {
            name: 'budgets',
            fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'start_date', type: 'date', required: false },
                { name: 'end_date', type: 'date', required: false },
                { name: 'is_active', type: 'bool', required: false },
                { name: 'notes', type: 'text', required: false },
                { name: 'user_id', type: 'text', required: false }
            ]
        },
        {
            name: 'tags',
            fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'color', type: 'text', required: false },
                { name: 'user_id', type: 'text', required: false }
            ]
        },
        {
            name: 'exchange_rates',
            fields: [
                { name: 'from_currency_id', type: 'text', required: true },
                { name: 'to_currency_id', type: 'text', required: true },
                { name: 'rate', type: 'number', required: true },
                { name: 'rate_date', type: 'date', required: false },
                { name: 'source', type: 'text', required: false }
            ]
        },
        {
            name: 'holdings',
            fields: [
                { name: 'name', type: 'text', required: true },
                { name: 'symbol', type: 'text', required: false },
                { name: 'investment_type', type: 'text', required: false },
                { name: 'sector', type: 'text', required: false },
                { name: 'geography', type: 'text', required: false },
                { name: 'exchange', type: 'text', required: false },
                { name: 'account_id', type: 'text', required: false },
                { name: 'account_type', type: 'text', required: false },
                { name: 'institution', type: 'text', required: false },
                { name: 'currency_id', type: 'text', required: false },
                { name: 'quantity', type: 'number', required: false },
                { name: 'average_cost_per_unit', type: 'number', required: false },
                { name: 'cost_basis', type: 'number', required: false },
                { name: 'current_price', type: 'number', required: false },
                { name: 'current_value', type: 'number', required: false },
                { name: 'purchase_date', type: 'date', required: false },
                { name: 'notes', type: 'text', required: false },
                { name: 'is_active', type: 'bool', required: false },
                { name: 'user_id', type: 'text', required: false }
            ]
        }
    ];

    // Create each collection
    for (const col of collections) {
        await createCollection(col.name, col.fields);
    }

    console.log('\n' + '='.repeat(50));
    console.log('✨ Setup complete!\n');
    console.log('📌 Next steps:');
    console.log('   1. Check collections at: http://127.0.0.1:8090/_/');
    console.log('   2. Run data import script');
    console.log('');
}

setupCollections().catch(console.error);
