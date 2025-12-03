-- Migration: Enhance existing holdings table + Create holding_snapshots
-- Date: 2025-12-03
-- Purpose: Add fields for AI financial planning, create snapshots table

-- ============================================================
-- STEP 1: Enhance existing holdings table
-- ============================================================

-- Add missing columns to holdings
ALTER TABLE personal_finance.holdings
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS investment_type TEXT,
ADD COLUMN IF NOT EXISTS sector TEXT,
ADD COLUMN IF NOT EXISTS geography TEXT,
ADD COLUMN IF NOT EXISTS exchange TEXT,
ADD COLUMN IF NOT EXISTS average_cost_per_unit NUMERIC(15, 6),
ADD COLUMN IF NOT EXISTS account_type TEXT,
ADD COLUMN IF NOT EXISTS institution TEXT;

-- Rename columns for clarity (if they exist with old names)
-- Note: Only run these if the columns haven't been renamed yet
-- ALTER TABLE personal_finance.holdings RENAME COLUMN price TO current_unit_price;
-- ALTER TABLE personal_finance.holdings RENAME COLUMN book_value TO book_cost;

-- Add comments
COMMENT ON COLUMN personal_finance.holdings.investment_type IS 'MUTUAL_FUND, STOCK, ETF, REIT, BOND, GIC, CRYPTO';
COMMENT ON COLUMN personal_finance.holdings.asset_type IS 'Legacy: use category for asset_class';
COMMENT ON COLUMN personal_finance.holdings.category IS 'Asset class: equity, fixed_income, real_estate, cash, alternative';
COMMENT ON COLUMN personal_finance.holdings.sector IS 'Industry sector: technology, healthcare, financial, etc.';
COMMENT ON COLUMN personal_finance.holdings.geography IS 'Geographic exposure: canada, us, international, emerging, global';

-- Populate user_id from account relationship
UPDATE personal_finance.holdings h
SET user_id = ia.user_id
FROM personal_finance.investment_accounts ia
WHERE h.account_id = ia.id
AND h.user_id IS NULL;

-- Populate denormalized fields from investment_accounts
UPDATE personal_finance.holdings h
SET 
  account_type = ia.account_type,
  institution = ia.institution
FROM personal_finance.investment_accounts ia
WHERE h.account_id = ia.id
AND (h.account_type IS NULL OR h.institution IS NULL);

-- Set default investment_type for existing records
UPDATE personal_finance.holdings
SET investment_type = COALESCE(asset_type, 'MUTUAL_FUND')
WHERE investment_type IS NULL;

-- Calculate average_cost_per_unit from existing data
UPDATE personal_finance.holdings
SET average_cost_per_unit = CASE 
  WHEN units > 0 AND book_value IS NOT NULL THEN book_value / units 
  ELSE NULL 
END
WHERE average_cost_per_unit IS NULL;

-- ============================================================
-- STEP 2: Create holding_snapshots table for historical tracking
-- ============================================================

CREATE TABLE IF NOT EXISTS personal_finance.holding_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id UUID REFERENCES personal_finance.investment_accounts(id) ON DELETE CASCADE,
  symbol TEXT NOT NULL,
  security_name TEXT,
  
  -- Snapshot data
  snapshot_date DATE NOT NULL,
  units NUMERIC(15, 6) NOT NULL,
  unit_price NUMERIC(15, 4) NOT NULL,
  market_value NUMERIC(15, 2) NOT NULL,
  book_cost NUMERIC(15, 2),
  
  -- Calculated
  unrealized_gain_loss NUMERIC(15, 2),
  gain_loss_percentage NUMERIC(8, 4),
  
  -- For trend analysis
  units_change NUMERIC(15, 6),             -- Change from previous snapshot
  value_change NUMERIC(15, 2),             -- Market value change
  
  -- Source tracking
  source TEXT DEFAULT 'statement',         -- 'statement', 'manual', 'api'
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(account_id, symbol, snapshot_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_holding_snapshots_user ON personal_finance.holding_snapshots(user_id);
CREATE INDEX IF NOT EXISTS idx_holding_snapshots_account ON personal_finance.holding_snapshots(account_id);
CREATE INDEX IF NOT EXISTS idx_holding_snapshots_date ON personal_finance.holding_snapshots(snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_holding_snapshots_symbol ON personal_finance.holding_snapshots(symbol);

-- Create indexes on holdings if missing
CREATE INDEX IF NOT EXISTS idx_holdings_user ON personal_finance.holdings(user_id);
CREATE INDEX IF NOT EXISTS idx_holdings_account ON personal_finance.holdings(account_id);
CREATE INDEX IF NOT EXISTS idx_holdings_symbol ON personal_finance.holdings(symbol);
CREATE INDEX IF NOT EXISTS idx_holdings_investment_type ON personal_finance.holdings(investment_type);
CREATE INDEX IF NOT EXISTS idx_holdings_category ON personal_finance.holdings(category);

-- ============================================================
-- STEP 3: Enable RLS on holding_snapshots
-- ============================================================

ALTER TABLE personal_finance.holding_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own snapshots" ON personal_finance.holding_snapshots 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own snapshots" ON personal_finance.holding_snapshots 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own snapshots" ON personal_finance.holding_snapshots 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own snapshots" ON personal_finance.holding_snapshots 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- STEP 4: Create initial snapshots from existing holdings
-- ============================================================

INSERT INTO personal_finance.holding_snapshots (
  user_id,
  account_id,
  symbol,
  security_name,
  snapshot_date,
  units,
  unit_price,
  market_value,
  book_cost,
  unrealized_gain_loss,
  gain_loss_percentage
)
SELECT 
  h.user_id,
  h.account_id,
  h.symbol,
  h.security_name,
  h.as_of_date as snapshot_date,
  h.units,
  h.price as unit_price,
  h.market_value,
  h.book_value as book_cost,
  h.gain_loss as unrealized_gain_loss,
  CASE WHEN h.book_value > 0 
       THEN ((h.market_value - h.book_value) / h.book_value) * 100 
       ELSE 0 END as gain_loss_percentage
FROM personal_finance.holdings h
WHERE h.user_id IS NOT NULL
ON CONFLICT (account_id, symbol, snapshot_date) DO NOTHING;

-- ============================================================
-- STEP 5: Create helpful views for AI queries
-- ============================================================

-- Portfolio summary by account type (RRSP, TFSA, Non-Reg)
CREATE OR REPLACE VIEW personal_finance.portfolio_by_account_type AS
SELECT 
  user_id,
  account_type,
  COUNT(DISTINCT account_id) as num_accounts,
  COUNT(*) as num_holdings,
  SUM(market_value) as total_value,
  SUM(book_value) as total_cost,
  SUM(gain_loss) as total_gain_loss,
  CASE WHEN SUM(book_value) > 0 
       THEN (SUM(market_value) - SUM(book_value)) / SUM(book_value) * 100 
       ELSE 0 END as overall_return_pct
FROM personal_finance.holdings
WHERE user_id IS NOT NULL
GROUP BY user_id, account_type;

-- Portfolio summary by asset class (category)
CREATE OR REPLACE VIEW personal_finance.portfolio_by_asset_class AS
SELECT 
  user_id,
  COALESCE(category, 'unclassified') as asset_class,
  COUNT(*) as num_holdings,
  SUM(market_value) as total_value,
  ROUND(SUM(market_value) * 100.0 / NULLIF(SUM(SUM(market_value)) OVER (PARTITION BY user_id), 0), 2) as allocation_pct
FROM personal_finance.holdings
WHERE user_id IS NOT NULL
GROUP BY user_id, category;

-- Portfolio summary by geography
CREATE OR REPLACE VIEW personal_finance.portfolio_by_geography AS
SELECT 
  user_id,
  COALESCE(geography, 'unclassified') as geography,
  SUM(market_value) as total_value,
  ROUND(SUM(market_value) * 100.0 / NULLIF(SUM(SUM(market_value)) OVER (PARTITION BY user_id), 0), 2) as allocation_pct
FROM personal_finance.holdings
WHERE user_id IS NOT NULL
GROUP BY user_id, geography;

-- Total investment net worth
CREATE OR REPLACE VIEW personal_finance.investment_net_worth AS
SELECT 
  user_id,
  SUM(market_value) as total_market_value,
  SUM(book_value) as total_book_cost,
  SUM(gain_loss) as total_unrealized_gain,
  COUNT(DISTINCT account_id) as num_accounts,
  COUNT(*) as num_positions
FROM personal_finance.holdings
WHERE user_id IS NOT NULL
GROUP BY user_id;

-- Portfolio growth over time (from snapshots)
CREATE OR REPLACE VIEW personal_finance.portfolio_growth AS
SELECT 
  user_id,
  snapshot_date,
  SUM(market_value) as total_value,
  SUM(book_cost) as total_cost,
  SUM(unrealized_gain_loss) as total_gain_loss,
  COUNT(*) as num_positions
FROM personal_finance.holding_snapshots
WHERE user_id IS NOT NULL
GROUP BY user_id, snapshot_date
ORDER BY snapshot_date;
