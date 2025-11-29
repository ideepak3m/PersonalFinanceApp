-- Add classification columns to holdings table
-- Run this in Supabase SQL Editor

ALTER TABLE personal_finance.holdings
ADD COLUMN IF NOT EXISTS asset_type TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_holdings_asset_type ON personal_finance.holdings(asset_type);
CREATE INDEX IF NOT EXISTS idx_holdings_category ON personal_finance.holdings(category);
CREATE INDEX IF NOT EXISTS idx_holdings_sub_category ON personal_finance.holdings(sub_category);

-- Add comments to document the columns
COMMENT ON COLUMN personal_finance.holdings.asset_type IS 'Type of asset: GIC, Mutual Fund, Stock, ETF, Bond, Cash, REIT';
COMMENT ON COLUMN personal_finance.holdings.category IS 'Investment category: Canadian Equity, US Equity, International Equity, Fixed Income, Money Market, Balanced, Real Estate';
COMMENT ON COLUMN personal_finance.holdings.sub_category IS 'Sub-category: Index Fund, Growth Fund, Value Fund, etc.';
