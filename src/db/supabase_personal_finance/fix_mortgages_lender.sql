-- Fix mortgages table - Remove lender column if it exists
-- (Lender belongs to mortgage_terms, not mortgages)

-- Option 1: Drop the lender column from mortgages
ALTER TABLE personal_finance.mortgages DROP COLUMN IF EXISTS lender;

-- OR Option 2: Make lender nullable (if you want to keep it)
-- ALTER TABLE personal_finance.mortgages ALTER COLUMN lender DROP NOT NULL;
