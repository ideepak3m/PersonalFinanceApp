| table_name        | column_name         | data_type                | character_maximum_length | is_nullable | column_default                                | ordinal_position |
| ----------------- | ------------------- | ------------------------ | ------------------------ | ----------- | --------------------------------------------- | ---------------- |
| accounts          | id                  | bigint                   | null                     | NO          | nextval('accounts_id_seq'::regclass)          | 1                |
| accounts          | user_id             | uuid                     | null                     | YES         | null                                          | 2                |
| accounts          | country             | text                     | null                     | NO          | null                                          | 3                |
| accounts          | account_category    | text                     | null                     | NO          | null                                          | 4                |
| accounts          | provider_id         | bigint                   | null                     | YES         | null                                          | 5                |
| accounts          | account_number      | text                     | null                     | YES         | null                                          | 6                |
| accounts          | name                | text                     | null                     | NO          | null                                          | 7                |
| accounts          | currency            | text                     | null                     | YES         | 'USD'::text                                   | 8                |
| accounts          | created_at          | timestamp with time zone | null                     | YES         | now()                                         | 9                |
| accounts          | updated_at          | timestamp with time zone | null                     | YES         | now()                                         | 10               |
| accounts          | balance             | real                     | null                     | YES         | '0'::real                                     | 11               |
| accounts          | institution         | text                     | null                     | YES         | null                                          | 12               |
| accounts          | type                | text                     | null                     | YES         | null                                          | 13               |
| belief_tags       | id                  | uuid                     | null                     | NO          | gen_random_uuid()                             | 1                |
| belief_tags       | name                | text                     | null                     | NO          | null                                          | 2                |
| belief_tags       | description         | text                     | null                     | YES         | null                                          | 3                |
| belief_tags       | category_id         | uuid                     | null                     | YES         | null                                          | 4                |
| belief_tags       | inserted_at         | timestamp with time zone | null                     | YES         | now()                                         | 5                |
| budgets           | id                  | bigint                   | null                     | NO          | nextval('budgets_id_seq'::regclass)           | 1                |
| budgets           | user_id             | uuid                     | null                     | YES         | null                                          | 2                |
| budgets           | category            | text                     | null                     | NO          | null                                          | 3                |
| budgets           | amount              | numeric                  | null                     | NO          | null                                          | 4                |
| budgets           | month               | integer                  | null                     | NO          | null                                          | 5                |
| budgets           | year                | integer                  | null                     | NO          | null                                          | 6                |
| budgets           | created_at          | timestamp with time zone | null                     | YES         | now()                                         | 7                |
| budgets           | updated_at          | timestamp with time zone | null                     | YES         | now()                                         | 8                |
| category          | id                  | uuid                     | null                     | NO          | gen_random_uuid()                             | 1                |
| category          | name                | text                     | null                     | NO          | null                                          | 2                |
| category          | description         | text                     | null                     | YES         | null                                          | 3                |
| category          | is_split_enabled    | boolean                  | null                     | YES         | false                                         | 4                |
| category          | inserted_at         | timestamp with time zone | null                     | YES         | now()                                         | 5                |
| chart_of_accounts | id                  | uuid                     | null                     | NO          | gen_random_uuid()                             | 1                |
| chart_of_accounts | user_id             | uuid                     | null                     | NO          | null                                          | 2                |
| chart_of_accounts | code                | text                     | null                     | NO          | null                                          | 3                |
| chart_of_accounts | name                | text                     | null                     | NO          | null                                          | 4                |
| chart_of_accounts | type                | text                     | null                     | NO          | null                                          | 5                |
| chart_of_accounts | description         | text                     | null                     | YES         | null                                          | 6                |
| chart_of_accounts | created_at          | timestamp with time zone | null                     | YES         | now()                                         | 7                |
| chart_of_accounts | updated_at          | timestamp with time zone | null                     | YES         | now()                                         | 8                |
| description_rules | id                  | bigint                   | null                     | NO          | nextval('description_rules_id_seq'::regclass) | 1                |
| description_rules | user_id             | uuid                     | null                     | YES         | null                                          | 2                |
| description_rules | description_pattern | text                     | null                     | NO          | null                                          | 3                |
| description_rules | chart_of_account    | text                     | null                     | NO          | null                                          | 4                |
| description_rules | created_at          | timestamp with time zone | null                     | YES         | now()                                         | 5                |
| description_rules | updated_at          | timestamp with time zone | null                     | YES         | now()                                         | 6                |
| goals             | id                  | bigint                   | null                     | NO          | nextval('goals_id_seq'::regclass)             | 1                |
| goals             | user_id             | uuid                     | null                     | YES         | null                                          | 2                |
| goals             | name                | text                     | null                     | NO          | null                                          | 3                |
| goals             | target_amount       | numeric                  | null                     | NO          | null                                          | 4                |
| goals             | current_amount      | numeric                  | null                     | YES         | 0                                             | 5                |
| goals             | deadline            | date                     | null                     | YES         | null                                          | 6                |
| goals             | created_at          | timestamp with time zone | null                     | YES         | now()                                         | 7                |
| goals             | updated_at          | timestamp with time zone | null                     | YES         | now()                                         | 8                |
| merchant          | id                  | uuid                     | null                     | NO          | gen_random_uuid()                             | 1                |
| merchant          | normalized_name     | text                     | null                     | NO          | null                                          | 2                |
| merchant          | category_id         | uuid                     | null                     | YES         | null                                          | 3                |
| merchant          | default_split_json  | jsonb                    | null                     | YES         | null                                          | 4                |
| merchant          | aliases             | ARRAY                    | null                     | YES         | null                                          | 5                |
| merchant          | inserted_at         | timestamp with time zone | null                     | YES         | now()                                         | 6                |
| product_metadata  | id                  | bigint                   | null                     | NO          | nextval('product_metadata_id_seq'::regclass)  | 1                |
| product_metadata  | user_id             | uuid                     | null                     | YES         | null                                          | 2                |
| product_metadata  | product_id          | bigint                   | null                     | YES         | null                                          | 3                |
| product_metadata  | key                 | text                     | null                     | NO          | null                                          | 4                |
| product_metadata  | value               | text                     | null                     | YES         | null                                          | 5                |
| product_metadata  | created_at          | timestamp with time zone | null                     | YES         | now()                                         | 6                |
| product_metadata  | updated_at          | timestamp with time zone | null                     | YES         | now()                                         | 7                |
| products          | id                  | bigint                   | null                     | NO          | nextval('products_id_seq'::regclass)          | 1                |
| products          | user_id             | uuid                     | null                     | YES         | null                                          | 2                |
| products          | account_id          | bigint                   | null                     | YES         | null                                          | 3                |
| products          | product_type        | text                     | null                     | NO          | null                                          | 4                |
| products          | product_name        | text                     | null                     | NO          | null                                          | 5                |
| products          | product_code        | text                     | null                     | YES         | null                                          | 6                |
| products          | quantity            | numeric                  | null                     | YES         | 0                                             | 7                |
| products          | purchase_price      | numeric                  | null                     | YES         | 0                                             | 8                |
| products          | current_price       | numeric                  | null                     | YES         | 0                                             | 9                |
| products          | purchase_date       | date                     | null                     | YES         | null                                          | 10               |
| products          | maturity_date       | date                     | null                     | YES         | null                                          | 11               |
| products          | created_at          | timestamp with time zone | null                     | YES         | now()                                         | 12               |
| products          | updated_at          | timestamp with time zone | null                     | YES         | now()                                         | 13               |
| profiles          | id                  | uuid                     | null                     | NO          | null                                          | 1                |
| profiles          | email               | text                     | null                     | YES         | null                                          | 2                |
| profiles          | full_name           | text                     | null                     | YES         | null                                          | 3                |
| profiles          | role                | text                     | null                     | YES         | 'user'::text                                  | 4                |
| profiles          | created_at          | timestamp with time zone | null                     | YES         | timezone('utc'::text, now())                  | 5                |
| providers         | id                  | bigint                   | null                     | NO          | nextval('providers_id_seq'::regclass)         | 1                |
| providers         | user_id             | uuid                     | null                     | YES         | null                                          | 2                |
| providers         | name                | text                     | null                     | NO          | null                                          | 3                |
| providers         | country             | text                     | null                     | NO          | null                                          | 4                |
| providers         | type                | text                     | null                     | NO          | null                                          | 5                |
| providers         | created_at          | timestamp with time zone | null                     | YES         | now()                                         | 6                |
| providers         | updated_at          | timestamp with time zone | null                     | YES         | now()                                         | 7                |
| transaction_split | id                  | uuid                     | null                     | NO          | gen_random_uuid()                             | 1                |
| transaction_split | transaction_id      | uuid                     | null                     | YES         | null                                          | 2                |
| transaction_split | category_id         | uuid                     | null                     | YES         | null                                          | 3                |
| transaction_split | amount              | numeric                  | null                     | NO          | null                                          | 4                |
| transaction_split | percentage          | numeric                  | null                     | YES         | null                                          | 5                |
| transaction_split | belief_tag          | text                     | null                     | YES         | null                                          | 6                |
| transaction_split | inserted_at         | timestamp with time zone | null                     | YES         | now()                                         | 7                |
| transactions      | id                  | uuid                     | null                     | NO          | gen_random_uuid()                             | 1                |
| transactions      | user_id             | uuid                     | null                     | YES         | null                                          | 2                |