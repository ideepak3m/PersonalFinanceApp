| ddl                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.accounts */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.accounts (
  id bigint NOT NULL DEFAULT nextval('personal_finance.accounts_id_seq'::regclass),
  user_id uuid,
  country text NOT NULL,
  account_category text NOT NULL,
  provider_id bigint,
  account_number text,
  name text NOT NULL,
  currency text DEFAULT 'USD'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  balance real DEFAULT '0'::real,
  institution text,
  type text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.accounts_id_seq */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.accounts_id_seq (
  last_value bigint NOT NULL,
  log_cnt bigint NOT NULL,
  is_called boolean NOT NULL
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.accounts_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.accounts_pkey (
  id bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.ai_extraction_logs */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.ai_extraction_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  filename text NOT NULL,
  file_size integer,
  extraction_timestamp timestamp with time zone NOT NULL,
  model_used text NOT NULL,
  prompt_tokens integer,
  completion_tokens integer,
  total_tokens integer,
  extraction_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.ai_extraction_logs_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.ai_extraction_logs_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.annual_cash_flow */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.annual_cash_flow (
  user_id uuid,
  year integer,
  annual_income numeric,
  annual_expenses numeric,
  annual_savings numeric,
  annual_savings_rate numeric,
  avg_monthly_income numeric,
  avg_monthly_expenses numeric
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.belief_tags */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.belief_tags (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category_id uuid,
  inserted_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.belief_tags_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.belief_tags_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.budgets */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.budgets (
  id bigint NOT NULL DEFAULT nextval('personal_finance.budgets_id_seq'::regclass),
  user_id uuid,
  category text NOT NULL,
  amount numeric NOT NULL,
  month integer NOT NULL,
  year integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.budgets_id_seq */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.budgets_id_seq (
  last_value bigint NOT NULL,
  log_cnt bigint NOT NULL,
  is_called boolean NOT NULL
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.budgets_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.budgets_pkey (
  id bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.budgets_user_id_category_month_year_key */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.budgets_user_id_category_month_year_key (
  user_id uuid,
  category text,
  month integer,
  year integer
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.cash_transactions */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.cash_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid,
  transaction_date date NOT NULL,
  description text NOT NULL,
  transaction_type text NOT NULL,
  debit numeric(15,2) DEFAULT 0,
  credit numeric(15,2) DEFAULT 0,
  balance numeric(15,2),
  currency text NOT NULL DEFAULT 'CAD'::text,
  created_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.cash_transactions_account_id_transaction_date_description_d_key */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.cash_transactions_account_id_transaction_date_description_d_key (
  account_id uuid,
  transaction_date date,
  description text,
  debit numeric(15,2),
  credit numeric(15,2)
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.cash_transactions_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.cash_transactions_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.category */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.category (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_split_enabled boolean DEFAULT false,
  inserted_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.category_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.category_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.chart_of_accounts */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.chart_of_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  code text NOT NULL,
  name text NOT NULL,
  account_type text NOT NULL,
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  is_active boolean
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.chart_of_accounts_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.chart_of_accounts_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.column_mappings */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.column_mappings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  account_id bigint,
  file_type text NOT NULL,
  name text NOT NULL,
  mapping_config jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.column_mappings_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.column_mappings_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.description_rules */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.description_rules (
  id bigint NOT NULL DEFAULT nextval('personal_finance.description_rules_id_seq'::regclass),
  user_id uuid,
  description_pattern text NOT NULL,
  chart_of_account text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.description_rules_id_seq */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.description_rules_id_seq (
  last_value bigint NOT NULL,
  log_cnt bigint NOT NULL,
  is_called boolean NOT NULL
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.description_rules_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.description_rules_pkey (
  id bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.expense_by_category */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.expense_by_category (
  user_id uuid,
  month date,
  category text,
  total_amount numeric,
  transaction_count bigint,
  percentage_of_monthly numeric
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.goals */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.goals (
  id bigint NOT NULL DEFAULT nextval('personal_finance.goals_id_seq'::regclass),
  user_id uuid,
  name text NOT NULL,
  target_amount numeric NOT NULL,
  current_amount numeric DEFAULT 0,
  deadline date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.goals_id_seq */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.goals_id_seq (
  last_value bigint NOT NULL,
  log_cnt bigint NOT NULL,
  is_called boolean NOT NULL
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.goals_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.goals_pkey (
  id bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.government_benefits */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.government_benefits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  cpp_estimated_at_65 numeric(10,2),
  cpp_statement_date date,
  cpp_contributions_to_date numeric(15,2),
  cpp_years_contributed integer,
  cpp_at_60 numeric(10,2),
  cpp_at_65 numeric(10,2),
  cpp_at_70 numeric(10,2),
  cpp_planned_start_age integer DEFAULT 65,
  oas_estimated_monthly numeric(10,2),
  oas_years_in_canada integer,
  oas_eligible_age integer DEFAULT 65,
  oas_planned_start_age integer DEFAULT 65,
  oas_clawback_threshold numeric(15,2) DEFAULT 90997,
  gis_eligible boolean DEFAULT false,
  gis_estimated_monthly numeric(10,2),
  has_employer_pension boolean DEFAULT false,
  pension_type text,
  pension_employer text,
  pension_years_of_service numeric(5,2),
  pension_multiplier numeric(5,4),
  pension_best_average_salary numeric(15,2),
  pension_estimated_monthly numeric(10,2),
  pension_earliest_age integer DEFAULT 55,
  pension_normal_age integer DEFAULT 65,
  pension_current_value numeric(15,2),
  spouse_cpp_at_65 numeric(10,2),
  spouse_oas_estimated numeric(10,2),
  spouse_pension_estimated numeric(10,2),
  last_updated date,
  created_at timestamp with time zone DEFAULT now()
); |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.government_benefits_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.government_benefits_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.government_benefits_user_id_key */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.government_benefits_user_id_key (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.holding_snapshots */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.holding_snapshots (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  account_id uuid,
  symbol text NOT NULL,
  security_name text,
  snapshot_date date NOT NULL,
  units numeric(15,6) NOT NULL,
  unit_price numeric(15,4) NOT NULL,
  market_value numeric(15,2) NOT NULL,
  book_cost numeric(15,2),
  unrealized_gain_loss numeric(15,2),
  gain_loss_percentage numeric(8,4),
  units_change numeric(15,6),
  value_change numeric(15,2),
  source text DEFAULT 'statement'::text,
  created_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.holding_snapshots_account_id_symbol_snapshot_date_key */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.holding_snapshots_account_id_symbol_snapshot_date_key (
  account_id uuid,
  symbol text,
  snapshot_date date
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.holding_snapshots_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.holding_snapshots_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.holdings */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.holdings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid,
  symbol text NOT NULL,
  security_name text NOT NULL,
  units numeric(15,6) NOT NULL,
  price numeric(15,4) NOT NULL,
  market_value numeric(15,2) NOT NULL,
  book_value numeric(15,2),
  gain_loss numeric(15,2),
  as_of_date date NOT NULL,
  currency text NOT NULL DEFAULT 'CAD'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  asset_type text,
  category text,
  sub_category text,
  user_id uuid,
  investment_type text,
  sector text,
  geography text,
  exchange text,
  average_cost_per_unit numeric(15,6),
  account_type text,
  institution text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.holdings_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.holdings_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_accounts_provider_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_accounts_provider_id (
  provider_id bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_accounts_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_accounts_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_budgets_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_budgets_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_cash_transactions_account_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_cash_transactions_account_id (
  account_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_cash_transactions_date */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_cash_transactions_date (
  transaction_date date
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_column_mappings_account_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_column_mappings_account_id (
  account_id bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_column_mappings_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_column_mappings_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_description_rules_pattern */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_description_rules_pattern (
  description_pattern text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_description_rules_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_description_rules_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_goals_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_goals_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_government_benefits_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_government_benefits_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_holding_snapshots_account */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_holding_snapshots_account (
  account_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_holding_snapshots_date */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_holding_snapshots_date (
  snapshot_date date
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_holding_snapshots_symbol */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_holding_snapshots_symbol (
  symbol text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_holding_snapshots_user */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_holding_snapshots_user (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_holdings_account */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_holdings_account (
  account_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_holdings_account_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_holdings_account_id (
  account_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_holdings_asset_type */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_holdings_asset_type (
  asset_type text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_holdings_category */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_holdings_category (
  category text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_holdings_investment_type */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_holdings_investment_type (
  investment_type text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_holdings_sub_category */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_holdings_sub_category (
  sub_category text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_holdings_symbol */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_holdings_symbol (
  symbol text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_holdings_user */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_holdings_user (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_import_raw_data_created_at */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_import_raw_data_created_at (
  created_at timestamp with time zone
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_import_raw_data_staging_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_import_raw_data_staging_id (
  staging_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_import_staging_account_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_import_staging_account_id (
  account_id bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_import_staging_status */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_import_staging_status (
  status text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_import_staging_uploaded_at */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_import_staging_uploaded_at (
  uploaded_at timestamp with time zone
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_import_staging_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_import_staging_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_investment_accounts_manager_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_investment_accounts_manager_id (
  manager_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_investment_accounts_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_investment_accounts_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_investment_managers_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_investment_managers_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_investment_transactions_account_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_investment_transactions_account_id (
  account_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_investment_transactions_date */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_investment_transactions_date (
  transaction_date date
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_investment_transactions_symbol */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_investment_transactions_symbol (
  symbol text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_merchant_aliases_gin */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_merchant_aliases_gin (
  aliases text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_merchant_normalized_name */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_merchant_normalized_name (
  normalized_name text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_merchant_normalized_name_lower */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_merchant_normalized_name_lower (
  lower text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_merchant_split_rules_name */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_merchant_split_rules_name (
  merchant_friendly_name text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_merchant_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_merchant_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_product_metadata_product_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_product_metadata_product_id (
  product_id bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_products_account_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_products_account_id (
  account_id bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_products_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_products_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_providers_country */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_providers_country (
  country text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_providers_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_providers_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_subscription_history_action_date */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_subscription_history_action_date (
  action_date timestamp with time zone
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_subscription_history_subscription_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_subscription_history_subscription_id (
  subscription_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_subscription_history_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_subscription_history_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_subscriptions_active */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_subscriptions_active (
  user_id uuid,
  is_active boolean
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_subscriptions_merchant_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_subscriptions_merchant_id (
  user_id uuid,
  merchant_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_subscriptions_next_billing */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_subscriptions_next_billing (
  user_id uuid,
  next_billing_date date
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_subscriptions_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_subscriptions_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_tax_withholdings_account_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_tax_withholdings_account_id (
  account_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_transaction_split_transaction_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_transaction_split_transaction_id (
  transaction_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_transactions_account_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_transactions_account_id (
  account_id bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_transactions_category_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_transactions_category_id (
  account_id bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_transactions_chart_of_account_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_transactions_chart_of_account_id (
  chart_of_account_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_transactions_date */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_transactions_date (
  date date
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_transactions_normalized_merchant_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_transactions_normalized_merchant_id (
  normalized_merchant_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_transactions_status */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_transactions_status (
  status text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_transactions_status_account */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_transactions_status_account (
  account_id bigint,
  status text,
  date date
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_transactions_user_id_date */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_transactions_user_id_date (
  user_id uuid,
  date date
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.idx_user_profile_user_id */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.idx_user_profile_user_id (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.import_raw_data */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.import_raw_data (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  staging_id uuid NOT NULL,
  raw_data jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.import_raw_data_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.import_raw_data_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.import_staging */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.import_staging (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  account_id bigint,
  file_name text NOT NULL,
  file_type text NOT NULL,
  column_names text[],
  row_count integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending_mapping'::text,
  mapping_id uuid,
  error_message text,
  uploaded_at timestamp with time zone DEFAULT now(),
  imported_at timestamp with time zone
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.import_staging_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.import_staging_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.income_by_source */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.income_by_source (
  user_id uuid,
  month date,
  source text,
  total_amount numeric,
  transaction_count bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.investment_accounts */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.investment_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  account_number text NOT NULL,
  account_type text NOT NULL,
  institution text NOT NULL,
  currency text NOT NULL DEFAULT 'CAD'::text,
  opening_balance numeric(15,2),
  closing_balance numeric(15,2),
  statement_date date,
  statement_period text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  manager_id uuid,
  display_name text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.investment_accounts_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.investment_accounts_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.investment_accounts_user_id_account_number_institution_key */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.investment_accounts_user_id_account_number_institution_key (
  user_id uuid,
  account_number text,
  institution text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.investment_managers */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.investment_managers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  name text NOT NULL,
  manager_type text NOT NULL DEFAULT 'Advisor'::text,
  description text,
  website text,
  contact_name text,
  contact_email text,
  contact_phone text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.investment_managers_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.investment_managers_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.investment_managers_user_id_name_key */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.investment_managers_user_id_name_key (
  user_id uuid,
  name text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.investment_net_worth */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.investment_net_worth (
  user_id uuid,
  total_market_value numeric,
  total_book_cost numeric,
  total_unrealized_gain numeric,
  num_accounts bigint,
  num_positions bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.investment_transactions */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.investment_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid,
  transaction_date date NOT NULL,
  symbol text,
  security_name text,
  transaction_type text NOT NULL,
  units numeric(15,6),
  price numeric(15,4),
  amount numeric(15,2) NOT NULL,
  fees numeric(15,2) DEFAULT 0,
  currency text NOT NULL DEFAULT 'CAD'::text,
  description text,
  created_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.investment_transactions_account_id_transaction_date_symbol__key */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.investment_transactions_account_id_transaction_date_symbol__key (
  account_id uuid,
  transaction_date date,
  symbol text,
  transaction_type text,
  units numeric(15,6),
  amount numeric(15,2)
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.investment_transactions_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.investment_transactions_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.merchant */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.merchant (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  normalized_name text NOT NULL,
  category_id uuid,
  aliases text[],
  inserted_at timestamp with time zone DEFAULT now(),
  user_id uuid,
  is_big_box_store boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.merchant_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.merchant_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.merchant_split_rules */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.merchant_split_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  merchant_friendly_name text NOT NULL,
  splits jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.merchant_split_rules_merchant_friendly_name_key */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.merchant_split_rules_merchant_friendly_name_key (
  merchant_friendly_name text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.merchant_split_rules_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.merchant_split_rules_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.monthly_cash_flow */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.monthly_cash_flow (
  user_id uuid,
  month date,
  total_income numeric,
  total_expenses numeric,
  net_savings numeric,
  total_transactions bigint,
  income_count bigint,
  expense_count bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.portfolio_by_account_type */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.portfolio_by_account_type (
  user_id uuid,
  account_type text,
  num_accounts bigint,
  num_holdings bigint,
  total_value numeric,
  total_cost numeric,
  total_gain_loss numeric,
  overall_return_pct numeric
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.portfolio_by_asset_class */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.portfolio_by_asset_class (
  user_id uuid,
  asset_class text,
  num_holdings bigint,
  total_value numeric,
  allocation_pct numeric
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.portfolio_by_geography */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.portfolio_by_geography (
  user_id uuid,
  geography text,
  total_value numeric,
  allocation_pct numeric
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.portfolio_growth */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.portfolio_growth (
  user_id uuid,
  snapshot_date date,
  total_value numeric,
  total_cost numeric,
  total_gain_loss numeric,
  num_positions bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.product_metadata */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.product_metadata (
  id bigint NOT NULL DEFAULT nextval('personal_finance.product_metadata_id_seq'::regclass),
  user_id uuid,
  product_id bigint,
  key text NOT NULL,
  value text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.product_metadata_id_seq */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.product_metadata_id_seq (
  last_value bigint NOT NULL,
  log_cnt bigint NOT NULL,
  is_called boolean NOT NULL
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.product_metadata_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.product_metadata_pkey (
  id bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.product_metadata_product_id_key_key */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.product_metadata_product_id_key_key (
  product_id bigint,
  key text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.products */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.products (
  id bigint NOT NULL DEFAULT nextval('personal_finance.products_id_seq'::regclass),
  user_id uuid,
  account_id bigint,
  product_type text NOT NULL,
  product_name text NOT NULL,
  product_code text,
  quantity numeric DEFAULT 0,
  purchase_price numeric DEFAULT 0,
  current_price numeric DEFAULT 0,
  purchase_date date,
  maturity_date date,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.products_id_seq */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.products_id_seq (
  last_value bigint NOT NULL,
  log_cnt bigint NOT NULL,
  is_called boolean NOT NULL
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.products_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.products_pkey (
  id bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.profiles */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.profiles (
  id uuid NOT NULL,
  email text,
  full_name text,
  role text DEFAULT 'user'::text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.profiles_email_key */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.profiles_email_key (
  email text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.profiles_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.profiles_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.providers */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.providers (
  id bigint NOT NULL DEFAULT nextval('personal_finance.providers_id_seq'::regclass),
  user_id uuid,
  name text NOT NULL,
  country text NOT NULL,
  type text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.providers_id_seq */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.providers_id_seq (
  last_value bigint NOT NULL,
  log_cnt bigint NOT NULL,
  is_called boolean NOT NULL
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.providers_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.providers_pkey (
  id bigint
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.retirement_summary */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.retirement_summary (
  user_id uuid,
  date_of_birth date,
  current_age integer,
  expected_retirement_age integer,
  years_to_retirement integer,
  current_annual_income numeric(15,2),
  desired_retirement_income numeric(15,2),
  risk_tolerance text,
  rrsp_contribution_room numeric(15,2),
  tfsa_contribution_room numeric(15,2),
  cpp_at_65 numeric(10,2),
  cpp_planned_start_age integer,
  oas_estimated_monthly numeric(10,2),
  oas_planned_start_age integer,
  has_employer_pension boolean,
  pension_estimated_monthly numeric(10,2),
  total_monthly_benefits_at_65 numeric,
  total_annual_benefits_at_65 numeric
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.savings_rate_trend */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.savings_rate_trend (
  user_id uuid,
  month date,
  total_income numeric,
  total_expenses numeric,
  net_savings numeric,
  savings_rate_percent numeric,
  avg_income_3mo numeric,
  avg_expenses_3mo numeric,
  avg_savings_12mo numeric
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.spending_personality */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.spending_personality (
  user_id uuid,
  category text,
  total_spent numeric,
  avg_monthly numeric,
  percent_of_spending numeric,
  spending_type text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.subscription_history */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.subscription_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL,
  user_id uuid NOT NULL,
  action text NOT NULL,
  action_date timestamp with time zone NOT NULL DEFAULT now(),
  reason text,
  notes text,
  old_value text,
  new_value text
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.subscription_history_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.subscription_history_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.subscriptions */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  merchant_id uuid NOT NULL,
  friendly_name text NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD'::text,
  frequency text NOT NULL,
  next_billing_date date,
  last_billing_date date,
  billing_day_of_month integer,
  is_active boolean NOT NULL DEFAULT true,
  activated_at timestamp with time zone DEFAULT now(),
  deactivated_at timestamp with time zone,
  description text,
  reminder_days_before integer DEFAULT 3,
  auto_renew boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.subscriptions_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.subscriptions_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.tax_withholdings */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.tax_withholdings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id uuid,
  transaction_id uuid,
  withholding_date date NOT NULL,
  symbol text,
  withholding_amount numeric(15,2) NOT NULL,
  country text NOT NULL,
  income_type text NOT NULL,
  currency text NOT NULL DEFAULT 'CAD'::text,
  created_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.tax_withholdings_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.tax_withholdings_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.transaction_split */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.transaction_split (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  transaction_id uuid,
  category_id uuid,
  amount numeric(12,2) NOT NULL,
  percentage numeric(5,2),
  belief_tag text,
  chart_of_account_id uuid,
  inserted_at timestamp with time zone DEFAULT now(),
  description text,
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.transaction_split_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.transaction_split_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.transactions */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  date date NOT NULL,
  raw_merchant_name text NOT NULL,
  normalized_merchant_id uuid,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL,
  is_split boolean DEFAULT false,
  notes text,
  inserted_at timestamp with time zone DEFAULT now(),
  category_id uuid,
  description text,
  memo text,
  type text,
  account_id bigint,
  chart_of_account_id uuid,
  split_chart_of_account_id uuid,
  product_id uuid,
  status text DEFAULT 'pending_merchant_mapping'::text,
  updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.transactions_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.transactions_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.user_preferences */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.user_preferences (
  user_id uuid NOT NULL,
  merchant_id uuid NOT NULL,
  preferred_split_json jsonb,
  auto_tag_enabled boolean DEFAULT true
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.user_preferences_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.user_preferences_pkey (
  user_id uuid,
  merchant_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.user_profile */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.user_profile (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date_of_birth date,
  province text DEFAULT 'ON'::text,
  country text DEFAULT 'CA'::text,
  marital_status text,
  spouse_date_of_birth date,
  employment_status text DEFAULT 'employed'::text,
  current_annual_income numeric(15,2),
  spouse_annual_income numeric(15,2),
  expected_retirement_age integer DEFAULT 65,
  desired_retirement_income numeric(15,2),
  life_expectancy integer DEFAULT 90,
  marginal_tax_rate numeric(5,2),
  average_tax_rate numeric(5,2),
  rrsp_contribution_room numeric(15,2),
  rrsp_unused_room numeric(15,2),
  tfsa_contribution_room numeric(15,2),
  risk_tolerance text DEFAULT 'moderate'::text,
  preferred_currency text DEFAULT 'CAD'::text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.user_profile_pkey */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.user_profile_pkey (
  id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| /* ------------------------------------------------------------ */
/* TABLE: personal_finance.user_profile_user_id_key */
/* ------------------------------------------------------------ */
CREATE TABLE personal_finance.user_profile_user_id_key (
  user_id uuid
);                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |