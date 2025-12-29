-- Migration: Create AI Context Views
-- Date: 2025-12-16
-- Purpose: Pre-computed views for AI to answer user financial questions
-- 
-- AI SCOPE:
-- ✅ Investment suitability based on user's risk tolerance
-- ✅ "Can I afford X?" questions based on current data
-- ✅ Retirement income projections
-- ✅ Questions about user's own financial data
-- ✅ Canadian retirement benefits knowledge (CPP, OAS)
-- ❌ General market advice or specific ticker recommendations
-- ❌ Generic mutual fund/stock questions
--
-- IMPORTANT: All aggregates are grouped by currency to avoid mixing
-- different currencies (e.g., CAD + INR) in the same total.

-- ============================================================
-- CHART OF ACCOUNTS - Mortgage Categories
-- Run this once to ensure proper mortgage categorization
-- ============================================================

-- Create separate COA entries for primary vs investment property mortgages
-- Using INSERT WHERE NOT EXISTS to avoid duplicates
INSERT INTO personal_finance.chart_of_accounts (code, name, account_type, description)
SELECT '6100', 'Mortgage Payment - Primary Residence', 'Expense', 
       'Mortgage payments for primary residence. Include in personal living expenses.'
WHERE NOT EXISTS (SELECT 1 FROM personal_finance.chart_of_accounts WHERE code = '6100');

INSERT INTO personal_finance.chart_of_accounts (code, name, account_type, description)
SELECT '6110', 'Mortgage Payment - Investment Property', 'Expense', 
       'Mortgage payments for investment/rental properties. Net against rental income for true cash flow.'
WHERE NOT EXISTS (SELECT 1 FROM personal_finance.chart_of_accounts WHERE code = '6110');

INSERT INTO personal_finance.chart_of_accounts (code, name, account_type, description)
SELECT '4200', 'Rental Income - Investment Property', 'Income',
       'Rental income from investment properties. Net against investment property expenses.'
WHERE NOT EXISTS (SELECT 1 FROM personal_finance.chart_of_accounts WHERE code = '4200');

INSERT INTO personal_finance.chart_of_accounts (code, name, account_type, description)
SELECT '4150', 'Owner Draw / Business Income', 'Income',
       'Variable income from business ownership. Amount varies based on business performance and owner needs. Use ANNUAL totals, not monthly averages.'
WHERE NOT EXISTS (SELECT 1 FROM personal_finance.chart_of_accounts WHERE code = '4150');

-- ============================================================
-- DROP EXISTING VIEWS (to allow column changes)
-- ============================================================
DROP VIEW IF EXISTS personal_finance.ai_usage_instructions CASCADE;
DROP VIEW IF EXISTS personal_finance.ai_master_context CASCADE;
DROP VIEW IF EXISTS personal_finance.ai_user_multi_country_profile CASCADE;
DROP VIEW IF EXISTS personal_finance.ai_government_benefits_summary CASCADE;
DROP VIEW IF EXISTS personal_finance.ai_retirement_by_country CASCADE;
DROP VIEW IF EXISTS personal_finance.ai_risk_profile CASCADE;
DROP VIEW IF EXISTS personal_finance.ai_insurance_summary CASCADE;
DROP VIEW IF EXISTS personal_finance.ai_liability_summary CASCADE;
DROP VIEW IF EXISTS personal_finance.ai_property_summary CASCADE;
DROP VIEW IF EXISTS personal_finance.ai_income_breakdown CASCADE;
DROP VIEW IF EXISTS personal_finance.ai_expense_breakdown CASCADE;
DROP VIEW IF EXISTS personal_finance.ai_cash_flow_analysis CASCADE;
DROP VIEW IF EXISTS personal_finance.ai_portfolio_analysis CASCADE;
DROP VIEW IF EXISTS personal_finance.ai_net_worth_summary CASCADE;

-- ============================================================
-- VIEW 1: AI Net Worth Summary (by Currency)
-- Purpose: Total picture of user's assets and liabilities per currency
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.ai_net_worth_summary AS
WITH bank_totals AS (
  SELECT user_id, currency, SUM(balance) as total
  FROM personal_finance.accounts
  GROUP BY user_id, currency
),
investment_totals AS (
  SELECT ia.user_id, ia.currency, SUM(h.market_value) as total
  FROM personal_finance.holdings h
  JOIN personal_finance.investment_accounts ia ON h.account_id = ia.id
  WHERE h.units > 0
  GROUP BY ia.user_id, ia.currency
),
property_equity AS (
  SELECT 
    p.user_id, 
    p.currency,
    SUM(
      COALESCE(p.current_market_value, p.purchase_price) - 
      COALESCE((
        SELECT SUM(m.current_balance) 
        FROM personal_finance.mortgages m 
        WHERE m.property_id = p.id AND m.is_active = true
      ), 0)
    ) as total
  FROM personal_finance.properties p
  GROUP BY p.user_id, p.currency
),
insurance_cash AS (
  SELECT user_id, currency, SUM(COALESCE(surrender_value, 0)) as total
  FROM personal_finance.insurance_policies
  WHERE status = 'active'
  GROUP BY user_id, currency
),
mortgage_totals AS (
  SELECT user_id, currency, SUM(current_balance) as total
  FROM personal_finance.mortgages
  WHERE is_active = true
  GROUP BY user_id, currency
),
liability_totals AS (
  SELECT user_id, currency, SUM(current_balance) as total
  FROM personal_finance.liabilities
  WHERE is_active = true
  GROUP BY user_id, currency
),
all_currencies AS (
  SELECT DISTINCT user_id, currency FROM bank_totals
  UNION SELECT DISTINCT user_id, currency FROM investment_totals
  UNION SELECT DISTINCT user_id, currency FROM property_equity
  UNION SELECT DISTINCT user_id, currency FROM insurance_cash
  UNION SELECT DISTINCT user_id, currency FROM mortgage_totals
  UNION SELECT DISTINCT user_id, currency FROM liability_totals
)
SELECT 
  ac.user_id,
  ac.currency,
  
  -- ASSETS
  COALESCE(bt.total, 0) as bank_account_total,
  COALESCE(it.total, 0) as investment_portfolio_total,
  COALESCE(pe.total, 0) as property_equity_total,
  COALESCE(ic.total, 0) as insurance_cash_value,
  
  -- LIABILITIES
  COALESCE(mt.total, 0) as mortgage_total,
  COALESCE(lt.total, 0) as other_liabilities_total,
  
  -- NET WORTH (for this currency)
  (
    COALESCE(bt.total, 0) + 
    COALESCE(it.total, 0) + 
    COALESCE(pe.total, 0) + 
    COALESCE(ic.total, 0) - 
    COALESCE(lt.total, 0)
  ) as net_worth,
  
  NOW() as calculated_at

FROM all_currencies ac
LEFT JOIN bank_totals bt ON ac.user_id = bt.user_id AND ac.currency = bt.currency
LEFT JOIN investment_totals it ON ac.user_id = it.user_id AND ac.currency = it.currency
LEFT JOIN property_equity pe ON ac.user_id = pe.user_id AND ac.currency = pe.currency
LEFT JOIN insurance_cash ic ON ac.user_id = ic.user_id AND ac.currency = ic.currency
LEFT JOIN mortgage_totals mt ON ac.user_id = mt.user_id AND ac.currency = mt.currency
LEFT JOIN liability_totals lt ON ac.user_id = lt.user_id AND ac.currency = lt.currency;

COMMENT ON VIEW personal_finance.ai_net_worth_summary IS 'Net worth breakdown by currency for AI: assets, liabilities, and total net worth per currency';

-- ============================================================
-- VIEW 2: AI Portfolio Analysis (by Currency)
-- Purpose: Understand user's investment allocation and risk per currency
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.ai_portfolio_analysis AS
SELECT 
  ia.user_id,
  ia.currency,
  ia.country,
  
  -- Total portfolio value
  SUM(h.market_value) as total_portfolio_value,
  SUM(h.book_value) as total_book_value,
  SUM(h.gain_loss) as total_unrealized_gain,
  
  -- Asset class allocation (as percentages)
  ROUND((SUM(CASE WHEN h.asset_type = 'Stock' THEN h.market_value ELSE 0 END) * 100.0 / NULLIF(SUM(h.market_value), 0))::NUMERIC, 2) as stock_percent,
  ROUND((SUM(CASE WHEN h.asset_type = 'ETF' THEN h.market_value ELSE 0 END) * 100.0 / NULLIF(SUM(h.market_value), 0))::NUMERIC, 2) as etf_percent,
  ROUND((SUM(CASE WHEN h.asset_type = 'Mutual Fund' THEN h.market_value ELSE 0 END) * 100.0 / NULLIF(SUM(h.market_value), 0))::NUMERIC, 2) as mutual_fund_percent,
  ROUND((SUM(CASE WHEN h.asset_type = 'Bond' THEN h.market_value ELSE 0 END) * 100.0 / NULLIF(SUM(h.market_value), 0))::NUMERIC, 2) as bond_percent,
  ROUND((SUM(CASE WHEN h.asset_type = 'GIC' THEN h.market_value ELSE 0 END) * 100.0 / NULLIF(SUM(h.market_value), 0))::NUMERIC, 2) as gic_percent,
  ROUND((SUM(CASE WHEN h.asset_type = 'Cash' THEN h.market_value ELSE 0 END) * 100.0 / NULLIF(SUM(h.market_value), 0))::NUMERIC, 2) as cash_percent,
  
  -- Equity vs Fixed Income (simplified risk measure)
  ROUND((SUM(CASE WHEN h.asset_type IN ('Stock', 'ETF', 'Mutual Fund') THEN h.market_value ELSE 0 END) * 100.0 / NULLIF(SUM(h.market_value), 0))::NUMERIC, 2) as equity_allocation_percent,
  ROUND((SUM(CASE WHEN h.asset_type IN ('Bond', 'GIC', 'Cash') THEN h.market_value ELSE 0 END) * 100.0 / NULLIF(SUM(h.market_value), 0))::NUMERIC, 2) as fixed_income_allocation_percent,
  
  -- By account type (tax efficiency) - relevant to the country
  jsonb_build_object(
    'TFSA', COALESCE(SUM(CASE WHEN ia.account_type = 'TFSA' THEN h.market_value END), 0),
    'RRSP', COALESCE(SUM(CASE WHEN ia.account_type = 'RRSP' THEN h.market_value END), 0),
    'RRIF', COALESCE(SUM(CASE WHEN ia.account_type = 'RRIF' THEN h.market_value END), 0),
    'LIRA', COALESCE(SUM(CASE WHEN ia.account_type = 'LIRA' THEN h.market_value END), 0),
    'RESP', COALESCE(SUM(CASE WHEN ia.account_type = 'RESP' THEN h.market_value END), 0),
    'Non-Registered', COALESCE(SUM(CASE WHEN ia.account_type = 'Non-Registered' THEN h.market_value END), 0),
    'NPS', COALESCE(SUM(CASE WHEN ia.account_type = 'NPS' THEN h.market_value END), 0),
    'PPF', COALESCE(SUM(CASE WHEN ia.account_type = 'PPF' THEN h.market_value END), 0),
    'EPF', COALESCE(SUM(CASE WHEN ia.account_type = 'EPF' THEN h.market_value END), 0)
  ) as by_account_type,
  
  -- Number of holdings (diversification measure)
  COUNT(DISTINCT h.symbol) as number_of_holdings,
  COUNT(DISTINCT ia.id) as number_of_accounts,
  
  -- Performance
  CASE WHEN SUM(h.book_value) > 0 
    THEN ROUND(((SUM(h.gain_loss) / SUM(h.book_value)) * 100)::NUMERIC, 2) 
    ELSE 0 
  END as overall_return_percent

FROM personal_finance.holdings h
JOIN personal_finance.investment_accounts ia ON h.account_id = ia.id
WHERE h.units > 0
GROUP BY ia.user_id, ia.currency, ia.country;

COMMENT ON VIEW personal_finance.ai_portfolio_analysis IS 'Investment portfolio breakdown by currency/country for AI suitability analysis';

-- ============================================================
-- VIEW 3: AI Cash Flow Analysis (by Currency)
-- Purpose: Monthly income/expenses for affordability questions per currency
-- IMPORTANT: 
-- - Separates PRIMARY residence mortgage (true living expense) from 
--   INVESTMENT property mortgage (netted against rental income)
-- - Separates regular payments from lump-sum prepayments
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.ai_cash_flow_analysis AS
WITH expected_mortgage_primary AS (
  -- Expected annual mortgage for PRIMARY residence only
  SELECT 
    m.user_id,
    m.currency,
    SUM(
      mt.regular_payment_amount * 
      CASE mt.payment_frequency
        WHEN 'Monthly' THEN 12
        WHEN 'Bi-Weekly' THEN 26
        WHEN 'Accelerated Bi-Weekly' THEN 26
        WHEN 'Weekly' THEN 52
        ELSE 12
      END
    ) as annual_expected
  FROM personal_finance.mortgages m
  JOIN personal_finance.mortgage_terms mt ON m.id = mt.mortgage_id
  JOIN personal_finance.properties p ON m.property_id = p.id
  WHERE m.is_active = true AND mt.is_current_term = true
    AND p.is_primary_residence = true
  GROUP BY m.user_id, m.currency
),
expected_mortgage_investment AS (
  -- Expected annual mortgage for INVESTMENT properties
  SELECT 
    m.user_id,
    m.currency,
    SUM(
      mt.regular_payment_amount * 
      CASE mt.payment_frequency
        WHEN 'Monthly' THEN 12
        WHEN 'Bi-Weekly' THEN 26
        WHEN 'Accelerated Bi-Weekly' THEN 26
        WHEN 'Weekly' THEN 52
        ELSE 12
      END
    ) as annual_expected
  FROM personal_finance.mortgages m
  JOIN personal_finance.mortgage_terms mt ON m.id = mt.mortgage_id
  JOIN personal_finance.properties p ON m.property_id = p.id
  WHERE m.is_active = true AND mt.is_current_term = true
    AND p.is_primary_residence = false
  GROUP BY m.user_id, m.currency
),
expected_rental_income AS (
  -- Expected annual rental income from investment properties
  SELECT 
    p.user_id,
    COALESCE(p.currency, 'CAD') as currency,
    SUM(COALESCE(p.expected_monthly_rent, 0) * 12) as annual_expected
  FROM personal_finance.properties p
  WHERE p.is_primary_residence = false
  GROUP BY p.user_id, COALESCE(p.currency, 'CAD')
),
monthly_data AS (
  SELECT 
    t.user_id,
    t.currency,
    DATE_TRUNC('month', t.date)::DATE as month,
    
    -- INCOME BREAKDOWN
    -- Salary/Employment income (regular, predictable)
    SUM(CASE WHEN LOWER(coa.account_type) = 'income' 
             AND (LOWER(coa.name) LIKE '%salary%' OR LOWER(coa.name) LIKE '%wage%' 
                  OR LOWER(coa.name) LIKE '%employment%' OR LOWER(coa.name) LIKE '%payroll%')
        THEN ABS(t.amount) ELSE 0 END) as monthly_salary_income,
    -- Business/Owner Draw income (variable, use annual totals)
    SUM(CASE WHEN LOWER(coa.account_type) = 'income' 
             AND (LOWER(coa.name) LIKE '%owner%draw%' OR LOWER(coa.name) LIKE '%business%income%'
                  OR LOWER(coa.name) LIKE '%self-employ%' OR LOWER(coa.name) LIKE '%freelance%'
                  OR LOWER(coa.name) LIKE '%owner%' OR LOWER(coa.name) LIKE '%draw%')
        THEN ABS(t.amount) ELSE 0 END) as monthly_business_income,
    -- Other personal income (dividends, interest, etc. - excludes rental)
    SUM(CASE WHEN LOWER(coa.account_type) = 'income' 
             AND LOWER(coa.name) NOT LIKE '%rental%' 
             AND LOWER(coa.name) NOT LIKE '%rent%'
             AND LOWER(coa.name) NOT LIKE '%salary%' AND LOWER(coa.name) NOT LIKE '%wage%'
             AND LOWER(coa.name) NOT LIKE '%employment%' AND LOWER(coa.name) NOT LIKE '%payroll%'
             AND LOWER(coa.name) NOT LIKE '%owner%' AND LOWER(coa.name) NOT LIKE '%draw%'
             AND LOWER(coa.name) NOT LIKE '%business%income%' AND LOWER(coa.name) NOT LIKE '%self-employ%'
             AND LOWER(coa.name) NOT LIKE '%freelance%'
        THEN ABS(t.amount) ELSE 0 END) as monthly_other_income,
    -- Non-rental income total (salary + business + other)
    SUM(CASE WHEN LOWER(coa.account_type) = 'income' 
             AND LOWER(coa.name) NOT LIKE '%rental%' 
             AND LOWER(coa.name) NOT LIKE '%rent%'
        THEN ABS(t.amount) ELSE 0 END) as monthly_personal_income,
    -- Rental income
    SUM(CASE WHEN LOWER(coa.account_type) = 'income' 
             AND (LOWER(coa.name) LIKE '%rental%' OR LOWER(coa.name) LIKE '%rent%')
        THEN ABS(t.amount) ELSE 0 END) as monthly_rental_income,
    -- Total income
    SUM(CASE WHEN LOWER(coa.account_type) = 'income' THEN ABS(t.amount) ELSE 0 END) as monthly_income_total,
    
    -- EXPENSE BREAKDOWN
    -- Operating expenses (non-mortgage)
    SUM(CASE WHEN LOWER(coa.account_type) = 'expense' 
             AND LOWER(coa.name) NOT LIKE '%mortgage%'
        THEN ABS(t.amount) ELSE 0 END) as monthly_operating_expenses,
    -- Primary residence mortgage
    SUM(CASE WHEN LOWER(coa.account_type) = 'expense' 
             AND LOWER(coa.name) LIKE '%mortgage%primary%'
        THEN ABS(t.amount) ELSE 0 END) as monthly_mortgage_primary,
    -- Investment property mortgage  
    SUM(CASE WHEN LOWER(coa.account_type) = 'expense' 
             AND LOWER(coa.name) LIKE '%mortgage%investment%'
        THEN ABS(t.amount) ELSE 0 END) as monthly_mortgage_investment,
    -- Generic mortgage (old category - for backwards compatibility)
    SUM(CASE WHEN LOWER(coa.account_type) = 'expense' 
             AND LOWER(coa.name) LIKE '%mortgage%'
             AND LOWER(coa.name) NOT LIKE '%primary%'
             AND LOWER(coa.name) NOT LIKE '%investment%'
        THEN ABS(t.amount) ELSE 0 END) as monthly_mortgage_generic
        
  FROM personal_finance.transactions t
  LEFT JOIN personal_finance.chart_of_accounts coa ON t.chart_of_account_id = coa.id
  WHERE t.date >= CURRENT_DATE - INTERVAL '18 months'
    AND (coa.account_type IS NULL OR LOWER(coa.account_type) NOT IN ('transfer'))
    AND (coa.name IS NULL OR LOWER(coa.name) != 'suspense')
  GROUP BY t.user_id, t.currency, DATE_TRUNC('month', t.date)
),
recent_12mo AS (
  SELECT 
    user_id,
    currency,
    -- Income by type
    SUM(monthly_salary_income) as annual_salary_income,
    SUM(monthly_business_income) as annual_business_income,
    SUM(monthly_other_income) as annual_other_income,
    SUM(monthly_personal_income) as annual_personal_income,
    SUM(monthly_rental_income) as annual_rental_income_actual,
    SUM(monthly_income_total) as annual_income_total,
    -- Averages (note: business income avg is misleading - use annual)
    AVG(monthly_salary_income) as avg_monthly_salary_income,
    AVG(monthly_business_income) as avg_monthly_business_income,
    AVG(monthly_personal_income) as avg_monthly_personal_income,
    AVG(monthly_rental_income) as avg_monthly_rental_income,
    -- Variability check for business income
    STDDEV(monthly_business_income) as stddev_business_income,
    -- Expenses
    SUM(monthly_operating_expenses) as annual_operating_expenses,
    SUM(monthly_mortgage_primary) as annual_mortgage_primary_actual,
    SUM(monthly_mortgage_investment) as annual_mortgage_investment_actual,
    SUM(monthly_mortgage_generic) as annual_mortgage_generic,
    AVG(monthly_operating_expenses) as avg_monthly_operating_expenses
  FROM monthly_data
  WHERE month >= CURRENT_DATE - INTERVAL '12 months'
  GROUP BY user_id, currency
)
SELECT 
  r.user_id,
  r.currency,
  
  -- === INCOME TYPE BREAKDOWN ===
  -- Salary (regular, predictable - safe to use monthly avg)
  ROUND(r.annual_salary_income::NUMERIC, 2) as annual_salary_income,
  ROUND(r.avg_monthly_salary_income::NUMERIC, 2) as avg_monthly_salary_income,
  
  -- Business/Owner Draw (variable - USE ANNUAL, not monthly avg)
  ROUND(r.annual_business_income::NUMERIC, 2) as annual_business_income,
  ROUND((r.annual_business_income / 12)::NUMERIC, 2) as monthly_business_income_normalized,
  -- Flag if business income is highly variable (stddev > 50% of avg)
  CASE WHEN r.avg_monthly_business_income > 0 
       AND r.stddev_business_income / NULLIF(r.avg_monthly_business_income, 0) > 0.5
       THEN true ELSE false END as business_income_is_variable,
  
  -- Other income (dividends, interest, etc.)
  ROUND(r.annual_other_income::NUMERIC, 2) as annual_other_income,
  
  -- === PERSONAL CASH FLOW (what matters for affordability) ===
  -- Total personal income (salary + business + other, excludes rental)
  ROUND(r.annual_personal_income::NUMERIC, 2) as annual_personal_income,
  -- For business owners: use annual/12 instead of avg (avg is misleading)
  ROUND(CASE 
    WHEN r.annual_business_income > r.annual_salary_income 
    THEN r.annual_personal_income / 12  -- Business owner: normalize annual
    ELSE r.avg_monthly_personal_income  -- Salaried: use actual avg
  END::NUMERIC, 2) as avg_monthly_personal_income,
  
  -- Personal expenses = operating + primary mortgage
  ROUND((r.avg_monthly_operating_expenses + COALESCE(emp.annual_expected, 0) / 12)::NUMERIC, 2) as avg_monthly_personal_expenses,
  ROUND((r.annual_operating_expenses + COALESCE(emp.annual_expected, 0))::NUMERIC, 2) as annual_personal_expenses,
  
  -- Personal surplus (what you can save/invest)
  -- For business owners: use annual income / 12 for fair comparison
  ROUND(CASE 
    WHEN r.annual_business_income > r.annual_salary_income 
    THEN (r.annual_personal_income / 12) - r.avg_monthly_operating_expenses - COALESCE(emp.annual_expected, 0) / 12
    ELSE r.avg_monthly_personal_income - r.avg_monthly_operating_expenses - COALESCE(emp.annual_expected, 0) / 12
  END::NUMERIC, 2) as avg_monthly_personal_surplus,
  
  -- === INVESTMENT PROPERTY CASH FLOW (separate business) ===
  -- Rental income
  ROUND(r.avg_monthly_rental_income::NUMERIC, 2) as avg_monthly_rental_income,
  ROUND(r.annual_rental_income_actual::NUMERIC, 2) as annual_rental_income_actual,
  ROUND(COALESCE(eri.annual_expected, 0)::NUMERIC, 2) as annual_rental_income_expected,
  
  -- Investment mortgage
  ROUND(COALESCE(emi.annual_expected, 0)::NUMERIC, 2) as annual_mortgage_investment_expected,
  ROUND(r.annual_mortgage_investment_actual::NUMERIC, 2) as annual_mortgage_investment_actual,
  
  -- Net rental cash flow = rental income - investment mortgage
  ROUND((r.annual_rental_income_actual - COALESCE(emi.annual_expected, 0))::NUMERIC, 2) as annual_rental_net_cash_flow,
  
  -- === MORTGAGE PREPAYMENTS (debt reduction, not expense) ===
  ROUND((r.annual_mortgage_primary_actual + r.annual_mortgage_generic - COALESCE(emp.annual_expected, 0))::NUMERIC, 2) as annual_mortgage_prepayments_primary,
  ROUND((r.annual_mortgage_investment_actual - COALESCE(emi.annual_expected, 0))::NUMERIC, 2) as annual_mortgage_prepayments_investment,
  
  -- === TOTALS (for reference) ===
  ROUND(r.annual_income_total::NUMERIC, 2) as annual_income_total,
  ROUND((r.annual_operating_expenses + COALESCE(emp.annual_expected, 0) + COALESCE(emi.annual_expected, 0))::NUMERIC, 2) as annual_expenses_total_expected,
  
  -- Savings rate based on PERSONAL income and expenses only
  CASE WHEN r.annual_personal_income > 0 
    THEN ROUND((((r.annual_personal_income - r.annual_operating_expenses - COALESCE(emp.annual_expected, 0)) / r.annual_personal_income) * 100)::NUMERIC, 2)
    ELSE 0 
  END as savings_rate_percent,
  
  -- === INCOME TYPE FLAG ===
  CASE 
    WHEN r.annual_business_income > r.annual_salary_income THEN 'business_owner'
    WHEN r.annual_salary_income > 0 THEN 'salaried'
    ELSE 'other'
  END as income_type,
  
  -- === AI GUIDANCE ===
  CASE 
    WHEN r.annual_business_income > r.annual_salary_income
    THEN 'BUSINESS OWNER: Income is variable (owner draws). Use ANNUAL totals, not monthly averages. Monthly avg is misleading - some months may show $0 income with large draws in others.'
    WHEN COALESCE(eri.annual_expected, 0) > 0 AND COALESCE(emi.annual_expected, 0) > 0
    THEN 'User has investment properties. Use PERSONAL income/expenses for affordability. Rental net cash flow shows investment property performance separately.'
    WHEN r.annual_mortgage_primary_actual + r.annual_mortgage_generic - COALESCE(emp.annual_expected, 0) > 10000 
    THEN 'Large mortgage prepayment detected on primary residence. This is debt reduction, not recurring expense.'
    ELSE 'Standard cash flow - personal income covers personal expenses.'
  END as ai_expense_note,
  
  -- Data quality
  (SELECT MIN(month) FROM monthly_data md WHERE md.user_id = r.user_id AND md.currency = r.currency) as data_from,
  (SELECT MAX(month) FROM monthly_data md WHERE md.user_id = r.user_id AND md.currency = r.currency) as data_to,
  (SELECT COUNT(DISTINCT month) FROM monthly_data md WHERE md.user_id = r.user_id AND md.currency = r.currency) as months_of_data

FROM recent_12mo r
LEFT JOIN expected_mortgage_primary emp ON r.user_id = emp.user_id AND r.currency = emp.currency
LEFT JOIN expected_mortgage_investment emi ON r.user_id = emi.user_id AND r.currency = emi.currency
LEFT JOIN expected_rental_income eri ON r.user_id = eri.user_id AND r.currency = eri.currency;

COMMENT ON VIEW personal_finance.ai_cash_flow_analysis IS 'Income/expense analysis by currency. Separates PERSONAL cash flow (salary - living expenses) from INVESTMENT PROPERTY cash flow (rental income - investment mortgage). Mortgage prepayments shown separately as they are debt reduction, not recurring expenses.';

-- ============================================================
-- VIEW 4: AI Expense Breakdown by Chart of Account (by Currency)
-- Purpose: Understand spending patterns using COA descriptions per currency
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.ai_expense_breakdown AS
SELECT 
  t.user_id,
  t.currency,
  coa.code as account_code,
  coa.name as account_name,
  coa.description as account_description,
  
  -- Total and average for this category
  SUM(ABS(t.amount)) as total_amount_12mo,
  ROUND(AVG(ABS(t.amount))::NUMERIC, 2) as avg_transaction_amount,
  ROUND((SUM(ABS(t.amount)) / 12)::NUMERIC, 2) as avg_monthly_amount,
  COUNT(*) as transaction_count,
  
  -- Percentage of total expenses (in same currency)
  ROUND((SUM(ABS(t.amount)) * 100.0 / NULLIF((
    SELECT SUM(ABS(t2.amount)) 
    FROM personal_finance.transactions t2 
    JOIN personal_finance.chart_of_accounts coa2 ON t2.chart_of_account_id = coa2.id
    WHERE t2.user_id = t.user_id 
    AND t2.currency = t.currency
    AND LOWER(coa2.account_type) = 'expense'
    AND LOWER(coa2.name) != 'suspense'
    AND t2.date >= CURRENT_DATE - INTERVAL '12 months'
  ), 0))::NUMERIC, 2) as percent_of_total_expenses,
  
  -- Classification for AI understanding
  CASE 
    WHEN coa.name ILIKE ANY(ARRAY['%mortgage%', '%rent%', '%utilities%', '%insurance%', '%groceries%', '%healthcare%', '%medical%', '%property tax%'])
      THEN 'Essential'
    WHEN coa.name ILIKE ANY(ARRAY['%dining%', '%entertainment%', '%shopping%', '%travel%', '%subscription%', '%hobby%'])
      THEN 'Discretionary'
    WHEN coa.name ILIKE ANY(ARRAY['%investment%', '%rrsp%', '%tfsa%', '%savings%'])
      THEN 'Savings/Investment'
    ELSE 'Other'
  END as expense_type

FROM personal_finance.transactions t
JOIN personal_finance.chart_of_accounts coa ON t.chart_of_account_id = coa.id
WHERE LOWER(coa.account_type) = 'expense'
  AND LOWER(coa.name) != 'suspense'
  AND t.date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY t.user_id, t.currency, coa.code, coa.name, coa.description
ORDER BY total_amount_12mo DESC;

COMMENT ON VIEW personal_finance.ai_expense_breakdown IS 'Expense breakdown by Chart of Account and currency for AI spending analysis';

-- ============================================================
-- VIEW 5: AI Income Breakdown by Chart of Account (by Currency)
-- Purpose: Understand income sources using COA descriptions per currency
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.ai_income_breakdown AS
SELECT 
  t.user_id,
  t.currency,
  coa.code as account_code,
  coa.name as account_name,
  coa.description as account_description,
  
  -- Total and average for this source
  SUM(ABS(t.amount)) as total_amount_12mo,
  ROUND((SUM(ABS(t.amount)) / 12)::NUMERIC, 2) as avg_monthly_amount,
  COUNT(*) as transaction_count,
  
  -- Percentage of total income (in same currency)
  ROUND((SUM(ABS(t.amount)) * 100.0 / NULLIF((
    SELECT SUM(ABS(t2.amount)) 
    FROM personal_finance.transactions t2 
    JOIN personal_finance.chart_of_accounts coa2 ON t2.chart_of_account_id = coa2.id
    WHERE t2.user_id = t.user_id 
    AND t2.currency = t.currency
    AND LOWER(coa2.account_type) = 'income'
    AND LOWER(coa2.name) != 'suspense'
    AND t2.date >= CURRENT_DATE - INTERVAL '12 months'
  ), 0))::NUMERIC, 2) as percent_of_total_income,
  
  -- Classification for AI
  CASE 
    WHEN coa.name ILIKE ANY(ARRAY['%salary%', '%wage%', '%employment%', '%payroll%'])
      THEN 'Employment Income'
    WHEN coa.name ILIKE ANY(ARRAY['%dividend%', '%interest%', '%capital gain%'])
      THEN 'Investment Income'
    WHEN coa.name ILIKE ANY(ARRAY['%rental%', '%rent received%'])
      THEN 'Rental Income'
    WHEN coa.name ILIKE ANY(ARRAY['%cpp%', '%oas%', '%pension%', '%retirement%'])
      THEN 'Government/Pension'
    WHEN coa.name ILIKE ANY(ARRAY['%business%', '%self-employ%', '%freelance%'])
      THEN 'Business/Self-Employment'
    ELSE 'Other Income'
  END as income_type

FROM personal_finance.transactions t
JOIN personal_finance.chart_of_accounts coa ON t.chart_of_account_id = coa.id
WHERE LOWER(coa.account_type) = 'income'
  AND LOWER(coa.name) != 'suspense'
  AND t.date >= CURRENT_DATE - INTERVAL '12 months'
GROUP BY t.user_id, t.currency, coa.code, coa.name, coa.description
ORDER BY total_amount_12mo DESC;

COMMENT ON VIEW personal_finance.ai_income_breakdown IS 'Income breakdown by Chart of Account and currency for AI income analysis';

-- ============================================================
-- VIEW 6: AI Property Summary (by Currency)
-- Purpose: Real estate holdings and rental income per currency
-- Note: Properties assume local currency. Uses property currency or defaults to CAD.
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.ai_property_summary AS
WITH property_data AS (
  SELECT 
    p.user_id,
    COALESCE(p.currency, 'CAD') as currency,
    p.id as property_id,
    p.is_primary_residence,
    COALESCE(p.current_market_value, p.purchase_price) as market_value,
    p.purchase_price,
    COALESCE(p.expected_monthly_rent, 0) as monthly_rent,
    COALESCE(p.property_tax_annual, 0) as property_tax,
    COALESCE(p.property_insurance_annual, 0) as insurance,
    COALESCE(p.hoa_monthly, 0) as hoa_monthly,
    COALESCE((
      SELECT SUM(m.current_balance) 
      FROM personal_finance.mortgages m 
      WHERE m.property_id = p.id AND m.is_active = true
    ), 0) as mortgage_balance,
    COALESCE((
      SELECT SUM(
        mt.regular_payment_amount * 
        CASE mt.payment_frequency
          WHEN 'Monthly' THEN 12
          WHEN 'Bi-Weekly' THEN 26
          WHEN 'Accelerated Bi-Weekly' THEN 26
          WHEN 'Weekly' THEN 52
          ELSE 12
        END
      )
      FROM personal_finance.mortgages m
      JOIN personal_finance.mortgage_terms mt ON m.id = mt.mortgage_id
      WHERE m.property_id = p.id AND m.is_active = true AND mt.is_current_term = true
    ), 0) as annual_mortgage_payment
  FROM personal_finance.properties p
)
SELECT 
  pd.user_id,
  pd.currency,
  
  -- Property counts
  COUNT(*) as total_properties,
  COUNT(CASE WHEN pd.is_primary_residence THEN 1 END) as primary_residences,
  COUNT(CASE WHEN NOT pd.is_primary_residence THEN 1 END) as investment_properties,
  
  -- Values
  SUM(pd.market_value) as total_property_value,
  SUM(pd.purchase_price) as total_purchase_price,
  SUM(pd.market_value - pd.purchase_price) as total_appreciation,
  
  -- Equity (property value - mortgages)
  SUM(pd.market_value - pd.mortgage_balance) as total_equity,
  
  -- Mortgage debt
  SUM(pd.mortgage_balance) as total_mortgage_balance,
  
  -- Annual income from rentals
  SUM(pd.monthly_rent) * 12 as annual_rental_income,
  
  -- Annual carrying costs
  SUM(pd.property_tax + pd.insurance + pd.hoa_monthly * 12) as annual_carrying_costs_excluding_mortgage,
  
  -- Annual mortgage payments
  SUM(pd.annual_mortgage_payment) as annual_mortgage_payments

FROM property_data pd
GROUP BY pd.user_id, pd.currency;

COMMENT ON VIEW personal_finance.ai_property_summary IS 'Property holdings summary by currency for AI real estate analysis';

-- ============================================================
-- VIEW 7: AI Liability Summary (by Currency)
-- Purpose: All debts for debt-to-income and affordability per currency
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.ai_liability_summary AS
SELECT 
  l.user_id,
  l.currency,
  
  -- Total debt
  SUM(l.current_balance) as total_debt,
  
  -- By type
  SUM(CASE WHEN l.liability_type = 'Mortgage' THEN l.current_balance ELSE 0 END) as mortgage_debt,
  SUM(CASE WHEN l.liability_type = 'Car Loan' THEN l.current_balance ELSE 0 END) as car_loan_debt,
  SUM(CASE WHEN l.liability_type = 'Student Loan' THEN l.current_balance ELSE 0 END) as student_loan_debt,
  SUM(CASE WHEN l.liability_type = 'Credit Card' THEN l.current_balance ELSE 0 END) as credit_card_debt,
  SUM(CASE WHEN l.liability_type = 'Line of Credit' THEN l.current_balance ELSE 0 END) as line_of_credit_debt,
  SUM(CASE WHEN l.liability_type IN ('Personal Loan', 'Family Loan', 'Tax Owing', 'Other') THEN l.current_balance ELSE 0 END) as other_debt,
  
  -- Annual payment obligations
  SUM(
    COALESCE(l.minimum_payment, 0) * 
    CASE l.payment_frequency
      WHEN 'Monthly' THEN 12
      WHEN 'Bi-Weekly' THEN 26
      WHEN 'Weekly' THEN 52
      ELSE 12
    END
  ) as annual_debt_payments,
  
  -- Monthly payment obligations
  ROUND((SUM(
    COALESCE(l.minimum_payment, 0) * 
    CASE l.payment_frequency
      WHEN 'Monthly' THEN 1
      WHEN 'Bi-Weekly' THEN 26.0/12
      WHEN 'Weekly' THEN 52.0/12
      ELSE 1
    END
  ))::NUMERIC, 2) as monthly_debt_payments,
  
  -- Weighted average interest rate
  ROUND((
    SUM(l.current_balance * COALESCE(l.interest_rate, 0)) / NULLIF(SUM(l.current_balance), 0)
  )::NUMERIC, 2) as weighted_avg_interest_rate,
  
  -- Count of active debts
  COUNT(*) as number_of_debts,
  
  -- Revolving vs installment
  SUM(CASE WHEN l.liability_type IN ('Credit Card', 'Line of Credit') THEN l.current_balance ELSE 0 END) as revolving_debt,
  SUM(CASE WHEN l.liability_type NOT IN ('Credit Card', 'Line of Credit') THEN l.current_balance ELSE 0 END) as installment_debt

FROM personal_finance.liabilities l
WHERE l.is_active = true
GROUP BY l.user_id, l.currency;

COMMENT ON VIEW personal_finance.ai_liability_summary IS 'Liability summary by currency for AI debt and affordability analysis';

-- ============================================================
-- VIEW 8: AI Insurance Coverage (by Currency/Country)
-- Purpose: Life insurance and protection analysis per currency
-- NOTE: For detailed LIC policy analysis, use ai_lic_policy_analysis view
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.ai_insurance_summary AS
SELECT 
  ip.user_id,
  ip.currency,
  COALESCE(ip.country, 'IN') as country,
  
  -- Life coverage (plan_type values: Endowment, Term, ULIP, Money Back, Whole Life)
  SUM(CASE WHEN ip.plan_type IN ('Term', 'Whole Life', 'ULIP', 'Endowment', 'Money Back', 'Endowment-Whole-Life') THEN ip.sum_assured ELSE 0 END) as total_life_coverage,
  
  -- Cash value (for permanent policies)
  SUM(COALESCE(ip.surrender_value, 0)) as total_cash_value,
  
  -- Annual premium cost
  SUM(
    ip.premium_amount * 
    CASE ip.premium_frequency
      WHEN 'monthly' THEN 12
      WHEN 'quarterly' THEN 4
      WHEN 'half_yearly' THEN 2
      WHEN 'annual' THEN 1
      WHEN 'single' THEN 0  -- One-time premium
      ELSE 1
    END
  ) as annual_premium_cost,
  
  -- Policy counts by type
  COUNT(CASE WHEN ip.plan_type = 'Term' THEN 1 END) as term_life_policies,
  COUNT(CASE WHEN ip.plan_type IN ('Whole Life', 'Endowment-Whole-Life') THEN 1 END) as whole_life_policies,
  COUNT(CASE WHEN ip.plan_type = 'ULIP' THEN 1 END) as ulip_policies,
  COUNT(CASE WHEN ip.plan_type = 'Endowment' THEN 1 END) as endowment_policies,
  COUNT(CASE WHEN ip.plan_type = 'Money Back' THEN 1 END) as money_back_policies,
  COUNT(*) as total_policies,
  
  -- Survival benefits (LIC endowment payouts) - what user receives as CASH
  SUM(COALESCE(ip.survival_benefit_amount, ip.expected_maturity_value, 0)) as total_survival_benefit_expected,
  
  -- Policies with extended life cover (Jeevan Anand style)
  COUNT(CASE WHEN ip.has_extended_life_cover = TRUE THEN 1 END) as policies_with_extended_cover,
  
  -- Legacy field for backwards compatibility
  SUM(COALESCE(ip.expected_maturity_value, 0)) as total_maturity_value

FROM personal_finance.insurance_policies ip
WHERE ip.status = 'active'
GROUP BY ip.user_id, ip.currency, COALESCE(ip.country, 'IN');

COMMENT ON VIEW personal_finance.ai_insurance_summary IS 
'Insurance coverage summary by currency/country.

IMPORTANT FOR INDIAN LIC POLICIES:
- total_survival_benefit_expected = CASH user will receive (Sum Assured + Bonuses)
- policies_with_extended_cover = policies where life cover continues AFTER survival payout
- For DETAILED per-policy analysis, use ai_lic_policy_analysis view

LIC Jeevan Anand: User receives survival_benefit + gets life cover until age 100.
Total potential value = survival_benefit + sum_assured (if death after survival payout).';

-- ============================================================
-- VIEW 9: AI Risk Profile (by Currency)
-- Purpose: Determine user's financial health indicators per currency
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.ai_risk_profile AS
SELECT 
  up.user_id,
  up.preferred_currency as currency,
  up.risk_tolerance,
  up.country,
  
  -- Age and time horizon
  EXTRACT(YEAR FROM AGE(NOW(), up.date_of_birth))::INTEGER as current_age,
  up.expected_retirement_age,
  up.expected_retirement_age - EXTRACT(YEAR FROM AGE(NOW(), up.date_of_birth))::INTEGER as years_to_retirement,
  
  -- Emergency fund coverage (months of expenses) - in preferred currency only
  ROUND((
    COALESCE((
      SELECT SUM(a.balance) 
      FROM personal_finance.accounts a 
      WHERE a.user_id = up.user_id 
      AND a.type IN ('checking', 'savings')
      AND a.currency = up.preferred_currency
    ), 0) / NULLIF((
      SELECT AVG(monthly_expenses) 
      FROM (
        SELECT t.user_id, DATE_TRUNC('month', t.date) as month, 
               SUM(ABS(t.amount)) as monthly_expenses
        FROM personal_finance.transactions t
        JOIN personal_finance.chart_of_accounts coa ON t.chart_of_account_id = coa.id
        WHERE LOWER(coa.account_type) = 'expense'
        AND LOWER(coa.name) != 'suspense'
        AND t.currency = up.preferred_currency
        AND t.date >= CURRENT_DATE - INTERVAL '6 months'
        GROUP BY t.user_id, DATE_TRUNC('month', t.date)
      ) sub
      WHERE sub.user_id = up.user_id
    ), 0)
  )::NUMERIC, 1) as emergency_fund_months,
  
  -- Debt-to-income ratio (annual debt payments / annual income) - in preferred currency
  ROUND((
    COALESCE((
      SELECT SUM(COALESCE(l.minimum_payment, 0) * 12)
      FROM personal_finance.liabilities l 
      WHERE l.user_id = up.user_id 
      AND l.is_active = true
      AND l.currency = up.preferred_currency
    ), 0) / NULLIF(up.current_annual_income, 0) * 100
  )::NUMERIC, 2) as debt_to_income_percent,
  
  -- RRSP/TFSA room available (Canada specific)
  up.rrsp_contribution_room,
  up.tfsa_contribution_room

FROM personal_finance.user_profile up;

COMMENT ON VIEW personal_finance.ai_risk_profile IS 'User risk profile by preferred currency for AI investment suitability assessment';

-- ============================================================
-- VIEW 10: AI Retirement Assets by Country
-- Purpose: Show retirement-relevant assets per country for multi-country planning
-- The AI should ask WHERE the user wants to retire and for how long
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.ai_retirement_by_country AS
WITH country_portfolios AS (
  SELECT 
    ia.user_id,
    ia.country,
    ia.currency,
    SUM(h.market_value) as portfolio_value,
    SUM(h.book_value) as book_value,
    SUM(h.gain_loss) as unrealized_gain,
    -- Tax-advantaged by country
    SUM(CASE WHEN ia.account_type IN ('RRSP', 'TFSA', 'RRIF', 'LIRA', 'RESP') THEN h.market_value ELSE 0 END) as canada_registered,
    SUM(CASE WHEN ia.account_type IN ('NPS', 'PPF', 'EPF') THEN h.market_value ELSE 0 END) as india_registered,
    SUM(CASE WHEN ia.account_type = 'Non-Registered' THEN h.market_value ELSE 0 END) as non_registered
  FROM personal_finance.holdings h
  JOIN personal_finance.investment_accounts ia ON h.account_id = ia.id
  WHERE h.units > 0
  GROUP BY ia.user_id, ia.country, ia.currency
),
country_cash AS (
  SELECT user_id, currency, 
         CASE 
           WHEN currency = 'CAD' THEN 'CA'
           WHEN currency = 'INR' THEN 'IN'
           WHEN currency = 'USD' THEN 'US'
           ELSE 'Other'
         END as country,
         SUM(balance) as cash_balance
  FROM personal_finance.accounts
  WHERE type IN ('checking', 'savings')
  GROUP BY user_id, currency
),
country_property AS (
  SELECT 
    p.user_id,
    COALESCE(p.currency, 'CAD') as currency,
    CASE 
      WHEN COALESCE(p.currency, 'CAD') = 'CAD' THEN 'CA'
      WHEN COALESCE(p.currency, 'CAD') = 'INR' THEN 'IN'
      WHEN COALESCE(p.currency, 'CAD') = 'USD' THEN 'US'
      ELSE 'Other'
    END as country,
    SUM(COALESCE(p.current_market_value, p.purchase_price)) as property_value,
    SUM(
      COALESCE(p.current_market_value, p.purchase_price) - 
      COALESCE((SELECT SUM(m.current_balance) FROM personal_finance.mortgages m WHERE m.property_id = p.id AND m.is_active = true), 0)
    ) as property_equity,
    SUM(COALESCE(p.expected_monthly_rent, 0)) * 12 as annual_rental_income
  FROM personal_finance.properties p
  GROUP BY p.user_id, COALESCE(p.currency, 'CAD')
),
country_insurance AS (
  SELECT 
    user_id, 
    country,
    currency,
    SUM(COALESCE(expected_maturity_value, 0)) as maturity_value,
    SUM(COALESCE(surrender_value, 0)) as surrender_value
  FROM personal_finance.insurance_policies
  WHERE status = 'active'
  GROUP BY user_id, country, currency
)
SELECT 
  cp.user_id,
  cp.country,
  cp.currency,
  
  -- Portfolio assets
  COALESCE(cp.portfolio_value, 0) as investment_portfolio,
  COALESCE(cp.canada_registered, 0) as canada_tax_advantaged,
  COALESCE(cp.india_registered, 0) as india_tax_advantaged,
  COALESCE(cp.non_registered, 0) as non_registered,
  
  -- Cash
  COALESCE(cc.cash_balance, 0) as cash_and_savings,
  
  -- Property
  COALESCE(cpr.property_value, 0) as real_estate_value,
  COALESCE(cpr.property_equity, 0) as real_estate_equity,
  COALESCE(cpr.annual_rental_income, 0) as rental_income_annual,
  
  -- Insurance maturity
  COALESCE(ci.maturity_value, 0) as insurance_maturity_value,
  COALESCE(ci.surrender_value, 0) as insurance_cash_value,
  
  -- Total liquid + semi-liquid assets in this country
  (COALESCE(cp.portfolio_value, 0) + COALESCE(cc.cash_balance, 0) + COALESCE(ci.surrender_value, 0)) as total_liquid_assets,
  
  -- Total net assets in this country
  (COALESCE(cp.portfolio_value, 0) + COALESCE(cc.cash_balance, 0) + COALESCE(cpr.property_equity, 0) + COALESCE(ci.surrender_value, 0)) as total_net_assets

FROM country_portfolios cp
LEFT JOIN country_cash cc ON cp.user_id = cc.user_id AND cp.country = cc.country
LEFT JOIN country_property cpr ON cp.user_id = cpr.user_id AND cp.country = cpr.country
LEFT JOIN country_insurance ci ON cp.user_id = ci.user_id AND cp.country = ci.country;

COMMENT ON VIEW personal_finance.ai_retirement_by_country IS 'Retirement assets broken down by country - AI should ask user where they plan to retire and for how many months per year';

-- ============================================================
-- VIEW 11: AI Government Benefits by Country
-- Purpose: Show expected government benefits per country
-- Note: This is a placeholder - actual benefits should be entered by user
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.ai_government_benefits_summary AS
SELECT 
  up.user_id,
  'CA' as country,
  'CAD' as currency,
  65 as cpp_start_age,
  0::NUMERIC as cpp_monthly,
  0::NUMERIC as cpp_annual,
  65 as oas_start_age,
  0::NUMERIC as oas_monthly,
  0::NUMERIC as oas_annual,
  0::NUMERIC as total_guaranteed_annual_ca
FROM personal_finance.user_profile up;

COMMENT ON VIEW personal_finance.ai_government_benefits_summary IS 'Government retirement benefits placeholder - user should enter their CPP/OAS estimates';

-- ============================================================
-- VIEW 12: AI User Profile with Multi-Country Context
-- Purpose: User profile with summary of which countries they have assets in
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.ai_user_multi_country_profile AS
SELECT 
  up.user_id,
  
  -- Basic profile
  EXTRACT(YEAR FROM AGE(NOW(), up.date_of_birth))::INTEGER as current_age,
  up.expected_retirement_age,
  up.expected_retirement_age - EXTRACT(YEAR FROM AGE(NOW(), up.date_of_birth))::INTEGER as years_to_retirement,
  up.life_expectancy,
  up.risk_tolerance,
  up.country as primary_residence_country,
  up.preferred_currency,
  
  -- Countries with assets (for AI to know what to ask about)
  (
    SELECT jsonb_agg(DISTINCT jsonb_build_object(
      'country', sub.country,
      'currency', sub.currency,
      'total_assets', sub.total_net_assets
    ))
    FROM personal_finance.ai_retirement_by_country sub
    WHERE sub.user_id = up.user_id
  ) as assets_by_country,
  
  -- Quick summary: which countries have significant assets
  (
    SELECT array_agg(DISTINCT country)
    FROM personal_finance.ai_retirement_by_country
    WHERE user_id = up.user_id AND total_net_assets > 0
  ) as countries_with_assets,
  
  -- Canadian contribution room (if applicable)
  up.rrsp_contribution_room,
  up.tfsa_contribution_room,
  
  -- Desired retirement income (in preferred currency)
  up.desired_retirement_income,
  up.current_annual_income

FROM personal_finance.user_profile up;

COMMENT ON VIEW personal_finance.ai_user_multi_country_profile IS 'User profile showing all countries where they have assets - AI should ask about retirement location preferences';

-- ============================================================
-- MASTER VIEW: AI User Financial Context (by Currency)
-- Purpose: Single view with all key metrics for AI per currency
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.ai_master_context AS
SELECT 
  up.user_id,
  up.preferred_currency as currency,
  
  -- PROFILE
  EXTRACT(YEAR FROM AGE(NOW(), up.date_of_birth))::INTEGER as age,
  up.province,
  up.country,
  up.marital_status,
  up.employment_status,
  up.current_annual_income,
  up.expected_retirement_age,
  up.risk_tolerance,
  
  -- NET WORTH (in preferred currency)
  nw.net_worth,
  nw.bank_account_total,
  nw.investment_portfolio_total,
  nw.property_equity_total,
  nw.mortgage_total,
  nw.other_liabilities_total,
  
  -- INCOME TYPE (critical for interpreting cash flow)
  cf.income_type,  -- 'business_owner', 'salaried', or 'other'
  cf.business_income_is_variable,
  cf.annual_salary_income,
  cf.annual_business_income,
  
  -- PERSONAL CASH FLOW (for affordability - excludes investment property)
  -- NOTE: avg_monthly_personal_income is already normalized for business owners
  cf.avg_monthly_personal_income,
  cf.avg_monthly_personal_expenses,
  cf.avg_monthly_personal_surplus,
  cf.annual_personal_income,
  cf.annual_personal_expenses,
  cf.savings_rate_percent,
  
  -- INVESTMENT PROPERTY CASH FLOW (separate business)
  cf.annual_rental_income_actual,
  cf.annual_mortgage_investment_expected,
  cf.annual_rental_net_cash_flow,
  
  -- PREPAYMENTS (debt reduction, not expense)
  cf.annual_mortgage_prepayments_primary,
  cf.annual_mortgage_prepayments_investment,
  cf.ai_expense_note,
  
  -- PORTFOLIO (in preferred currency)
  pa.equity_allocation_percent,
  pa.fixed_income_allocation_percent,
  pa.overall_return_percent,
  pa.number_of_holdings,
  pa.by_account_type as portfolio_by_account_type,
  
  -- PROPERTIES
  ps.total_properties,
  ps.total_property_value,
  ps.total_equity as property_equity,
  ps.annual_rental_income as annual_rental_income_expected,
  
  -- LIABILITIES
  ls.total_debt,
  ls.monthly_debt_payments,
  ls.weighted_avg_interest_rate as avg_debt_interest_rate,
  
  -- INSURANCE
  ins.total_life_coverage,
  ins.annual_premium_cost as annual_insurance_premiums,
  
  -- RISK INDICATORS
  rp.emergency_fund_months,
  rp.debt_to_income_percent,
  rp.rrsp_contribution_room,
  rp.tfsa_contribution_room,
  
  -- RETIREMENT (in user's primary country)
  up.expected_retirement_age - EXTRACT(YEAR FROM AGE(NOW(), up.date_of_birth))::INTEGER as years_to_retirement,
  gbs.total_guaranteed_annual_ca as retirement_guaranteed_income_ca,
  
  -- MULTI-COUNTRY ASSETS SUMMARY
  (
    SELECT jsonb_agg(jsonb_build_object(
      'country', rbc.country,
      'currency', rbc.currency,
      'liquid_assets', rbc.total_liquid_assets,
      'total_net_assets', rbc.total_net_assets
    ))
    FROM personal_finance.ai_retirement_by_country rbc
    WHERE rbc.user_id = up.user_id
  ) as assets_by_country,
  
  -- METADATA
  NOW() as context_generated_at

FROM personal_finance.user_profile up
LEFT JOIN personal_finance.ai_net_worth_summary nw ON up.user_id = nw.user_id AND nw.currency = up.preferred_currency
LEFT JOIN personal_finance.ai_cash_flow_analysis cf ON up.user_id = cf.user_id AND cf.currency = up.preferred_currency
LEFT JOIN personal_finance.ai_portfolio_analysis pa ON up.user_id = pa.user_id AND pa.currency = up.preferred_currency
LEFT JOIN personal_finance.ai_property_summary ps ON up.user_id = ps.user_id AND ps.currency = up.preferred_currency
LEFT JOIN personal_finance.ai_liability_summary ls ON up.user_id = ls.user_id AND ls.currency = up.preferred_currency
LEFT JOIN personal_finance.ai_insurance_summary ins ON up.user_id = ins.user_id AND ins.currency = up.preferred_currency
LEFT JOIN personal_finance.ai_risk_profile rp ON up.user_id = rp.user_id
LEFT JOIN personal_finance.ai_government_benefits_summary gbs ON up.user_id = gbs.user_id;

COMMENT ON VIEW personal_finance.ai_master_context IS 'Master context view with all financial metrics. assets_by_country shows multi-country holdings - AI should ask about retirement location preferences';

-- ============================================================
-- CANADIAN RETIREMENT BENEFITS REFERENCE TABLE
-- Purpose: Static reference data for AI to use
-- ============================================================

CREATE TABLE IF NOT EXISTS personal_finance.ai_canada_benefits_reference (
  id SERIAL PRIMARY KEY,
  benefit_name TEXT NOT NULL,
  year INTEGER NOT NULL,
  description TEXT,
  max_monthly_amount NUMERIC(10,2),
  eligibility_age INTEGER,
  clawback_threshold NUMERIC(15,2),
  full_clawback_amount NUMERIC(15,2),
  reduction_rate_per_month NUMERIC(6,4),
  increase_rate_per_month NUMERIC(6,4),
  notes TEXT,
  source_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert 2025 reference data
INSERT INTO personal_finance.ai_canada_benefits_reference 
(benefit_name, year, description, max_monthly_amount, eligibility_age, clawback_threshold, reduction_rate_per_month, increase_rate_per_month, notes) 
VALUES
('CPP', 2025, 'Canada Pension Plan retirement benefit', 1364.60, 65, NULL, 0.006, 0.007, 
 'Max at 65. Take at 60: reduced 36% (0.6%/month x 60). Take at 70: increased 42% (0.7%/month x 60). Based on contributions.'),
('OAS', 2025, 'Old Age Security pension', 727.67, 65, 90997, 0.006, 0.0072, 
 'Clawback starts at $90,997 income (2025). Full clawback at ~$148,451. Can defer to 70 for 36% increase.'),
('GIS', 2025, 'Guaranteed Income Supplement', 1086.88, 65, NULL, NULL, NULL, 
 'For low-income seniors. Single max $1,086.88, married $654.23 each. Income-tested.'),
('RRSP', 2025, 'RRSP contribution limit', NULL, NULL, NULL, NULL, NULL, 
 '2025 limit: $32,490 or 18% of prior year income. Must convert to RRIF by Dec 31 of year turning 71.'),
('TFSA', 2025, 'TFSA contribution limit', NULL, 18, NULL, NULL, NULL, 
 '2025 limit: $7,000. Cumulative since 2009: $102,000 (if 18+ since 2009).')
ON CONFLICT DO NOTHING;

COMMENT ON TABLE personal_finance.ai_canada_benefits_reference IS 'Reference data for Canadian retirement benefits - AI should cite this for benefit questions';

-- ============================================================
-- AI INSTRUCTIONS VIEW
-- Purpose: Guidance for AI on how to use these views
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.ai_usage_instructions AS
SELECT 
  'BUSINESS OWNER VS SALARIED INCOME' as topic,
  'CRITICAL: Handle business owners differently from salaried employees.
   
   Check income_type field:
   - "business_owner" = Income from owner draws (variable, irregular)
   - "salaried" = Regular employment income (predictable monthly)
   
   FOR BUSINESS OWNERS:
   - DO NOT use avg_monthly_personal_income directly - it''s misleading
   - Use annual_personal_income / 12 for normalized monthly
   - Owner draws may be $0 some months, $50K others - this is normal
   - Check business_income_is_variable flag
   - annual_business_income shows total draws for the year
   
   FOR SALARIED:
   - avg_monthly_personal_income is reliable
   - Income is predictable month-to-month
   
   COA Categories:
   - "Salary/Wages" (code 4100) = regular employment
   - "Owner Draw / Business Income" (code 4150) = variable business income' as instructions
UNION ALL
SELECT 
  'PERSONAL VS INVESTMENT CASH FLOW',
  'CRITICAL: Separate personal finances from investment property business.
   
   PERSONAL CASH FLOW (for affordability):
   - annual_personal_income = salary, dividends, interest (excludes rental)
   - annual_personal_expenses = operating expenses + PRIMARY residence mortgage
   - Use these for "can I afford X?" questions
   
   INVESTMENT PROPERTY CASH FLOW (separate business):
   - annual_rental_income = income from investment properties
   - annual_mortgage_investment_expected = investment property mortgages
   - annual_rental_net_cash_flow = rental income - investment mortgage
   - This shows if rental properties are cash-flow positive/negative
   
   For COA categorization:
   - "Mortgage Payment - Primary Residence" (code 6100) = personal expense
   - "Mortgage Payment - Investment Property" (code 6110) = business expense
   - "Rental Income - Investment Property" (code 4200) = business income' as instructions
UNION ALL
SELECT 
  'MORTGAGE PREPAYMENTS',
  'Lump-sum mortgage payments from savings are DEBT REDUCTION, not recurring expenses.
   annual_mortgage_prepayments_primary = extra payments on primary residence
   annual_mortgage_prepayments_investment = extra payments on investment properties
   Do NOT include prepayments in affordability calculations - they are asset transfers.'
UNION ALL
SELECT 
  'MULTI-COUNTRY RETIREMENT PLANNING',
  'The user may have assets in multiple countries (Canada, India, US, etc.). 
   NEVER combine or convert currencies - always show assets per country/currency.
   Use ai_retirement_by_country to see assets in each country.
   Ask the user: "Where do you plan to retire? If you plan to split time between countries, 
   please tell me how many months per year in each location."'
UNION ALL
SELECT 
  'AVAILABLE VIEWS',
  'ai_net_worth_summary - Net worth by currency (DO NOT sum across currencies)
   ai_cash_flow_analysis - PERSONAL vs INVESTMENT cash flow separated
   ai_retirement_by_country - All assets by country for retirement planning
   ai_portfolio_analysis - Investment portfolio by currency/country
   ai_property_summary - Real estate by currency
   ai_liability_summary - Debts by currency
   ai_insurance_summary - Insurance by country (basic summary)
   ai_lic_policy_analysis - DETAILED view for Indian LIC policies (survival benefit, extended cover)
   ai_risk_profile - Risk indicators and contribution room
   ai_government_benefits_summary - Canada CPP/OAS estimates
   ai_master_context - Summary with personal/investment cash flow separated
   ai_canada_benefits_reference - Static data for CA retirement benefits'
UNION ALL
SELECT 
  'INDIAN LIC INSURANCE POLICIES',
  'IMPORTANT: Indian LIC policies (Money Back, Jeevan Anand, Endowment) work DIFFERENTLY from Western insurance.
   
   KEY TERMINOLOGY:
   - SURVIVAL BENEFIT = Cash payout at end of premium term (Sum Assured + Bonuses)
   - EXTENDED LIFE COVER = Death benefit continues AFTER survival payout
   - TRUE MATURITY = Age 99/100 when whole-life cover ends
   
   JEEVAN ANAND (Endowment-cum-Whole-Life):
   - survival_benefit_date = when user receives Sum Assured + Bonuses (end of premium term)
   - survival_benefit_amount = expected_maturity_value = cash received
   - has_extended_life_cover = TRUE
   - life_cover_end_age = 99 or 100
   - sum_assured = death benefit (paid AGAIN if death after survival benefit)
   - Total potential value = survival_benefit + sum_assured (if death after survival)
   
   DATABASE FIELDS:
   - Use ai_lic_policy_analysis view for Indian policies
   - survival_benefit_date replaces maturity_date conceptually
   - survival_benefit_expected shows cash payout
   - years_to_survival_benefit shows when user gets cash
   - life_cover_end_age shows when protection truly ends
   
   MONEY BACK policies:
   - Periodic survival benefits during policy term (e.g., 20%/25%/30%/25%)
   - Each payout NOT individually tracked - check policy document
   
   For retirement planning:
   - Use survival_benefit_expected for cash flow projection
   - survival_benefit_date is when the lump sum arrives
   - sum_assured is NOT retirement income - it is protection for dependents
   - Bonuses declared annually by LIC - update accrued_bonus periodically'
UNION ALL
SELECT 
  'IMPORTANT RULES',
  '1. NEVER add CAD + INR + USD - meaningless totals
   2. CHECK income_type FIRST - business owners need different handling
   3. For business owners: use ANNUAL income, not monthly averages
   4. Use PERSONAL income/expenses for affordability questions
   5. Investment property cash flow is a separate business - report separately
   6. Mortgage prepayments are debt reduction, not expenses
   7. Check ai_expense_note for context on each user''s situation
   8. For "can I afford X?": use avg_monthly_personal_surplus (already normalized for business owners)
   9. For "how are my rentals doing?": use annual_rental_net_cash_flow';

COMMENT ON VIEW personal_finance.ai_usage_instructions IS 'Instructions for AI on how to properly use the financial context views';
