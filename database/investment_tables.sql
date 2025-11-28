-- Investment Account Management Tables
-- Run these in Supabase SQL Editor to create the investment tracking schema

-- IMPORTANT: After running this script, you need to expose the personal_finance schema:
-- 1. Go to Supabase Dashboard → Settings → API
-- 2. Under "Exposed schemas", add "personal_finance" to the list
-- 3. Save changes and restart your app
--
-- OR use the public schema instead by removing "personal_finance." from all CREATE TABLE statements

-- Create personal_finance schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS personal_finance;

-- Grant usage on schema to authenticated users
GRANT USAGE ON SCHEMA personal_finance TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA personal_finance TO authenticated;

-- 0. AI Extraction Logs Table (for backup and audit)
CREATE TABLE IF NOT EXISTS personal_finance.ai_extraction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size INTEGER,
    extraction_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    model_used TEXT NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    extraction_data JSONB NOT NULL, -- Full AI response with accountInfo + tables
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 1. Investment Accounts Table
CREATE TABLE IF NOT EXISTS personal_finance.investment_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_number TEXT NOT NULL,
    account_type TEXT NOT NULL, -- TFSA, RRSP, Cash, Margin, LIRA, RESP
    institution TEXT NOT NULL, -- Olympia Trust, RBC, TD, BMO, Questrade, etc.
    currency TEXT NOT NULL DEFAULT 'CAD', -- CAD, USD
    opening_balance DECIMAL(15, 2),
    closing_balance DECIMAL(15, 2),
    statement_date DATE,
    statement_period TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, account_number, institution)
);

-- 2. Holdings Table (Current Positions)
CREATE TABLE IF NOT EXISTS personal_finance.holdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES personal_finance.investment_accounts(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    security_name TEXT NOT NULL,
    units DECIMAL(15, 6) NOT NULL,
    price DECIMAL(15, 4) NOT NULL,
    market_value DECIMAL(15, 2) NOT NULL,
    book_value DECIMAL(15, 2),
    gain_loss DECIMAL(15, 2),
    as_of_date DATE NOT NULL,
    currency TEXT NOT NULL DEFAULT 'CAD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Cash Transactions Table (Fees, Purchases, Transfers)
CREATE TABLE IF NOT EXISTS personal_finance.cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES personal_finance.investment_accounts(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    description TEXT NOT NULL,
    transaction_type TEXT NOT NULL, -- Fee, Purchase, Transfer, Deposit, Withdrawal
    debit DECIMAL(15, 2) DEFAULT 0,
    credit DECIMAL(15, 2) DEFAULT 0,
    balance DECIMAL(15, 2),
    currency TEXT NOT NULL DEFAULT 'CAD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(account_id, transaction_date, description, debit, credit)
);

-- 4. Investment Transactions Table (Dividends, Interest, Trades)
CREATE TABLE IF NOT EXISTS personal_finance.investment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES personal_finance.investment_accounts(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    symbol TEXT,
    security_name TEXT,
    transaction_type TEXT NOT NULL, -- Dividend Reinvestment, Dividend Payment, Interest, Buy, Sell, Transfer In, Transfer Out
    units DECIMAL(15, 6),
    price DECIMAL(15, 4),
    amount DECIMAL(15, 2) NOT NULL,
    fees DECIMAL(15, 2) DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'CAD',
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(account_id, transaction_date, symbol, transaction_type, units, amount)
);

-- 5. Tax Withholdings Table (Optional but useful for tax filing)
CREATE TABLE IF NOT EXISTS personal_finance.tax_withholdings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES personal_finance.investment_accounts(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES personal_finance.investment_transactions(id) ON DELETE CASCADE,
    withholding_date DATE NOT NULL,
    symbol TEXT,
    withholding_amount DECIMAL(15, 2) NOT NULL,
    country TEXT NOT NULL, -- USA, Canada, etc.
    income_type TEXT NOT NULL, -- Dividend, Interest
    currency TEXT NOT NULL DEFAULT 'CAD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_ai_extraction_logs_user_id ON personal_finance.ai_extraction_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_extraction_logs_timestamp ON personal_finance.ai_extraction_logs(extraction_timestamp);
CREATE INDEX IF NOT EXISTS idx_investment_accounts_user_id ON personal_finance.investment_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_account_id ON personal_finance.holdings(account_id);
CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON personal_finance.holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_account_id ON personal_finance.cash_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON personal_finance.cash_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_account_id ON personal_finance.investment_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_symbol ON personal_finance.investment_transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_investment_transactions_date ON personal_finance.investment_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_tax_withholdings_account_id ON personal_finance.tax_withholdings(account_id);

-- Enable Row Level Security (RLS)
ALTER TABLE personal_finance.ai_extraction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.cash_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.investment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.tax_withholdings ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see their own data

-- AI Extraction Logs
CREATE POLICY "Users can view own AI extraction logs"
    ON personal_finance.ai_extraction_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI extraction logs"
    ON personal_finance.ai_extraction_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI extraction logs"
    ON personal_finance.ai_extraction_logs FOR DELETE
    USING (auth.uid() = user_id);

-- Investment Accounts
CREATE POLICY "Users can view own investment accounts"
    ON personal_finance.investment_accounts FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investment accounts"
    ON personal_finance.investment_accounts FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investment accounts"
    ON personal_finance.investment_accounts FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investment accounts"
    ON personal_finance.investment_accounts FOR DELETE
    USING (auth.uid() = user_id);

-- Holdings
CREATE POLICY "Users can view own holdings"
    ON personal_finance.holdings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = holdings.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own holdings"
    ON personal_finance.holdings FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = holdings.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own holdings"
    ON personal_finance.holdings FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = holdings.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own holdings"
    ON personal_finance.holdings FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = holdings.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

-- Cash Transactions
CREATE POLICY "Users can view own cash transactions"
    ON personal_finance.cash_transactions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = cash_transactions.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own cash transactions"
    ON personal_finance.cash_transactions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = cash_transactions.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own cash transactions"
    ON personal_finance.cash_transactions FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = cash_transactions.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own cash transactions"
    ON personal_finance.cash_transactions FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = cash_transactions.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

-- Investment Transactions
CREATE POLICY "Users can view own investment transactions"
    ON personal_finance.investment_transactions FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = investment_transactions.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own investment transactions"
    ON personal_finance.investment_transactions FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = investment_transactions.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own investment transactions"
    ON personal_finance.investment_transactions FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = investment_transactions.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own investment transactions"
    ON personal_finance.investment_transactions FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = investment_transactions.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

-- Tax Withholdings
CREATE POLICY "Users can view own tax withholdings"
    ON personal_finance.tax_withholdings FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = tax_withholdings.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own tax withholdings"
    ON personal_finance.tax_withholdings FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = tax_withholdings.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

CREATE POLICY "Users can update own tax withholdings"
    ON personal_finance.tax_withholdings FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = tax_withholdings.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

CREATE POLICY "Users can delete own tax withholdings"
    ON personal_finance.tax_withholdings FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM personal_finance.investment_accounts
        WHERE investment_accounts.id = tax_withholdings.account_id
        AND investment_accounts.user_id = auth.uid()
    ));

-- Create updated_at trigger function in personal_finance schema
CREATE OR REPLACE FUNCTION personal_finance.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
CREATE TRIGGER update_investment_accounts_updated_at
    BEFORE UPDATE ON personal_finance.investment_accounts
    FOR EACH ROW
    EXECUTE FUNCTION personal_finance.update_updated_at_column();

CREATE TRIGGER update_holdings_updated_at
    BEFORE UPDATE ON personal_finance.holdings
    FOR EACH ROW
    EXECUTE FUNCTION personal_finance.update_updated_at_column();

-- Sample queries for testing

-- View all investment accounts
-- SELECT * FROM personal_finance.investment_accounts WHERE user_id = auth.uid();

-- View holdings with account info
-- SELECT h.*, ia.account_number, ia.institution
-- FROM personal_finance.holdings h
-- JOIN personal_finance.investment_accounts ia ON h.account_id = ia.id
-- WHERE ia.user_id = auth.uid();

-- View recent investment transactions
-- SELECT it.*, ia.account_number
-- FROM personal_finance.investment_transactions it
-- JOIN personal_finance.investment_accounts ia ON it.account_id = ia.id
-- WHERE ia.user_id = auth.uid()
-- ORDER BY it.transaction_date DESC
-- LIMIT 50;

-- Portfolio summary
-- SELECT 
--     ia.institution,
--     ia.account_type,
--     SUM(h.market_value) as total_market_value,
--     SUM(h.book_value) as total_book_value,
--     SUM(h.gain_loss) as total_gain_loss
-- FROM personal_finance.holdings h
-- JOIN personal_finance.investment_accounts ia ON h.account_id = ia.id
-- WHERE ia.user_id = auth.uid()
-- GROUP BY ia.institution, ia.account_type;

