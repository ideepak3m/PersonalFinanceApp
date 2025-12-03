-- Migration: Create monthly cash flow views
-- Date: 2025-12-03
-- Purpose: Auto-calculated views for income/expense analysis

-- ============================================================
-- STEP 1: Create monthly_cash_flow view
-- ============================================================
-- This view aggregates transactions by month for AI analysis
-- Works with your existing transactions table

CREATE OR REPLACE VIEW personal_finance.monthly_cash_flow AS
SELECT 
  user_id,
  DATE_TRUNC('month', date)::DATE as month,
  
  -- Income (positive amounts or type = 'income')
  SUM(CASE 
    WHEN type = 'income' OR amount > 0 THEN ABS(amount) 
    ELSE 0 
  END) as total_income,
  
  -- Expenses (negative amounts or type = 'expense')
  SUM(CASE 
    WHEN type = 'expense' OR (type IS NULL AND amount < 0) THEN ABS(amount) 
    ELSE 0 
  END) as total_expenses,
  
  -- Net savings
  SUM(CASE 
    WHEN type = 'income' OR amount > 0 THEN ABS(amount) 
    ELSE 0 
  END) - 
  SUM(CASE 
    WHEN type = 'expense' OR (type IS NULL AND amount < 0) THEN ABS(amount) 
    ELSE 0 
  END) as net_savings,
  
  -- Transaction counts
  COUNT(*) as total_transactions,
  COUNT(CASE WHEN type = 'income' OR amount > 0 THEN 1 END) as income_count,
  COUNT(CASE WHEN type = 'expense' OR (type IS NULL AND amount < 0) THEN 1 END) as expense_count

FROM personal_finance.transactions
WHERE date IS NOT NULL
GROUP BY user_id, DATE_TRUNC('month', date)
ORDER BY month DESC;

COMMENT ON VIEW personal_finance.monthly_cash_flow IS 'Monthly income/expense summary for AI cash flow analysis';

-- ============================================================
-- STEP 2: Create expense breakdown by category
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.expense_by_category AS
SELECT 
  t.user_id,
  DATE_TRUNC('month', t.date)::DATE as month,
  COALESCE(c.name, 'Uncategorized') as category,
  SUM(ABS(t.amount)) as total_amount,
  COUNT(*) as transaction_count,
  ROUND(
    SUM(ABS(t.amount)) * 100.0 / 
    NULLIF(SUM(SUM(ABS(t.amount))) OVER (PARTITION BY t.user_id, DATE_TRUNC('month', t.date)), 0),
    2
  ) as percentage_of_monthly
FROM personal_finance.transactions t
LEFT JOIN personal_finance.category c ON t.category_id = c.id
WHERE (t.type = 'expense' OR (t.type IS NULL AND t.amount < 0))
  AND t.date IS NOT NULL
GROUP BY t.user_id, DATE_TRUNC('month', t.date), c.name
ORDER BY month DESC, total_amount DESC;

COMMENT ON VIEW personal_finance.expense_by_category IS 'Monthly expense breakdown by category for spending analysis';

-- ============================================================
-- STEP 3: Create income breakdown by source
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.income_by_source AS
SELECT 
  t.user_id,
  DATE_TRUNC('month', t.date)::DATE as month,
  COALESCE(c.name, 'Other Income') as source,
  SUM(ABS(t.amount)) as total_amount,
  COUNT(*) as transaction_count
FROM personal_finance.transactions t
LEFT JOIN personal_finance.category c ON t.category_id = c.id
WHERE (t.type = 'income' OR (t.type IS NULL AND t.amount > 0))
  AND t.date IS NOT NULL
GROUP BY t.user_id, DATE_TRUNC('month', t.date), c.name
ORDER BY month DESC, total_amount DESC;

COMMENT ON VIEW personal_finance.income_by_source IS 'Monthly income breakdown by source';

-- ============================================================
-- STEP 4: Create savings rate trend
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.savings_rate_trend AS
SELECT 
  user_id,
  month,
  total_income,
  total_expenses,
  net_savings,
  CASE 
    WHEN total_income > 0 THEN ROUND((net_savings / total_income) * 100, 2)
    ELSE 0 
  END as savings_rate_percent,
  -- Rolling averages for AI
  AVG(total_income) OVER (
    PARTITION BY user_id 
    ORDER BY month 
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ) as avg_income_3mo,
  AVG(total_expenses) OVER (
    PARTITION BY user_id 
    ORDER BY month 
    ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
  ) as avg_expenses_3mo,
  AVG(net_savings) OVER (
    PARTITION BY user_id 
    ORDER BY month 
    ROWS BETWEEN 11 PRECEDING AND CURRENT ROW
  ) as avg_savings_12mo
FROM personal_finance.monthly_cash_flow
ORDER BY user_id, month DESC;

COMMENT ON VIEW personal_finance.savings_rate_trend IS 'Monthly savings rate with rolling averages for trend analysis';

-- ============================================================
-- STEP 5: Create annual summary
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.annual_cash_flow AS
SELECT 
  user_id,
  EXTRACT(YEAR FROM month)::INTEGER as year,
  SUM(total_income) as annual_income,
  SUM(total_expenses) as annual_expenses,
  SUM(net_savings) as annual_savings,
  CASE 
    WHEN SUM(total_income) > 0 
    THEN ROUND((SUM(net_savings) / SUM(total_income)) * 100, 2)
    ELSE 0 
  END as annual_savings_rate,
  AVG(total_income) as avg_monthly_income,
  AVG(total_expenses) as avg_monthly_expenses
FROM personal_finance.monthly_cash_flow
GROUP BY user_id, EXTRACT(YEAR FROM month)
ORDER BY year DESC;

COMMENT ON VIEW personal_finance.annual_cash_flow IS 'Annual income/expense summary';

-- ============================================================
-- STEP 6: Create spending personality view for AI
-- ============================================================

CREATE OR REPLACE VIEW personal_finance.spending_personality AS
WITH category_stats AS (
  SELECT 
    user_id,
    category,
    SUM(total_amount) as total_spent,
    AVG(total_amount) as avg_monthly
  FROM personal_finance.expense_by_category
  WHERE month >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
  GROUP BY user_id, category
),
user_totals AS (
  SELECT 
    user_id,
    SUM(total_spent) as total_annual_spending
  FROM category_stats
  GROUP BY user_id
)
SELECT 
  cs.user_id,
  cs.category,
  cs.total_spent,
  cs.avg_monthly,
  ROUND((cs.total_spent / ut.total_annual_spending) * 100, 2) as percent_of_spending,
  -- Classify spending
  CASE 
    WHEN cs.category IN ('Mortgage', 'Rent', 'Utilities', 'Insurance', 'Groceries', 'Healthcare') 
      THEN 'Essential'
    WHEN cs.category IN ('Dining', 'Entertainment', 'Shopping', 'Travel', 'Subscriptions')
      THEN 'Discretionary'
    ELSE 'Other'
  END as spending_type
FROM category_stats cs
JOIN user_totals ut ON cs.user_id = ut.user_id
ORDER BY cs.user_id, cs.total_spent DESC;

COMMENT ON VIEW personal_finance.spending_personality IS 'Categorized spending patterns for AI personality analysis';
