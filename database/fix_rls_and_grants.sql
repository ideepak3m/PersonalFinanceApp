-- Fix RLS policies and grants for existing investment tables
-- Run this if tables were created but policies/grants need to be fixed

-- Grant proper permissions
GRANT USAGE ON SCHEMA personal_finance TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA personal_finance TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA personal_finance TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA personal_finance TO authenticated;

-- Ensure RLS is enabled
ALTER TABLE personal_finance.ai_extraction_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.investment_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.investment_transactions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own AI extraction logs" ON personal_finance.ai_extraction_logs;
DROP POLICY IF EXISTS "Users can insert own AI extraction logs" ON personal_finance.ai_extraction_logs;
DROP POLICY IF EXISTS "Users can delete own AI extraction logs" ON personal_finance.ai_extraction_logs;

DROP POLICY IF EXISTS "Users can view own investment accounts" ON personal_finance.investment_accounts;
DROP POLICY IF EXISTS "Users can insert own investment accounts" ON personal_finance.investment_accounts;
DROP POLICY IF EXISTS "Users can update own investment accounts" ON personal_finance.investment_accounts;
DROP POLICY IF EXISTS "Users can delete own investment accounts" ON personal_finance.investment_accounts;

DROP POLICY IF EXISTS "Users can view own holdings" ON personal_finance.holdings;
DROP POLICY IF EXISTS "Users can insert own holdings" ON personal_finance.holdings;
DROP POLICY IF EXISTS "Users can update own holdings" ON personal_finance.holdings;
DROP POLICY IF EXISTS "Users can delete own holdings" ON personal_finance.holdings;

DROP POLICY IF EXISTS "Users can view own investment transactions" ON personal_finance.investment_transactions;
DROP POLICY IF EXISTS "Users can insert own investment transactions" ON personal_finance.investment_transactions;
DROP POLICY IF EXISTS "Users can update own investment transactions" ON personal_finance.investment_transactions;
DROP POLICY IF EXISTS "Users can delete own investment transactions" ON personal_finance.investment_transactions;

-- Recreate AI Extraction Logs policies
CREATE POLICY "Users can view own AI extraction logs"
    ON personal_finance.ai_extraction_logs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own AI extraction logs"
    ON personal_finance.ai_extraction_logs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own AI extraction logs"
    ON personal_finance.ai_extraction_logs FOR DELETE
    USING (auth.uid() = user_id);

-- Recreate Investment Accounts policies
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

-- Recreate Holdings policies
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

-- Recreate Investment Transactions policies
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
