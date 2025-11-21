-- 1. category
create table personal_finance.category (
  id uuid not null default gen_random_uuid (),
  name text not null,
  description text null,
  is_split_enabled boolean null default false,
  inserted_at timestamp with time zone null default now(),
  constraint category_pkey primary key (id)
) TABLESPACE pg_default;

-- 2. profiles
create table personal_finance.profiles (
  id uuid not null,
  email text null,
  full_name text null,
  role text null default 'user'::text,
  created_at timestamp with time zone null default timezone ('utc'::text, now()),
  constraint profiles_pkey primary key (id),
  constraint profiles_email_key unique (email),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- 3. chart_of_accounts
create table personal_finance.chart_of_accounts (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  code text not null,
  name text not null,
  account_type text not null,
  description text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  is_active boolean null,
  constraint chart_of_accounts_pkey primary key (id)
) TABLESPACE pg_default;
create index IF not exists idx_chart_of_accounts_user_id on personal_finance.chart_of_accounts using btree (user_id) TABLESPACE pg_default;

-- 4. merchant
create table personal_finance.merchant (
  id uuid not null default gen_random_uuid (),
  normalized_name text not null,
  category_id uuid null,
  default_split_json jsonb null,
  aliases text[] null,
  inserted_at timestamp with time zone null default now(),
  constraint merchant_pkey primary key (id),
  constraint merchant_category_id_fkey foreign KEY (category_id) references personal_finance.category (id)
) TABLESPACE pg_default;

-- 5. providers
create table personal_finance.providers (
  id bigserial not null,
  user_id uuid null,
  name text not null,
  country text not null,
  type text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint providers_pkey primary key (id),
  constraint providers_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;
create index IF not exists idx_providers_user_id on personal_finance.providers using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_providers_country on personal_finance.providers using btree (country) TABLESPACE pg_default;

-- 6. accounts
create table personal_finance.accounts (
  id uuid not null,
  user_id uuid null,
  country text not null,
  account_category text not null,
  provider_id bigint null,
  account_number text null,
  name text not null,
  currency text null default 'USD'::text,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  balance real null default '0'::real,
  institution text null,
  type text null,
  constraint accounts_pkey primary key (id),
  constraint accounts_provider_id_fkey foreign KEY (provider_id) references personal_finance.providers (id) on delete CASCADE,
  constraint accounts_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;
create index IF not exists idx_accounts_user_id on personal_finance.accounts using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_accounts_provider_id on personal_finance.accounts using btree (provider_id) TABLESPACE pg_default;

-- 7. budgets
create table personal_finance.budgets (
  id bigserial not null,
  user_id uuid null,
  category text not null,
  amount numeric not null,
  month integer not null,
  year integer not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint budgets_pkey primary key (id),
  constraint budgets_user_id_category_month_year_key unique (user_id, category, month, year),
  constraint budgets_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;
create index IF not exists idx_budgets_user_id on personal_finance.budgets using btree (user_id) TABLESPACE pg_default;

-- 8. goals
create table personal_finance.goals (
  id bigserial not null,
  user_id uuid null,
  name text not null,
  target_amount numeric not null,
  current_amount numeric null default 0,
  deadline date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint goals_pkey primary key (id),
  constraint goals_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;
create index IF not exists idx_goals_user_id on personal_finance.goals using btree (user_id) TABLESPACE pg_default;

-- 9. description_rules
create table personal_finance.description_rules (
  id bigserial not null,
  user_id uuid null,
  description_pattern text not null,
  chart_of_account text not null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint description_rules_pkey primary key (id),
  constraint description_rules_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;
create index IF not exists idx_description_rules_user_id on personal_finance.description_rules using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_description_rules_pattern on personal_finance.description_rules using btree (description_pattern) TABLESPACE pg_default;

-- 10. products
create table personal_finance.products (
  id bigserial not null,
  user_id uuid null,
  account_id bigint null,
  product_type text not null,
  product_name text not null,
  product_code text null,
  quantity numeric null default 0,
  purchase_price numeric null default 0,
  current_price numeric null default 0,
  purchase_date date null,
  maturity_date date null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint products_pkey primary key (id),
  constraint products_account_id_fkey foreign KEY (account_id) references personal_finance.accounts (id) on delete CASCADE,
  constraint products_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;
create index IF not exists idx_products_user_id on personal_finance.products using btree (user_id) TABLESPACE pg_default;
create index IF not exists idx_products_account_id on personal_finance.products using btree (account_id) TABLESPACE pg_default;

-- 11. belief_tags
create table personal_finance.belief_tags (
  id uuid not null default gen_random_uuid (),
  name text not null,
  description text null,
  category_id uuid null,
  inserted_at timestamp with time zone null default now(),
  constraint belief_tags_pkey primary key (id),
  constraint belief_tags_category_id_fkey foreign KEY (category_id) references personal_finance.category (id)
) TABLESPACE pg_default;

-- 12. product_metadata
create table personal_finance.product_metadata (
  id bigserial not null,
  user_id uuid null,
  product_id bigint null,
  key text not null,
  value text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint product_metadata_pkey primary key (id),
  constraint product_metadata_product_id_key_key unique (product_id, key),
  constraint product_metadata_product_id_fkey foreign KEY (product_id) references personal_finance.products (id) on delete CASCADE,
  constraint product_metadata_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;
create index IF not exists idx_product_metadata_product_id on personal_finance.product_metadata using btree (product_id) TABLESPACE pg_default;

-- 13. transactions
create table personal_finance.transactions (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  date date not null,
  raw_merchant_name text not null,
  normalized_merchant_id uuid null,
  amount numeric(12, 2) not null,
  currency text not null,
  is_split boolean null default false,
  notes text null,
  inserted_at timestamp with time zone null default now(),
  account_id uuid null,
  category_id uuid null,
  "chartOfAccountId" uuid null,
  splitChartOfAccountId uuid null,
  description text null,
  memo text null,
  "productId" uuid null,
  type text null,
  constraint transactions_pkey primary key (id),
  constraint transactions_normalized_merchant_id_fkey foreign KEY (normalized_merchant_id) references personal_finance.merchant (id),
  constraint transactions_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- 14. transaction_split
create table personal_finance.transaction_split (
  id uuid not null default gen_random_uuid (),
  transaction_id uuid null,
  category_id uuid null,
  amount numeric(12, 2) not null,
  percentage numeric(5, 2) null,
  belief_tag text null,
  chart_of_account_id uuid null,
  inserted_at timestamp with time zone null default now(),
  constraint transaction_split_pkey primary key (id),
  constraint transaction_split_category_id_fkey foreign KEY (category_id) references personal_finance.category (id),
  constraint transaction_split_transaction_id_fkey foreign KEY (transaction_id) references personal_finance.transactions (id) on delete CASCADE
) TABLESPACE pg_default;

-- 15. user_preferences
create table personal_finance.user_preferences (
  user_id uuid not null,
  merchant_id uuid not null,
  preferred_split_json jsonb null,
  auto_tag_enabled boolean null default true,
  constraint user_preferences_pkey primary key (user_id, merchant_id),
  constraint user_preferences_merchant_id_fkey foreign KEY (merchant_id) references personal_finance.merchant (id),
  constraint user_preferences_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

-- Triggers (add after table creation)
create trigger update_accounts_updated_at BEFORE update on personal_finance.accounts for EACH row execute FUNCTION update_updated_at_column ();
create trigger update_providers_updated_at BEFORE update on personal_finance.providers for EACH row execute FUNCTION update_updated_at_column ();
create trigger update_budgets_updated_at BEFORE update on personal_finance.budgets for EACH row execute FUNCTION update_updated_at_column ();
create trigger update_description_rules_updated_at BEFORE update on personal_finance.description_rules for EACH row execute FUNCTION update_updated_at_column ();
create trigger update_goals_updated_at BEFORE update on personal_finance.goals for EACH row execute FUNCTION update_updated_at_column ();
create trigger update_product_metadata_updated_at BEFORE update on personal_finance.product_metadata for EACH row execute FUNCTION update_updated_at_column ();
create trigger update_products_updated_at BEFORE update on personal_finance.products for EACH row execute FUNCTION update_updated_at_column ();
