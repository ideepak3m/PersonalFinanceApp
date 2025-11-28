import { supabase } from './supabaseClient';

/**
 * Save extracted PDF data to Supabase investment tables
 */

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
            statement_date: accountInfo.statementDate || null
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
            transaction_date: row.Date || row.date,
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
            transaction_date: row.Date || row.date,
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

        const { data, error } = await supabase
            .from('investment_transactions')
            .upsert(transactionsData, {
                onConflict: 'account_id,transaction_date,symbol,transaction_type,units,amount',
                ignoreDuplicates: true
            })
            .select();

        if (error) throw error;

        console.log(`✅ ${data.length} investment transactions saved`);
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

export default {
    saveAccountInfo,
    saveHoldings,
    saveCashTransactions,
    saveInvestmentTransactions,
    saveCompleteExtraction
};
