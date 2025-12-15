// Database Facade - Switches between PocketBase and Supabase based on VITE_DB_MODE
// Usage: Set VITE_DB_MODE=pocketbase or VITE_DB_MODE=supabase in .env.local
//
// Example .env.local:
//   VITE_DB_MODE=pocketbase  # For local/offline use
//   VITE_DB_MODE=supabase    # For cloud deployment

const DB_MODE = import.meta.env.VITE_DB_MODE || 'pocketbase';

console.log(`[Database] Running in ${DB_MODE.toUpperCase()} mode`);

// Dynamic imports based on mode
let dbModule;

if (DB_MODE === 'supabase') {
    dbModule = await import('./supabaseDatabase.js');
} else {
    dbModule = await import('./pocketbaseDatabase.js');
}

// ============ Core Database Services (Clean Names) ============
// Both pocketbaseDatabase and supabaseDatabase export supabase* aliases for compatibility
export const accountsDB = dbModule.supabaseAccountsDB;
export const transactionsDB = dbModule.supabaseTransactionsDB;
export const chartOfAccountsDB = dbModule.supabaseChartOfAccountsDB;
export const categoryDB = dbModule.supabaseCategoryDB;
export const merchantDB = dbModule.supabaseMerchantDB;
export const merchantSplitRulesDB = dbModule.supabaseMerchantSplitRulesDB;
export const transactionSplitDB = dbModule.supabaseTransactionSplitDB;

// ============ Investment Services ============
export const holdingsDB = dbModule.supabaseHoldingsDB;
export const holdingSnapshotsDB = dbModule.supabaseHoldingSnapshotsDB;
export const investmentAccountsDB = dbModule.supabaseInvestmentAccountsDB;
export const investmentManagersDB = dbModule.supabaseInvestmentManagersDB;
export const investmentTransactionsDB = dbModule.supabaseInvestmentTransactionsDB;
export const cashTransactionsDB = dbModule.supabaseCashTransactionsDB;

// ============ Property & Mortgage Services ============
export const propertiesDB = dbModule.supabasePropertiesDB;
export const mortgagesDB = dbModule.supabaseMortgagesDB;
export const mortgageTermsDB = dbModule.supabaseMortgageTermsDB;
export const mortgagePaymentsDB = dbModule.supabaseMortgagePaymentsDB;

// ============ Liabilities Services ============
export const liabilitiesDB = dbModule.supabaseLiabilitiesDB;

// ============ Import/Staging Services ============
export const importStagingDB = dbModule.supabaseImportStagingDB;
export const importRawDataDB = dbModule.supabaseImportRawDataDB;
export const columnMappingsDB = dbModule.supabaseColumnMappingsDB;

// ============ Rules & Configuration Services ============
export const descriptionRulesDB = dbModule.supabaseDescriptionRulesDB;

// ============ User/Profile Services ============
export const userProfileDB = dbModule.supabaseUserProfileDB;
export const governmentBenefitsDB = dbModule.supabaseGovernmentBenefitsDB;
export const profilesDB = dbModule.supabaseProfilesDB;
export const userPreferencesDB = dbModule.supabaseUserPreferencesDB;

// ============ Misc Services ============
export const aiExtractionLogsDB = dbModule.supabaseAIExtractionLogsDB;
export const providersDB = dbModule.supabaseProvidersDB;
export const budgetsDB = dbModule.supabaseBudgetsDB;
export const goalsDB = dbModule.supabaseGoalsDB;
export const productsDB = dbModule.supabaseProductsDB;
export const beliefTagsDB = dbModule.supabaseBeliefTagsDB;
export const subscriptionHistoryDB = dbModule.supabaseSubscriptionHistoryDB;
export const knowledgeDB = dbModule.supabaseKnowledgeDB;
export const settingsDB = dbModule.supabaseSettingsDB;
export const productMetadataDB = dbModule.supabaseProductMetadataDB;

// ============ Legacy Aliases (for backward compatibility) ============
// These allow gradual migration - can be removed once all files are updated
export const supabaseAccountsDB = accountsDB;
export const supabaseTransactionsDB = transactionsDB;
export const supabaseChartOfAccountsDB = chartOfAccountsDB;
export const supabaseCategoryDB = categoryDB;
export const supabaseMerchantDB = merchantDB;
export const supabaseMerchantSplitRulesDB = merchantSplitRulesDB;
export const supabaseTransactionSplitDB = transactionSplitDB;
export const supabaseHoldingsDB = holdingsDB;
export const supabaseHoldingSnapshotsDB = holdingSnapshotsDB;
export const supabaseInvestmentAccountsDB = investmentAccountsDB;
export const supabaseInvestmentManagersDB = investmentManagersDB;
export const supabaseInvestmentTransactionsDB = investmentTransactionsDB;
export const supabaseCashTransactionsDB = cashTransactionsDB;
export const supabaseImportStagingDB = importStagingDB;
export const supabaseImportRawDataDB = importRawDataDB;
export const supabaseColumnMappingsDB = columnMappingsDB;
export const supabaseDescriptionRulesDB = descriptionRulesDB;
export const supabaseUserProfileDB = userProfileDB;
export const supabaseGovernmentBenefitsDB = governmentBenefitsDB;
export const supabaseProfilesDB = profilesDB;
export const supabaseUserPreferencesDB = userPreferencesDB;
export const supabaseAIExtractionLogsDB = aiExtractionLogsDB;
export const supabaseProvidersDB = providersDB;
export const supabaseBudgetsDB = budgetsDB;
export const supabaseGoalsDB = goalsDB;
export const supabaseProductsDB = productsDB;
export const supabaseBeliefTagsDB = beliefTagsDB;
export const supabaseSubscriptionHistoryDB = subscriptionHistoryDB;
export const supabaseKnowledgeDB = knowledgeDB;
export const supabaseSettingsDB = settingsDB;
export const supabaseProductMetadataDB = productMetadataDB;

// ============ Mode Utilities ============
export const DB_MODE_CURRENT = DB_MODE;
export const isPocketBase = DB_MODE === 'pocketbase';
export const isSupabase = DB_MODE === 'supabase';

// ============ Auth/User Utilities ============
export const getDefaultUserId = dbModule.getDefaultUserId;
