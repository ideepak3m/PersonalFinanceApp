# Personal Finance App - Development Phases

## Purpose
Consolidate all expenses, income, and investments in one place with categorized expenses so that AI can understand my financial personality. A chatbot will analyze this data to answer retirement planning questions like:
- When can I retire?
- How much money will I have after retirement?
- Am I saving enough?

**Note:** This is NOT for tax filing, but AI should consider taxes when giving advice.

---

## Phase 1: Database Foundation ✅ (Current)

### Existing Tables (Salvaged - No Deletions)

| Table | Purpose | Status |
|-------|---------|--------|
| `accounts` | Bank/financial accounts | ✅ Keep |
| `transactions` | Expenses/income | ✅ Keep - enhance |
| `investment_accounts` | Investment accounts | ✅ Keep |
| `holdings` | Current investment positions | ✅ Keep - enhance |
| `investment_transactions` | Buy/sell history | ✅ Keep |
| `cash_transactions` | Fees in investment accounts | ✅ Keep |
| `budgets` | Monthly budgets | ✅ Keep |
| `category` | Expense categories | ✅ Keep |
| `investment_managers` | Who manages accounts | ✅ Keep |

### New Tables to Add

| Table | Purpose | Priority |
|-------|---------|----------|
| `user_profile` | DOB, province, retirement age, tax info | 🔴 Critical |
| `government_benefits` | CPP/OAS/pension estimates | 🔴 Critical |
| `holding_snapshots` | Historical investment values (monthly/quarterly) | 🟡 Important |
| `monthly_cash_flow` | Summarized income/expenses (view) | 🟡 Important |
| `retirement_scenarios` | "What if" planning | 🟢 Later |
| `insurance_policies` | Indian maturity/endowment plans | 🟢 Later (Phase 4) |

### Enhancements to Existing Tables

| Table | Enhancement |
|-------|-------------|
| `holdings` | Add `user_id`, `investment_type`, `sector`, `geography`, `account_type` (denormalized) |
| `transactions` | Ensure `type` field distinguishes income vs expense |
| `accounts` | Support multi-country (Canada, India) |

---

## Phase 2: UI Flow & Dashboard

### User Flow (How Users Actually Use the App)

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER WORKFLOWS                            │
└─────────────────────────────────────────────────────────────────┘

🔧 CREATE / CLOSE (Setup - Occasional)
├── Create new investment account
├── Create new bank account  
├── Close/archive an account
└── Setup profile (DOB, retirement goals, CPP info)

📅 MONTHLY/DAILY (Regular Use - Most Common)
├── Daily:
│   ├── Add income transaction
│   ├── Add expense transaction
│   └── Categorize transactions
├── Monthly/Quarterly:
│   ├── Import investment statement (PDF)
│   ├── Review portfolio growth vs last month/quarter
│   └── Update CPP statement (annually)
└── Quick Actions from Dashboard

⚙️ MAINTENANCE (Background - Rare)
├── Run data migrations
├── Recalculate summaries
└── Admin tasks (hidden from normal flow)

📊 AD-HOC (On-Demand Analysis)
├── View investment growth (YTD, cumulative, by account)
├── View expense analysis:
│   ├── Monthly breakdown for current year
│   ├── Category breakdown
│   └── Year-over-year comparison graphs
├── View income trends
└── Chat with AI for insights
```

### Intuitive UI Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  SIDEBAR                    │  MAIN CONTENT                     │
├─────────────────────────────┼───────────────────────────────────┤
│                             │                                    │
│  🏠 Dashboard               │  [Changes based on selection]      │
│     └─ Net Worth & Summary  │                                    │
│                             │                                    │
│  💰 Transactions ─────────► │  ┌─────────────────────────────┐  │
│     ├─ Bank & Credit Cards  │  │ BANK ACCOUNTS: Import CSV,  │  │
│     └─ All Transactions     │  │ view transactions. System   │  │
│                             │  │ determines income/expense   │  │
│                             │  │ from category (salary,      │  │
│                             │  │ business income, rental)    │  │
│                             │  └─────────────────────────────┘  │
│                             │                                    │
│  📈 Investments ──────────► │  ┌─────────────────────────────┐  │
│     ├─ Investment Accounts  │  │ TABLE VIEW: All investment  │  │
│     └─ Import Statement     │  │ accounts with Import button.│  │
│                             │  │ Click account → Performance │  │
│                             │  └─────────────────────────────┘  │
│                             │                                    │
│  📊 Reports ──────────────► │  ┌─────────────────────────────┐  │
│     ├─ Expense Analysis     │  │ AD-HOC: Charts, comparisons │  │
│     ├─ Income Analysis      │  │ year-over-year graphs       │  │
│     ├─ Investment Growth    │  └─────────────────────────────┘  │
│     └─ Net Worth Trend      │                                    │
│                             │                                    │
│  🤖 AI Chat ──────────────► │  Chat interface for insights      │
│                             │                                    │
│  ⚙️ Settings               │  Profile, retirement goals         │
│     ├─ Profile              │                                    │
│     ├─ Retirement Info      │                                    │
│     ├─ Subscriptions        │                                    │
│     └─ Split Rules          │                                    │
│                             │                                    │
└─────────────────────────────┴───────────────────────────────────┘
```

### Dashboard (Home) - The Hub

```
┌─────────────────────────────────────────────────────────────────┐
│  DASHBOARD                                          [Dec 2025]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Net Worth    │ │ This Month   │ │ Portfolio    │            │
│  │ $XXX,XXX     │ │ Income $X,XXX│ │ +X.X% MTD    │            │
│  │ ▲ +$X,XXX    │ │ Expense $X,XX│ │ +X.X% YTD    │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ QUICK ACTIONS                                            │   │
│  │  [+ Add Income]  [+ Add Expense]  [Import Statement]    │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────┐ ┌─────────────────────────────┐   │
│  │ Recent Transactions     │ │ Portfolio Allocation        │   │
│  │ • Salary      +$5,000  │ │      [Pie Chart]            │   │
│  │ • Groceries    -$150   │ │  Equity 60%                 │   │
│  │ • Gas          -$80    │ │  Fixed Income 30%           │   │
│  │ • Netflix      -$15    │ │  Cash 10%                   │   │
│  │ [View All →]           │ │                             │   │
│  └─────────────────────────┘ └─────────────────────────────┘   │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Monthly Expense Trend (Last 12 Months)                  │   │
│  │  $5K ┤    ╭─╮                                           │   │
│  │      │ ╭──╯ ╰─╮  ╭──╮                                   │   │
│  │  $4K ┤─╯      ╰──╯  ╰───                               │   │
│  │      └─────────────────────────────                    │   │
│  │       J  F  M  A  M  J  J  A  S  O  N  D               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Page Breakdown by User Flow

#### 🔧 CREATE/CLOSE → Settings
| Action | Location |
|--------|----------|
| Create investment account | Investments > Investment Accounts > + New |
| Create bank/credit account | Transactions > Bank & Credit Cards > + New |
| Close/archive account | Account Details > Archive |
| Setup profile | Settings > Profile |
| Enter CPP/OAS info | Settings > Retirement Info |

#### 📅 DAILY USE → Transactions
| Action | Location |
|--------|----------|
| Import bank/credit CSV | Transactions > Bank & Credit Cards > Import |
| View transactions | Transactions > All Transactions (with filters) |
| Categorize | Click transaction > Edit category |
| **Income vs Expense** | System determines from category (Salary, Business Income, Rental = Income) |

#### 📅 MONTHLY USE → Investments
| Action | Location |
|--------|----------|
| Import statement (PDF) | Investments > Import Statement OR click Import on account row |
| View all accounts | Investments > Investment Accounts (table view) |
| View performance | Click any account row → Performance details |
| Check growth | Account detail shows MTD, QTD, YTD growth |

#### 📊 AD-HOC ANALYSIS → Reports
| Action | Location |
|--------|----------|
| Investment growth (YTD) | Reports > Investment Growth |
| Cumulative by account | Reports > Investment Growth > By Account |
| Expense by month | Reports > Expense Analysis > Monthly |
| Expense by category | Reports > Expense Analysis > By Category |
| Year-over-year comparison | Reports > Expense Analysis > YoY Compare |
| Income trends | Reports > Income Analysis |
| Chat with AI | AI Chat (dedicated page) |

### Key UX Principles

1. **Dashboard is the Hub** - Everything starts here
2. **Quick Actions** - Most common daily tasks are 1 click away
3. **Progressive Disclosure** - Show summary first, details on demand
4. **Consistent Navigation** - Same sidebar everywhere
5. **Visual Feedback** - Graphs and colors for quick understanding

---

## Phase 3: Data Import & Forms

### 3a. Import Capabilities
- [x] PDF Investment Statements (RBC, etc.)
- [ ] Bank Statement CSV
- [ ] Credit Card CSV
- [ ] CPP Statement of Contributions PDF
- [ ] Manual Entry Forms

### 3b. Forms Needed
- [ ] Add/Edit Transaction
- [ ] Add/Edit Account
- [ ] User Profile Setup
- [ ] CPP/OAS Benefits Entry
- [ ] Retirement Scenario Builder

---

## Phase 4: AI & Reporting

### 4a. AI Chatbot Capabilities
- "When can I retire?"
- "How much will I have at 65?"
- "Should I take CPP at 60 or 65?"
- "What's my spending personality?"
- "Am I saving enough?"
- "Show my portfolio allocation"
- "What if I reduce expenses by $500/month?"

### 4b. Reports
- Monthly Cash Flow Report
- Annual Summary
- Portfolio Performance
- Tax-Advantaged vs Taxable Split
- Retirement Projection

### 4c. AI Data Sources
```sql
-- AI queries these views/tables:
- investment_net_worth (total portfolio value)
- portfolio_by_account_type (RRSP, TFSA, Non-Reg)
- portfolio_by_asset_class (equity, fixed income, etc.)
- monthly_cash_flow (income/expense patterns)
- user_profile (age, retirement goals)
- government_benefits (CPP/OAS estimates)
```

---

## Phase 5: India Support

### 5a. Multi-Country Support
- Currency: CAD + INR
- Accounts: Canadian + Indian banks
- Investments: Canadian + Indian mutual funds/stocks

### 5b. Indian-Specific Features
- **Insurance Policies Table** - Endowment/maturity plans
  - Policy number, maturity date, maturity amount
  - Premium payment tracking
  - Treat maturity as retirement income stream
- **NRI Tax Considerations** - AI should understand:
  - DTAA (Double Taxation Avoidance Agreement)
  - NRE/NRO account implications
  - Repatriation rules

### 5c. Insurance as Retirement Income
```sql
CREATE TABLE personal_finance.insurance_policies (
  id UUID PRIMARY KEY,
  user_id UUID,
  policy_number TEXT,
  policy_type TEXT,  -- 'endowment', 'ULIP', 'term', 'whole_life'
  provider TEXT,     -- 'LIC', 'HDFC Life', etc.
  country TEXT DEFAULT 'IN',
  currency TEXT DEFAULT 'INR',
  
  -- Premium details
  premium_amount NUMERIC(15, 2),
  premium_frequency TEXT,  -- 'monthly', 'quarterly', 'annual'
  premium_start_date DATE,
  premium_end_date DATE,
  
  -- Maturity details
  maturity_date DATE,
  maturity_amount NUMERIC(15, 2),
  sum_assured NUMERIC(15, 2),
  
  -- For retirement planning
  is_retirement_income BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## Migration Files

| File | Purpose | Status |
|------|---------|--------|
| `enhance_holdings_add_snapshots.sql` | Add fields to holdings + create snapshots table | 📝 Ready |
| `create_user_profile.sql` | User profile + government benefits tables | 📝 To create |
| `create_retirement_tables.sql` | Scenarios + projections | 🔜 Phase 4 |
| `create_insurance_policies.sql` | Indian insurance maturity tracking | 🔜 Phase 5 |

---

## Progress Tracking

- [x] Phase 1: Database analysis complete
- [ ] Phase 1: Run migrations
- [ ] Phase 2a: Fix navigation flow
- [ ] Phase 2b: Build dashboard
- [ ] Phase 3: Import/forms
- [ ] Phase 4: AI integration
- [ ] Phase 5: India support