/**
 * PocketBase Collection Setup Script
 * Creates all collections programmatically via API
 * 
 * Usage: 
 *   1. Update ADMIN_EMAIL and ADMIN_PASSWORD below
 *   2. Run: node pb_setup.js
 */

const PocketBase = require('pocketbase').default;

const pb = new PocketBase('http://127.0.0.1:8090');

// ============================================
// UPDATE THESE WITH YOUR ADMIN CREDENTIALS!
// ============================================
const ADMIN_EMAIL = 'ivdeepak@gmail.com';
const ADMIN_PASSWORD = '0702Toths001!@#';
// ============================================

async function createCollections() {
    console.log('\n🚀 PocketBase Collection Setup\n');
    console.log('='.repeat(50));

    // Authenticate as admin (PocketBase v0.23+ uses collection-based auth)
    try {
        // Try new v0.23+ method first
        await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated as admin\n');
    } catch (error) {
        // Fallback to old method
        try {
            await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
            console.log('✅ Authenticated as admin (legacy)\n');
        } catch (e) {
            console.error('❌ Admin authentication failed:', error.message);
            console.log('\n📝 Please update ADMIN_EMAIL and ADMIN_PASSWORD in this script');
            console.log('   Or create an admin at: http://127.0.0.1:8090/_/\n');
            return;
        }
    }

    const collections = [
        // 1. Currencies
        {
            name: 'currencies',
            schema: [
                { name: 'code', type: 'text', required: true },
                { name: 'name', type: 'text', required: true },
                { name: 'symbol', type: 'text', required: false }
            ]
        },

        // 2. Countries
        {
            name: 'countries',
            schema: [
                { name: 'code', type: 'text', required: true },
                { name: 'name', type: 'text', required: true }
            ]
        },

        // 3. Chart of Accounts
        {
            name: 'chart_of_accounts',
            schema: [
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

        // 4. Institutions
        {
            name: 'institutions',
            schema: [
                { name: 'name', type: 'text', required: true },
                { name: 'type', type: 'text', required: false },
                { name: 'country_id', type: 'text', required: false },
                { name: 'website', type: 'url', required: false },
                { name: 'notes', type: 'text', required: false },
                { name: 'is_active', type: 'bool', required: false },
                { name: 'user_id', type: 'text', required: false }
            ]
        },

        // 5. Accounts
        {
            name: 'accounts',
            schema: [
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

        // 6. Transactions
        {
            name: 'transactions',
            schema: [
                { name: 'transaction_date', type: 'date', required: true },
                { name: 'description', type: 'text', required: false },
                { name: 'amount', type: 'number', required: true },
                { name: 'account_id', type: 'text', required: true },
                { name: 'coa_id', type: 'text', required: false },
                { name: 'transaction_type', type: 'text', required: false },
                { name: 'reference', type: 'text', required: false },
                { name: 'notes', type: 'text', required: false },
                { name: 'is_reconciled', type: 'bool', required: false },
                { name: 'user_id', type: 'text', required: false }
            ]
        },

        // 7. Investment Holdings (main holdings table)
        {
            name: 'holdings',
            schema: [
                { name: 'symbol', type: 'text', required: false },
                { name: 'name', type: 'text', required: true },
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
        },

        // 8. Holding Snapshots (for historical tracking)
        {
            name: 'holding_snapshots',
            schema: [
                { name: 'holding_id', type: 'text', required: false },
                { name: 'account_id', type: 'text', required: true },
                { name: 'symbol', type: 'text', required: true },
                { name: 'investment_type', type: 'text', required: false },
                { name: 'snapshot_date', type: 'date', required: true },
                { name: 'units', type: 'number', required: true },
                { name: 'unit_price', type: 'number', required: true },
                { name: 'market_value', type: 'number', required: true },
                { name: 'book_cost', type: 'number', required: false },
                { name: 'unrealized_gain_loss', type: 'number', required: false },
                { name: 'gain_loss_percentage', type: 'number', required: false }
            ]
        },

        // 9. Budgets
        {
            name: 'budgets',
            schema: [
                { name: 'name', type: 'text', required: true },
                { name: 'start_date', type: 'date', required: false },
                { name: 'end_date', type: 'date', required: false },
                { name: 'is_active', type: 'bool', required: false },
                { name: 'notes', type: 'text', required: false },
                { name: 'user_id', type: 'text', required: false }
            ]
        },

        // 10. Tags
        {
            name: 'tags',
            schema: [
                { name: 'name', type: 'text', required: true },
                { name: 'color', type: 'text', required: false },
                { name: 'user_id', type: 'text', required: false }
            ]
        },

        // 11. Exchange Rates
        {
            name: 'exchange_rates',
            schema: [
                { name: 'from_currency_id', type: 'text', required: true },
                { name: 'to_currency_id', type: 'text', required: true },
                { name: 'rate', type: 'number', required: true },
                { name: 'rate_date', type: 'date', required: true },
                { name: 'source', type: 'text', required: false }
            ]
        },

        // 12. User Profile
        {
            name: 'user_profile',
            schema: [
                { name: 'user_id', type: 'text', required: true },
                { name: 'display_name', type: 'text', required: false },
                { name: 'default_currency_id', type: 'text', required: false },
                { name: 'default_country_id', type: 'text', required: false },
                { name: 'date_format', type: 'text', required: false },
                { name: 'timezone', type: 'text', required: false }
            ]
        }
    ];

    // Create each collection
    for (const col of collections) {
        try {
            // Check if collection already exists
            try {
                await pb.collections.getOne(col.name);
                console.log(`⏭️  '${col.name}' already exists, skipping...`);
                continue;
            } catch (e) {
                // Collection doesn't exist, create it
            }

            await pb.collections.create({
                name: col.name,
                type: 'base',
                listRule: '',      // Allow all (empty string = public)
                viewRule: '',
                createRule: '',
                updateRule: '',
                deleteRule: '',
                schema: col.schema
            });
            console.log(`✅ Created: ${col.name}`);
        } catch (error) {
            console.error(`❌ Error creating '${col.name}':`, error.message);
            if (error.response?.data) {
                console.error('   Details:', JSON.stringify(error.response.data, null, 2));
            }
        }
    }

    console.log('\n' + '='.repeat(50));
    console.log('✨ Setup complete!\n');
    console.log('📌 Next steps:');
    console.log('   1. Check collections at: http://127.0.0.1:8090/_/');
    console.log('   2. Import your data');
    console.log('');
}

createCollections().catch(console.error);
