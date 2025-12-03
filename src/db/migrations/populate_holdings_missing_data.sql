-- ============================================================
-- MIGRATION: Populate missing data in holdings table
-- Run this in Supabase SQL Editor (ONE TIME ONLY)
-- ============================================================

-- 1. Populate user_id from investment_accounts
-- This ensures all holdings have user_id for RLS and filtering
UPDATE personal_finance.holdings h
SET user_id = ia.user_id
FROM personal_finance.investment_accounts ia
WHERE h.account_id = ia.id
  AND h.user_id IS NULL;

-- 2. Populate account_type and institution from investment_accounts
-- Denormalized fields for faster queries and analytics
UPDATE personal_finance.holdings h
SET 
    account_type = ia.account_type,
    institution = ia.institution
FROM personal_finance.investment_accounts ia
WHERE h.account_id = ia.id
  AND (h.account_type IS NULL OR h.institution IS NULL);

-- 3. Calculate average_cost_per_unit where missing
UPDATE personal_finance.holdings
SET average_cost_per_unit = CASE 
    WHEN units > 0 AND book_value IS NOT NULL THEN book_value / units
    ELSE NULL
END
WHERE average_cost_per_unit IS NULL
  AND units > 0
  AND book_value IS NOT NULL;

-- 4. Verify the updates
DO $$
DECLARE
    holdings_without_user_id INT;
    holdings_without_account_type INT;
BEGIN
    SELECT COUNT(*) INTO holdings_without_user_id 
    FROM personal_finance.holdings 
    WHERE user_id IS NULL;

    SELECT COUNT(*) INTO holdings_without_account_type 
    FROM personal_finance.holdings 
    WHERE account_type IS NULL;

    RAISE NOTICE 'Migration complete:';
    RAISE NOTICE '  Holdings still without user_id: %', holdings_without_user_id;
    RAISE NOTICE '  Holdings still without account_type: %', holdings_without_account_type;
    
    IF holdings_without_user_id > 0 THEN
        RAISE WARNING 'Some holdings have no user_id - their account may not exist in investment_accounts';
    END IF;
END $$;

-- 5. Show summary of current holdings data
SELECT 
    COUNT(*) as total_holdings,
    COUNT(user_id) as with_user_id,
    COUNT(account_type) as with_account_type,
    COUNT(institution) as with_institution,
    COUNT(investment_type) as with_investment_type,
    COUNT(sector) as with_sector,
    COUNT(geography) as with_geography
FROM personal_finance.holdings;
