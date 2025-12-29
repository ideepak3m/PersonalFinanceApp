🎯 Strategy: Pre-Computed Tables + Dynamic Queries
✅ MUST Pre-Compute (for Performance)
These should be materialized views or scheduled jobs that update regularly:
sql-- 1. USER SPENDING ANALYSIS (Update: Daily)
CREATE TABLE ai_user_spending_analysis AS
SELECT 
  user_id,
  -- Current spending patterns
  SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as annual_expenses,
  SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as annual_income,
  (SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) - 
   SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)) as annual_savings,
  
  -- Spending by category (for retirement projection)
  JSONB_BUILD_OBJECT(
    'housing', (SELECT SUM(amount) FROM transactions t2 
                JOIN chart_of_accounts coa ON t2.chart_of_account_id = coa.id
                WHERE t2.user_id = t.user_id AND coa.code LIKE '5100%'),
    'mortgage', (SELECT SUM(amount) FROM transactions t2 
                 JOIN chart_of_accounts coa ON t2.chart_of_account_id = coa.id
                 WHERE t2.user_id = t.user_id AND coa.name ILIKE '%mortgage%'),
    'transportation', (SELECT SUM(amount) FROM transactions t2 
                       JOIN chart_of_accounts coa ON t2.chart_of_account_id = coa.id
                       WHERE t2.user_id = t.user_id AND coa.code LIKE '5300%'),
    'food', (SELECT SUM(amount) FROM transactions t2 
             JOIN chart_of_accounts coa ON t2.chart_of_account_id = coa.id
             WHERE t2.user_id = t.user_id AND coa.code LIKE '5400%'),
    'insurance', (SELECT SUM(amount) FROM transactions t2 
                  JOIN chart_of_accounts coa ON t2.chart_of_account_id = coa.id
                  WHERE t2.user_id = t.user_id AND coa.code LIKE '5700%'),
    'savings_contributions', (SELECT SUM(amount) FROM transactions t2 
                              WHERE t2.user_id = t.user_id 
                              AND description ILIKE ANY(ARRAY['%RRSP%', '%TFSA%', '%RESP%']))
  ) as spending_breakdown,
  
  -- Data quality
  MIN(date) as data_start_date,
  MAX(date) as data_end_date,
  COUNT(*) as transaction_count,
  NOW() as last_calculated
FROM transactions t
WHERE date >= CURRENT_DATE - INTERVAL '18 months'
GROUP BY user_id;

-- Index for fast AI lookups
CREATE INDEX idx_ai_spending_user ON ai_user_spending_analysis(user_id);


-- 2. PORTFOLIO ALLOCATION ANALYSIS (Update: Daily)
CREATE TABLE ai_portfolio_allocation AS
SELECT 
  h.user_id,
  
  -- Total portfolio value
  SUM(h.market_value) as total_portfolio_value,
  
  -- By asset class
  SUM(CASE WHEN h.security_type = 'Stock' THEN h.market_value ELSE 0 END) / NULLIF(SUM(h.market_value), 0) as equity_percentage,
  SUM(CASE WHEN h.security_type = 'Bond' THEN h.market_value ELSE 0 END) / NULLIF(SUM(h.market_value), 0) as bond_percentage,
  SUM(CASE WHEN h.security_type = 'ETF' THEN h.market_value ELSE 0 END) / NULLIF(SUM(h.market_value), 0) as etf_percentage,
  SUM(CASE WHEN h.security_type = 'GIC' THEN h.market_value ELSE 0 END) / NULLIF(SUM(h.market_value), 0) as gic_percentage,
  SUM(CASE WHEN h.security_type = 'Cash' THEN h.market_value ELSE 0 END) / NULLIF(SUM(h.market_value), 0) as cash_percentage,
  
  -- By account type
  JSONB_BUILD_OBJECT(
    'TFSA', (SELECT COALESCE(SUM(market_value), 0) FROM holdings h2 
             JOIN investment_accounts ia ON h2.account_id = ia.id 
             WHERE h2.user_id = h.user_id AND ia.account_type = 'TFSA'),
    'RRSP', (SELECT COALESCE(SUM(market_value), 0) FROM holdings h2 
             JOIN investment_accounts ia ON h2.account_id = ia.id 
             WHERE h2.user_id = h.user_id AND ia.account_type = 'RRSP'),
    'Non-Registered', (SELECT COALESCE(SUM(market_value), 0) FROM holdings h2 
                       JOIN investment_accounts ia ON h2.account_id = ia.id 
                       WHERE h2.user_id = h.user_id AND ia.account_type = 'Non-Registered')
  ) as by_account_type,
  
  -- By geography (requires additional security metadata table)
  -- This would need a securities_metadata table with geography info
  
  -- Performance
  SUM(h.unrealized_gain_loss) as total_unrealized_gain_loss,
  AVG(h.unrealized_gain_loss_percent) as avg_gain_loss_percent,
  
  NOW() as last_calculated
FROM holdings h
WHERE h.quantity > 0
GROUP BY h.user_id;

CREATE INDEX idx_ai_portfolio_user ON ai_portfolio_allocation(user_id);


-- 3. BEHAVIORAL RISK INDICATORS (Update: Weekly)
CREATE TABLE ai_risk_indicators AS
SELECT 
  user_id,
  
  -- Time horizon
  EXTRACT(YEAR FROM AGE(up.expected_retirement_age::text::interval + up.date_of_birth)) as years_to_retirement,
  
  -- Emergency fund (months of coverage)
  (SELECT COALESCE(SUM(balance), 0) 
   FROM accounts 
   WHERE user_id = up.user_id 
   AND type IN ('checking', 'savings')) / 
  NULLIF((SELECT AVG(monthly_expenses) 
          FROM (SELECT user_id, DATE_TRUNC('month', date) as month, 
                SUM(amount) as monthly_expenses
                FROM transactions 
                WHERE type = 'expense' 
                GROUP BY user_id, DATE_TRUNC('month', date)) sub
          WHERE sub.user_id = up.user_id), 0) as emergency_fund_months,
  
  -- Savings rate
  (SELECT COALESCE(net_savings / NULLIF(total_income, 0), 0)
   FROM (SELECT user_id,
         SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END) as total_income,
         SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as total_expenses,
         SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END) as net_savings
         FROM transactions
         WHERE date >= CURRENT_DATE - INTERVAL '12 months'
         GROUP BY user_id) sub
   WHERE sub.user_id = up.user_id) as savings_rate,
  
  -- Debt-to-income ratio
  (SELECT COALESCE(SUM(l.minimum_payment * 12), 0)
   FROM liabilities l
   WHERE l.user_id = up.user_id AND l.is_active = true) / 
  NULLIF(up.current_annual_income, 0) as debt_to_income_ratio,
  
  -- Investment behavior
  (SELECT COUNT(*) 
   FROM investment_transactions 
   WHERE user_id = up.user_id 
   AND transaction_type = 'SELL'
   AND transaction_date BETWEEN '2022-01-01' AND '2022-12-31') as panic_sells_2022,
  
  -- Current portfolio allocation (from ai_portfolio_allocation)
  (SELECT equity_percentage FROM ai_portfolio_allocation WHERE user_id = up.user_id),
  
  -- Conversation sophistication (placeholder - would track over time)
  0 as conversation_sophistication_score,
  
  NOW() as last_calculated
FROM user_profile up;

CREATE INDEX idx_ai_risk_user ON ai_risk_indicators(user_id);


-- 4. RETIREMENT PROJECTION (Update: Daily)
CREATE TABLE ai_retirement_projections AS
SELECT 
  up.user_id,
  
  -- Basic info
  EXTRACT(YEAR FROM AGE(CURRENT_DATE, up.date_of_birth)) as current_age,
  up.expected_retirement_age,
  up.expected_retirement_age - EXTRACT(YEAR FROM AGE(CURRENT_DATE, up.date_of_birth)) as years_to_retirement,
  
  -- Current expenses (from ai_user_spending_analysis)
  (SELECT annual_expenses FROM ai_user_spending_analysis WHERE user_id = up.user_id),
  
  -- Projected retirement expenses (simplified - you'd refine this)
  (SELECT 
     annual_expenses - 
     (spending_breakdown->>'mortgage')::numeric - 
     (spending_breakdown->>'savings_contributions')::numeric
   FROM ai_user_spending_analysis 
   WHERE user_id = up.user_id) as projected_retirement_expenses,
  
  -- Government benefits
  (SELECT COALESCE(SUM(estimated_monthly_amount * 12), 0)
   FROM government_benefits
   WHERE user_id = up.user_id) as government_benefits_annual,
  
  -- Portfolio income needed
  ((SELECT 
      annual_expenses - 
      (spending_breakdown->>'mortgage')::numeric - 
      (spending_breakdown->>'savings_contributions')::numeric
    FROM ai_user_spending_analysis 
    WHERE user_id = up.user_id) - 
   (SELECT COALESCE(SUM(estimated_monthly_amount * 12), 0)
    FROM government_benefits
    WHERE user_id = up.user_id)) as portfolio_income_needed,
  
  -- Lump sum needed (using 4% rule)
  (((SELECT 
       annual_expenses - 
       (spending_breakdown->>'mortgage')::numeric - 
       (spending_breakdown->>'savings_contributions')::numeric
     FROM ai_user_spending_analysis 
     WHERE user_id = up.user_id) - 
    (SELECT COALESCE(SUM(estimated_monthly_amount * 12), 0)
     FROM government_benefits
     WHERE user_id = up.user_id)) / 0.04) as lump_sum_needed_today,
  
  -- Current portfolio value
  (SELECT COALESCE(total_portfolio_value, 0) FROM ai_portfolio_allocation WHERE user_id = up.user_id),
  
  -- Success probability (placeholder - would use Monte Carlo)
  0.85 as success_probability,
  
  NOW() as last_calculated
FROM user_profile up;

CREATE INDEX idx_ai_retirement_user ON ai_retirement_projections(user_id);


-- 5. LIFE EVENTS DETECTION (Update: Daily)
CREATE TABLE ai_detected_life_events AS
WITH recent_changes AS (
  SELECT 
    user_id,
    'car_loan_paid_off' as event_type,
    MAX(date) as detected_date,
    'Car payment stopped appearing' as reasoning
  FROM transactions
  WHERE chart_of_account_id IN (SELECT id FROM chart_of_accounts WHERE name ILIKE '%car payment%')
  GROUP BY user_id
  HAVING MAX(date) < CURRENT_DATE - INTERVAL '60 days'
  
  UNION ALL
  
  SELECT 
    user_id,
    'salary_increase' as event_type,
    MAX(date) as detected_date,
    'Income increased by >10%' as reasoning
  FROM (
    SELECT user_id, DATE_TRUNC('month', date) as month, SUM(amount) as monthly_income
    FROM transactions
    WHERE type = 'income' AND chart_of_account_id IN (
      SELECT id FROM chart_of_accounts WHERE name ILIKE '%salary%'
    )
    GROUP BY user_id, DATE_TRUNC('month', date)
  ) monthly
  WHERE monthly_income > (
    SELECT AVG(monthly_income) * 1.1 
    FROM (
      SELECT user_id, DATE_TRUNC('month', date) as month, SUM(amount) as monthly_income
      FROM transactions
      WHERE type = 'income'
      GROUP BY user_id, DATE_TRUNC('month', date)
    ) sub
    WHERE sub.user_id = monthly.user_id
  )
  GROUP BY user_id
)
SELECT * FROM recent_changes;

CREATE INDEX idx_ai_events_user ON ai_detected_life_events(user_id);