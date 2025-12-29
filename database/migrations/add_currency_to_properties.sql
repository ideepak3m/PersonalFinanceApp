-- Migration: Add currency/country columns to properties, mortgages, and insurance_policies tables
-- Date: 2025-12-17
-- Purpose: Enable multi-currency property and mortgage tracking

-- Add currency column to properties table
ALTER TABLE personal_finance.properties 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CAD';

-- Add country column as well for consistency
ALTER TABLE personal_finance.properties 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'CA';

-- Add currency column to mortgages table
ALTER TABLE personal_finance.mortgages 
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CAD';

-- Add country column to insurance_policies (if not exists)
ALTER TABLE personal_finance.insurance_policies 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'IN';

-- Update existing records based on user's preferred currency (optional)
-- UPDATE personal_finance.properties p
-- SET currency = up.preferred_currency,
--     country = up.country
-- FROM personal_finance.user_profile up
-- WHERE p.user_id = up.user_id;

COMMENT ON COLUMN personal_finance.properties.currency IS 'Currency for property values (CAD, INR, USD, etc.)';
COMMENT ON COLUMN personal_finance.properties.country IS 'Country where property is located (CA, IN, US, etc.)';
COMMENT ON COLUMN personal_finance.mortgages.currency IS 'Currency for mortgage values (CAD, INR, USD, etc.)';
COMMENT ON COLUMN personal_finance.insurance_policies.country IS 'Country where policy is issued (CA, IN, US, etc.)';
