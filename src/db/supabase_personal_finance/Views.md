| ?column?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CREATE OR REPLACE VIEW personal_finance.annual_cash_flow AS  SELECT user_id,
    (EXTRACT(year FROM month))::integer AS year,
    sum(total_income) AS annual_income,
    sum(total_expenses) AS annual_expenses,
    sum(net_savings) AS annual_savings,
        CASE
            WHEN (sum(total_income) > (0)::numeric) THEN round(((sum(net_savings) / sum(total_income)) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS annual_savings_rate,
    avg(total_income) AS avg_monthly_income,
    avg(total_expenses) AS avg_monthly_expenses
   FROM personal_finance.monthly_cash_flow
  GROUP BY user_id, (EXTRACT(year FROM month))
  ORDER BY ((EXTRACT(year FROM month))::integer) DESC;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| CREATE OR REPLACE VIEW personal_finance.expense_by_category AS  SELECT t.user_id,
    (date_trunc('month'::text, (t.date)::timestamp with time zone))::date AS month,
    COALESCE(c.name, 'Uncategorized'::text) AS category,
    sum(abs(t.amount)) AS total_amount,
    count(*) AS transaction_count,
    round(((sum(abs(t.amount)) * 100.0) / NULLIF(sum(sum(abs(t.amount))) OVER (PARTITION BY t.user_id, (date_trunc('month'::text, (t.date)::timestamp with time zone))), (0)::numeric)), 2) AS percentage_of_monthly
   FROM (personal_finance.transactions t
     LEFT JOIN personal_finance.category c ON ((t.category_id = c.id)))
  WHERE (((t.type = 'expense'::text) OR ((t.type IS NULL) AND (t.amount < (0)::numeric))) AND (t.date IS NOT NULL))
  GROUP BY t.user_id, (date_trunc('month'::text, (t.date)::timestamp with time zone)), c.name
  ORDER BY ((date_trunc('month'::text, (t.date)::timestamp with time zone))::date) DESC, (sum(abs(t.amount))) DESC;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| CREATE OR REPLACE VIEW personal_finance.income_by_source AS  SELECT t.user_id,
    (date_trunc('month'::text, (t.date)::timestamp with time zone))::date AS month,
    COALESCE(c.name, 'Other Income'::text) AS source,
    sum(abs(t.amount)) AS total_amount,
    count(*) AS transaction_count
   FROM (personal_finance.transactions t
     LEFT JOIN personal_finance.category c ON ((t.category_id = c.id)))
  WHERE (((t.type = 'income'::text) OR ((t.type IS NULL) AND (t.amount > (0)::numeric))) AND (t.date IS NOT NULL))
  GROUP BY t.user_id, (date_trunc('month'::text, (t.date)::timestamp with time zone)), c.name
  ORDER BY ((date_trunc('month'::text, (t.date)::timestamp with time zone))::date) DESC, (sum(abs(t.amount))) DESC;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| CREATE OR REPLACE VIEW personal_finance.investment_net_worth AS  SELECT user_id,
    sum(market_value) AS total_market_value,
    sum(book_value) AS total_book_cost,
    sum(gain_loss) AS total_unrealized_gain,
    count(DISTINCT account_id) AS num_accounts,
    count(*) AS num_positions
   FROM personal_finance.holdings
  WHERE (user_id IS NOT NULL)
  GROUP BY user_id;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| CREATE OR REPLACE VIEW personal_finance.monthly_cash_flow AS  SELECT user_id,
    (date_trunc('month'::text, (date)::timestamp with time zone))::date AS month,
    sum(
        CASE
            WHEN ((type = 'income'::text) OR (amount > (0)::numeric)) THEN abs(amount)
            ELSE (0)::numeric
        END) AS total_income,
    sum(
        CASE
            WHEN ((type = 'expense'::text) OR ((type IS NULL) AND (amount < (0)::numeric))) THEN abs(amount)
            ELSE (0)::numeric
        END) AS total_expenses,
    (sum(
        CASE
            WHEN ((type = 'income'::text) OR (amount > (0)::numeric)) THEN abs(amount)
            ELSE (0)::numeric
        END) - sum(
        CASE
            WHEN ((type = 'expense'::text) OR ((type IS NULL) AND (amount < (0)::numeric))) THEN abs(amount)
            ELSE (0)::numeric
        END)) AS net_savings,
    count(*) AS total_transactions,
    count(
        CASE
            WHEN ((type = 'income'::text) OR (amount > (0)::numeric)) THEN 1
            ELSE NULL::integer
        END) AS income_count,
    count(
        CASE
            WHEN ((type = 'expense'::text) OR ((type IS NULL) AND (amount < (0)::numeric))) THEN 1
            ELSE NULL::integer
        END) AS expense_count
   FROM personal_finance.transactions
  WHERE (date IS NOT NULL)
  GROUP BY user_id, (date_trunc('month'::text, (date)::timestamp with time zone))
  ORDER BY ((date_trunc('month'::text, (date)::timestamp with time zone))::date) DESC;      |
| CREATE OR REPLACE VIEW personal_finance.portfolio_by_account_type AS  SELECT user_id,
    account_type,
    count(DISTINCT account_id) AS num_accounts,
    count(*) AS num_holdings,
    sum(market_value) AS total_value,
    sum(book_value) AS total_cost,
    sum(gain_loss) AS total_gain_loss,
        CASE
            WHEN (sum(book_value) > (0)::numeric) THEN (((sum(market_value) - sum(book_value)) / sum(book_value)) * (100)::numeric)
            ELSE (0)::numeric
        END AS overall_return_pct
   FROM personal_finance.holdings
  WHERE (user_id IS NOT NULL)
  GROUP BY user_id, account_type;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| CREATE OR REPLACE VIEW personal_finance.portfolio_by_asset_class AS  SELECT user_id,
    COALESCE(category, 'unclassified'::text) AS asset_class,
    count(*) AS num_holdings,
    sum(market_value) AS total_value,
    round(((sum(market_value) * 100.0) / NULLIF(sum(sum(market_value)) OVER (PARTITION BY user_id), (0)::numeric)), 2) AS allocation_pct
   FROM personal_finance.holdings
  WHERE (user_id IS NOT NULL)
  GROUP BY user_id, category;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| CREATE OR REPLACE VIEW personal_finance.portfolio_by_geography AS  SELECT user_id,
    COALESCE(geography, 'unclassified'::text) AS geography,
    sum(market_value) AS total_value,
    round(((sum(market_value) * 100.0) / NULLIF(sum(sum(market_value)) OVER (PARTITION BY user_id), (0)::numeric)), 2) AS allocation_pct
   FROM personal_finance.holdings
  WHERE (user_id IS NOT NULL)
  GROUP BY user_id, geography;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| CREATE OR REPLACE VIEW personal_finance.portfolio_growth AS  SELECT user_id,
    snapshot_date,
    sum(market_value) AS total_value,
    sum(book_cost) AS total_cost,
    sum(unrealized_gain_loss) AS total_gain_loss,
    count(*) AS num_positions
   FROM personal_finance.holding_snapshots
  WHERE (user_id IS NOT NULL)
  GROUP BY user_id, snapshot_date
  ORDER BY snapshot_date;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| CREATE OR REPLACE VIEW personal_finance.retirement_summary AS  SELECT up.user_id,
    up.date_of_birth,
    (EXTRACT(year FROM age(now(), (up.date_of_birth)::timestamp with time zone)))::integer AS current_age,
    up.expected_retirement_age,
    (up.expected_retirement_age - (EXTRACT(year FROM age(now(), (up.date_of_birth)::timestamp with time zone)))::integer) AS years_to_retirement,
    up.current_annual_income,
    up.desired_retirement_income,
    up.risk_tolerance,
    up.rrsp_contribution_room,
    up.tfsa_contribution_room,
    gb.cpp_at_65,
    gb.cpp_planned_start_age,
    gb.oas_estimated_monthly,
    gb.oas_planned_start_age,
    gb.has_employer_pension,
    gb.pension_estimated_monthly,
    ((COALESCE(gb.cpp_at_65, (0)::numeric) + COALESCE(gb.oas_estimated_monthly, (0)::numeric)) + COALESCE(gb.pension_estimated_monthly, (0)::numeric)) AS total_monthly_benefits_at_65,
    (((COALESCE(gb.cpp_at_65, (0)::numeric) + COALESCE(gb.oas_estimated_monthly, (0)::numeric)) + COALESCE(gb.pension_estimated_monthly, (0)::numeric)) * (12)::numeric) AS total_annual_benefits_at_65
   FROM (personal_finance.user_profile up
     LEFT JOIN personal_finance.government_benefits gb ON ((up.user_id = gb.user_id)));                                                                                                                                                                                                                                                                       |
| CREATE OR REPLACE VIEW personal_finance.savings_rate_trend AS  SELECT user_id,
    month,
    total_income,
    total_expenses,
    net_savings,
        CASE
            WHEN (total_income > (0)::numeric) THEN round(((net_savings / total_income) * (100)::numeric), 2)
            ELSE (0)::numeric
        END AS savings_rate_percent,
    avg(total_income) OVER (PARTITION BY user_id ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS avg_income_3mo,
    avg(total_expenses) OVER (PARTITION BY user_id ORDER BY month ROWS BETWEEN 2 PRECEDING AND CURRENT ROW) AS avg_expenses_3mo,
    avg(net_savings) OVER (PARTITION BY user_id ORDER BY month ROWS BETWEEN 11 PRECEDING AND CURRENT ROW) AS avg_savings_12mo
   FROM personal_finance.monthly_cash_flow
  ORDER BY user_id, month DESC;                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| CREATE OR REPLACE VIEW personal_finance.spending_personality AS  WITH category_stats AS (
         SELECT expense_by_category.user_id,
            expense_by_category.category,
            sum(expense_by_category.total_amount) AS total_spent,
            avg(expense_by_category.total_amount) AS avg_monthly
           FROM personal_finance.expense_by_category
          WHERE (expense_by_category.month >= date_trunc('month'::text, (now() - '1 year'::interval)))
          GROUP BY expense_by_category.user_id, expense_by_category.category
        ), user_totals AS (
         SELECT category_stats.user_id,
            sum(category_stats.total_spent) AS total_annual_spending
           FROM category_stats
          GROUP BY category_stats.user_id
        )
 SELECT cs.user_id,
    cs.category,
    cs.total_spent,
    cs.avg_monthly,
    round(((cs.total_spent / ut.total_annual_spending) * (100)::numeric), 2) AS percent_of_spending,
        CASE
            WHEN (cs.category = ANY (ARRAY['Mortgage'::text, 'Rent'::text, 'Utilities'::text, 'Insurance'::text, 'Groceries'::text, 'Healthcare'::text])) THEN 'Essential'::text
            WHEN (cs.category = ANY (ARRAY['Dining'::text, 'Entertainment'::text, 'Shopping'::text, 'Travel'::text, 'Subscriptions'::text])) THEN 'Discretionary'::text
            ELSE 'Other'::text
        END AS spending_type
   FROM (category_stats cs
     JOIN user_totals ut ON ((cs.user_id = ut.user_id)))
  ORDER BY cs.user_id, cs.total_spent DESC; |