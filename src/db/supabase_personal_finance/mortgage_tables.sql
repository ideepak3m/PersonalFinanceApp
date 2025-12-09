-- =====================================================
-- MORTGAGE TRACKING TABLES (Enhanced with Terms)
-- Run this in Supabase SQL Editor
-- =====================================================

-- 1. Properties Table - Real estate assets
CREATE TABLE IF NOT EXISTS personal_finance.properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    property_name TEXT NOT NULL,
    property_type TEXT NOT NULL CHECK (property_type IN ('primary_residence', 'rental', 'vacation', 'investment', 'commercial')),
    address TEXT,
    purchase_date DATE NOT NULL,
    purchase_price NUMERIC NOT NULL,
    down_payment NUMERIC NOT NULL,
    land_transfer_tax NUMERIC DEFAULT 0,
    legal_fees NUMERIC DEFAULT 0,
    home_inspection NUMERIC DEFAULT 0,
    appraisal_fee NUMERIC DEFAULT 0,
    other_closing_costs NUMERIC DEFAULT 0,
    current_market_value NUMERIC,
    property_tax_annual NUMERIC,
    is_primary_residence BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Mortgages Table - The mortgage lifecycle (not term-specific)
CREATE TABLE IF NOT EXISTS personal_finance.mortgages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    property_id UUID REFERENCES personal_finance.properties(id) ON DELETE CASCADE,
    mortgage_name TEXT NOT NULL,
    mortgage_type TEXT NOT NULL CHECK (mortgage_type IN ('traditional', 'heloc', 'loc_mortgage', 'reverse', 'hybrid')),
    original_loan_amount NUMERIC NOT NULL,
    original_loan_date DATE NOT NULL,
    original_amortization_years INTEGER NOT NULL,
    current_balance NUMERIC,
    linked_account_id UUID,  -- For LOC mortgages linked to checking accounts
    is_active BOOLEAN DEFAULT TRUE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Mortgage Terms Table - Each renewal/refinance period
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

-- 4. Mortgage Payments Table - Payment history
CREATE TABLE IF NOT EXISTS personal_finance.mortgage_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    mortgage_id UUID REFERENCES personal_finance.mortgages(id) ON DELETE CASCADE,
    term_id UUID REFERENCES personal_finance.mortgage_terms(id) ON DELETE SET NULL,
    payment_date DATE NOT NULL,
    payment_amount NUMERIC NOT NULL,
    principal_amount NUMERIC NOT NULL,
    interest_amount NUMERIC NOT NULL,
    extra_principal NUMERIC DEFAULT 0,
    payment_type TEXT DEFAULT 'regular' CHECK (payment_type IN ('regular', 'extra', 'lump_sum', 'prepayment', 'interest_only')),
    balance_after_payment NUMERIC,
    source_transaction_id UUID,  -- Link to transactions table if auto-imported
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- INDEXES for performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_properties_user_id ON personal_finance.properties(user_id);
CREATE INDEX IF NOT EXISTS idx_properties_type ON personal_finance.properties(property_type);

CREATE INDEX IF NOT EXISTS idx_mortgages_user_id ON personal_finance.mortgages(user_id);
CREATE INDEX IF NOT EXISTS idx_mortgages_property_id ON personal_finance.mortgages(property_id);
CREATE INDEX IF NOT EXISTS idx_mortgages_is_active ON personal_finance.mortgages(is_active);

CREATE INDEX IF NOT EXISTS idx_mortgage_terms_user_id ON personal_finance.mortgage_terms(user_id);
CREATE INDEX IF NOT EXISTS idx_mortgage_terms_mortgage_id ON personal_finance.mortgage_terms(mortgage_id);
CREATE INDEX IF NOT EXISTS idx_mortgage_terms_current ON personal_finance.mortgage_terms(is_current_term);

CREATE INDEX IF NOT EXISTS idx_mortgage_payments_user_id ON personal_finance.mortgage_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_mortgage_payments_mortgage_id ON personal_finance.mortgage_payments(mortgage_id);
CREATE INDEX IF NOT EXISTS idx_mortgage_payments_term_id ON personal_finance.mortgage_payments(term_id);
CREATE INDEX IF NOT EXISTS idx_mortgage_payments_date ON personal_finance.mortgage_payments(payment_date);

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE personal_finance.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.mortgages ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.mortgage_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.mortgage_payments ENABLE ROW LEVEL SECURITY;

-- Properties policies
CREATE POLICY "Users can view own properties" ON personal_finance.properties
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own properties" ON personal_finance.properties
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own properties" ON personal_finance.properties
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own properties" ON personal_finance.properties
    FOR DELETE USING (auth.uid() = user_id);

-- Mortgages policies
CREATE POLICY "Users can view own mortgages" ON personal_finance.mortgages
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mortgages" ON personal_finance.mortgages
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mortgages" ON personal_finance.mortgages
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mortgages" ON personal_finance.mortgages
    FOR DELETE USING (auth.uid() = user_id);

-- Mortgage Terms policies
CREATE POLICY "Users can view own mortgage_terms" ON personal_finance.mortgage_terms
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mortgage_terms" ON personal_finance.mortgage_terms
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mortgage_terms" ON personal_finance.mortgage_terms
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mortgage_terms" ON personal_finance.mortgage_terms
    FOR DELETE USING (auth.uid() = user_id);

-- Mortgage Payments policies
CREATE POLICY "Users can view own mortgage_payments" ON personal_finance.mortgage_payments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own mortgage_payments" ON personal_finance.mortgage_payments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own mortgage_payments" ON personal_finance.mortgage_payments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own mortgage_payments" ON personal_finance.mortgage_payments
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- VIEWS for easier querying
-- =====================================================

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
-- TRIGGER for updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION personal_finance.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_properties_updated_at
    BEFORE UPDATE ON personal_finance.properties
    FOR EACH ROW EXECUTE FUNCTION personal_finance.update_updated_at_column();

CREATE TRIGGER update_mortgages_updated_at
    BEFORE UPDATE ON personal_finance.mortgages
    FOR EACH ROW EXECUTE FUNCTION personal_finance.update_updated_at_column();

CREATE TRIGGER update_mortgage_terms_updated_at
    BEFORE UPDATE ON personal_finance.mortgage_terms
    FOR EACH ROW EXECUTE FUNCTION personal_finance.update_updated_at_column();
