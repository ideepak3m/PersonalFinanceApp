# Investment Statement Data Schema

## Overview
This document defines the complete data structure extracted from investment statements (Olympia Trust, RBC, TD, etc.) and how it maps to database tables.

## AI Extraction Output

```json
{
  "accountInfo": {
    "accountNumber": "123456",
    "accountType": "TFSA|RRSP|Cash|Margin|LIRA|RESP",
    "institution": "Olympia Trust|RBC|TD|BMO|Questrade",
    "statementPeriod": "Q1 2024",
    "statementDate": "2024-03-31",
    "currency": "CAD|USD",
    "openingBalance": "25000.00",
    "closingBalance": "26500.00"
  },
  "tables": [...]
}
```

## Database Tables

### 1. `accounts`
**Purpose:** Track investment accounts  
**Source:** `accountInfo` from AI extraction

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| id | UUID | Primary key | auto |
| user_id | UUID | Foreign key to users | - |
| account_number | TEXT | Account # | "123456" |
| account_type | TEXT | TFSA/RRSP/etc | "TFSA" |
| institution | TEXT | Broker name | "Olympia Trust" |
| currency | TEXT | CAD/USD | "CAD" |
| created_at | TIMESTAMP | When added | auto |

### 2. `holdings`
**Purpose:** Current investment positions (what you own now)  
**Source:** "Holdings" / "Securities Held" / "Positions" table

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| id | UUID | Primary key | auto |
| account_id | UUID | Foreign key | - |
| symbol | TEXT | Ticker symbol | "CNR.UN" |
| security_name | TEXT | Full name | "Centurion Apartment REIT" |
| units | DECIMAL | Shares/units owned | "1800.627" |
| price | DECIMAL | Current price | "14.50" |
| market_value | DECIMAL | Current value | "26109.09" |
| book_value | DECIMAL | Cost basis | "25000.00" |
| gain_loss | DECIMAL | Unrealized gain | "1109.09" |
| as_of_date | DATE | Statement date | "2024-03-31" |

### 3. `cash_transactions`
**Purpose:** Fees, purchases, transfers, deposits/withdrawals  
**Source:** "Record of Cash Transactions" / "Cash Activity"

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| id | UUID | Primary key | auto |
| account_id | UUID | Foreign key | - |
| date | DATE | Transaction date | "2018-03-16" |
| description | TEXT | What happened | "Administration Fee" |
| transaction_type | TEXT | Fee/Purchase/Transfer | "Fee" |
| debit | DECIMAL | Money out | "150.00" |
| credit | DECIMAL | Money in | "0.00" |
| balance | DECIMAL | Running balance | "-150.00" |
| currency | TEXT | CAD/USD | "CAD" |

### 4. `investment_transactions`
**Purpose:** Dividends, interest, buys, sells, reinvestments  
**Source:** "Transaction Details" / "Income" / "Trading Activity"

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| id | UUID | Primary key | auto |
| account_id | UUID | Foreign key | - |
| date | DATE | Transaction date | "2018-04-05" |
| symbol | TEXT | Ticker | "CNR.UN" |
| security_name | TEXT | Full name | "Centurion Apartment REIT" |
| transaction_type | TEXT | See types below | "Dividend Reinvestment" |
| units | DECIMAL | Shares affected | "8.755" |
| price | DECIMAL | Price per share | "14.18" |
| amount | DECIMAL | Total value | "124.15" |
| fees | DECIMAL | Commission/fees | "0.00" |
| currency | TEXT | CAD/USD | "CAD" |

**Transaction Types:**
- `Dividend Reinvestment` - Dividend used to buy more shares
- `Dividend Payment` - Cash dividend paid out
- `Interest` - Interest earned
- `Buy` - Purchase of securities
- `Sell` - Sale of securities
- `Transfer In` - Securities transferred into account
- `Transfer Out` - Securities transferred out

### 5. `tax_withholdings` (Optional but recommended)
**Purpose:** Track tax deducted for tax filing  
**Source:** Tax withholding rows in transaction details

| Column | Type | Description | Example |
|--------|------|-------------|---------|
| id | UUID | Primary key | auto |
| account_id | UUID | Foreign key | - |
| transaction_id | UUID | Related transaction | - |
| date | DATE | When withheld | "2018-04-05" |
| symbol | TEXT | Stock symbol | "AAPL" |
| withholding_amount | DECIMAL | Tax deducted | "15.00" |
| country | TEXT | Tax jurisdiction | "USA" |
| income_type | TEXT | Dividend/Interest | "Dividend" |

## AI Classification Logic

### Table Detection
- **Holdings:** Keywords: "SECURITIES HELD", "Holdings", "Positions", "Portfolio"
- **Cash Transactions:** Keywords: "RECORD OF CASH TRANSACTIONS", "Cash Activity", has Debit/Credit columns
- **Investment Transactions:** Keywords: "TRANSACTION DETAILS", "Income", "Dividends", has Shares/Price columns
- **Tax:** Keywords: "Withholding", "Tax", amount with negative sign

### Transaction Type Detection
```javascript
if (description.includes("Interest") && units > 0) → "Dividend Reinvestment"
if (description.includes("Dividend") && !credit) → "Dividend Reinvestment"  
if (description.includes("Dividend") && credit > 0) → "Dividend Payment"
if (description.includes("Security Purchase")) → "Buy"
if (description.includes("Security Sale")) → "Sell"
if (description.includes("Administration Fee") || "HST") → "Fee"
if (description.includes("Transfer-In")) → "Transfer In"
```

## Import Flow

```
PDF Upload
   ↓
Claude Sonnet 3.5 Extraction
   ↓
JSON Response { accountInfo, tables[] }
   ↓
User Reviews & Confirms
   ↓
Save to Database:
   1. Create/Update account (from accountInfo)
   2. Import holdings (replace existing for this date)
   3. Import cash_transactions (append)
   4. Import investment_transactions (append, check duplicates)
   5. Import tax_withholdings (if present)
   ↓
Data Available for Queries/Reports
```

## What's NOT Included (But Could Be Added)

- **Performance metrics:** ROI, IRR, time-weighted returns
- **Corporate actions:** Stock splits, mergers
- **Margin/borrowing:** Margin interest, borrowing power
- **Options/derivatives:** Puts, calls, futures
- **Foreign exchange:** FX gains/losses

## Example: Olympia Trust Statement

**Contains:**
- ✅ Account info (at top)
- ✅ Holdings (not in your sample, but usually present)
- ✅ Cash Transactions (RECORD OF CASH TRANSACTIONS)
- ✅ Investment Transactions (TRANSACTION DETAILS)
- ❌ Tax withholdings (not shown separately in your sample)

**Example: RBC Direct Investing**
- ✅ Account summary (page 1)
- ✅ Holdings with gain/loss (page 2)
- ✅ Transaction history (pages 3-5)
- ✅ Income summary (page 6)
- ✅ Tax slips (T5, T3, etc.)

## Summary

**Minimum Required (Your 3 points):**
1. ✅ Holdings → `holdings` table
2. ✅ Cash Transactions (fees, purchases) → `cash_transactions` table
3. ✅ Investment Transactions (dividends, reinvestments) → `investment_transactions` table

**Recommended Additions:**
4. Account Info → `accounts` table
5. Tax Withholdings → `tax_withholdings` table

This structure handles **any broker format** (Olympia, RBC, TD, BMO, Questrade) because Claude understands the semantic meaning, not just keywords.
