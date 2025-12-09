-- =====================================================
-- MORTGAGE TABLES V2 MIGRATION
-- Adds mortgage_terms table for renewal/refinance tracking
-- Run this AFTER the original mortgage_tables.sql
-- =====================================================

-- =====================================================
-- 1. CREATE MORTGAGE_TERMS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS personal_finance.mortgage_terms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    mortgage_id UUID REFERENCES personal_finance.mortgages(id) ON DELETE CASCADE,
    term_number INTEGER NOT NULL,
    lender TEXT NOT NULL,
    interest_rate NUMERIC NOT NULL,
    rate_type TEXT NOT NULL CHECK (rate_type IN ('fixed', 'variable', 'adjustable', 'prime_plus', 'prime_minus')),
    prime_rate_offset NUMERIC,  -- For variable rates (e.g., Prime + 0.5%)
    term_years INTEGER NOT NULL,
    term_start_date DATE NOT NULL,
    term_end_date DATE,
    payment_frequency TEXT NOT NULL CHECK (payment_frequency IN ('weekly', 'bi_weekly', 'semi_monthly', 'monthly', 'accelerated_bi_weekly', 'accelerated_weekly')),
    regular_payment_amount NUMERIC NOT NULL,
    minimum_payment_type TEXT CHECK (minimum_payment_type IN ('principal_and_interest', 'interest_only', 'custom')),
    balance_at_term_start NUMERIC,
    balance_at_term_end NUMERIC,
    is_current_term BOOLEAN DEFAULT FALSE,
    renewal_type TEXT CHECK (renewal_type IN ('original', 'renewal', 'refinance', 'transfer')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 2. ADD MISSING COLUMNS TO mortgages (if not exists)
-- =====================================================
DO $$ 
BEGIN
    -- Add original_loan_date if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'personal_finance' 
        AND table_name = 'mortgages' 
        AND column_name = 'original_loan_date'
    ) THEN
        ALTER TABLE personal_finance.mortgages 
        ADD COLUMN original_loan_date DATE;
    END IF;
    
    -- Add original_amortization_years if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'personal_finance' 
        AND table_name = 'mortgages' 
        AND column_name = 'original_amortization_years'
    ) THEN
        ALTER TABLE personal_finance.mortgages 
        ADD COLUMN original_amortization_years INTEGER;
    END IF;
END $$;

-- =====================================================
-- 3. ADD term_id TO mortgage_payments (if not exists)
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'personal_finance' 
        AND table_name = 'mortgage_payments' 
        AND column_name = 'term_id'
    ) THEN
        ALTER TABLE personal_finance.mortgage_payments 
        ADD COLUMN term_id UUID REFERENCES personal_finance.mortgage_terms(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =====================================================
-- 3. INDEXES for mortgage_terms
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_mortgage_terms_user_id ON personal_finance.mortgage_terms(user_id);
CREATE INDEX IF NOT EXISTS idx_mortgage_terms_mortgage_id ON personal_finance.mortgage_terms(mortgage_id);
CREATE INDEX IF NOT EXISTS idx_mortgage_terms_current ON personal_finance.mortgage_terms(is_current_term);
CREATE INDEX IF NOT EXISTS idx_mortgage_payments_term_id ON personal_finance.mortgage_payments(term_id);

-- =====================================================
-- 4. ROW LEVEL SECURITY for mortgage_terms
-- =====================================================
ALTER TABLE personal_finance.mortgage_terms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own mortgage_terms" ON personal_finance.mortgage_terms
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mortgage_terms" ON personal_finance.mortgage_terms
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mortgage_terms" ON personal_finance.mortgage_terms
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mortgage_terms" ON personal_finance.mortgage_terms
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- 5. UPDATED VIEWS (drop and recreate)
-- =====================================================

-- Drop existing views first
DROP VIEW IF EXISTS personal_finance.v_mortgage_history;
DROP VIEW IF EXISTS personal_finance.v_mortgage_term_summary;
DROP VIEW IF EXISTS personal_finance.v_mortgage_with_current_term;
DROP VIEW IF EXISTS personal_finance.v_property_summary;

-- Property summary with total equity
CREATE OR REPLACE VIEW personal_finance.v_property_summary AS
SELECT 
    p.id,
    p.user_id,
    p.property_name,
    p.property_type,
    p.address,
    p.purchase_date,
    p.purchase_price,
    p.current_market_value,
    COALESCE(p.current_market_value, p.purchase_price) - COALESCE(
        (SELECT SUM(current_balance) FROM personal_finance.mortgages m WHERE m.property_id = p.id AND m.is_active = TRUE),
        0
    ) AS estimated_equity,
    p.down_payment + COALESCE(p.land_transfer_tax, 0) + COALESCE(p.legal_fees, 0) + COALESCE(p.home_inspection, 0) + COALESCE(p.appraisal_fee, 0) + COALESCE(p.other_closing_costs, 0) AS total_closing_costs,
    (SELECT COUNT(*) FROM personal_finance.mortgages m WHERE m.property_id = p.id AND m.is_active = TRUE) AS active_mortgages_count
FROM personal_finance.properties p;

-- Mortgage with current term details
CREATE OR REPLACE VIEW personal_finance.v_mortgage_with_current_term AS
SELECT 
    m.id,
    m.user_id,
    m.mortgage_name,
    m.mortgage_type,
    m.original_loan_amount,
    m.original_loan_date,
    m.original_amortization_years,
    m.current_balance,
    m.is_active,
    p.property_name,
    p.address,
    t.term_number,
    t.lender AS current_lender,
    t.interest_rate AS current_rate,
    t.rate_type AS current_rate_type,
    t.term_start_date,
    t.term_end_date,
    t.payment_frequency,
    t.regular_payment_amount,
    t.minimum_payment_type
FROM personal_finance.mortgages m
LEFT JOIN personal_finance.properties p ON m.property_id = p.id
LEFT JOIN personal_finance.mortgage_terms t ON t.mortgage_id = m.id AND t.is_current_term = TRUE;

-- Mortgage payment summary by term
CREATE OR REPLACE VIEW personal_finance.v_mortgage_term_summary AS
SELECT 
    t.id AS term_id,
    t.user_id,
    t.mortgage_id,
    t.term_number,
    t.lender,
    t.interest_rate,
    t.rate_type,
    t.term_start_date,
    t.term_end_date,
    t.renewal_type,
    m.mortgage_name,
    COALESCE(SUM(mp.principal_amount + COALESCE(mp.extra_principal, 0)), 0) AS total_principal_paid,
    COALESCE(SUM(mp.interest_amount), 0) AS total_interest_paid,
    COUNT(mp.id) AS payments_made
FROM personal_finance.mortgage_terms t
JOIN personal_finance.mortgages m ON t.mortgage_id = m.id
LEFT JOIN personal_finance.mortgage_payments mp ON mp.term_id = t.id
GROUP BY t.id, t.user_id, t.mortgage_id, t.term_number, t.lender, t.interest_rate, 
         t.rate_type, t.term_start_date, t.term_end_date, t.renewal_type, m.mortgage_name;

-- Full mortgage history (all terms)
CREATE OR REPLACE VIEW personal_finance.v_mortgage_history AS
SELECT 
    m.id AS mortgage_id,
    m.user_id,
    m.mortgage_name,
    m.mortgage_type,
    m.original_loan_amount,
    p.property_name,
    t.term_number,
    t.lender,
    t.interest_rate,
    t.rate_type,
    t.term_years,
    t.term_start_date,
    t.term_end_date,
    t.renewal_type,
    t.balance_at_term_start,
    t.balance_at_term_end,
    t.is_current_term
FROM personal_finance.mortgages m
JOIN personal_finance.properties p ON m.property_id = p.id
JOIN personal_finance.mortgage_terms t ON t.mortgage_id = m.id
ORDER BY m.id, t.term_number;

-- =====================================================
-- 6. TRIGGER for mortgage_terms updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION personal_finance.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger only if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_mortgage_terms_updated_at'
    ) THEN
        CREATE TRIGGER update_mortgage_terms_updated_at
            BEFORE UPDATE ON personal_finance.mortgage_terms
            FOR EACH ROW EXECUTE FUNCTION personal_finance.update_updated_at_column();
    END IF;
END $$;

-- =====================================================
-- DONE! mortgage_terms table added
-- =====================================================
SELECT 'Migration complete! mortgage_terms table created.' AS status;
