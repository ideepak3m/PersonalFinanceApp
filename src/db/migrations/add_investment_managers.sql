-- Add Investment Managers Table and Link to Investment Accounts
-- This migration adds support for "Managed By" concept
-- Example: Olympia Trust (institution) manages RRSP accounts for a user, 
--          but CI Assante (manager) is the investment advisor/dealer

-- 1. Create Investment Managers Table
CREATE TABLE IF NOT EXISTS personal_finance.investment_managers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,                    -- e.g., "Olympia Trust", "CI Assante", "Manulife"
    manager_type TEXT NOT NULL DEFAULT 'Advisor',  -- Advisor, Dealer, Custodian, Self-Directed
    description TEXT,                      -- Optional notes
    website TEXT,                          -- Manager's website
    contact_name TEXT,                     -- Primary contact person
    contact_email TEXT,
    contact_phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);

-- 2. Add manager_id and display_name to investment_accounts
ALTER TABLE personal_finance.investment_accounts
ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES personal_finance.investment_managers(id) ON DELETE SET NULL;

ALTER TABLE personal_finance.investment_accounts
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- display_name is the friendly name shown on dashboard
-- e.g., "Olympia RRSP", "TFSA - Self Directed", "Spousal RRSP"
COMMENT ON COLUMN personal_finance.investment_accounts.display_name IS 
  'User-friendly display name for dashboard, e.g., "Olympia RRSP", "Spousal RRSP"';

COMMENT ON COLUMN personal_finance.investment_accounts.manager_id IS 
  'Links to the investment manager/advisor managing this account';

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_investment_managers_user_id 
    ON personal_finance.investment_managers(user_id);

CREATE INDEX IF NOT EXISTS idx_investment_accounts_manager_id 
    ON personal_finance.investment_accounts(manager_id);

-- 4. Enable RLS on investment_managers
ALTER TABLE personal_finance.investment_managers ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for investment_managers
CREATE POLICY "Users can view own investment managers"
    ON personal_finance.investment_managers FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own investment managers"
    ON personal_finance.investment_managers FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own investment managers"
    ON personal_finance.investment_managers FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own investment managers"
    ON personal_finance.investment_managers FOR DELETE
    USING (auth.uid() = user_id);

-- 6. Grant permissions
GRANT ALL ON personal_finance.investment_managers TO authenticated;

-- 7. Add updated_at trigger
CREATE TRIGGER update_investment_managers_updated_at
    BEFORE UPDATE ON personal_finance.investment_managers
    FOR EACH ROW
    EXECUTE FUNCTION personal_finance.update_updated_at_column();

-- Sample data (commented out - run manually if needed)
/*
-- Example: Add investment managers
INSERT INTO personal_finance.investment_managers (user_id, name, manager_type, description)
VALUES 
    (auth.uid(), 'Olympia Trust', 'Custodian', 'Self-directed RRSP custodian'),
    (auth.uid(), 'CI Assante', 'Advisor', 'Investment advisor for managed accounts'),
    (auth.uid(), 'Self-Directed', 'Self-Directed', 'DIY investing through discount brokerages');

-- Example: Update investment accounts with manager and display name
UPDATE personal_finance.investment_accounts
SET 
    manager_id = (SELECT id FROM personal_finance.investment_managers WHERE name = 'Olympia Trust' AND user_id = auth.uid()),
    display_name = 'Olympia RRSP'
WHERE account_type = 'RRSP' AND institution = 'Olympia Trust';
*/

-- Helpful query to see accounts with managers
/*
SELECT 
    ia.display_name,
    ia.account_type,
    ia.institution,
    im.name as manager_name,
    im.manager_type,
    ia.account_number,
    ia.closing_balance
FROM personal_finance.investment_accounts ia
LEFT JOIN personal_finance.investment_managers im ON ia.manager_id = im.id
WHERE ia.user_id = auth.uid()
ORDER BY im.name, ia.account_type;
*/
