-- Fix accounts table sequence out of sync issue
-- This happens when data is inserted with explicit IDs or after data restoration

-- Reset the sequence to the maximum ID in the accounts table
SELECT setval(
  'personal_finance.accounts_id_seq', 
  COALESCE((SELECT MAX(id) FROM personal_finance.accounts), 0) + 1,
  false
);

-- Verify the fix
-- Run this query to check the current sequence value:
-- SELECT currval('personal_finance.accounts_id_seq'), MAX(id) FROM personal_finance.accounts;
