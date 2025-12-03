-- Migration: Create user_profile and government_benefits tables
-- Date: 2025-12-03
-- Purpose: Foundation for retirement planning and AI advisory

-- ============================================================
-- STEP 1: Create user_profile table
-- ============================================================

CREATE TABLE IF NOT EXISTS personal_finance.user_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Personal Information
  date_of_birth DATE,
  province TEXT DEFAULT 'ON',              -- For provincial tax calculations
  country TEXT DEFAULT 'CA',               -- 'CA', 'IN' for multi-country support
  marital_status TEXT,                     -- 'single', 'married', 'common-law', 'separated'
  spouse_date_of_birth DATE,
  
  -- Employment & Income
  employment_status TEXT DEFAULT 'employed',  -- 'employed', 'self-employed', 'retired', 'student'
  current_annual_income NUMERIC(15, 2),
  spouse_annual_income NUMERIC(15, 2),
  
  -- Retirement Goals
  expected_retirement_age INTEGER DEFAULT 65,
  desired_retirement_income NUMERIC(15, 2),   -- Annual income needed in retirement
  life_expectancy INTEGER DEFAULT 90,
  
  -- Tax Information (for AI to consider)
  marginal_tax_rate NUMERIC(5, 2),            -- Current marginal rate
  average_tax_rate NUMERIC(5, 2),             -- Average rate paid
  
  -- RRSP/TFSA Room (from CRA)
  rrsp_contribution_room NUMERIC(15, 2),
  rrsp_unused_room NUMERIC(15, 2),
  tfsa_contribution_room NUMERIC(15, 2),
  
  -- Preferences
  risk_tolerance TEXT DEFAULT 'moderate',     -- 'conservative', 'moderate', 'aggressive'
  preferred_currency TEXT DEFAULT 'CAD',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Add comments
COMMENT ON TABLE personal_finance.user_profile IS 'User profile for retirement planning and AI advisory';
COMMENT ON COLUMN personal_finance.user_profile.province IS 'Canadian province for tax calculations (ON, BC, AB, etc.)';
COMMENT ON COLUMN personal_finance.user_profile.country IS 'Primary country for tax residency (CA=Canada, IN=India)';
COMMENT ON COLUMN personal_finance.user_profile.risk_tolerance IS 'Investment risk tolerance for AI recommendations';

-- ============================================================
-- STEP 2: Create government_benefits table (CPP/OAS/Pension)
-- ============================================================

CREATE TABLE IF NOT EXISTS personal_finance.government_benefits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- CPP (Canada Pension Plan) Information
  cpp_estimated_at_65 NUMERIC(10, 2),         -- Monthly amount if taken at 65
  cpp_statement_date DATE,                     -- When you got this estimate
  cpp_contributions_to_date NUMERIC(15, 2),   -- Total contributed so far
  cpp_years_contributed INTEGER,               -- Number of years contributed
  
  -- CPP at different ages (calculated or from Service Canada)
  cpp_at_60 NUMERIC(10, 2),                   -- 36% reduction (0.6% × 60 months)
  cpp_at_65 NUMERIC(10, 2),                   -- Full amount
  cpp_at_70 NUMERIC(10, 2),                   -- 42% increase (0.7% × 60 months)
  cpp_planned_start_age INTEGER DEFAULT 65,   -- When user plans to start CPP
  
  -- OAS (Old Age Security) Information
  oas_estimated_monthly NUMERIC(10, 2),       -- Monthly amount at 65
  oas_years_in_canada INTEGER,                 -- Years of Canadian residency (40 for full)
  oas_eligible_age INTEGER DEFAULT 65,
  oas_planned_start_age INTEGER DEFAULT 65,   -- When user plans to start OAS
  
  -- OAS Clawback threshold (updates annually)
  oas_clawback_threshold NUMERIC(15, 2) DEFAULT 90997,  -- 2025 threshold
  
  -- GIS (Guaranteed Income Supplement) - for low-income retirees
  gis_eligible BOOLEAN DEFAULT FALSE,
  gis_estimated_monthly NUMERIC(10, 2),
  
  -- Employer Pension (if applicable)
  has_employer_pension BOOLEAN DEFAULT FALSE,
  pension_type TEXT,                          -- 'DB' (Defined Benefit), 'DC' (Defined Contribution)
  pension_employer TEXT,
  pension_years_of_service NUMERIC(5, 2),
  pension_multiplier NUMERIC(5, 4),           -- For DB: e.g., 0.02 (2% per year)
  pension_best_average_salary NUMERIC(15, 2), -- For DB: best 5-year average
  pension_estimated_monthly NUMERIC(10, 2),   -- Estimated monthly pension
  pension_earliest_age INTEGER DEFAULT 55,
  pension_normal_age INTEGER DEFAULT 65,
  pension_current_value NUMERIC(15, 2),       -- For DC pensions
  
  -- For spouse (if applicable)
  spouse_cpp_at_65 NUMERIC(10, 2),
  spouse_oas_estimated NUMERIC(10, 2),
  spouse_pension_estimated NUMERIC(10, 2),
  
  last_updated DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- Add comments
COMMENT ON TABLE personal_finance.government_benefits IS 'CPP, OAS, and pension estimates for retirement planning';
COMMENT ON COLUMN personal_finance.government_benefits.cpp_at_60 IS 'CPP reduced by 36% if taken at 60';
COMMENT ON COLUMN personal_finance.government_benefits.cpp_at_70 IS 'CPP increased by 42% if delayed to 70';
COMMENT ON COLUMN personal_finance.government_benefits.oas_clawback_threshold IS 'OAS clawback starts at this income level';
COMMENT ON COLUMN personal_finance.government_benefits.pension_multiplier IS 'For DB pension: percentage per year of service';

-- ============================================================
-- STEP 3: Create indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON personal_finance.user_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_government_benefits_user_id ON personal_finance.government_benefits(user_id);

-- ============================================================
-- STEP 4: Enable RLS
-- ============================================================

ALTER TABLE personal_finance.user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_finance.government_benefits ENABLE ROW LEVEL SECURITY;

-- User Profile policies
CREATE POLICY "Users can view own profile" ON personal_finance.user_profile 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON personal_finance.user_profile 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON personal_finance.user_profile 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own profile" ON personal_finance.user_profile 
  FOR DELETE USING (auth.uid() = user_id);

-- Government Benefits policies
CREATE POLICY "Users can view own benefits" ON personal_finance.government_benefits 
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own benefits" ON personal_finance.government_benefits 
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own benefits" ON personal_finance.government_benefits 
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own benefits" ON personal_finance.government_benefits 
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- STEP 5: Create update timestamp triggers
-- ============================================================

CREATE OR REPLACE FUNCTION personal_finance.update_user_profile_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profile_timestamp ON personal_finance.user_profile;
CREATE TRIGGER update_user_profile_timestamp
  BEFORE UPDATE ON personal_finance.user_profile
  FOR EACH ROW
  EXECUTE FUNCTION personal_finance.update_user_profile_timestamp();

-- ============================================================
-- STEP 6: Create helpful views for AI
-- ============================================================

-- User's retirement readiness summary
CREATE OR REPLACE VIEW personal_finance.retirement_summary AS
SELECT 
  up.user_id,
  up.date_of_birth,
  EXTRACT(YEAR FROM AGE(NOW(), up.date_of_birth))::INTEGER as current_age,
  up.expected_retirement_age,
  up.expected_retirement_age - EXTRACT(YEAR FROM AGE(NOW(), up.date_of_birth))::INTEGER as years_to_retirement,
  up.current_annual_income,
  up.desired_retirement_income,
  up.risk_tolerance,
  up.rrsp_contribution_room,
  up.tfsa_contribution_room,
  gb.cpp_at_65,
  gb.cpp_planned_start_age,
  gb.oas_estimated_monthly,
  gb.oas_planned_start_age,
  gb.has_employer_pension,
  gb.pension_estimated_monthly,
  -- Calculate total government income at 65
  COALESCE(gb.cpp_at_65, 0) + COALESCE(gb.oas_estimated_monthly, 0) + COALESCE(gb.pension_estimated_monthly, 0) as total_monthly_benefits_at_65,
  (COALESCE(gb.cpp_at_65, 0) + COALESCE(gb.oas_estimated_monthly, 0) + COALESCE(gb.pension_estimated_monthly, 0)) * 12 as total_annual_benefits_at_65
FROM personal_finance.user_profile up
LEFT JOIN personal_finance.government_benefits gb ON up.user_id = gb.user_id;

COMMENT ON VIEW personal_finance.retirement_summary IS 'Combined user profile and benefits for AI retirement planning';
