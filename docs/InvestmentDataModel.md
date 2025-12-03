# Investment Data Model - Simplified for AI Financial Planning

## Purpose

This app consolidates expenses, income, and investments to help AI understand your **financial personality** and answer questions like:
- When can I retire?
- How much will I have at retirement?
- Am I saving enough?
- Is my portfolio properly diversified?

**Note:** This is NOT for tax filing. The AI will *consider* taxes when giving advice, but we don't track ACB adjustments, ROC, etc.

## Core Investment Tables

### 1. `investment_holdings` - Current Positions

Your current investment portfolio. One row per security per account.

```sql
-- Key fields for AI analysis:
symbol              -- Security identifier
security_name       -- Human readable name
investment_type     -- MUTUAL_FUND, STOCK, ETF, REIT, BOND, GIC, CRYPTO
asset_class         -- equity, fixed_income, real_estate, cash, alternative
sector              -- technology, healthcare, financial, etc.
geography           -- canada, us, international, emerging, global

-- Position data
units               -- How many shares/units
market_value        -- Current worth
book_cost           -- What you paid (for gain/loss)

-- Account context (denormalized for fast queries)
account_type        -- RRSP, TFSA, Non-Registered
institution         -- RBC, TD, etc.
```

### 2. `holding_snapshots` - Historical Tracking

Monthly/quarterly snapshots for trend analysis.

```sql
snapshot_date       -- When this snapshot was taken
units               -- Units at that time
market_value        -- Value at that time
units_change        -- Change from previous snapshot
value_change        -- Value change from previous
```

## Investment Types

| Type | Examples | Notes |
|------|----------|-------|
| `MUTUAL_FUND` | RBF556, TDB902 | Default for bank-managed funds |
| `ETF` | VFV.TO, XIU.TO | Exchange-traded funds |
| `STOCK` | AAPL, TD.TO | Individual stocks |
| `REIT` | REI.UN, HR.UN | Real estate investment trusts |
| `BOND` | Government, Corporate | Fixed income |
| `GIC` | 1-5 year terms | Guaranteed investments |
| `CRYPTO` | BTC, ETH | Cryptocurrency |

## Asset Classes

| Class | Description | AI Usage |
|-------|-------------|----------|
| `equity` | Stocks, equity funds | Growth, higher risk |
| `fixed_income` | Bonds, GICs | Stability, income |
| `real_estate` | REITs, property funds | Diversification |
| `cash` | Money market, savings | Liquidity |
| `alternative` | Crypto, commodities | Speculation |

## Pre-built Views for AI Queries

### Portfolio by Account Type
```sql
SELECT * FROM personal_finance.portfolio_by_account_type;
-- Returns: account_type, total_value, total_gain_loss, return_pct
-- AI use: "How much is in your RRSP vs TFSA?"
```

### Portfolio by Asset Class
```sql
SELECT * FROM personal_finance.portfolio_by_asset_class;
-- Returns: asset_class, total_value, allocation_pct
-- AI use: "Your portfolio is 80% equity - consider more bonds as you near retirement"
```

### Portfolio by Geography
```sql
SELECT * FROM personal_finance.portfolio_by_geography;
-- Returns: geography, total_value, allocation_pct
-- AI use: "You're heavily weighted to Canadian markets"
```

### Total Investment Net Worth
```sql
SELECT * FROM personal_finance.investment_net_worth;
-- Returns: total_market_value, total_unrealized_gain, num_accounts
-- AI use: Quick portfolio summary
```

## AI Query Examples

### "What's my total net worth?"
```sql
SELECT 
  (SELECT COALESCE(SUM(market_value), 0) FROM investment_holdings WHERE user_id = $1) +
  (SELECT COALESCE(SUM(balance), 0) FROM accounts WHERE user_id = $1) as total_net_worth;
```

### "How diversified am I?"
```sql
SELECT 
  asset_class,
  total_value,
  allocation_pct
FROM portfolio_by_asset_class 
WHERE user_id = $1
ORDER BY total_value DESC;
```

### "How has my portfolio grown?"
```sql
SELECT 
  DATE_TRUNC('month', snapshot_date) as month,
  SUM(market_value) as total_value
FROM holding_snapshots
WHERE user_id = $1
GROUP BY month
ORDER BY month;
```

### "What's my tax-advantaged vs taxable split?"
```sql
SELECT 
  CASE 
    WHEN account_type IN ('RRSP', 'TFSA', 'LIRA', 'RRIF') THEN 'Tax-Advantaged'
    ELSE 'Taxable'
  END as tax_status,
  SUM(market_value) as total_value
FROM investment_holdings
WHERE user_id = $1
GROUP BY tax_status;
```

## Workflow: Importing Statements

1. **Upload PDF** → Extract holdings data
2. **Match/Create** investment_holdings records
3. **Create snapshot** for the statement date
4. **Update current prices** on holdings

```javascript
// Simplified save flow
async function saveHoldings(accountId, holdings, statementDate) {
  for (const holding of holdings) {
    // Upsert to investment_holdings (current position)
    await upsertHolding(accountId, holding);
    
    // Create snapshot for historical tracking
    await createSnapshot(accountId, holding, statementDate);
  }
}
```

## What We DON'T Track (Simplification)

| Removed | Why |
|---------|-----|
| Book cost per unit per transaction | Not needed for planning |
| Return of Capital | Tax-specific |
| ACB adjustments | Tax-specific |
| Distribution types | Tax-specific |
| Individual DRIP transactions | Snapshots capture net effect |

## Code Simplification

### Before (Complex)
- `holdings` - Current holdings
- `investment_transactions` - Every buy/sell/DRIP
- `cash_transactions` - Fees, distributions
- `investment_positions` - Quarterly snapshots (different from holdings?)

### After (Simple)
- `investment_holdings` - Current positions (one per security)
- `holding_snapshots` - Historical values (one per security per month)
- `investment_transactions` - Only if user wants transaction history

## Database Migration

Run `simplify_investment_tables.sql` which will:
1. Create `investment_holdings` table
2. Create `holding_snapshots` table
3. Create pre-built views
4. Migrate data from old `holdings` table
5. Set up RLS policies

After verifying migration, optionally drop:
- `holdings` (replaced by `investment_holdings`)
- `investment_positions` (replaced by `holding_snapshots`)
