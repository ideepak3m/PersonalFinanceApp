-- ============================================================
-- INSURANCE POLICIES MODULE
-- ============================================================

-- Main Insurance Policies Table
CREATE TABLE IF NOT EXISTS personal_finance.insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    
    -- Core Policy Details
    insurer_name TEXT NOT NULL,                          -- LIC, HDFC Life, ICICI Pru, etc.
    policy_number TEXT NOT NULL,
    plan_name TEXT,                                      -- Plan name (e.g., "Jeevan Anand", "Click 2 Protect")
    plan_type TEXT NOT NULL,                             -- Endowment, Term, ULIP, Money Back, Whole Life, etc.
    policy_holder_name TEXT NOT NULL,
    
    -- Financial Details
    sum_assured DECIMAL(15,2) NOT NULL,
    premium_amount DECIMAL(12,2) NOT NULL,
    premium_frequency TEXT NOT NULL DEFAULT 'annual',    -- monthly, quarterly, half_yearly, annual, single
    currency TEXT NOT NULL DEFAULT 'INR',
    
    -- Policy Timeline
    policy_start_date DATE NOT NULL,
    maturity_date DATE,                                  -- NULL for term plans without maturity
    premium_payment_term INTEGER,                        -- Years (e.g., 15)
    policy_term INTEGER,                                 -- Years (e.g., 20)
    
    -- Status
    status TEXT NOT NULL DEFAULT 'active',              -- active, paid_up, lapsed, matured, surrendered, claimed
    
    -- Financial Tracking
    total_premiums_paid DECIMAL(15,2) DEFAULT 0,
    accrued_bonus DECIMAL(15,2) DEFAULT 0,              -- Simple/Reversionary bonus for traditional plans
    terminal_bonus DECIMAL(15,2) DEFAULT 0,             -- Terminal bonus (estimated or actual)
    current_fund_value DECIMAL(15,2),                   -- For ULIPs
    expected_maturity_value DECIMAL(15,2),
    surrender_value DECIMAL(15,2),
    
    -- Payment Details
    premium_payment_mode TEXT,                          -- cash, online, auto_debit, cheque, ecs
    next_premium_due_date DATE,
    last_premium_paid_date DATE,
    
    -- Document & Notes
    policy_document_location TEXT,                      -- File path or description (e.g., "Bank locker", "Google Drive")
    notes TEXT,                                         -- Loan taken, premium holiday, special conditions
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy Nominees Table
CREATE TABLE IF NOT EXISTS personal_finance.insurance_nominees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES personal_finance.insurance_policies(id) ON DELETE CASCADE,
    nominee_name TEXT NOT NULL,
    relationship TEXT NOT NULL,                         -- spouse, child, parent, sibling, other
    percentage DECIMAL(5,2) DEFAULT 100,                -- Share percentage
    date_of_birth DATE,
    is_minor BOOLEAN DEFAULT FALSE,
    guardian_name TEXT,                                 -- Required if minor
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy Riders Table
CREATE TABLE IF NOT EXISTS personal_finance.insurance_riders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES personal_finance.insurance_policies(id) ON DELETE CASCADE,
    rider_name TEXT NOT NULL,                           -- Accidental Death Benefit, Critical Illness, Waiver of Premium, etc.
    rider_sum_assured DECIMAL(15,2),
    additional_premium DECIMAL(12,2) DEFAULT 0,
    start_date DATE,
    end_date DATE,
    status TEXT DEFAULT 'active',                       -- active, expired, claimed
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Premium Payment History Table
CREATE TABLE IF NOT EXISTS personal_finance.insurance_premium_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES personal_finance.insurance_policies(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    payment_mode TEXT,                                  -- cash, online, auto_debit, cheque
    reference_number TEXT,
    financial_year TEXT,                                -- e.g., "2024-25"
    is_late_payment BOOLEAN DEFAULT FALSE,
    late_fee DECIMAL(10,2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bonus History Table (for traditional plans)
CREATE TABLE IF NOT EXISTS personal_finance.insurance_bonus_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES personal_finance.insurance_policies(id) ON DELETE CASCADE,
    financial_year TEXT NOT NULL,                       -- e.g., "2024-25"
    bonus_type TEXT NOT NULL,                           -- simple, reversionary, terminal, loyalty
    bonus_rate DECIMAL(8,4),                            -- Rate per 1000 sum assured
    bonus_amount DECIMAL(15,2) NOT NULL,
    declared_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_insurance_policies_user_id ON personal_finance.insurance_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_status ON personal_finance.insurance_policies(status);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_insurer ON personal_finance.insurance_policies(insurer_name);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_maturity ON personal_finance.insurance_policies(maturity_date);
CREATE INDEX IF NOT EXISTS idx_insurance_policies_next_due ON personal_finance.insurance_policies(next_premium_due_date);
CREATE INDEX IF NOT EXISTS idx_insurance_nominees_policy ON personal_finance.insurance_nominees(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_riders_policy ON personal_finance.insurance_riders(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_premium_payments_policy ON personal_finance.insurance_premium_payments(policy_id);
CREATE INDEX IF NOT EXISTS idx_insurance_bonus_history_policy ON personal_finance.insurance_bonus_history(policy_id);

-- Enable Row Level Security
ALTER TABLE personal_finance.insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.insurance_nominees ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.insurance_riders ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.insurance_premium_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.insurance_bonus_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own insurance policies" 
    ON personal_finance.insurance_policies FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insurance policies" 
    ON personal_finance.insurance_policies FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insurance policies" 
    ON personal_finance.insurance_policies FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own insurance policies" 
    ON personal_finance.insurance_policies FOR DELETE 
    USING (auth.uid() = user_id);

-- RLS for nominees (via policy ownership)
CREATE POLICY "Users can manage nominees for their policies" 
    ON personal_finance.insurance_nominees FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM personal_finance.insurance_policies 
            WHERE id = policy_id AND user_id = auth.uid()
        )
    );

-- RLS for riders (via policy ownership)
CREATE POLICY "Users can manage riders for their policies" 
    ON personal_finance.insurance_riders FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM personal_finance.insurance_policies 
            WHERE id = policy_id AND user_id = auth.uid()
        )
    );

-- RLS for premium payments (via policy ownership)
CREATE POLICY "Users can manage premium payments for their policies" 
    ON personal_finance.insurance_premium_payments FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM personal_finance.insurance_policies 
            WHERE id = policy_id AND user_id = auth.uid()
        )
    );

-- RLS for bonus history (via policy ownership)
CREATE POLICY "Users can manage bonus history for their policies" 
    ON personal_finance.insurance_bonus_history FOR ALL 
    USING (
        EXISTS (
            SELECT 1 FROM personal_finance.insurance_policies 
            WHERE id = policy_id AND user_id = auth.uid()
        )
    );

-- Function to update total premiums paid
CREATE OR REPLACE FUNCTION personal_finance.update_policy_total_premiums()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE personal_finance.insurance_policies
    SET total_premiums_paid = (
        SELECT COALESCE(SUM(amount + COALESCE(late_fee, 0)), 0)
        FROM personal_finance.insurance_premium_payments
        WHERE policy_id = NEW.policy_id
    ),
    last_premium_paid_date = NEW.payment_date,
    updated_at = NOW()
    WHERE id = NEW.policy_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update total premiums
DROP TRIGGER IF EXISTS trigger_update_policy_premiums ON personal_finance.insurance_premium_payments;
CREATE TRIGGER trigger_update_policy_premiums
    AFTER INSERT OR UPDATE OR DELETE ON personal_finance.insurance_premium_payments
    FOR EACH ROW
    EXECUTE FUNCTION personal_finance.update_policy_total_premiums();

-- Function to update accrued bonus
CREATE OR REPLACE FUNCTION personal_finance.update_policy_accrued_bonus()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE personal_finance.insurance_policies
    SET accrued_bonus = (
        SELECT COALESCE(SUM(bonus_amount), 0)
        FROM personal_finance.insurance_bonus_history
        WHERE policy_id = NEW.policy_id
        AND bonus_type IN ('simple', 'reversionary', 'loyalty')
    ),
    terminal_bonus = (
        SELECT COALESCE(SUM(bonus_amount), 0)
        FROM personal_finance.insurance_bonus_history
        WHERE policy_id = NEW.policy_id
        AND bonus_type = 'terminal'
    ),
    updated_at = NOW()
    WHERE id = NEW.policy_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update accrued bonus
DROP TRIGGER IF EXISTS trigger_update_policy_bonus ON personal_finance.insurance_bonus_history;
CREATE TRIGGER trigger_update_policy_bonus
    AFTER INSERT OR UPDATE OR DELETE ON personal_finance.insurance_bonus_history
    FOR EACH ROW
    EXECUTE FUNCTION personal_finance.update_policy_accrued_bonus();

-- Comments for documentation
COMMENT ON TABLE personal_finance.insurance_policies IS 'Main table for storing insurance policy details';
COMMENT ON TABLE personal_finance.insurance_nominees IS 'Nominees for each insurance policy';
COMMENT ON TABLE personal_finance.insurance_riders IS 'Additional riders attached to policies';
COMMENT ON TABLE personal_finance.insurance_premium_payments IS 'History of premium payments';
COMMENT ON TABLE personal_finance.insurance_bonus_history IS 'Bonus declarations for traditional plans';

COMMENT ON COLUMN personal_finance.insurance_policies.plan_type IS 'Types: endowment, term, ulip, money_back, whole_life, pension, health, child';
COMMENT ON COLUMN personal_finance.insurance_policies.premium_frequency IS 'Values: monthly, quarterly, half_yearly, annual, single';
COMMENT ON COLUMN personal_finance.insurance_policies.status IS 'Values: active, paid_up, lapsed, matured, surrendered, claimed';
