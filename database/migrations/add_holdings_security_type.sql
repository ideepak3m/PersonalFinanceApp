-- Migration: Add security_type to holdings table
-- Run this in Supabase SQL Editor

-- Add security_type column to holdings if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'personal_finance' 
        AND table_name = 'holdings' 
        AND column_name = 'security_type'
    ) THEN
        ALTER TABLE personal_finance.holdings 
        ADD COLUMN security_type TEXT DEFAULT 'stock';
    END IF;
END $$;

-- Add notes column for additional info
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'personal_finance' 
        AND table_name = 'holdings' 
        AND column_name = 'notes'
    ) THEN
        ALTER TABLE personal_finance.holdings 
        ADD COLUMN notes TEXT;
    END IF;
END $$;

-- Update existing holdings with detected security types based on name
UPDATE personal_finance.holdings
SET security_type = CASE
    WHEN LOWER(security_name) LIKE '%reit%' OR LOWER(security_name) LIKE '%real estate%' THEN 'reit'
    WHEN LOWER(security_name) LIKE '%etf%' OR LOWER(security_name) LIKE '%index%' THEN 'etf'
    WHEN LOWER(security_name) LIKE '%fund%' OR LOWER(security_name) LIKE '%class a%' OR LOWER(security_name) LIKE '%class f%' THEN 'mutual_fund'
    WHEN LOWER(security_name) LIKE '%bond%' OR LOWER(security_name) LIKE '%fixed income%' THEN 'bond'
    WHEN LOWER(security_name) LIKE '%gic%' OR LOWER(security_name) LIKE '%term deposit%' THEN 'gic'
    ELSE 'stock'
END
WHERE security_type IS NULL OR security_type = 'stock';

-- Add comment explaining security types
COMMENT ON COLUMN personal_finance.holdings.security_type IS 
'Type of security: stock, etf, mutual_fund, reit, bond, gic, crypto, other';

-- Grant access
GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.holdings TO authenticated;
