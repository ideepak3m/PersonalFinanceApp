-- Fix all table sequences that may be out of sync
-- This comprehensive script resets all sequences to match their respective table data

-- 1. Fix accounts sequence
SELECT setval(
  'personal_finance.accounts_id_seq', 
  COALESCE((SELECT MAX(id) FROM personal_finance.accounts), 0) + 1,
  false
);

-- 2. Fix chart_of_accounts sequence (if it uses a sequence)
-- Note: Check if this table uses serial/bigserial
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_sequences 
    WHERE schemaname = 'personal_finance' 
    AND sequencename = 'chart_of_accounts_id_seq'
  ) THEN
    EXECUTE 'SELECT setval(''personal_finance.chart_of_accounts_id_seq'', 
      COALESCE((SELECT MAX(id) FROM personal_finance.chart_of_accounts), 0) + 1, false)';
  END IF;
END $$;

-- 3. Fix providers sequence (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_sequences 
    WHERE schemaname = 'personal_finance' 
    AND sequencename = 'providers_id_seq'
  ) THEN
    EXECUTE 'SELECT setval(''personal_finance.providers_id_seq'', 
      COALESCE((SELECT MAX(id) FROM personal_finance.providers), 0) + 1, false)';
  END IF;
END $$;

-- 4. Fix categories sequence (if exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_sequences 
    WHERE schemaname = 'personal_finance' 
    AND sequencename = 'categories_id_seq'
  ) THEN
    EXECUTE 'SELECT setval(''personal_finance.categories_id_seq'', 
      COALESCE((SELECT MAX(id) FROM personal_finance.categories), 0) + 1, false)';
  END IF;
END $$;

-- Verification query - Run this to check all sequences:
/*
SELECT 
  schemaname,
  sequencename,
  last_value
FROM pg_sequences 
WHERE schemaname = 'personal_finance'
ORDER BY sequencename;
*/

-- To compare sequences with their table max IDs:
/*
SELECT 
  'accounts' as table_name,
  (SELECT last_value FROM personal_finance.accounts_id_seq) as sequence_value,
  (SELECT MAX(id) FROM personal_finance.accounts) as max_table_id;
*/
