-- Migration: Add country column to investment_accounts
-- Purpose: Enable country-specific filtering in investment reports

-- Add country column to investment_accounts table
ALTER TABLE personal_finance.investment_accounts 
ADD COLUMN IF NOT EXISTS country TEXT;

-- Add comment for documentation
COMMENT ON COLUMN personal_finance.investment_accounts.country IS 'Country where the investment account is held (e.g., Malaysia, Singapore, USA)';

-- Create an index for faster filtering by country
CREATE INDEX IF NOT EXISTS idx_investment_accounts_country 
ON personal_finance.investment_accounts(country);

-- Optional: Update existing accounts based on institution or currency
-- You may want to run these manually if you can infer country from existing data:

-- Example: If you have Malaysian Ringgit accounts, set them to Malaysia
-- UPDATE personal_finance.investment_accounts 
-- SET country = 'Malaysia' 
-- WHERE currency = 'MYR' AND country IS NULL;

-- Example: If you have Singapore Dollar accounts, set them to Singapore
-- UPDATE personal_finance.investment_accounts 
-- SET country = 'Singapore' 
-- WHERE currency = 'SGD' AND country IS NULL;

-- Example: If you have US Dollar accounts, set them to USA
-- UPDATE personal_finance.investment_accounts 
-- SET country = 'USA' 
-- WHERE currency = 'USD' AND country IS NULL;

-- Example: If you have Canadian Dollar accounts, set them to Canada
-- UPDATE personal_finance.investment_accounts 
-- SET country = 'Canada' 
-- WHERE currency = 'CAD' AND country IS NULL;
