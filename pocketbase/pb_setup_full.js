/**
 * PocketBase Collection Setup Script
 * Based on actual Supabase personal_finance schema
 * 
 * Usage: 
 *   1. Update ADMIN_EMAIL and ADMIN_PASSWORD below
 *   2. Run: node pb_setup_full.js
 */

import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

// ============================================
// UPDATE THESE WITH YOUR ADMIN CREDENTIALS!
// ============================================
const ADMIN_EMAIL = 'ivdeepak@gmail.com';
const ADMIN_PASSWORD = '0702Toths001!@#';
// ============================================

async function createCollections() {
    console.log('\n🚀 PocketBase Collection Setup (from Supabase Schema)\n');
    console.log('='.repeat(60));

    // Authenticate as admin (PocketBase v0.23+ uses collection-based auth)
    try {
        await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated as admin\n');
    } catch (error) {
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
        // ============================================
        // CORE TABLES
        // ============================================

        // 1. Accounts
        {
            name: 'accounts',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'country', type: 'text', required: true },
                { name: 'account_category', type: 'text', required: true },
                { name: 'provider_id', type: 'text', required: false },
                { name: 'account_number', type: 'text', required: false },
                { name: 'name', type: 'text', required: true },
                { name: 'currency', type: 'text', required: false },
                { name: 'balance', type: 'number', required: false },
                { name: 'institution', type: 'text', required: false },
                { name: 'type', type: 'text', required: false }
            ]
        },

        // 2. Providers (Institutions)
        {
            name: 'providers',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'name', type: 'text', required: true },
                { name: 'country', type: 'text', required: true },
                { name: 'type', type: 'text', required: true }
            ]
        },

        // 3. Chart of Accounts
        {
            name: 'chart_of_accounts',
            schema: [
                { name: 'user_id', type: 'text', required: true },
                { name: 'code', type: 'text', required: true },
                { name: 'name', type: 'text', required: true },
                { name: 'account_type', type: 'text', required: true },
                { name: 'description', type: 'text', required: false },
                { name: 'is_active', type: 'bool', required: false }
            ]
        },

        // 4. Transactions
        {
            name: 'transactions',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'date', type: 'date', required: true },
                { name: 'raw_merchant_name', type: 'text', required: true },
                { name: 'normalized_merchant_id', type: 'text', required: false },
                { name: 'amount', type: 'number', required: true },
                { name: 'currency', type: 'text', required: true },
                { name: 'is_split', type: 'bool', required: false },
                { name: 'notes', type: 'text', required: false },
                { name: 'category_id', type: 'text', required: false },
                { name: 'description', type: 'text', required: false },
                { name: 'memo', type: 'text', required: false },
                { name: 'type', type: 'text', required: false },
                { name: 'account_id', type: 'text', required: false },
                { name: 'chart_of_account_id', type: 'text', required: false },
                { name: 'split_chart_of_account_id', type: 'text', required: false },
                { name: 'product_id', type: 'text', required: false },
                { name: 'status', type: 'text', required: false }
            ]
        },

        // 5. Cash Transactions
        {
            name: 'cash_transactions',
            schema: [
                { name: 'account_id', type: 'text', required: false },
                { name: 'transaction_date', type: 'date', required: true },
                { name: 'description', type: 'text', required: true },
                { name: 'transaction_type', type: 'text', required: true },
                { name: 'debit', type: 'number', required: false },
                { name: 'credit', type: 'number', required: false },
                { name: 'balance', type: 'number', required: false },
                { name: 'currency', type: 'text', required: false }
            ]
        },

        // 6. Transaction Splits
        {
            name: 'transaction_split',
            schema: [
                { name: 'transaction_id', type: 'text', required: false },
                { name: 'category_id', type: 'text', required: false },
                { name: 'amount', type: 'number', required: true },
                { name: 'percentage', type: 'number', required: false },
                { name: 'belief_tag', type: 'text', required: false },
                { name: 'chart_of_account_id', type: 'text', required: false },
                { name: 'description', type: 'text', required: false },
                { name: 'user_id', type: 'text', required: false }
            ]
        },

        // ============================================
        // INVESTMENT TABLES
        // ============================================

        // 7. Holdings
        {
            name: 'holdings',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'account_id', type: 'text', required: false },
                { name: 'symbol', type: 'text', required: true },
                { name: 'security_name', type: 'text', required: true },
                { name: 'units', type: 'number', required: true },
                { name: 'price', type: 'number', required: true },
                { name: 'market_value', type: 'number', required: true },
                { name: 'book_value', type: 'number', required: false },
                { name: 'gain_loss', type: 'number', required: false },
                { name: 'as_of_date', type: 'date', required: true },
                { name: 'currency', type: 'text', required: false },
                { name: 'asset_type', type: 'text', required: false },
                { name: 'category', type: 'text', required: false },
                { name: 'sub_category', type: 'text', required: false },
                { name: 'investment_type', type: 'text', required: false },
                { name: 'sector', type: 'text', required: false },
                { name: 'geography', type: 'text', required: false },
                { name: 'exchange', type: 'text', required: false },
                { name: 'average_cost_per_unit', type: 'number', required: false },
                { name: 'account_type', type: 'text', required: false },
                { name: 'institution', type: 'text', required: false }
            ]
        },

        // 8. Holding Snapshots
        {
            name: 'holding_snapshots',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'account_id', type: 'text', required: false },
                { name: 'symbol', type: 'text', required: true },
                { name: 'security_name', type: 'text', required: false },
                { name: 'snapshot_date', type: 'date', required: true },
                { name: 'units', type: 'number', required: true },
                { name: 'unit_price', type: 'number', required: true },
                { name: 'market_value', type: 'number', required: true },
                { name: 'book_cost', type: 'number', required: false },
                { name: 'unrealized_gain_loss', type: 'number', required: false },
                { name: 'gain_loss_percentage', type: 'number', required: false },
                { name: 'units_change', type: 'number', required: false },
                { name: 'value_change', type: 'number', required: false },
                { name: 'source', type: 'text', required: false }
            ]
        },

        // 9. Investment Accounts
        {
            name: 'investment_accounts',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'account_number', type: 'text', required: true },
                { name: 'account_type', type: 'text', required: true },
                { name: 'institution', type: 'text', required: true },
                { name: 'currency', type: 'text', required: false },
                { name: 'opening_balance', type: 'number', required: false },
                { name: 'closing_balance', type: 'number', required: false },
                { name: 'statement_date', type: 'date', required: false },
                { name: 'statement_period', type: 'text', required: false },
                { name: 'manager_id', type: 'text', required: false },
                { name: 'display_name', type: 'text', required: false }
            ]
        },

        // 10. Investment Transactions
        {
            name: 'investment_transactions',
            schema: [
                { name: 'account_id', type: 'text', required: false },
                { name: 'transaction_date', type: 'date', required: true },
                { name: 'symbol', type: 'text', required: false },
                { name: 'security_name', type: 'text', required: false },
                { name: 'transaction_type', type: 'text', required: true },
                { name: 'units', type: 'number', required: false },
                { name: 'price', type: 'number', required: false },
                { name: 'amount', type: 'number', required: true },
                { name: 'fees', type: 'number', required: false },
                { name: 'currency', type: 'text', required: false },
                { name: 'description', type: 'text', required: false }
            ]
        },

        // 11. Investment Managers
        {
            name: 'investment_managers',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'name', type: 'text', required: true },
                { name: 'manager_type', type: 'text', required: false },
                { name: 'description', type: 'text', required: false },
                { name: 'website', type: 'url', required: false },
                { name: 'contact_name', type: 'text', required: false },
                { name: 'contact_email', type: 'email', required: false },
                { name: 'contact_phone', type: 'text', required: false }
            ]
        },

        // ============================================
        // BUDGETS & GOALS
        // ============================================

        // 12. Budgets
        {
            name: 'budgets',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'category', type: 'text', required: true },
                { name: 'amount', type: 'number', required: true },
                { name: 'month', type: 'number', required: true },
                { name: 'year', type: 'number', required: true }
            ]
        },

        // 13. Goals
        {
            name: 'goals',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'name', type: 'text', required: true },
                { name: 'target_amount', type: 'number', required: true },
                { name: 'current_amount', type: 'number', required: false },
                { name: 'deadline', type: 'date', required: false }
            ]
        },

        // ============================================
        // MERCHANTS & CATEGORIES
        // ============================================

        // 14. Merchant
        {
            name: 'merchant',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'normalized_name', type: 'text', required: true },
                { name: 'category_id', type: 'text', required: false },
                { name: 'aliases', type: 'json', required: false },
                { name: 'is_big_box_store', type: 'bool', required: false }
            ]
        },

        // 15. Merchant Split Rules
        {
            name: 'merchant_split_rules',
            schema: [
                { name: 'merchant_friendly_name', type: 'text', required: true },
                { name: 'splits', type: 'json', required: true }
            ]
        },

        // 16. Category
        {
            name: 'category',
            schema: [
                { name: 'name', type: 'text', required: true },
                { name: 'description', type: 'text', required: false },
                { name: 'is_split_enabled', type: 'bool', required: false }
            ]
        },

        // 17. Belief Tags
        {
            name: 'belief_tags',
            schema: [
                { name: 'name', type: 'text', required: true },
                { name: 'description', type: 'text', required: false },
                { name: 'category_id', type: 'text', required: false }
            ]
        },

        // ============================================
        // USER & PROFILE
        // ============================================

        // 18. Profiles
        {
            name: 'profiles',
            schema: [
                { name: 'email', type: 'email', required: false },
                { name: 'full_name', type: 'text', required: false },
                { name: 'role', type: 'text', required: false }
            ]
        },

        // 19. User Profile (detailed)
        {
            name: 'user_profile',
            schema: [
                { name: 'user_id', type: 'text', required: true },
                { name: 'date_of_birth', type: 'date', required: false },
                { name: 'province', type: 'text', required: false },
                { name: 'country', type: 'text', required: false },
                { name: 'marital_status', type: 'text', required: false },
                { name: 'spouse_date_of_birth', type: 'date', required: false },
                { name: 'employment_status', type: 'text', required: false },
                { name: 'current_annual_income', type: 'number', required: false },
                { name: 'spouse_annual_income', type: 'number', required: false },
                { name: 'expected_retirement_age', type: 'number', required: false },
                { name: 'desired_retirement_income', type: 'number', required: false },
                { name: 'life_expectancy', type: 'number', required: false },
                { name: 'marginal_tax_rate', type: 'number', required: false },
                { name: 'average_tax_rate', type: 'number', required: false },
                { name: 'rrsp_contribution_room', type: 'number', required: false },
                { name: 'rrsp_unused_room', type: 'number', required: false },
                { name: 'tfsa_contribution_room', type: 'number', required: false },
                { name: 'risk_tolerance', type: 'text', required: false },
                { name: 'preferred_currency', type: 'text', required: false }
            ]
        },

        // 20. User Preferences
        {
            name: 'user_preferences',
            schema: [
                { name: 'user_id', type: 'text', required: true },
                { name: 'merchant_id', type: 'text', required: true },
                { name: 'preferred_split_json', type: 'json', required: false },
                { name: 'auto_tag_enabled', type: 'bool', required: false }
            ]
        },

        // ============================================
        // GOVERNMENT BENEFITS (Canadian)
        // ============================================

        // 21. Government Benefits
        {
            name: 'government_benefits',
            schema: [
                { name: 'user_id', type: 'text', required: true },
                { name: 'cpp_estimated_at_65', type: 'number', required: false },
                { name: 'cpp_statement_date', type: 'date', required: false },
                { name: 'cpp_contributions_to_date', type: 'number', required: false },
                { name: 'cpp_years_contributed', type: 'number', required: false },
                { name: 'cpp_at_60', type: 'number', required: false },
                { name: 'cpp_at_65', type: 'number', required: false },
                { name: 'cpp_at_70', type: 'number', required: false },
                { name: 'cpp_planned_start_age', type: 'number', required: false },
                { name: 'oas_estimated_monthly', type: 'number', required: false },
                { name: 'oas_years_in_canada', type: 'number', required: false },
                { name: 'oas_eligible_age', type: 'number', required: false },
                { name: 'oas_planned_start_age', type: 'number', required: false },
                { name: 'oas_clawback_threshold', type: 'number', required: false },
                { name: 'gis_eligible', type: 'bool', required: false },
                { name: 'gis_estimated_monthly', type: 'number', required: false },
                { name: 'has_employer_pension', type: 'bool', required: false },
                { name: 'pension_type', type: 'text', required: false },
                { name: 'pension_employer', type: 'text', required: false },
                { name: 'pension_years_of_service', type: 'number', required: false },
                { name: 'pension_multiplier', type: 'number', required: false },
                { name: 'pension_best_average_salary', type: 'number', required: false },
                { name: 'pension_estimated_monthly', type: 'number', required: false },
                { name: 'pension_earliest_age', type: 'number', required: false },
                { name: 'pension_normal_age', type: 'number', required: false },
                { name: 'pension_current_value', type: 'number', required: false },
                { name: 'spouse_cpp_at_65', type: 'number', required: false },
                { name: 'spouse_oas_estimated', type: 'number', required: false },
                { name: 'spouse_pension_estimated', type: 'number', required: false },
                { name: 'last_updated', type: 'date', required: false }
            ]
        },

        // ============================================
        // PRODUCTS & SUBSCRIPTIONS
        // ============================================

        // 22. Products
        {
            name: 'products',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'account_id', type: 'text', required: false },
                { name: 'product_type', type: 'text', required: true },
                { name: 'product_name', type: 'text', required: true },
                { name: 'product_code', type: 'text', required: false },
                { name: 'quantity', type: 'number', required: false },
                { name: 'purchase_price', type: 'number', required: false },
                { name: 'current_price', type: 'number', required: false },
                { name: 'purchase_date', type: 'date', required: false },
                { name: 'maturity_date', type: 'date', required: false }
            ]
        },

        // 23. Product Metadata
        {
            name: 'product_metadata',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'product_id', type: 'text', required: false },
                { name: 'key', type: 'text', required: true },
                { name: 'value', type: 'text', required: false }
            ]
        },

        // 24. Subscriptions
        {
            name: 'subscriptions',
            schema: [
                { name: 'user_id', type: 'text', required: true },
                { name: 'merchant_id', type: 'text', required: true },
                { name: 'friendly_name', type: 'text', required: true },
                { name: 'amount', type: 'number', required: true },
                { name: 'currency', type: 'text', required: false },
                { name: 'frequency', type: 'text', required: true },
                { name: 'next_billing_date', type: 'date', required: false },
                { name: 'last_billing_date', type: 'date', required: false },
                { name: 'billing_day_of_month', type: 'number', required: false },
                { name: 'is_active', type: 'bool', required: false },
                { name: 'activated_at', type: 'date', required: false },
                { name: 'deactivated_at', type: 'date', required: false },
                { name: 'description', type: 'text', required: false },
                { name: 'reminder_days_before', type: 'number', required: false },
                { name: 'auto_renew', type: 'bool', required: false }
            ]
        },

        // 25. Subscription History
        {
            name: 'subscription_history',
            schema: [
                { name: 'subscription_id', type: 'text', required: true },
                { name: 'user_id', type: 'text', required: true },
                { name: 'action', type: 'text', required: true },
                { name: 'action_date', type: 'date', required: false },
                { name: 'reason', type: 'text', required: false },
                { name: 'notes', type: 'text', required: false },
                { name: 'old_value', type: 'text', required: false },
                { name: 'new_value', type: 'text', required: false }
            ]
        },

        // ============================================
        // IMPORT & MAPPING TABLES
        // ============================================

        // 26. Description Rules
        {
            name: 'description_rules',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'description_pattern', type: 'text', required: true },
                { name: 'chart_of_account', type: 'text', required: true }
            ]
        },

        // 27. Column Mappings
        {
            name: 'column_mappings',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'account_id', type: 'text', required: false },
                { name: 'file_type', type: 'text', required: true },
                { name: 'name', type: 'text', required: true },
                { name: 'mapping_config', type: 'json', required: true }
            ]
        },

        // 28. Import Staging
        {
            name: 'import_staging',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'account_id', type: 'text', required: false },
                { name: 'file_name', type: 'text', required: true },
                { name: 'file_type', type: 'text', required: true },
                { name: 'column_names', type: 'json', required: false },
                { name: 'row_count', type: 'number', required: false },
                { name: 'status', type: 'text', required: false },
                { name: 'mapping_id', type: 'text', required: false },
                { name: 'error_message', type: 'text', required: false },
                { name: 'uploaded_at', type: 'date', required: false },
                { name: 'imported_at', type: 'date', required: false }
            ]
        },

        // 29. Import Raw Data
        {
            name: 'import_raw_data',
            schema: [
                { name: 'staging_id', type: 'text', required: true },
                { name: 'raw_data', type: 'json', required: true }
            ]
        },

        // ============================================
        // TAX & MISC
        // ============================================

        // 30. Tax Withholdings
        {
            name: 'tax_withholdings',
            schema: [
                { name: 'account_id', type: 'text', required: false },
                { name: 'transaction_id', type: 'text', required: false },
                { name: 'withholding_date', type: 'date', required: true },
                { name: 'symbol', type: 'text', required: false },
                { name: 'withholding_amount', type: 'number', required: true },
                { name: 'country', type: 'text', required: true },
                { name: 'income_type', type: 'text', required: true },
                { name: 'currency', type: 'text', required: false }
            ]
        },

        // 31. AI Extraction Logs
        {
            name: 'ai_extraction_logs',
            schema: [
                { name: 'user_id', type: 'text', required: false },
                { name: 'filename', type: 'text', required: true },
                { name: 'file_size', type: 'number', required: false },
                { name: 'extraction_timestamp', type: 'date', required: true },
                { name: 'model_used', type: 'text', required: true },
                { name: 'prompt_tokens', type: 'number', required: false },
                { name: 'completion_tokens', type: 'number', required: false },
                { name: 'total_tokens', type: 'number', required: false },
                { name: 'extraction_data', type: 'json', required: true }
            ]
        }
    ];

    // Create each collection
    let created = 0;
    let skipped = 0;
    let failed = 0;

    for (const col of collections) {
        try {
            // Check if collection already exists
            try {
                await pb.collections.getOne(col.name);
                console.log(`⏭️  '${col.name}' already exists`);
                skipped++;
                continue;
            } catch (e) {
                // Collection doesn't exist, create it
            }

            await pb.collections.create({
                name: col.name,
                type: 'base',
                listRule: '',      // Allow all (empty string = public for single user)
                viewRule: '',
                createRule: '',
                updateRule: '',
                deleteRule: '',
                schema: col.schema
            });
            console.log(`✅ Created: ${col.name}`);
            created++;
        } catch (error) {
            console.error(`❌ Failed: ${col.name} - ${error.message}`);
            failed++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`\n📊 Summary: ${created} created, ${skipped} skipped, ${failed} failed`);
    console.log('\n📌 Next steps:');
    console.log('   1. Check collections at: http://127.0.0.1:8090/_/');
    console.log('   2. Import your CSV data');
    console.log('');
}

createCollections().catch(console.error);
