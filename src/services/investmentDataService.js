import { supabase } from './supabaseClient';

/**
 * Save extracted PDF data to Supabase investment tables
 */

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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('investment_managers')
            .select('*')
            .eq('user_id', user.id)
            .order('name', { ascending: true });

        if (error) throw error;

        return { success: true, managers: data || [] };
    } catch (error) {
        console.error('❌ Error fetching investment managers:', error);
        return { success: false, error: error.message, managers: [] };
    }
};

// Create a new investment manager
export const createInvestmentManager = async (managerData) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('investment_managers')
            .insert({
                user_id: user.id,
                name: managerData.name,
                manager_type: managerData.managerType || 'Advisor',
                description: managerData.description || null,
                website: managerData.website || null,
                contact_name: managerData.contactName || null,
                contact_email: managerData.contactEmail || null,
                contact_phone: managerData.contactPhone || null
            })
            .select()
            .single();

        if (error) throw error;

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

// 1. Save or update account info
export const saveAccountInfo = async (accountInfo) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const accountData = {
            user_id: user.id,
            account_number: accountInfo.accountNumber,
            account_type: accountInfo.accountType,
            institution: accountInfo.institution,
            currency: accountInfo.currency || 'CAD',
            opening_balance: parseFloat(accountInfo.openingBalance) || null,
            closing_balance: parseFloat(accountInfo.closingBalance) || null,
            statement_date: accountInfo.statementDate || null,
            display_name: accountInfo.displayName || null,
            manager_id: accountInfo.managerId || null
            // Note: statement_period removed - it's a text field that may not exist in DB schema
        };

        // Upsert: Update if exists, insert if not
        const { data, error } = await supabase
            .from('investment_accounts')
            .upsert(accountData, {
                onConflict: 'user_id,account_number,institution'
            })
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Account info saved:', data);
        return { success: true, accountId: data.id, account: data };
    } catch (error) {
        console.error('❌ Error saving account info:', error);
        return { success: false, error: error.message };
    }
};

// 2. Save holdings (replaces existing for this account/date)
export const saveHoldings = async (accountId, holdingsRows, asOfDate) => {
    try {
        // Delete existing holdings for this account and date
        await supabase
            .from('holdings')
            .delete()
            .eq('account_id', accountId)
            .eq('as_of_date', asOfDate);

        // Prepare holdings data with classification fields
        const holdingsData = holdingsRows.map(row => ({
            account_id: accountId,
            symbol: row.Symbol || row.symbol || '',
            security_name: row['Security Name'] || row.securityName || row.name || '',
            asset_type: row.assetType || row.asset_type || null,
            category: row.category || null,
            sub_category: row.subCategory || row.sub_category || null,
            units: parseFloat(row.Units || row.units || row['Units/Shares'] || 0),
            price: parseFloat(row.Price || row.price || 0),
            market_value: parseFloat(row['Market Value'] || row.marketValue || row['Market Val'] || row.value || 0),
            book_value: parseFloat(row['Book Value'] || row.bookValue || row['Book Val'] || row.bookCost || 0) || null,
            gain_loss: parseFloat(row['Gain/Loss'] || row.gainLoss || row['Gain Loss'] || 0) || null,
            as_of_date: asOfDate,
            currency: row.Currency || row.currency || 'CAD'
        }));

        const { data, error } = await supabase
            .from('holdings')
            .insert(holdingsData)
            .select();

        if (error) throw error;

        console.log(`✅ ${data.length} holdings saved`);
        return { success: true, count: data.length, holdings: data };
    } catch (error) {
        console.error('❌ Error saving holdings:', error);
        return { success: false, error: error.message };
    }
};

// 3. Save cash transactions
export const saveCashTransactions = async (accountId, transactionRows) => {
    try {
        // Filter and validate dates - skip rows with invalid dates like quarters (2025-Q3)
        const validRows = transactionRows.filter(row => {
            const dateStr = row.Date || row.date;
            if (!dateStr) return false;
            // Skip quarter formats (2025-Q3, Q3-2025, etc)
            if (/Q\d|quarter/i.test(dateStr)) return false;
            // Validate date format
            const date = new Date(dateStr);
            return !isNaN(date.getTime());
        });

        if (validRows.length === 0) {
            console.log('⚠️ No valid cash transactions to save (all dates invalid)');
            return { success: true, count: 0, transactions: [] };
        }

        const transactionsData = validRows.map(row => ({
            account_id: accountId,
            transaction_date: formatDateString(row.Date || row.date),
            description: row.Description || row['Item Description'] || row.description || '',
            transaction_type: classifyTransactionType(row.Description || row['Item Description'] || ''),
            debit: parseFloat(row.Debit || row.debit || 0),
            credit: parseFloat(row.Credit || row.credit || 0),
            balance: parseFloat(row.Balance || row.balance || 0) || null,
            currency: row.Currency || row.currency || 'CAD'
        }));

        const { data, error } = await supabase
            .from('cash_transactions')
            .upsert(transactionsData, {
                onConflict: 'account_id,transaction_date,description,debit,credit',
                ignoreDuplicates: true
            })
            .select();

        if (error) throw error;

        console.log(`✅ ${data.length} cash transactions saved`);
        return { success: true, count: data.length, transactions: data };
    } catch (error) {
        console.error('❌ Error saving cash transactions:', error);
        return { success: false, error: error.message };
    }
};

// 4. Save investment transactions
export const saveInvestmentTransactions = async (accountId, transactionRows) => {
    try {
        // Filter and validate dates
        const validRows = transactionRows.filter(row => {
            const dateStr = row.Date || row.date;
            if (!dateStr) return false;
            // Skip quarter formats
            if (/Q\d|quarter/i.test(dateStr)) return false;
            // Validate date format
            const date = new Date(dateStr);
            return !isNaN(date.getTime());
        });

        if (validRows.length === 0) {
            console.log('⚠️ No valid investment transactions to save (all dates invalid)');
            return { success: true, count: 0, transactions: [] };
        }

        const transactionsData = validRows.map(row => ({
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
        }));

        // Get existing transactions for this account to check for duplicates
        // This handles NULL values in symbol which upsert doesn't handle well
        const { data: existingTxns } = await supabase
            .from('investment_transactions')
            .select('transaction_date, symbol, transaction_type, units, amount')
            .eq('account_id', accountId);

        // Filter out duplicates manually
        const existingSet = new Set(
            (existingTxns || []).map(t =>
                `${t.transaction_date}|${t.symbol || ''}|${t.transaction_type}|${t.units || ''}|${t.amount}`
            )
        );

        const newTransactions = transactionsData.filter(t => {
            const key = `${t.transaction_date}|${t.symbol || ''}|${t.transaction_type}|${t.units || ''}|${t.amount}`;
            return !existingSet.has(key);
        });

        if (newTransactions.length === 0) {
            console.log('⚠️ All investment transactions already exist, skipping');
            return { success: true, count: 0, transactions: [] };
        }

        const { data, error } = await supabase
            .from('investment_transactions')
            .insert(newTransactions)
            .select();

        if (error) throw error;

        console.log(`✅ ${data.length} investment transactions saved (${transactionsData.length - newTransactions.length} duplicates skipped)`);
        return { success: true, count: data.length, transactions: data };
    } catch (error) {
        console.error('❌ Error saving investment transactions:', error);
        return { success: false, error: error.message };
    }
};

// 5. Save complete extraction (orchestrates all saves)
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
                        accountInfo.statementDate || new Date().toISOString().split('T')[0]
                    );
                    results.holdings = holdingsResult;
                    if (!holdingsResult.success) {
                        results.errors.push(`Holdings: ${holdingsResult.error}`);
                    }
                    break;

                case 'fees':
                    // Transform fees to cash transactions format
                    const feeRows = rows.map(row => ({
                        Date: row.date || row.Date,
                        Description: row.description || row.Description || 'Fee',
                        Debit: parseFloat(row.amount || row.Amount || row.debit || row.Debit || 0),
                        Credit: 0,
                        Balance: null
                    }));
                    const feesResult = await saveCashTransactions(accountId, feeRows);
                    // Store fees result in cashTransactions if not already set
                    if (!results.cashTransactions) {
                        results.cashTransactions = feesResult;
                    } else if (feesResult.success) {
                        // Merge fee counts with existing cash transactions
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('investment_accounts')
            .select(`
                *,
                manager:investment_managers(id, name, manager_type)
            `)
            .eq('user_id', user.id)
            .order('institution', { ascending: true });

        if (error) throw error;

        return { success: true, accounts: data || [] };
    } catch (error) {
        console.error('❌ Error fetching investment accounts:', error);
        return { success: false, error: error.message, accounts: [] };
    }
};

// Get last transaction date for each investment account
export const getLastTransactionDates = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // First get all investment accounts for this user
        const { data: accounts, error: accountsError } = await supabase
            .from('investment_accounts')
            .select('id')
            .eq('user_id', user.id);

        if (accountsError) throw accountsError;

        const accountIds = (accounts || []).map(a => a.id);
        if (accountIds.length === 0) {
            return { success: true, dates: {} };
        }

        // Get last transaction date for each account
        const { data, error } = await supabase
            .from('investment_transactions')
            .select('account_id, transaction_date')
            .in('account_id', accountIds)
            .order('transaction_date', { ascending: false });

        if (error) throw error;

        // Group by account_id and get the most recent date
        const dates = {};
        (data || []).forEach(txn => {
            if (!dates[txn.account_id]) {
                dates[txn.account_id] = txn.transaction_date;
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // First get all investment accounts for this user
        const { data: accounts, error: accountsError } = await supabase
            .from('investment_accounts')
            .select('id')
            .eq('user_id', user.id);

        if (accountsError) throw accountsError;

        const accountIds = (accounts || []).map(a => a.id);
        if (accountIds.length === 0) {
            return { success: true, dates: {} };
        }

        // Get last holdings date for each account
        const { data, error } = await supabase
            .from('holdings')
            .select('account_id, as_of_date')
            .in('account_id', accountIds)
            .order('as_of_date', { ascending: false });

        if (error) throw error;

        // Group by account_id and get the most recent date
        const dates = {};
        (data || []).forEach(holding => {
            if (!dates[holding.account_id]) {
                dates[holding.account_id] = holding.as_of_date;
            }
        });

        return { success: true, dates };
    } catch (error) {
        console.error('❌ Error getting last holdings dates:', error);
        return { success: false, error: error.message, dates: {} };
    }
};

// Get latest market value for each investment account (calculated from holdings)
export const getLatestMarketValues = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Get all investment accounts for this user
        const { data: accounts, error: accountsError } = await supabase
            .from('investment_accounts')
            .select('id')
            .eq('user_id', user.id);

        if (accountsError) throw accountsError;

        const accountIds = (accounts || []).map(a => a.id);
        if (accountIds.length === 0) {
            return { success: true, values: {} };
        }

        // Get all holdings for these accounts
        const { data: holdings, error: holdingsError } = await supabase
            .from('holdings')
            .select('account_id, as_of_date, market_value')
            .in('account_id', accountIds)
            .order('as_of_date', { ascending: false });

        if (holdingsError) throw holdingsError;

        // For each account, find the latest date and sum market values for that date
        const values = {};
        const latestDates = {};

        // First pass: find the latest date for each account
        (holdings || []).forEach(holding => {
            if (!latestDates[holding.account_id]) {
                latestDates[holding.account_id] = holding.as_of_date;
            }
        });

        // Second pass: sum market values for the latest date of each account
        (holdings || []).forEach(holding => {
            if (holding.as_of_date === latestDates[holding.account_id]) {
                values[holding.account_id] = (values[holding.account_id] || 0) + (parseFloat(holding.market_value) || 0);
            }
        });

        return { success: true, values };
    } catch (error) {
        console.error('❌ Error getting latest market values:', error);
        return { success: false, error: error.message, values: {} };
    }
};

// Get existing holdings for an account
export const getHoldingsForAccount = async (accountId) => {
    try {
        const { data, error } = await supabase
            .from('holdings')
            .select('*')
            .eq('account_id', accountId)
            .order('as_of_date', { ascending: false });

        if (error) throw error;

        return { success: true, holdings: data || [] };
    } catch (error) {
        console.error('❌ Error getting holdings for account:', error);
        return { success: false, error: error.message, holdings: [] };
    }
};

// Get existing cash transactions (fees) for an account
export const getCashTransactionsForAccount = async (accountId) => {
    try {
        const { data, error } = await supabase
            .from('cash_transactions')
            .select('*')
            .eq('account_id', accountId)
            .order('transaction_date', { ascending: false });

        if (error) throw error;

        return { success: true, transactions: data || [] };
    } catch (error) {
        console.error('❌ Error getting cash transactions for account:', error);
        return { success: false, error: error.message, transactions: [] };
    }
};

// Get existing investment transactions for an account
export const getInvestmentTransactionsForAccount = async (accountId) => {
    try {
        const { data, error } = await supabase
            .from('investment_transactions')
            .select('*')
            .eq('account_id', accountId)
            .order('transaction_date', { ascending: false });

        if (error) throw error;

        return { success: true, transactions: data || [] };
    } catch (error) {
        console.error('❌ Error getting investment transactions for account:', error);
        return { success: false, error: error.message, transactions: [] };
    }
};

// Find account by account number and institution
export const findAccountByNumber = async (accountNumber, institution) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('investment_accounts')
            .select('*')
            .eq('user_id', user.id)
            .eq('account_number', accountNumber)
            .eq('institution', institution)
            .single();

        if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found

        return { success: true, account: data || null };
    } catch (error) {
        console.error('❌ Error finding account:', error);
        return { success: false, error: error.message, account: null };
    }
};

// Update investment account (rename, change manager, etc.)
export const updateInvestmentAccount = async (accountId, updates) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('investment_accounts')
            .update({
                display_name: updates.displayName,
                manager_id: updates.managerId || null,
                updated_at: new Date().toISOString()
            })
            .eq('id', accountId)
            .eq('user_id', user.id)
            .select()
            .single();

        if (error) throw error;

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
