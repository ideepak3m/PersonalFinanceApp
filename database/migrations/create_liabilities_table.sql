-- Migration: Create liabilities table
-- Purpose: Track summary of debts/liabilities for AI analysis and net worth calculation
-- Note: This captures liability snapshots, not individual transactions

-- Liabilities Table - Summary tracking of all debts
CREATE TABLE IF NOT EXISTS personal_finance.liabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Liability identification
    liability_name TEXT NOT NULL,
    liability_type TEXT NOT NULL CHECK (liability_type IN (
        'mortgage',           -- Home mortgage (linked to property)
        'car_loan',          -- Vehicle financing
        'student_loan',      -- Education debt
        'personal_loan',     -- Unsecured personal loans
        'line_of_credit',    -- LOC / HELOC
        'credit_card',       -- Credit card debt
        'medical_debt',      -- Medical bills
        'tax_debt',          -- Owed taxes
        'family_loan',       -- Money owed to family/friends
        'business_loan',     -- Business-related debt
        'other'              -- Other liabilities
    )),
    
    -- Balance and limits
    current_balance NUMERIC NOT NULL DEFAULT 0,
    credit_limit NUMERIC,                    -- For revolving credit (LOC, credit cards)
    original_amount NUMERIC,                 -- Original loan amount
    
    -- Interest and payments
    interest_rate NUMERIC,                   -- Annual interest rate (%)
    rate_type TEXT CHECK (rate_type IN ('fixed', 'variable', 'prime_plus', 'prime_minus')),
    prime_rate_offset NUMERIC,               -- For variable rates (e.g., Prime + 0.5%)
    monthly_payment NUMERIC,                 -- Regular payment amount
    minimum_payment NUMERIC,                 -- Minimum required payment (for revolving)
    payment_frequency TEXT DEFAULT 'monthly' CHECK (payment_frequency IN (
        'weekly', 'bi_weekly', 'semi_monthly', 'monthly'
    )),
    
    -- Dates
    start_date DATE,                         -- When the liability started
    payoff_date DATE,                        -- Expected payoff date
    last_payment_date DATE,                  -- Last payment made
    
    -- Linked entities
    property_id UUID REFERENCES personal_finance.properties(id) ON DELETE SET NULL,  -- For mortgages
    linked_account_id UUID,                  -- Link to bank account if applicable
    
    -- Status and metadata
    is_active BOOLEAN DEFAULT TRUE,
    country TEXT,                            -- Country where liability exists
    currency TEXT DEFAULT 'CAD',
    lender TEXT,                             -- Name of lender/institution
    account_number TEXT,                     -- Last 4 digits or reference number
    notes TEXT,                              -- Additional notes for AI context
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_liabilities_user_id ON personal_finance.liabilities(user_id);
CREATE INDEX IF NOT EXISTS idx_liabilities_type ON personal_finance.liabilities(liability_type);
CREATE INDEX IF NOT EXISTS idx_liabilities_active ON personal_finance.liabilities(is_active);
CREATE INDEX IF NOT EXISTS idx_liabilities_country ON personal_finance.liabilities(country);
CREATE INDEX IF NOT EXISTS idx_liabilities_property ON personal_finance.liabilities(property_id);

-- Enable RLS
ALTER TABLE personal_finance.liabilities ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own liabilities"
    ON personal_finance.liabilities FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own liabilities"
    ON personal_finance.liabilities FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own liabilities"
    ON personal_finance.liabilities FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own liabilities"
    ON personal_finance.liabilities FOR DELETE
    USING (auth.uid() = user_id);

-- Comments for documentation
COMMENT ON TABLE personal_finance.liabilities IS 'Summary tracking of all debts and liabilities for net worth calculation and AI analysis';
COMMENT ON COLUMN personal_finance.liabilities.liability_type IS 'Type of liability: mortgage, car_loan, student_loan, personal_loan, line_of_credit, credit_card, medical_debt, tax_debt, family_loan, business_loan, other';
COMMENT ON COLUMN personal_finance.liabilities.current_balance IS 'Current outstanding balance owed';
COMMENT ON COLUMN personal_finance.liabilities.credit_limit IS 'Credit limit for revolving credit (LOC, credit cards)';
COMMENT ON COLUMN personal_finance.liabilities.monthly_payment IS 'Regular monthly payment amount (already tracked in expenses)';
COMMENT ON COLUMN personal_finance.liabilities.payoff_date IS 'Expected date when liability will be fully paid off';
COMMENT ON COLUMN personal_finance.liabilities.notes IS 'Additional context about the liability for AI understanding';

-- View for liability summary by type
CREATE OR REPLACE VIEW personal_finance.liability_summary AS
SELECT 
    user_id,
    country,
    liability_type,
    COUNT(*) as count,
    SUM(current_balance) as total_balance,
    SUM(monthly_payment) as total_monthly_payment,
    SUM(credit_limit) as total_credit_limit
FROM personal_finance.liabilities
WHERE is_active = true
GROUP BY user_id, country, liability_type;

-- Grant access to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON personal_finance.liabilities TO authenticated;
GRANT SELECT ON personal_finance.liability_summary TO authenticated;
