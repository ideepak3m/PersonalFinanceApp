/**
 * PocketBase Investment Data Service
 * Migrated from Supabase to PocketBase
 */

import {
    supabaseInvestmentManagersDB,
    supabaseInvestmentAccountsDB,
    supabaseHoldingsDB,
    supabaseCashTransactionsDB,
    supabaseInvestmentTransactionsDB,
    getDefaultUserId
} from './pocketbaseDatabase';

// Helper function to format date string properly without timezone shift
const formatDateString = (dateStr) => {
    if (!dateStr) return null;

    // If already in YYYY-MM-DD format, return as-is
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
    }

    // Parse the date and format it manually to avoid timezone issues
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return null;

    // Use UTC methods to avoid timezone shift
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

// =====================================================
// INVESTMENT MANAGERS
// =====================================================

// Get all investment managers for the current user
export const getInvestmentManagers = async () => {
    try {
        const managers = await supabaseInvestmentManagersDB.getAll();
        // Sort by name
        const sorted = (managers || []).sort((a, b) =>
            (a.name || '').localeCompare(b.name || '')
        );
        return { success: true, managers: sorted };
    } catch (error) {
        console.error('❌ Error fetching investment managers:', error);
        return { success: false, error: error.message, managers: [] };
    }
};

// Create a new investment manager
export const createInvestmentManager = async (managerData) => {
    try {
        const userId = await getDefaultUserId();
        if (!userId) throw new Error('User not authenticated');

        const data = await supabaseInvestmentManagersDB.add({
            user_id: userId,
            name: managerData.name,
            manager_type: managerData.managerType || 'Advisor',
            description: managerData.description || null,
            website: managerData.website || null,
            contact_name: managerData.contactName || null,
            contact_email: managerData.contactEmail || null,
            contact_phone: managerData.contactPhone || null
        });

        console.log('✅ Investment manager created:', data);
        return { success: true, manager: data };
    } catch (error) {
        console.error('❌ Error creating investment manager:', error);
        return { success: false, error: error.message };
    }
};

// =====================================================
// INVESTMENT ACCOUNTS
// =====================================================

// Save or update account info
export const saveAccountInfo = async (accountInfo) => {
    try {
        const userId = await getDefaultUserId();
        if (!userId) throw new Error('User not authenticated');

        // Check if account already exists
        const allAccounts = await supabaseInvestmentAccountsDB.getAll();
        const existing = (allAccounts || []).find(a =>
            a.account_number === accountInfo.accountNumber &&
            a.institution === accountInfo.institution
        );

        const accountData = {
            user_id: userId,
            account_number: accountInfo.accountNumber,
            account_type: accountInfo.accountType,
            institution: accountInfo.institution,
            currency: accountInfo.currency || 'CAD',
            opening_balance: parseFloat(accountInfo.openingBalance) || null,
            closing_balance: parseFloat(accountInfo.closingBalance) || null,
            statement_date: accountInfo.statementDate || null,
            display_name: accountInfo.displayName || null,
            manager_id: accountInfo.managerId || null
        };

        let data;
        if (existing) {
            data = await supabaseInvestmentAccountsDB.update(existing.id, accountData);
        } else {
            data = await supabaseInvestmentAccountsDB.add(accountData);
        }

        console.log('✅ Account info saved:', data);
        return { success: true, accountId: data.id, account: data };
    } catch (error) {
        console.error('❌ Error saving account info:', error);
        return { success: false, error: error.message };
    }
};

// Save holdings (replaces existing for this account/date)
export const saveHoldings = async (accountId, holdingsRows, asOfDate, accountInfo = {}) => {
    try {
        const userId = await getDefaultUserId();
        if (!userId) throw new Error('User not authenticated');

        // Delete existing holdings for this account and date
        const existingHoldings = await supabaseHoldingsDB.getAll();
        const toDelete = (existingHoldings || []).filter(h =>
            h.account_id === accountId && h.as_of_date === asOfDate
        );
        for (const h of toDelete) {
            await supabaseHoldingsDB.delete(h.id);
        }

        // Prepare and insert holdings data
        const savedHoldings = [];
        for (const row of holdingsRows) {
            const units = parseFloat(row.Units || row.units || row['Units/Shares'] || 0);
            const bookValue = parseFloat(row['Book Value'] || row.bookValue || row['Book Val'] || row.bookCost || 0) || null;

            const holdingData = {
                account_id: accountId,
                user_id: userId,
                symbol: row.Symbol || row.symbol || '',
                security_name: row['Security Name'] || row.securityName || row.name || '',
                asset_type: row.assetType || row.asset_type || null,
                category: row.category || null,
                sub_category: row.subCategory || row.sub_category || null,
                units: units,
                price: parseFloat(row.Price || row.price || 0),
                market_value: parseFloat(row['Market Value'] || row.marketValue || row['Market Val'] || row.value || 0),
                book_value: bookValue,
                gain_loss: parseFloat(row['Gain/Loss'] || row.gainLoss || row['Gain Loss'] || 0) || null,
                as_of_date: asOfDate,
                currency: row.Currency || row.currency || 'CAD',
                investment_type: row.investmentType || row.investment_type || null,
                sector: row.sector || null,
                geography: row.geography || null,
                exchange: row.exchange || null,
                average_cost_per_unit: (bookValue && units) ? (bookValue / units) : null,
                account_type: accountInfo.accountType || accountInfo.account_type || null,
                institution: accountInfo.institution || null
            };

            const saved = await supabaseHoldingsDB.add(holdingData);
            savedHoldings.push(saved);
        }

        console.log(`✅ ${savedHoldings.length} holdings saved with user_id and new classification fields`);
        return { success: true, count: savedHoldings.length, holdings: savedHoldings };
    } catch (error) {
        console.error('❌ Error saving holdings:', error);
        return { success: false, error: error.message };
    }
};

// Save cash transactions
export const saveCashTransactions = async (accountId, transactionRows) => {
    try {
        // Filter and validate dates
        const validRows = transactionRows.filter(row => {
            const dateStr = row.Date || row.date;
            if (!dateStr) return false;
            if (/Q\d|quarter/i.test(dateStr)) return false;
            const date = new Date(dateStr);
            return !isNaN(date.getTime());
        });

        if (validRows.length === 0) {
            console.log('⚠️ No valid cash transactions to save (all dates invalid)');
            return { success: true, count: 0, transactions: [] };
        }

        // Get existing transactions to check for duplicates
        const existingTxns = await supabaseCashTransactionsDB.getAll();
        const existingSet = new Set(
            (existingTxns || []).filter(t => t.account_id === accountId).map(t =>
                `${t.transaction_date}|${t.description}|${t.debit}|${t.credit}`
            )
        );

        const savedTransactions = [];
        for (const row of validRows) {
            const txnData = {
                account_id: accountId,
                transaction_date: formatDateString(row.Date || row.date),
                description: row.Description || row['Item Description'] || row.description || '',
                transaction_type: classifyTransactionType(row.Description || row['Item Description'] || ''),
                debit: parseFloat(row.Debit || row.debit || 0),
                credit: parseFloat(row.Credit || row.credit || 0),
                balance: parseFloat(row.Balance || row.balance || 0) || null,
                currency: row.Currency || row.currency || 'CAD'
            };

            const key = `${txnData.transaction_date}|${txnData.description}|${txnData.debit}|${txnData.credit}`;
            if (!existingSet.has(key)) {
                const saved = await supabaseCashTransactionsDB.add(txnData);
                savedTransactions.push(saved);
                existingSet.add(key);
            }
        }

        console.log(`✅ ${savedTransactions.length} cash transactions saved`);
        return { success: true, count: savedTransactions.length, transactions: savedTransactions };
    } catch (error) {
        console.error('❌ Error saving cash transactions:', error);
        return { success: false, error: error.message };
    }
};

// Save investment transactions
export const saveInvestmentTransactions = async (accountId, transactionRows) => {
    try {
        // Filter and validate dates
        const validRows = transactionRows.filter(row => {
            const dateStr = row.Date || row.date;
            if (!dateStr) return false;
            if (/Q\d|quarter/i.test(dateStr)) return false;
            const date = new Date(dateStr);
            return !isNaN(date.getTime());
        });

        if (validRows.length === 0) {
            console.log('⚠️ No valid investment transactions to save (all dates invalid)');
            return { success: true, count: 0, transactions: [] };
        }

        // Get existing transactions to check for duplicates
        const existingTxns = await supabaseInvestmentTransactionsDB.getAll();
        const existingSet = new Set(
            (existingTxns || []).filter(t => t.account_id === accountId).map(t =>
                `${t.transaction_date}|${t.symbol || ''}|${t.transaction_type}|${t.units || ''}|${t.amount}`
            )
        );

        const savedTransactions = [];
        for (const row of validRows) {
            const txnData = {
                account_id: accountId,
                transaction_date: formatDateString(row.Date || row.date),
                symbol: row.Symbol || row.symbol || null,
                security_name: row['Security Name'] || row.securityName || row.Description || row.description || '',
                transaction_type: row['Transaction Type'] || row.transactionType || classifyInvestmentType(row.Description || row.description || ''),
                units: parseFloat(row.Units || row.units || row['Units/Shares'] || row.Shares || 0) || null,
                price: parseFloat(row.Price || row.price || 0) || null,
                amount: parseFloat(row.Amount || row.amount || row['Gross Amt.'] || row['Gross Amt'] || 0),
                fees: parseFloat(row.Fees || row.fees || 0),
                currency: row.Currency || row.currency || 'CAD',
                description: row.Description || row['Item Description'] || row.description || ''
            };

            const key = `${txnData.transaction_date}|${txnData.symbol || ''}|${txnData.transaction_type}|${txnData.units || ''}|${txnData.amount}`;
            if (!existingSet.has(key)) {
                const saved = await supabaseInvestmentTransactionsDB.add(txnData);
                savedTransactions.push(saved);
                existingSet.add(key);
            }
        }

        console.log(`✅ ${savedTransactions.length} investment transactions saved (${validRows.length - savedTransactions.length} duplicates skipped)`);
        return { success: true, count: savedTransactions.length, transactions: savedTransactions };
    } catch (error) {
        console.error('❌ Error saving investment transactions:', error);
        return { success: false, error: error.message };
    }
};

// Save complete extraction (orchestrates all saves)
export const saveCompleteExtraction = async (accountInfo, tables) => {
    try {
        const results = {
            account: null,
            holdings: null,
            cashTransactions: null,
            investmentTransactions: null,
            errors: []
        };

        // 1. Save account info first
        const accountResult = await saveAccountInfo(accountInfo);
        if (!accountResult.success) {
            throw new Error(`Failed to save account: ${accountResult.error}`);
        }
        results.account = accountResult;
        const accountId = accountResult.accountId;

        // 2. Save each table type
        for (const table of tables) {
            const dataType = table.dataType;
            const rows = table.rows;

            if (rows.length === 0) {
                console.log(`⚠️ Skipping empty table: ${table.name}`);
                continue;
            }

            switch (dataType) {
                case 'holdings':
                    const holdingsResult = await saveHoldings(
                        accountId,
                        rows,
                        accountInfo.statementDate || new Date().toISOString().split('T')[0],
                        {
                            accountType: accountInfo.accountType || accountInfo.account_type,
                            institution: accountInfo.institution
                        }
                    );
                    results.holdings = holdingsResult;
                    if (!holdingsResult.success) {
                        results.errors.push(`Holdings: ${holdingsResult.error}`);
                    }
                    break;

                case 'fees':
                    const feeRows = rows.map(row => ({
                        Date: row.date || row.Date,
                        Description: row.description || row.Description || 'Fee',
                        Debit: parseFloat(row.amount || row.Amount || row.debit || row.Debit || 0),
                        Credit: 0,
                        Balance: null
                    }));
                    const feesResult = await saveCashTransactions(accountId, feeRows);
                    if (!results.cashTransactions) {
                        results.cashTransactions = feesResult;
                    } else if (feesResult.success) {
                        results.cashTransactions.count = (results.cashTransactions.count || 0) + feesResult.count;
                    }
                    if (!feesResult.success) {
                        results.errors.push(`Fees: ${feesResult.error}`);
                    }
                    break;

                case 'cashTransactions':
                    const cashResult = await saveCashTransactions(accountId, rows);
                    results.cashTransactions = cashResult;
                    if (!cashResult.success) {
                        results.errors.push(`Cash Transactions: ${cashResult.error}`);
                    }
                    break;

                case 'investmentTransactions':
                    const invResult = await saveInvestmentTransactions(accountId, rows);
                    results.investmentTransactions = invResult;
                    if (!invResult.success) {
                        results.errors.push(`Investment Transactions: ${invResult.error}`);
                    }
                    break;

                default:
                    console.log(`⚠️ Unknown dataType: ${dataType}, skipping`);
            }
        }

        const success = results.errors.length === 0;
        console.log(success ? '✅ All data saved successfully!' : '⚠️ Some data saved with errors');

        return {
            success,
            results,
            message: success
                ? `Successfully imported data to account ${accountInfo.accountNumber}`
                : `Imported with ${results.errors.length} error(s)`
        };
    } catch (error) {
        console.error('❌ Error saving complete extraction:', error);
        return {
            success: false,
            error: error.message,
            message: `Failed to save data: ${error.message}`
        };
    }
};

// Helper: Classify transaction type from description
const classifyTransactionType = (description) => {
    const desc = description.toLowerCase();
    if (desc.includes('fee') || desc.includes('hst')) return 'Fee';
    if (desc.includes('purchase')) return 'Purchase';
    if (desc.includes('transfer-in')) return 'Transfer In';
    if (desc.includes('transfer-out')) return 'Transfer Out';
    if (desc.includes('deposit')) return 'Deposit';
    if (desc.includes('withdrawal')) return 'Withdrawal';
    return 'Other';
};

const classifyInvestmentType = (description) => {
    const desc = description.toLowerCase();
    if (desc.includes('interest') && !desc.includes('sale')) return 'Dividend Reinvestment';
    if (desc.includes('dividend') && desc.includes('reinvest')) return 'Dividend Reinvestment';
    if (desc.includes('dividend')) return 'Dividend Payment';
    if (desc.includes('buy') || desc.includes('purchase')) return 'Buy';
    if (desc.includes('sell') || desc.includes('sale')) return 'Sell';
    if (desc.includes('transfer-in')) return 'Transfer In';
    if (desc.includes('transfer-out')) return 'Transfer Out';
    return 'Other';
};

// Get all investment accounts for the current user (with manager info)
export const getInvestmentAccounts = async () => {
    try {
        const accounts = await supabaseInvestmentAccountsDB.getAll();
        const managers = await supabaseInvestmentManagersDB.getAll();

        // Create manager lookup using supabase_id as key (for original UUID references)
        const managerMap = {};
        (managers || []).forEach(m => {
            if (m.supabase_id) managerMap[m.supabase_id] = m;
            managerMap[m.id] = m;
        });

        // Enrich accounts with manager info
        const enrichedAccounts = (accounts || []).map(a => ({
            ...a,
            manager: managerMap[a.manager_id] ? {
                id: managerMap[a.manager_id].id,
                name: managerMap[a.manager_id].name,
                manager_type: managerMap[a.manager_id].manager_type
            } : null
        })).sort((a, b) => (a.institution || '').localeCompare(b.institution || ''));

        return { success: true, accounts: enrichedAccounts };
    } catch (error) {
        console.error('❌ Error fetching investment accounts:', error);
        return { success: false, error: error.message, accounts: [] };
    }
};

// Helper to build account ID mappings (supabase_id <-> pocketbase_id)
const buildAccountIdMaps = (accounts) => {
    const supabaseToId = {}; // supabase_id -> PocketBase id
    const idToSupabase = {}; // PocketBase id -> supabase_id
    (accounts || []).forEach(a => {
        if (a.supabase_id) {
            supabaseToId[a.supabase_id] = a.id;
            idToSupabase[a.id] = a.supabase_id;
        }
        // Also map id to itself for new records
        supabaseToId[a.id] = a.id;
    });
    return { supabaseToId, idToSupabase };
};

// Get last transaction date for each investment account
export const getLastTransactionDates = async () => {
    try {
        const accounts = await supabaseInvestmentAccountsDB.getAll();
        const { supabaseToId } = buildAccountIdMaps(accounts);
        // Get all supabase_ids and PocketBase ids for filtering
        const allAccountIds = (accounts || []).flatMap(a => [a.id, a.supabase_id].filter(Boolean));

        if (allAccountIds.length === 0) {
            return { success: true, dates: {} };
        }

        const allTxns = await supabaseInvestmentTransactionsDB.getAll();
        const txns = (allTxns || []).filter(t => allAccountIds.includes(t.account_id))
            .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

        const dates = {};
        txns.forEach(txn => {
            // Map account_id (which may be supabase UUID) to PocketBase id
            const pbId = supabaseToId[txn.account_id] || txn.account_id;
            if (!dates[pbId]) {
                dates[pbId] = txn.transaction_date;
            }
        });

        return { success: true, dates };
    } catch (error) {
        console.error('❌ Error getting last transaction dates:', error);
        return { success: false, error: error.message, dates: {} };
    }
};

// Get last holdings date for each investment account
export const getLastHoldingsDates = async () => {
    try {
        const accounts = await supabaseInvestmentAccountsDB.getAll();
        const { supabaseToId } = buildAccountIdMaps(accounts);
        const allAccountIds = (accounts || []).flatMap(a => [a.id, a.supabase_id].filter(Boolean));

        if (allAccountIds.length === 0) {
            return { success: true, dates: {} };
        }

        const allHoldings = await supabaseHoldingsDB.getAll();
        const holdings = (allHoldings || []).filter(h => allAccountIds.includes(h.account_id))
            .sort((a, b) => new Date(b.as_of_date) - new Date(a.as_of_date));

        const dates = {};
        holdings.forEach(holding => {
            const pbId = supabaseToId[holding.account_id] || holding.account_id;
            if (!dates[pbId]) {
                dates[pbId] = holding.as_of_date;
            }
        });

        return { success: true, dates };
    } catch (error) {
        console.error('❌ Error getting last holdings dates:', error);
        return { success: false, error: error.message, dates: {} };
    }
};

// Get latest market value for each investment account
export const getLatestMarketValues = async () => {
    try {
        const accounts = await supabaseInvestmentAccountsDB.getAll();
        const { supabaseToId } = buildAccountIdMaps(accounts);
        const allAccountIds = (accounts || []).flatMap(a => [a.id, a.supabase_id].filter(Boolean));

        if (allAccountIds.length === 0) {
            return { success: true, values: {} };
        }

        const allHoldings = await supabaseHoldingsDB.getAll();
        const holdings = (allHoldings || []).filter(h => allAccountIds.includes(h.account_id))
            .sort((a, b) => new Date(b.as_of_date) - new Date(a.as_of_date));

        const values = {};
        const latestDates = {};

        // Find latest date for each account (using PocketBase id as key)
        holdings.forEach(holding => {
            const pbId = supabaseToId[holding.account_id] || holding.account_id;
            if (!latestDates[pbId]) {
                latestDates[pbId] = holding.as_of_date;
            }
        });

        // Sum market values for latest date
        holdings.forEach(holding => {
            const pbId = supabaseToId[holding.account_id] || holding.account_id;
            if (holding.as_of_date === latestDates[pbId]) {
                values[pbId] = (values[pbId] || 0) + (parseFloat(holding.market_value) || 0);
            }
        });

        return { success: true, values };
    } catch (error) {
        console.error('❌ Error getting latest market values:', error);
        return { success: false, error: error.message, values: {} };
    }
};

// Get existing holdings for an account
export const getHoldingsForAccount = async (accountId, supabaseId = null) => {
    try {
        const allHoldings = await supabaseHoldingsDB.getAll();
        // Match by either accountId or supabaseId
        const idsToMatch = [accountId, supabaseId].filter(Boolean);
        const holdings = (allHoldings || []).filter(h => idsToMatch.includes(h.account_id))
            .sort((a, b) => new Date(b.as_of_date) - new Date(a.as_of_date));

        return { success: true, holdings };
    } catch (error) {
        console.error('❌ Error getting holdings for account:', error);
        return { success: false, error: error.message, holdings: [] };
    }
};

// Get existing cash transactions for an account
export const getCashTransactionsForAccount = async (accountId) => {
    try {
        const allTxns = await supabaseCashTransactionsDB.getAll();
        const transactions = (allTxns || []).filter(t => t.account_id === accountId)
            .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

        return { success: true, transactions };
    } catch (error) {
        console.error('❌ Error getting cash transactions for account:', error);
        return { success: false, error: error.message, transactions: [] };
    }
};

// Get existing investment transactions for an account
export const getInvestmentTransactionsForAccount = async (accountId) => {
    try {
        const allTxns = await supabaseInvestmentTransactionsDB.getAll();
        const transactions = (allTxns || []).filter(t => t.account_id === accountId)
            .sort((a, b) => new Date(b.transaction_date) - new Date(a.transaction_date));

        return { success: true, transactions };
    } catch (error) {
        console.error('❌ Error getting investment transactions for account:', error);
        return { success: false, error: error.message, transactions: [] };
    }
};

// Find account by account number and institution
export const findAccountByNumber = async (accountNumber, institution) => {
    try {
        const accounts = await supabaseInvestmentAccountsDB.getAll();
        const account = (accounts || []).find(a =>
            a.account_number === accountNumber && a.institution === institution
        );

        return { success: true, account: account || null };
    } catch (error) {
        console.error('❌ Error finding account:', error);
        return { success: false, error: error.message, account: null };
    }
};

// Update investment account
export const updateInvestmentAccount = async (accountId, updates) => {
    try {
        const data = await supabaseInvestmentAccountsDB.update(accountId, {
            display_name: updates.displayName,
            manager_id: updates.managerId || null,
            updated_at: new Date().toISOString()
        });

        console.log('✅ Investment account updated:', data);
        return { success: true, account: data };
    } catch (error) {
        console.error('❌ Error updating investment account:', error);
        return { success: false, error: error.message };
    }
};

export default {
    // Managers
    getInvestmentManagers,
    createInvestmentManager,
    // Accounts
    saveAccountInfo,
    getInvestmentAccounts,
    getLastTransactionDates,
    getLastHoldingsDates,
    getLatestMarketValues,
    findAccountByNumber,
    updateInvestmentAccount,
    // Holdings & Transactions
    saveHoldings,
    saveCashTransactions,
    saveInvestmentTransactions,
    saveCompleteExtraction,
    // Get existing data
    getHoldingsForAccount,
    getCashTransactionsForAccount,
    getInvestmentTransactionsForAccount
};
