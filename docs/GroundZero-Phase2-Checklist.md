# Ground Zero - Phase 2 Checklist

## Purpose
This document tracks all database schema changes and required code updates before moving to Phase 3.

---

## Schema Summary (Based on SupabaseTableSchema.md)

### ✅ Tables Already In Use (No Changes Needed)
| Table | Status |
|-------|--------|
| `accounts` | ✅ Working |
| `transactions` | ✅ Working |
| `investment_accounts` | ✅ Working |
| `investment_transactions` | ✅ Working |
| `cash_transactions` | ✅ Working |
| `merchant` | ✅ Working |
| `category` | ✅ Working |
| `investment_managers` | ✅ Working |
| `budgets` | ✅ Working |
| `profiles` | ✅ Working |

### 🆕 New Tables (Need Services + UI)
| Table | Purpose | Service | UI |
|-------|---------|---------|-----|
| `user_profile` | User demographics, retirement goals | ❌ Need to create | ❌ Settings > Profile |
| `government_benefits` | CPP/OAS/Pension estimates | ❌ Need to create | ❌ Settings > Retirement |
| `holding_snapshots` | Historical investment values | ❌ Need to create | ❌ Investment History |

### 🔧 Tables With New Columns (Need Code Updates)
| Table | New Columns | Code to Update |
|-------|-------------|----------------|
| `holdings` | `user_id`, `investment_type`, `sector`, `geography`, `exchange`, `average_cost_per_unit`, `account_type`, `institution` | `investmentDataService.js` → `saveHoldings()` |

---

## Code Changes Required

### 1. investmentDataService.js - `saveHoldings()` (Line ~128)

**Current columns saved:**
- `account_id`, `symbol`, `security_name`, `asset_type`, `category`, `sub_category`, `units`, `price`, `market_value`, `book_value`, `gain_loss`, `as_of_date`, `currency`

**Missing columns (need to add):**
- `user_id` - Get from auth context
- `investment_type` - From AI extraction or manual input (ETF, Mutual Fund, Stock, Bond, etc.)
- `sector` - From AI extraction (Technology, Healthcare, Financial, etc.)
- `geography` - From AI extraction (US, Canada, International, etc.)
- `exchange` - From AI extraction (TSX, NYSE, NASDAQ, etc.)
- `average_cost_per_unit` - Calculate from book_value / units
- `account_type` - Denormalized from investment_accounts (RRSP, TFSA, Non-Registered)
- `institution` - Denormalized from investment_accounts

**Fix Required:**
```javascript
// In saveHoldings function, add these fields:
const holdingsData = holdingsRows.map(row => ({
    // ...existing fields...
    user_id: userId,  // Get from supabase.auth.getUser()
    investment_type: row.investmentType || row.investment_type || null,
    sector: row.sector || null,
    geography: row.geography || null,
    exchange: row.exchange || null,
    average_cost_per_unit: bookValue / units || null,
    account_type: accountType, // Pass from caller
    institution: institution,   // Pass from caller
}));
```

---

### 2. New Service: supabaseUserProfileDB

**Create in:** `src/services/supabaseDatabase.js` or new file

```javascript
// User Profile Service
class UserProfileService extends SupabaseService {
    constructor() {
        super('user_profile', 'personal_finance');
    }

    async getProfile() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await this.table()
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async upsertProfile(profileData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const record = {
            user_id: user.id,
            ...this.toSnakeCase(profileData),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await this.table()
            .upsert(record, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

export const supabaseUserProfileDB = new UserProfileService();
```

---

### 3. New Service: supabaseGovernmentBenefitsDB

```javascript
// Government Benefits Service
class GovernmentBenefitsService extends SupabaseService {
    constructor() {
        super('government_benefits', 'personal_finance');
    }

    async getBenefits() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await this.table()
            .select('*')
            .eq('user_id', user.id)
            .single();

        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async upsertBenefits(benefitsData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const record = {
            user_id: user.id,
            ...this.toSnakeCase(benefitsData),
            last_updated: new Date().toISOString()
        };

        const { data, error } = await this.table()
            .upsert(record, { onConflict: 'user_id' })
            .select()
            .single();

        if (error) throw error;
        return data;
    }
}

export const supabaseGovernmentBenefitsDB = new GovernmentBenefitsService();
```

---

### 4. New Service: supabaseHoldingSnapshotsDB

```javascript
// Holding Snapshots Service
class HoldingSnapshotsService extends SupabaseService {
    constructor() {
        super('holding_snapshots', 'personal_finance');
    }

    async saveSnapshot(snapshotData) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const record = {
            ...this.toSnakeCase(snapshotData),
            user_id: user.id,
            source: snapshotData.source || 'statement'
        };

        const { data, error } = await this.table()
            .upsert(record, { 
                onConflict: 'account_id,symbol,snapshot_date' 
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async getSnapshotsByAccount(accountId, startDate, endDate) {
        const { data, error } = await this.table()
            .select('*')
            .eq('account_id', accountId)
            .gte('snapshot_date', startDate)
            .lte('snapshot_date', endDate)
            .order('snapshot_date', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async getPortfolioGrowth(startDate, endDate) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const { data, error } = await this.table()
            .select('snapshot_date, market_value, book_cost, unrealized_gain_loss')
            .eq('user_id', user.id)
            .gte('snapshot_date', startDate)
            .lte('snapshot_date', endDate)
            .order('snapshot_date', { ascending: true });

        if (error) throw error;
        return data || [];
    }
}

export const supabaseHoldingSnapshotsDB = new HoldingSnapshotsService();
```

---

## Data Migration Needs

### 1. Populate `user_id` in existing `holdings` records

**Problem:** Existing holdings records might not have `user_id` set.

**SQL Migration (run once):**
```sql
-- Populate user_id in holdings from investment_accounts
UPDATE personal_finance.holdings h
SET user_id = ia.user_id
FROM personal_finance.investment_accounts ia
WHERE h.account_id = ia.id
  AND h.user_id IS NULL;
```

### 2. Populate `account_type` and `institution` in existing `holdings` records

**SQL Migration (run once):**
```sql
-- Populate account_type and institution from investment_accounts
UPDATE personal_finance.holdings h
SET 
    account_type = ia.account_type,
    institution = ia.institution
FROM personal_finance.investment_accounts ia
WHERE h.account_id = ia.id
  AND (h.account_type IS NULL OR h.institution IS NULL);
```

---

## New Views Already Created

These views exist in the database and can be used by AI/Reports:

| View | Purpose |
|------|---------|
| `monthly_cash_flow` | Monthly income/expenses summary |
| `expense_by_category` | Expenses grouped by category |
| `income_by_source` | Income grouped by source |
| `savings_rate_trend` | Savings rate over time |
| `annual_cash_flow` | Yearly cash flow summary |
| `spending_personality` | Spending pattern analysis |
| `investment_net_worth` | Total portfolio value |
| `portfolio_by_account_type` | Portfolio by RRSP/TFSA/etc |
| `portfolio_by_asset_class` | Portfolio by equity/fixed income |
| `portfolio_by_geography` | Portfolio by region |
| `portfolio_growth` | Historical portfolio growth |
| `retirement_summary` | Combined retirement info |

---

## Action Items Checklist

### Database (Run in Supabase SQL Editor)
- [ ] Run migration: `populate_holdings_missing_data.sql` (one-time, populates user_id, account_type, institution)

### Code Changes ✅ COMPLETED
- [x] Updated `investmentDataService.js` → `saveHoldings()` to include new columns
- [x] Added `supabaseUserProfileDB` service
- [x] Added `supabaseGovernmentBenefitsDB` service  
- [x] Added `supabaseHoldingSnapshotsDB` service
- [ ] Update PDF extractor to capture `investment_type`, `sector`, `geography`, `exchange` (optional, can be manual)

### UI (Phase 3)
- [ ] Create Settings > Profile page
- [ ] Create Settings > Retirement Info page
- [ ] Add history tab to Investment Account details
- [ ] Add new columns to holdings review modal in PDF importer

---

## Quick Reference: Holdings Table Columns

| Column | Type | Source |
|--------|------|--------|
| `id` | uuid | Auto-generated |
| `account_id` | uuid | From investment_accounts |
| `symbol` | text | From statement |
| `security_name` | text | From statement |
| `units` | numeric | From statement |
| `price` | numeric | From statement |
| `market_value` | numeric | From statement |
| `book_value` | numeric | From statement |
| `gain_loss` | numeric | From statement or calculated |
| `as_of_date` | date | Statement date |
| `currency` | text | From statement (default CAD) |
| `asset_type` | text | Manual classification |
| `category` | text | Manual classification |
| `sub_category` | text | Manual classification |
| `user_id` | uuid | **NEW** - From auth |
| `investment_type` | text | **NEW** - ETF/MF/Stock/Bond |
| `sector` | text | **NEW** - Technology/Healthcare/etc |
| `geography` | text | **NEW** - US/Canada/International |
| `exchange` | text | **NEW** - TSX/NYSE/etc |
| `average_cost_per_unit` | numeric | **NEW** - book_value/units |
| `account_type` | text | **NEW** - RRSP/TFSA/etc (from account) |
| `institution` | text | **NEW** - RBC/TD/etc (from account) |

---

## Status
- **Last Updated:** December 3, 2025
- **Current Phase:** 2 (Ground Zero cleanup)
- **Next Phase:** 3 (Data Import & Forms)
