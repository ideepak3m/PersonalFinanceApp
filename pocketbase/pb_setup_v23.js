/**
 * PocketBase Collection Setup Script - v0.23+ Compatible
 * Uses correct 'fields' format instead of deprecated 'schema'
 * 
 * Usage: node pb_setup_v23.js
 */

import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

const ADMIN_EMAIL = 'ivdeepak@gmail.com';
const ADMIN_PASSWORD = '0702Toths001!@#';

// Helper to create field definitions for PocketBase v0.23+
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

function emailField(name, required = false) {
    return { type: 'email', name, required };
}

function urlField(name, required = false) {
    return { type: 'url', name, required };
}

function jsonField(name, required = false) {
    return { type: 'json', name, required };
}

async function createCollections() {
    console.log('\n🚀 PocketBase Collection Setup (v0.23+ format)\n');
    console.log('='.repeat(60));

    try {
        await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated as admin\n');
    } catch (error) {
        console.error('❌ Auth failed:', error.message);
        return;
    }

    const collections = [
        // 1. Accounts
        {
            name: 'accounts',
            fields: [
                textField('user_id'),
                textField('country', true),
                textField('account_category', true),
                textField('provider_id'),
                textField('account_number'),
                textField('name', true),
                textField('currency'),
                numberField('balance'),
                textField('institution'),
                textField('type'),
            ]
        },

        // 2. Providers
        {
            name: 'providers',
            fields: [
                textField('user_id'),
                textField('name', true),
                textField('country', true),
                textField('type', true),
            ]
        },

        // 3. Chart of Accounts
        {
            name: 'chart_of_accounts',
            fields: [
                textField('user_id', true),
                textField('code', true),
                textField('name', true),
                textField('account_type', true),
                textField('description'),
                boolField('is_active'),
            ]
        },

        // 4. Transactions
        {
            name: 'transactions',
            fields: [
                textField('user_id'),
                dateField('date', true),
                textField('raw_merchant_name', true),
                textField('normalized_merchant_id'),
                numberField('amount', true),
                textField('currency', true),
                boolField('is_split'),
                textField('notes'),
                textField('category_id'),
                textField('description'),
                textField('memo'),
                textField('type'),
                textField('account_id'),
                textField('chart_of_account_id'),
                textField('split_chart_of_account_id'),
                textField('product_id'),
                textField('status'),
            ]
        },

        // 5. Cash Transactions
        {
            name: 'cash_transactions',
            fields: [
                textField('account_id'),
                dateField('transaction_date', true),
                textField('description', true),
                textField('transaction_type', true),
                numberField('debit'),
                numberField('credit'),
                numberField('balance'),
                textField('currency'),
            ]
        },

        // 6. Transaction Split
        {
            name: 'transaction_split',
            fields: [
                textField('transaction_id'),
                textField('category_id'),
                numberField('amount', true),
                numberField('percentage'),
                textField('belief_tag'),
                textField('chart_of_account_id'),
                textField('description'),
                textField('user_id'),
            ]
        },

        // 7. Holdings
        {
            name: 'holdings',
            fields: [
                textField('user_id'),
                textField('account_id'),
                textField('symbol', true),
                textField('security_name', true),
                numberField('units', true),
                numberField('price', true),
                numberField('market_value', true),
                numberField('book_value'),
                numberField('gain_loss'),
                dateField('as_of_date', true),
                textField('currency'),
                textField('asset_type'),
                textField('category'),
                textField('sub_category'),
                textField('investment_type'),
                textField('sector'),
                textField('geography'),
                textField('exchange'),
                numberField('average_cost_per_unit'),
                textField('account_type'),
                textField('institution'),
            ]
        },

        // 8. Holding Snapshots
        {
            name: 'holding_snapshots',
            fields: [
                textField('user_id'),
                textField('account_id'),
                textField('symbol', true),
                textField('security_name'),
                dateField('snapshot_date', true),
                numberField('units', true),
                numberField('unit_price', true),
                numberField('market_value', true),
                numberField('book_cost'),
                numberField('unrealized_gain_loss'),
                numberField('gain_loss_percentage'),
                numberField('units_change'),
                numberField('value_change'),
                textField('source'),
            ]
        },

        // 9. Investment Accounts
        {
            name: 'investment_accounts',
            fields: [
                textField('user_id'),
                textField('account_number', true),
                textField('account_type', true),
                textField('institution', true),
                textField('currency'),
                numberField('opening_balance'),
                numberField('closing_balance'),
                dateField('statement_date'),
                textField('statement_period'),
                textField('manager_id'),
                textField('display_name'),
            ]
        },

        // 10. Investment Transactions
        {
            name: 'investment_transactions',
            fields: [
                textField('account_id'),
                dateField('transaction_date', true),
                textField('symbol'),
                textField('security_name'),
                textField('transaction_type', true),
                numberField('units'),
                numberField('price'),
                numberField('amount', true),
                numberField('fees'),
                textField('currency'),
                textField('description'),
            ]
        },

        // 11. Investment Managers
        {
            name: 'investment_managers',
            fields: [
                textField('user_id'),
                textField('name', true),
                textField('manager_type'),
                textField('description'),
                urlField('website'),
                textField('contact_name'),
                emailField('contact_email'),
                textField('contact_phone'),
            ]
        },

        // 12. Budgets
        {
            name: 'budgets',
            fields: [
                textField('user_id'),
                textField('category', true),
                numberField('amount', true),
                numberField('month', true),
                numberField('year', true),
            ]
        },

        // 13. Goals
        {
            name: 'goals',
            fields: [
                textField('user_id'),
                textField('name', true),
                numberField('target_amount', true),
                numberField('current_amount'),
                dateField('deadline'),
            ]
        },

        // 14. Merchant
        {
            name: 'merchant',
            fields: [
                textField('user_id'),
                textField('normalized_name', true),
                textField('category_id'),
                jsonField('aliases'),
                boolField('is_big_box_store'),
            ]
        },

        // 15. Merchant Split Rules
        {
            name: 'merchant_split_rules',
            fields: [
                textField('merchant_friendly_name', true),
                jsonField('splits', true),
            ]
        },

        // 16. Category
        {
            name: 'category',
            fields: [
                textField('name', true),
                textField('description'),
                boolField('is_split_enabled'),
            ]
        },

        // 17. Belief Tags
        {
            name: 'belief_tags',
            fields: [
                textField('name', true),
                textField('description'),
                textField('category_id'),
            ]
        },

        // 18. Profiles
        {
            name: 'profiles',
            fields: [
                emailField('email'),
                textField('full_name'),
                textField('role'),
            ]
        },

        // 19. User Profile
        {
            name: 'user_profile',
            fields: [
                textField('user_id', true),
                dateField('date_of_birth'),
                textField('province'),
                textField('country'),
                textField('marital_status'),
                dateField('spouse_date_of_birth'),
                textField('employment_status'),
                numberField('current_annual_income'),
                numberField('spouse_annual_income'),
                numberField('expected_retirement_age'),
                numberField('desired_retirement_income'),
                numberField('life_expectancy'),
                numberField('marginal_tax_rate'),
                numberField('average_tax_rate'),
                numberField('rrsp_contribution_room'),
                numberField('rrsp_unused_room'),
                numberField('tfsa_contribution_room'),
                textField('risk_tolerance'),
                textField('preferred_currency'),
            ]
        },

        // 20. User Preferences
        {
            name: 'user_preferences',
            fields: [
                textField('user_id', true),
                textField('merchant_id', true),
                jsonField('preferred_split_json'),
                boolField('auto_tag_enabled'),
            ]
        },

        // 21. Government Benefits
        {
            name: 'government_benefits',
            fields: [
                textField('user_id', true),
                numberField('cpp_estimated_at_65'),
                dateField('cpp_statement_date'),
                numberField('cpp_contributions_to_date'),
                numberField('cpp_years_contributed'),
                numberField('cpp_at_60'),
                numberField('cpp_at_65'),
                numberField('cpp_at_70'),
                numberField('cpp_planned_start_age'),
                numberField('oas_estimated_monthly'),
                numberField('oas_years_in_canada'),
                numberField('oas_eligible_age'),
                numberField('oas_planned_start_age'),
                numberField('oas_clawback_threshold'),
                boolField('gis_eligible'),
                numberField('gis_estimated_monthly'),
                boolField('has_employer_pension'),
                textField('pension_type'),
                textField('pension_employer'),
                numberField('pension_years_of_service'),
                numberField('pension_multiplier'),
                numberField('pension_best_average_salary'),
                numberField('pension_estimated_monthly'),
                numberField('pension_earliest_age'),
                numberField('pension_normal_age'),
                numberField('pension_current_value'),
                numberField('spouse_cpp_at_65'),
                numberField('spouse_oas_estimated'),
                numberField('spouse_pension_estimated'),
                dateField('last_updated'),
            ]
        },

        // 22. Products
        {
            name: 'products',
            fields: [
                textField('user_id'),
                textField('account_id'),
                textField('product_type', true),
                textField('product_name', true),
                textField('product_code'),
                numberField('quantity'),
                numberField('purchase_price'),
                numberField('current_price'),
                dateField('purchase_date'),
                dateField('maturity_date'),
            ]
        },

        // 23. Product Metadata
        {
            name: 'product_metadata',
            fields: [
                textField('user_id'),
                textField('product_id'),
                textField('key', true),
                textField('value'),
            ]
        },

        // 24. Subscriptions
        {
            name: 'subscriptions',
            fields: [
                textField('user_id', true),
                textField('merchant_id', true),
                textField('friendly_name', true),
                numberField('amount', true),
                textField('currency'),
                textField('frequency', true),
                dateField('next_billing_date'),
                dateField('last_billing_date'),
                numberField('billing_day_of_month'),
                boolField('is_active'),
                dateField('activated_at'),
                dateField('deactivated_at'),
                textField('description'),
                numberField('reminder_days_before'),
                boolField('auto_renew'),
            ]
        },

        // 25. Subscription History
        {
            name: 'subscription_history',
            fields: [
                textField('subscription_id', true),
                textField('user_id', true),
                textField('action', true),
                dateField('action_date'),
                textField('reason'),
                textField('notes'),
                textField('old_value'),
                textField('new_value'),
            ]
        },

        // 26. Description Rules
        {
            name: 'description_rules',
            fields: [
                textField('user_id'),
                textField('description_pattern', true),
                textField('chart_of_account', true),
            ]
        },

        // 27. Column Mappings
        {
            name: 'column_mappings',
            fields: [
                textField('user_id'),
                textField('account_id'),
                textField('file_type', true),
                textField('name', true),
                jsonField('mapping_config', true),
            ]
        },

        // 28. Import Staging
        {
            name: 'import_staging',
            fields: [
                textField('user_id'),
                textField('account_id'),
                textField('file_name', true),
                textField('file_type', true),
                jsonField('column_names'),
                numberField('row_count'),
                textField('status'),
                textField('mapping_id'),
                textField('error_message'),
                dateField('uploaded_at'),
                dateField('imported_at'),
            ]
        },

        // 29. Import Raw Data
        {
            name: 'import_raw_data',
            fields: [
                textField('staging_id', true),
                jsonField('raw_data', true),
            ]
        },

        // 30. Tax Withholdings
        {
            name: 'tax_withholdings',
            fields: [
                textField('account_id'),
                textField('transaction_id'),
                dateField('withholding_date', true),
                textField('symbol'),
                numberField('withholding_amount', true),
                textField('country', true),
                textField('income_type', true),
                textField('currency'),
            ]
        },

        // 31. AI Extraction Logs
        {
            name: 'ai_extraction_logs',
            fields: [
                textField('user_id'),
                textField('filename', true),
                numberField('file_size'),
                dateField('extraction_timestamp', true),
                textField('model_used', true),
                numberField('prompt_tokens'),
                numberField('completion_tokens'),
                numberField('total_tokens'),
                jsonField('extraction_data', true),
            ]
        },
    ];

    let created = 0, failed = 0;

    for (const col of collections) {
        try {
            await pb.collections.create({
                name: col.name,
                type: 'base',
                listRule: '',
                viewRule: '',
                createRule: '',
                updateRule: '',
                deleteRule: '',
                fields: col.fields,
            });
            console.log(`✅ ${col.name} (${col.fields.length} fields)`);
            created++;
        } catch (error) {
            console.error(`❌ ${col.name}: ${error.message}`);
            failed++;
        }
    }

    console.log('\n' + '='.repeat(60));
    console.log(`📊 Created: ${created}, Failed: ${failed}`);
    console.log('\n📌 Next: Run pb_import_data.js to import CSV data');
}

createCollections().catch(console.error);
