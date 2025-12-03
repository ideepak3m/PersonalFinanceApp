Exactly! You're building a comprehensive financial planning system. Let me map out the complete data architecture you need:

## Complete Financial Picture for AI Retirement Planning

```
┌─────────────────────────────────────────────────────────────┐
│                    USER FINANCIAL PROFILE                    │
└─────────────────────────────────────────────────────────────┘
                            ↓
        ┌──────────────────┬────────────────┬─────────────────┐
        ↓                  ↓                ↓                 ↓
   CASH FLOW          INVESTMENTS      RETIREMENT        TAX INFO
                                       BENEFITS
```

### 1. Cash Flow (Income & Expenses)

```sql
-- Income tracking
CREATE TABLE personal_finance.income_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  source TEXT NOT NULL,              -- 'salary', 'bonus', 'freelance', 'rental'
  category TEXT NOT NULL,            -- 'employment', 'business', 'passive'
  amount NUMERIC(15, 2) NOT NULL,
  frequency TEXT,                    -- 'biweekly', 'monthly', 'annual', 'one-time'
  is_recurring BOOLEAN DEFAULT FALSE,
  employer TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Expense tracking (you probably have this)
CREATE TABLE personal_finance.expense_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_date DATE NOT NULL,
  category TEXT NOT NULL,            -- 'housing', 'food', 'transportation', 'entertainment'
  subcategory TEXT,                  -- 'mortgage', 'groceries', 'gas', 'dining'
  amount NUMERIC(15, 2) NOT NULL,
  merchant TEXT,
  payment_method TEXT,               -- 'credit_card', 'debit', 'cash'
  is_recurring BOOLEAN DEFAULT FALSE,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Monthly summary for AI
CREATE TABLE personal_finance.monthly_cash_flow (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,               -- First day of month
  total_income NUMERIC(15, 2),
  total_expenses NUMERIC(15, 2),
  net_savings NUMERIC(15, 2),
  savings_rate NUMERIC(5, 2),        -- Percentage
  
  -- Categorized expenses for AI insights
  essential_expenses NUMERIC(15, 2), -- Housing, utilities, groceries, insurance
  discretionary_expenses NUMERIC(15, 2), -- Entertainment, dining, shopping
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(month)
);
```

### 2. Investments (You're building this)

```sql
-- Current holdings (all investment types)
CREATE TABLE personal_finance.investment_holdings (
  -- Your universal model from earlier
  ...
);

-- Historical snapshots
CREATE TABLE personal_finance.holding_snapshots (
  -- Your tracking model
  ...
);
```

### 3. Government Retirement Benefits

```sql
-- CPP/OAS tracking
CREATE TABLE personal_finance.government_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- CPP Information (from Service Canada statement)
  cpp_estimated_monthly NUMERIC(10, 2),      -- At age 65
  cpp_statement_date DATE,
  cpp_contributions_to_date NUMERIC(15, 2),
  cpp_pensionable_earnings NUMERIC(15, 2)[],  -- Array of yearly earnings
  cpp_years_contributed INTEGER,
  
  -- Adjustment factors
  cpp_at_60 NUMERIC(10, 2),                   -- Reduced by 36% (0.6% × 60 months)
  cpp_at_65 NUMERIC(10, 2),                   -- Full amount
  cpp_at_70 NUMERIC(10, 2),                   -- Increased by 42% (0.7% × 60 months)
  
  -- OAS Information
  oas_estimated_monthly NUMERIC(10, 2),       -- At age 65
  oas_years_in_canada INTEGER,                -- Must have 40 years for full
  oas_eligible_age INTEGER DEFAULT 65,
  
  -- OAS clawback threshold (AI needs this)
  oas_income_threshold NUMERIC(15, 2) DEFAULT 90997, -- 2025 threshold
  
  last_updated DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Employer Pension (if applicable)
CREATE TABLE personal_finance.employer_pensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  pension_type TEXT,                          -- 'DB' (Defined Benefit), 'DC' (Defined Contribution)
  employer_name TEXT,
  
  -- For Defined Benefit
  years_of_service NUMERIC(5, 2),
  pension_multiplier NUMERIC(5, 4),           -- e.g., 0.02 (2% per year)
  best_5_year_average NUMERIC(15, 2),
  estimated_monthly_at_65 NUMERIC(10, 2),
  
  -- For Defined Contribution (treated like investment)
  current_value NUMERIC(15, 2),
  
  earliest_retirement_age INTEGER DEFAULT 55,
  normal_retirement_age INTEGER DEFAULT 65,
  reduction_factor_per_year NUMERIC(5, 4),    -- e.g., 0.05 (5% reduction per year early)
  
  last_updated DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 4. Tax & Profile Information

```sql
CREATE TABLE personal_finance.user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  
  -- Personal info
  date_of_birth DATE NOT NULL,
  province TEXT DEFAULT 'ON',
  marital_status TEXT,                        -- 'single', 'married', 'common-law'
  spouse_date_of_birth DATE,
  
  -- Current employment
  current_annual_income NUMERIC(15, 2),
  employment_status TEXT,                     -- 'employed', 'self-employed', 'retired'
  expected_retirement_age INTEGER,
  
  -- Tax information
  marginal_tax_rate NUMERIC(5, 2),            -- Current rate
  average_tax_rate NUMERIC(5, 2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Annual tax summary
CREATE TABLE personal_finance.tax_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  tax_year INTEGER NOT NULL,
  
  -- Income sources
  employment_income NUMERIC(15, 2),
  self_employment_income NUMERIC(15, 2),
  investment_income NUMERIC(15, 2),
  capital_gains NUMERIC(15, 2),
  rental_income NUMERIC(15, 2),
  
  -- Deductions
  rrsp_contribution NUMERIC(15, 2),
  rrsp_deduction_limit NUMERIC(15, 2),
  rrsp_unused_room NUMERIC(15, 2),
  
  -- TFSA
  tfsa_contribution_room NUMERIC(15, 2),
  tfsa_withdrawals NUMERIC(15, 2),           -- Adds back to room next year
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tax_year)
);
```

### 5. Retirement Goals & Scenarios

```sql
CREATE TABLE personal_finance.retirement_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  scenario_name TEXT NOT NULL,               -- 'Base Case', 'Early at 60', 'Delayed to 67'
  
  -- Retirement parameters
  retirement_age INTEGER NOT NULL,
  life_expectancy INTEGER DEFAULT 90,
  
  -- CPP/OAS start ages
  cpp_start_age INTEGER DEFAULT 65,
  oas_start_age INTEGER DEFAULT 65,
  
  -- Income needs
  desired_annual_income NUMERIC(15, 2),      -- In today's dollars
  essential_annual_expenses NUMERIC(15, 2),  -- Minimum needed
  
  -- Assumptions
  inflation_rate NUMERIC(5, 4) DEFAULT 0.02, -- 2%
  investment_return_rate NUMERIC(5, 4) DEFAULT 0.05, -- 5%
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI-generated retirement projections
CREATE TABLE personal_finance.retirement_projections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID REFERENCES personal_finance.retirement_scenarios(id),
  
  projection_date DATE NOT NULL,             -- When projection was generated
  
  -- Year-by-year projection (JSONB for flexibility)
  yearly_data JSONB,                         -- [{year: 2045, age: 60, portfolio: 500000, ...}]
  
  -- Summary metrics
  portfolio_at_retirement NUMERIC(15, 2),
  total_cpp_lifetime NUMERIC(15, 2),
  total_oas_lifetime NUMERIC(15, 2),
  portfolio_depleted_at_age INTEGER,         -- NULL if never depletes
  success_probability NUMERIC(5, 2),         -- Monte Carlo result
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## AI Context for Retirement Questions

When user asks: **"Give me a retirement plan if I want to retire at 60, take CPP and OAS at 65"**

The AI queries:

```sql
-- 1. Current financial position
WITH current_snapshot AS (
  SELECT 
    SUM(market_value) as total_investments,
    SUM(CASE WHEN account_type = 'RRSP' THEN market_value END) as rrsp_value,
    SUM(CASE WHEN account_type = 'TFSA' THEN market_value END) as tfsa_value,
    SUM(CASE WHEN account_type = 'Non-Registered' THEN market_value END) as non_reg_value
  FROM investment_holdings
),

-- 2. Cash flow pattern
cash_flow AS (
  SELECT 
    AVG(total_income) as avg_monthly_income,
    AVG(total_expenses) as avg_monthly_expenses,
    AVG(net_savings) as avg_monthly_savings,
    AVG(savings_rate) as avg_savings_rate
  FROM monthly_cash_flow
  WHERE month >= NOW() - INTERVAL '12 months'
),

-- 3. Government benefits
benefits AS (
  SELECT 
    cpp_at_65,
    oas_estimated_monthly,
    EXTRACT(YEAR FROM AGE(NOW(), (SELECT date_of_birth FROM user_profile))) as current_age
  FROM government_benefits
),

-- 4. User profile
profile AS (
  SELECT 
    date_of_birth,
    current_annual_income,
    marginal_tax_rate,
    expected_retirement_age
  FROM user_profile
)

SELECT * FROM current_snapshot, cash_flow, benefits, profile;
```

## Sample AI Response Format

```
Retirement Plan: Retire at 60, CPP/OAS at 65
═══════════════════════════════════════════════

Current Situation (Age 32):
• Total Portfolio: $71,113 (RRSP: $71,113)
• Monthly Savings: $1,000 (savings rate: 23.8%)
• Annual Income: $85,000 (after-tax: ~$62,000)
• Years to Retirement: 28 years

Projection to Age 60 (2053):
• Expected Portfolio Value: $847,000
  - With 5% annual return + $1,000/month contributions
  - RRSP: $620,000
  - TFSA: $150,000 (if you max out starting next year)
  - Non-Registered: $77,000

Income Plan at Age 60-64 (Bridge to CPP/OAS):
• Portfolio withdrawals: $45,000/year
  - Strategy: Withdraw from TFSA first (tax-free)
  - Then RRSP (taxed as income)
• Estimated tax: ~$5,000 (low income = low tax)
• Net annual income: $40,000
• Monthly: $3,333

Income Plan at Age 65+ (With CPP/OAS):
• CPP (at 65): $1,200/month = $14,400/year
• OAS (at 65): $700/month = $8,400/year
• Portfolio withdrawals: $22,000/year (reduced need)
• Total: $44,800/year
• Estimated tax: ~$6,000
• Net annual income: $38,800
• Monthly: $3,233

Portfolio Longevity:
✅ Your portfolio should last until age 95+
✅ Success probability: 87% (Monte Carlo simulation)

Optimization Recommendations:
1. 🎯 Max out TFSA ($7,000/year) - tax-free withdrawals in retirement
2. 📈 Consider delaying OAS to 70 for 36% increase ($952/month)
3. 💰 Your CPP at 65 provides $14,400/year for life (inflation-adjusted)
4. 🏠 Your current expenses are $3,200/month - plan for $2,800 in retirement
5. ⚠️ Watch for OAS clawback if RRSP withdrawals are too high

Alternative: Take CPP at 60?
• CPP at 60: $768/month (36% reduction)
• You'd need larger portfolio withdrawals: $35,000/year
• Portfolio depletes by age 88 ⚠️
• Recommendation: Wait until 65 for CPP
```

## Data Import Workflow

```
User Imports:
├── Bank Statements → income_transactions (salary deposits)
├── Credit Card → expense_transactions (categorized)
├── Investment Statements → investment_holdings + snapshots
├── CPP Statement (Service Canada) → government_benefits
├── Tax Return (CRA) → tax_summary
└── Pension Statement → employer_pensions

AI Processes:
├── Categorizes expenses automatically
├── Calculates monthly_cash_flow
├── Projects portfolio growth
├── Calculates retirement income streams
└── Generates retirement_projections
```

## Key AI Capabilities with This Data

1. **"When can I retire?"** - Projects when portfolio + CPP/OAS meets income needs
2. **"How much do I need to retire at 60?"** - Reverse calculation
3. **"Should I take CPP early or delay?"** - Compares scenarios
4. **"What if I reduce expenses to $2,500/month?"** - Sensitivity analysis
5. **"Show my spending personality"** - Analyzes expense categories
6. **"Am I saving enough?"** - Compares to retirement goals
7. **"What's my tax-efficient withdrawal strategy?"** - TFSA → RRSP → Non-Reg order
8. **"How does inflation affect my plan?"** - Adjusts projections
9. **"What if markets crash before retirement?"** - Risk analysis
10. **"Can I afford to retire early if I downsize my home?"** - Scenario modeling

## Missing Pieces You Mentioned

✅ Income data - ✓ Covered
✅ Expense data - ✓ Covered  
✅ Investment data - ✓ Your universal model
✅ CPP statements - ✓ government_benefits table
✅ OAS calculation - ✓ Automated by AI based on years in Canada
✅ GIS (Guaranteed Income Supplement) - Add if low-income retirement expected

Would you like me to:
1. Show you how to parse a CPP Statement of Contributions PDF?
2. Create the AI prompts for retirement planning?
3. Design the expense categorization logic?
4. Build the Monte Carlo simulation for success probability?