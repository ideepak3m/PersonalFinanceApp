-- Merchant Split Rules - PRODUCTION SCRIPT
-- Run this in Supabase SQL Editor

-- =====================================================
-- STEP 1: Create merchant_split_rules table
-- =====================================================

CREATE TABLE IF NOT EXISTS personal_finance.merchant_split_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    merchant_friendly_name TEXT NOT NULL UNIQUE,
    splits JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    CONSTRAINT merchant_split_rules_pkey PRIMARY KEY (id),
    CONSTRAINT splits_valid_json CHECK (jsonb_typeof(splits) = 'array')
);

COMMENT ON TABLE personal_finance.merchant_split_rules IS 
'Default split rules for merchants. Matched by merchant friendly name.';

COMMENT ON COLUMN personal_finance.merchant_split_rules.merchant_friendly_name IS 
'Merchant friendly name that matches merchant.normalized_name.';

COMMENT ON COLUMN personal_finance.merchant_split_rules.splits IS 
'Array of split definitions: [{"category_id": "uuid", "percentage": 50}, ...]';

-- =====================================================
-- STEP 2: Create indexes
-- =====================================================

CREATE INDEX idx_merchant_split_rules_name 
    ON personal_finance.merchant_split_rules(merchant_friendly_name);

-- =====================================================
-- STEP 3: Create validation function
-- =====================================================

CREATE OR REPLACE FUNCTION validate_split_percentages()
RETURNS TRIGGER AS $$
DECLARE
    total_percentage NUMERIC;
BEGIN
    SELECT SUM((split->>'percentage')::numeric)
    INTO total_percentage
    FROM jsonb_array_elements(NEW.splits) AS split;
    
    IF total_percentage != 100 THEN
        RAISE EXCEPTION 'Split percentages must add up to 100, got %', total_percentage;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 4: Create triggers
-- =====================================================

CREATE TRIGGER validate_split_percentages_trigger
    BEFORE INSERT OR UPDATE ON personal_finance.merchant_split_rules
    FOR EACH ROW
    EXECUTE FUNCTION validate_split_percentages();

CREATE TRIGGER update_merchant_split_rules_updated_at 
    BEFORE UPDATE ON personal_finance.merchant_split_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 5: Clean up merchant table
-- =====================================================

-- Remove old columns that are no longer needed:

-- 1. Remove default_split_json (now using merchant_split_rules table)
ALTER TABLE personal_finance.merchant 
DROP COLUMN IF EXISTS default_split_json;

-- 2. Keep these columns in merchant table:
--    - id
--    - normalized_name (this matches merchant_split_rules.merchant_friendly_name)
--    - category_id
--    - aliases
--    - user_id
--    - is_big_box_store
--    - inserted_at
--    - updated_at

-- No other changes needed to merchant table!
-- The join happens at query time:
-- merchant.normalized_name = merchant_split_rules.merchant_friendly_name

-- =====================================================
-- DONE!
-- =====================================================

-- Now you can add split rules through your UI or manually:
-- Example (replace UUIDs with your actual category IDs):
/*
INSERT INTO personal_finance.merchant_split_rules (
    merchant_friendly_name,
    splits
) VALUES (
    'Costco Wholesale',
    '[
        {"category_id": "your-groceries-category-uuid", "percentage": 50},
        {"category_id": "your-clothing-category-uuid", "percentage": 20},
        {"category_id": "your-pharmacy-category-uuid", "percentage": 15},
        {"category_id": "your-personal-care-category-uuid", "percentage": 15}
    ]'::jsonb
);
*/
