-- Migration: Add property_insurance_annual and hoa_monthly to properties
-- Purpose: Track annual property insurance and monthly HOA fees for carrying cost calculations

-- Add property_insurance_annual column
ALTER TABLE personal_finance.properties 
ADD COLUMN IF NOT EXISTS property_insurance_annual NUMERIC DEFAULT 0;

-- Add hoa_monthly column (if not exists)
ALTER TABLE personal_finance.properties 
ADD COLUMN IF NOT EXISTS hoa_monthly NUMERIC DEFAULT 0;

-- Add expected_monthly_rent column (if not exists - for rental properties)
ALTER TABLE personal_finance.properties 
ADD COLUMN IF NOT EXISTS expected_monthly_rent NUMERIC DEFAULT 0;

-- Add comments for documentation
COMMENT ON COLUMN personal_finance.properties.property_insurance_annual IS 'Annual property/home insurance premium';
COMMENT ON COLUMN personal_finance.properties.hoa_monthly IS 'Monthly HOA (Home Owners Association) fee';
COMMENT ON COLUMN personal_finance.properties.expected_monthly_rent IS 'Expected monthly rental income for investment properties';
