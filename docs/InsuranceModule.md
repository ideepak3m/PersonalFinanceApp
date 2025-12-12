# Insurance Module - Database Schema

## Overview
The insurance module allows users to track their insurance policies including life insurance, health insurance, and other policy types. It supports Indian insurance-specific features like bonus tracking, nominee management, and rider attachments.

## Tables

### 1. insurance_policies (Main Table)
Primary table for storing insurance policy details.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Reference to auth.users |
| insurer_name | TEXT | Insurance company (LIC, HDFC Life, etc.) |
| policy_number | TEXT | Unique policy number |
| plan_name | TEXT | Plan name (e.g., "Jeevan Anand") |
| plan_type | TEXT | Type: endowment, term, ulip, money_back, whole_life, pension, health, child |
| policy_holder_name | TEXT | Name of the insured person |
| sum_assured | DECIMAL(15,2) | Death/Maturity benefit amount |
| premium_amount | DECIMAL(12,2) | Premium amount per frequency |
| premium_frequency | TEXT | monthly, quarterly, half_yearly, annual, single |
| currency | TEXT | Default: INR |
| policy_start_date | DATE | Policy commencement date |
| maturity_date | DATE | Policy maturity date (NULL for term plans) |
| premium_payment_term | INTEGER | Years of premium payment |
| policy_term | INTEGER | Total policy duration in years |
| status | TEXT | active, paid_up, lapsed, matured, surrendered, claimed |
| total_premiums_paid | DECIMAL(15,2) | Running total (auto-calculated) |
| accrued_bonus | DECIMAL(15,2) | Accumulated simple/reversionary bonus |
| terminal_bonus | DECIMAL(15,2) | Terminal bonus (estimated/actual) |
| current_fund_value | DECIMAL(15,2) | For ULIPs only |
| expected_maturity_value | DECIMAL(15,2) | Expected maturity payout |
| surrender_value | DECIMAL(15,2) | Current surrender value |
| premium_payment_mode | TEXT | cash, online, auto_debit, cheque, ecs, upi |
| next_premium_due_date | DATE | Next premium due |
| last_premium_paid_date | DATE | Most recent payment |
| policy_document_location | TEXT | Where document is stored |
| notes | TEXT | Loans, premium holidays, special conditions |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### 2. insurance_nominees
Stores nominee information for each policy.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| policy_id | UUID | FK to insurance_policies |
| nominee_name | TEXT | Nominee's full name |
| relationship | TEXT | spouse, son, daughter, father, mother, brother, sister, other |
| percentage | DECIMAL(5,2) | Share percentage (default 100) |
| date_of_birth | DATE | Nominee's DOB |
| is_minor | BOOLEAN | True if nominee is under 18 |
| guardian_name | TEXT | Required if minor |
| created_at | TIMESTAMPTZ | Record creation timestamp |

### 3. insurance_riders
Additional riders attached to policies.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| policy_id | UUID | FK to insurance_policies |
| rider_name | TEXT | accidental_death, critical_illness, waiver_of_premium, etc. |
| rider_sum_assured | DECIMAL(15,2) | Rider coverage amount |
| additional_premium | DECIMAL(12,2) | Extra premium for rider |
| start_date | DATE | Rider start date |
| end_date | DATE | Rider expiry date |
| status | TEXT | active, expired, claimed |
| created_at | TIMESTAMPTZ | Record creation timestamp |

### 4. insurance_premium_payments
History of all premium payments.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| policy_id | UUID | FK to insurance_policies |
| payment_date | DATE | Date of payment |
| amount | DECIMAL(12,2) | Premium amount paid |
| payment_mode | TEXT | cash, online, auto_debit, cheque, upi, card |
| reference_number | TEXT | Transaction/Receipt number |
| financial_year | TEXT | e.g., "2024-25" |
| is_late_payment | BOOLEAN | True if paid after due date |
| late_fee | DECIMAL(10,2) | Late payment charges |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMPTZ | Record creation timestamp |

### 5. insurance_bonus_history
Bonus declarations for traditional policies (LIC, etc.).

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| policy_id | UUID | FK to insurance_policies |
| financial_year | TEXT | e.g., "2024-25" |
| bonus_type | TEXT | simple, reversionary, terminal, loyalty |
| bonus_rate | DECIMAL(8,4) | Rate per ₹1000 sum assured |
| bonus_amount | DECIMAL(15,2) | Total bonus amount |
| declared_date | DATE | Date of declaration |
| notes | TEXT | Additional notes |
| created_at | TIMESTAMPTZ | Record creation timestamp |

## Triggers

### update_policy_total_premiums
Automatically updates `total_premiums_paid` and `last_premium_paid_date` when premium payments are recorded.

### update_policy_accrued_bonus
Automatically updates `accrued_bonus` and `terminal_bonus` when bonus history is added.

## Row Level Security (RLS)
All tables have RLS enabled:
- Users can only view/modify their own policies
- Related tables (nominees, riders, payments, bonuses) are accessible based on policy ownership

## Plan Types
- `term` - Term Insurance (pure protection, no maturity benefit)
- `endowment` - Endowment Plan (protection + savings)
- `money_back` - Money Back Plan (periodic survival benefits)
- `whole_life` - Whole Life Insurance
- `ulip` - Unit Linked Insurance Plan (market-linked)
- `pension` - Pension/Retirement Plan
- `child` - Child Education/Marriage Plan
- `health` - Health Insurance
- `critical_illness` - Critical Illness Cover
- `accident` - Accidental Insurance
- `annuity` - Annuity Plan

## Common Insurers (India)
- LIC (Life Insurance Corporation of India)
- HDFC Life
- ICICI Prudential
- SBI Life
- Max Life
- Bajaj Allianz
- Tata AIA
- Kotak Life
- PNB MetLife
- Aditya Birla Sun Life
- And many more...

## Usage Notes

### For Traditional Plans (LIC, etc.)
1. Record yearly bonus declarations in `insurance_bonus_history`
2. Bonus is typically declared annually and can be tracked
3. Terminal bonus is usually declared at maturity

### For ULIPs
1. Track `current_fund_value` which fluctuates with market
2. No bonus declarations - returns are market-linked

### For Term Plans
1. No maturity date (or set to end of policy term)
2. No expected maturity value (only death benefit)
3. Lower premiums, pure protection

### Premium Reminders
- Use `next_premium_due_date` to track upcoming payments
- Query policies where `next_premium_due_date` is within X days for reminders

### Tax Benefits (80C)
- Premium payments can be tracked by financial year
- Use `financial_year` field in premium payments for tax reporting
