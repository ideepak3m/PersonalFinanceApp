// Investment Data Service Facade - Switches between PocketBase and Supabase based on VITE_DB_MODE

const DB_MODE = import.meta.env.VITE_DB_MODE || 'pocketbase';

let investmentModule;

if (DB_MODE === 'supabase') {
    investmentModule = await import('./supabaseInvestmentDataService.js');
} else {
    investmentModule = await import('./pocketbaseInvestmentDataService.js');
}

// Re-export all functions from the selected module
export const getInvestmentManagers = investmentModule.getInvestmentManagers;
export const createInvestmentManager = investmentModule.createInvestmentManager;
export const saveAccountInfo = investmentModule.saveAccountInfo;
export const saveHoldings = investmentModule.saveHoldings;
export const saveCashTransactions = investmentModule.saveCashTransactions;
export const saveInvestmentTransactions = investmentModule.saveInvestmentTransactions;
export const saveCompleteExtraction = investmentModule.saveCompleteExtraction;
export const getInvestmentAccounts = investmentModule.getInvestmentAccounts;
export const getLastTransactionDates = investmentModule.getLastTransactionDates;
export const getLastHoldingsDates = investmentModule.getLastHoldingsDates;
export const getLatestMarketValues = investmentModule.getLatestMarketValues;
export const getHoldingsForAccount = investmentModule.getHoldingsForAccount;
export const getCashTransactionsForAccount = investmentModule.getCashTransactionsForAccount;
export const getInvestmentTransactionsForAccount = investmentModule.getInvestmentTransactionsForAccount;
export const findAccountByNumber = investmentModule.findAccountByNumber;
export const updateInvestmentAccount = investmentModule.updateInvestmentAccount;
