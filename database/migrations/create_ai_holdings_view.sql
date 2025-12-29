-- AI Holdings Detail View
-- Run this in Supabase SQL Editor to create a detailed holdings view for AI analysis
-- This view provides individual holding details with growth rates

-- ============================================================
-- VIEW: AI Holdings Detail
-- Purpose: Individual holdings with book value, market value, gain/loss, and return %
-- ============================================================

DROP VIEW IF EXISTS personal_finance.ai_holdings_detail CASCADE;

CREATE OR REPLACE VIEW personal_finance.ai_holdings_detail AS
SELECT 
    ia.user_id,
    ia.id as account_id,
    ia.account_type,
    ia.institution,
    ia.currency,
    ia.country,
    
    -- Security details
    h.symbol,
    h.security_name,
    h.units,
    h.price as current_price,
    h.book_value,
    h.market_value,
    -- Calculate gain_loss if it's NULL or 0
    CASE 
        WHEN h.gain_loss IS NOT NULL AND h.gain_loss != 0 THEN h.gain_loss
        WHEN h.market_value IS NOT NULL AND h.book_value IS NOT NULL THEN h.market_value - h.book_value
        ELSE 0
    END as gain_loss,
    h.as_of_date,
    
    -- Performance metrics
    CASE 
        WHEN COALESCE(h.book_value, h.market_value) > 0 THEN
            ROUND((
                (CASE 
                    WHEN h.gain_loss IS NOT NULL AND h.gain_loss != 0 THEN h.gain_loss
                    WHEN h.market_value IS NOT NULL AND h.book_value IS NOT NULL THEN h.market_value - h.book_value
                    ELSE 0
                END / COALESCE(h.book_value, h.market_value)) * 100
            )::NUMERIC, 2)
        ELSE 0 
    END as return_percent,
    
    -- Average cost basis
    CASE WHEN h.units > 0 
        THEN ROUND((COALESCE(h.book_value, h.market_value) / h.units)::NUMERIC, 4)
        ELSE 0 
    END as avg_cost_per_unit,
    
    -- Weight in portfolio (will be calculated at user level)
    h.market_value as position_value

FROM personal_finance.holdings h
JOIN personal_finance.investment_accounts ia ON h.account_id = ia.id
WHERE h.units > 0;

COMMENT ON VIEW personal_finance.ai_holdings_detail IS 'Individual investment holdings with performance metrics for AI growth analysis';

-- Grant access
GRANT SELECT ON personal_finance.ai_holdings_detail TO authenticated;

-- ============================================================
-- VIEW: AI Portfolio Growth Summary
-- Purpose: Aggregated growth rates by account type and overall
-- ============================================================

DROP VIEW IF EXISTS personal_finance.ai_portfolio_growth CASCADE;

CREATE OR REPLACE VIEW personal_finance.ai_portfolio_growth AS
WITH user_totals AS (
    SELECT 
        ia.user_id,
        ia.currency,
        SUM(h.book_value) as total_book_value,
        SUM(h.market_value) as total_market_value,
        SUM(h.gain_loss) as total_gain_loss
    FROM personal_finance.holdings h
    JOIN personal_finance.investment_accounts ia ON h.account_id = ia.id
    WHERE h.units > 0
    GROUP BY ia.user_id, ia.currency
),
by_account_type AS (
    SELECT 
        ia.user_id,
        ia.currency,
        ia.account_type,
        SUM(h.book_value) as book_value,
        SUM(h.market_value) as market_value,
        SUM(h.gain_loss) as gain_loss,
        CASE WHEN SUM(h.book_value) > 0 
            THEN ROUND(((SUM(h.gain_loss) / SUM(h.book_value)) * 100)::NUMERIC, 2) 
            ELSE 0 
        END as return_percent
    FROM personal_finance.holdings h
    JOIN personal_finance.investment_accounts ia ON h.account_id = ia.id
    WHERE h.units > 0
    GROUP BY ia.user_id, ia.currency, ia.account_type
),
top_gainers AS (
    SELECT 
        ia.user_id,
        ia.currency,
        h.symbol,
        h.security_name,
        h.gain_loss,
        CASE WHEN h.book_value > 0 
            THEN ROUND(((h.gain_loss / h.book_value) * 100)::NUMERIC, 2) 
            ELSE 0 
        END as return_percent,
        ROW_NUMBER() OVER (PARTITION BY ia.user_id, ia.currency ORDER BY h.gain_loss DESC) as rn
    FROM personal_finance.holdings h
    JOIN personal_finance.investment_accounts ia ON h.account_id = ia.id
    WHERE h.units > 0 AND h.book_value > 0
),
top_losers AS (
    SELECT 
        ia.user_id,
        ia.currency,
        h.symbol,
        h.security_name,
        h.gain_loss,
        CASE WHEN h.book_value > 0 
            THEN ROUND(((h.gain_loss / h.book_value) * 100)::NUMERIC, 2) 
            ELSE 0 
        END as return_percent,
        ROW_NUMBER() OVER (PARTITION BY ia.user_id, ia.currency ORDER BY h.gain_loss ASC) as rn
    FROM personal_finance.holdings h
    JOIN personal_finance.investment_accounts ia ON h.account_id = ia.id
    WHERE h.units > 0 AND h.book_value > 0
)
SELECT 
    ut.user_id,
    ut.currency,
    
    -- Overall metrics
    ut.total_book_value,
    ut.total_market_value,
    ut.total_gain_loss,
    CASE WHEN ut.total_book_value > 0 
        THEN ROUND(((ut.total_gain_loss / ut.total_book_value) * 100)::NUMERIC, 2) 
        ELSE 0 
    END as overall_return_percent,
    
    -- By account type
    (SELECT jsonb_agg(jsonb_build_object(
        'account_type', bat.account_type,
        'book_value', bat.book_value,
        'market_value', bat.market_value,
        'gain_loss', bat.gain_loss,
        'return_percent', bat.return_percent
    ) ORDER BY bat.market_value DESC)
    FROM by_account_type bat 
    WHERE bat.user_id = ut.user_id AND bat.currency = ut.currency
    ) as by_account_type,
    
    -- Top 5 gainers
    (SELECT jsonb_agg(jsonb_build_object(
        'symbol', tg.symbol,
        'security_name', tg.security_name,
        'gain_loss', tg.gain_loss,
        'return_percent', tg.return_percent
    ))
    FROM top_gainers tg 
    WHERE tg.user_id = ut.user_id AND tg.currency = ut.currency AND tg.rn <= 5 AND tg.gain_loss > 0
    ) as top_gainers,
    
    -- Top 5 losers
    (SELECT jsonb_agg(jsonb_build_object(
        'symbol', tl.symbol,
        'security_name', tl.security_name,
        'gain_loss', tl.gain_loss,
        'return_percent', tl.return_percent
    ))
    FROM top_losers tl 
    WHERE tl.user_id = ut.user_id AND tl.currency = ut.currency AND tl.rn <= 5 AND tl.gain_loss < 0
    ) as top_losers

FROM user_totals ut;

COMMENT ON VIEW personal_finance.ai_portfolio_growth IS 'Portfolio growth summary with breakdown by account type and top performers/losers';

-- Grant access
GRANT SELECT ON personal_finance.ai_portfolio_growth TO authenticated;

-- ============================================================
-- VIEW: AI Investment Transactions Summary
-- Purpose: Summarize investment transactions for growth/income analysis
-- ============================================================

DROP VIEW IF EXISTS personal_finance.ai_investment_transactions CASCADE;

CREATE OR REPLACE VIEW personal_finance.ai_investment_transactions AS
WITH transaction_summary AS (
    SELECT 
        ia.user_id,
        ia.id as account_id,
        ia.display_name as account_name,
        ia.account_type,
        ia.institution,
        ia.currency,
        ia.country,
        it.symbol,
        it.security_name,
        
        -- Transaction counts
        COUNT(*) FILTER (WHERE it.transaction_type ILIKE '%buy%' OR it.transaction_type ILIKE '%purchase%') as buy_count,
        COUNT(*) FILTER (WHERE it.transaction_type ILIKE '%sell%') as sell_count,
        COUNT(*) FILTER (WHERE it.transaction_type ILIKE '%dividend%' OR it.transaction_type ILIKE '%distribution%') as dividend_count,
        COUNT(*) FILTER (WHERE it.transaction_type ILIKE '%interest%') as interest_count,
        
        -- Amounts
        COALESCE(SUM(it.amount) FILTER (WHERE it.transaction_type ILIKE '%buy%' OR it.transaction_type ILIKE '%purchase%'), 0) as total_bought,
        COALESCE(SUM(it.amount) FILTER (WHERE it.transaction_type ILIKE '%sell%'), 0) as total_sold,
        COALESCE(SUM(it.amount) FILTER (WHERE it.transaction_type ILIKE '%dividend%' OR it.transaction_type ILIKE '%distribution%'), 0) as total_dividends,
        COALESCE(SUM(it.amount) FILTER (WHERE it.transaction_type ILIKE '%interest%'), 0) as total_interest,
        
        -- Units
        COALESCE(SUM(it.units) FILTER (WHERE it.transaction_type ILIKE '%buy%' OR it.transaction_type ILIKE '%purchase%' OR it.transaction_type ILIKE '%reinvest%'), 0) as total_units_bought,
        COALESCE(SUM(it.units) FILTER (WHERE it.transaction_type ILIKE '%sell%'), 0) as total_units_sold,
        
        -- Fees
        COALESCE(SUM(it.fees), 0) as total_fees,
        
        -- Date range
        MIN(it.transaction_date) as first_transaction,
        MAX(it.transaction_date) as last_transaction
        
    FROM personal_finance.investment_transactions it
    JOIN personal_finance.investment_accounts ia ON it.account_id = ia.id
    GROUP BY ia.user_id, ia.id, ia.display_name, ia.account_type, ia.institution, ia.currency, ia.country, it.symbol, it.security_name
)
SELECT 
    ts.*,
    -- Net investment (bought - sold)
    (ts.total_bought - ts.total_sold) as net_invested,
    -- Total income (dividends + interest)
    (ts.total_dividends + ts.total_interest) as total_income,
    -- Calculate holding period in months
    EXTRACT(MONTH FROM AGE(ts.last_transaction, ts.first_transaction)) + 
    (EXTRACT(YEAR FROM AGE(ts.last_transaction, ts.first_transaction)) * 12) as holding_months
FROM transaction_summary ts
WHERE ts.symbol IS NOT NULL 
  AND (ts.buy_count > 0 OR ts.sell_count > 0 OR ts.dividend_count > 0 OR ts.interest_count > 0);

COMMENT ON VIEW personal_finance.ai_investment_transactions IS 'Investment transaction summary by security for growth and income analysis';

-- Grant access
GRANT SELECT ON personal_finance.ai_investment_transactions TO authenticated;

-- ============================================================
-- VIEW: AI Portfolio Income Summary
-- Purpose: Aggregate dividend/interest income for retirement planning
-- ============================================================

DROP VIEW IF EXISTS personal_finance.ai_portfolio_income CASCADE;

CREATE OR REPLACE VIEW personal_finance.ai_portfolio_income AS
SELECT 
    ia.user_id,
    ia.currency,
    ia.country,
    ia.account_type,
    
    -- Annual dividend income (last 12 months)
    COALESCE(SUM(it.amount) FILTER (
        WHERE it.transaction_type ILIKE '%dividend%' 
        AND it.transaction_date >= CURRENT_DATE - INTERVAL '12 months'
    ), 0) as annual_dividend_income,
    
    -- Annual interest income (last 12 months)
    COALESCE(SUM(it.amount) FILTER (
        WHERE it.transaction_type ILIKE '%interest%'
        AND it.transaction_date >= CURRENT_DATE - INTERVAL '12 months'
    ), 0) as annual_interest_income,
    
    -- YTD dividend income
    COALESCE(SUM(it.amount) FILTER (
        WHERE it.transaction_type ILIKE '%dividend%'
        AND it.transaction_date >= DATE_TRUNC('year', CURRENT_DATE)
    ), 0) as ytd_dividend_income,
    
    -- YTD interest income
    COALESCE(SUM(it.amount) FILTER (
        WHERE it.transaction_type ILIKE '%interest%'
        AND it.transaction_date >= DATE_TRUNC('year', CURRENT_DATE)
    ), 0) as ytd_interest_income,
    
    -- All-time totals
    COALESCE(SUM(it.amount) FILTER (WHERE it.transaction_type ILIKE '%dividend%'), 0) as lifetime_dividend_income,
    COALESCE(SUM(it.amount) FILTER (WHERE it.transaction_type ILIKE '%interest%'), 0) as lifetime_interest_income,
    
    -- Count of income-generating securities
    COUNT(DISTINCT it.symbol) FILTER (WHERE it.transaction_type ILIKE '%dividend%' OR it.transaction_type ILIKE '%interest%') as income_generating_holdings,
    
    -- First income date (for calculating income history)
    MIN(it.transaction_date) FILTER (WHERE it.transaction_type ILIKE '%dividend%' OR it.transaction_type ILIKE '%interest%') as first_income_date

FROM personal_finance.investment_transactions it
JOIN personal_finance.investment_accounts ia ON it.account_id = ia.id
GROUP BY ia.user_id, ia.currency, ia.country, ia.account_type;

COMMENT ON VIEW personal_finance.ai_portfolio_income IS 'Portfolio income summary for dividend/interest analysis';

-- Grant access
GRANT SELECT ON personal_finance.ai_portfolio_income TO authenticated;

-- ============================================================
-- VIEW: AI Security Performance
-- Purpose: Calculate returns for each security with transaction history
-- ============================================================

DROP VIEW IF EXISTS personal_finance.ai_security_performance CASCADE;

CREATE OR REPLACE VIEW personal_finance.ai_security_performance AS
WITH security_transactions AS (
    SELECT 
        ia.user_id,
        ia.currency,
        it.symbol,
        it.security_name,
        -- Total cost basis from purchases
        COALESCE(SUM(it.amount) FILTER (WHERE it.transaction_type ILIKE '%buy%' OR it.transaction_type ILIKE '%purchase%'), 0) as total_cost,
        -- Total proceeds from sales
        COALESCE(SUM(it.amount) FILTER (WHERE it.transaction_type ILIKE '%sell%'), 0) as total_proceeds,
        -- Total dividends received
        COALESCE(SUM(it.amount) FILTER (WHERE it.transaction_type ILIKE '%dividend%'), 0) as total_dividends,
        -- Total fees paid
        COALESCE(SUM(it.fees), 0) as total_fees,
        -- First and last transaction dates
        MIN(it.transaction_date) as first_transaction,
        MAX(it.transaction_date) as last_transaction
    FROM personal_finance.investment_transactions it
    JOIN personal_finance.investment_accounts ia ON it.account_id = ia.id
    WHERE it.symbol IS NOT NULL
    GROUP BY ia.user_id, ia.currency, it.symbol, it.security_name
),
current_holdings AS (
    SELECT 
        ia.user_id,
        ia.currency,
        h.symbol,
        h.market_value,
        h.book_value,
        h.gain_loss,
        h.units
    FROM personal_finance.holdings h
    JOIN personal_finance.investment_accounts ia ON h.account_id = ia.id
    WHERE h.units > 0
)
SELECT 
    st.user_id,
    st.currency,
    st.symbol,
    st.security_name,
    st.total_cost,
    st.total_proceeds,
    st.total_dividends,
    st.total_fees,
    COALESCE(ch.market_value, 0) as current_value,
    COALESCE(ch.units, 0) as current_units,
    
    -- Realized gain (from sales)
    (st.total_proceeds - (st.total_cost * (st.total_proceeds / NULLIF(st.total_cost + COALESCE(ch.market_value, 0), 0)))) as estimated_realized_gain,
    
    -- Unrealized gain (current holdings)
    COALESCE(ch.gain_loss, 0) as unrealized_gain,
    
    -- Total return = Dividends + Unrealized Gain + Realized Gains
    (st.total_dividends + COALESCE(ch.gain_loss, 0)) as total_return,
    
    -- Return percentage (if still holding)
    CASE 
        WHEN COALESCE(ch.book_value, st.total_cost - st.total_proceeds) > 0 
        THEN ROUND((
            (st.total_dividends + COALESCE(ch.gain_loss, 0)) / 
            COALESCE(ch.book_value, st.total_cost - st.total_proceeds) * 100
        )::NUMERIC, 2)
        ELSE 0
    END as total_return_percent,
    
    -- Holding period
    st.first_transaction,
    st.last_transaction,
    EXTRACT(MONTH FROM AGE(COALESCE(st.last_transaction, CURRENT_DATE), st.first_transaction)) + 
    (EXTRACT(YEAR FROM AGE(COALESCE(st.last_transaction, CURRENT_DATE), st.first_transaction)) * 12) as holding_months,
    
    -- Annualized return estimate
    CASE 
        WHEN COALESCE(ch.book_value, st.total_cost - st.total_proceeds) > 0 
            AND EXTRACT(YEAR FROM AGE(CURRENT_DATE, st.first_transaction)) > 0
        THEN ROUND((
            POWER(
                1 + ((st.total_dividends + COALESCE(ch.gain_loss, 0)) / COALESCE(ch.book_value, st.total_cost - st.total_proceeds)),
                1.0 / GREATEST(EXTRACT(YEAR FROM AGE(CURRENT_DATE, st.first_transaction)), 1)
            ) - 1
        ) * 100::NUMERIC, 2)
        ELSE NULL
    END as annualized_return_percent

FROM security_transactions st
LEFT JOIN current_holdings ch ON st.user_id = ch.user_id AND st.currency = ch.currency AND st.symbol = ch.symbol;

COMMENT ON VIEW personal_finance.ai_security_performance IS 'Security-level performance with transaction-based returns';

-- Grant access
GRANT SELECT ON personal_finance.ai_security_performance TO authenticated;
