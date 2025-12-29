-- ============================================================
-- Migration: Add LIC-specific fields to insurance_policies
-- Date: 2024-12-22
-- Purpose: Support Indian LIC Endowment-cum-Whole-Life policies like Jeevan Anand
-- ============================================================
-- 
-- BACKGROUND:
-- Indian LIC policies like Jeevan Anand, Jeevan Umang have a unique structure:
-- 
-- 1. PREMIUM PAYMENT PHASE (e.g., 15-20 years)
--    - Policyholder pays premiums during this period
--    - At END of this phase: Sum Assured + Accumulated Bonuses are PAID OUT
--    - This is the "Survival Benefit" or "Endowment Benefit"
-- 
-- 2. EXTENDED LIFE COVER PHASE (until age 99/100)
--    - AFTER receiving the survival payout, life cover CONTINUES
--    - No more premiums required
--    - At DEATH: Sum Assured is paid AGAIN to nominee
--    - At AGE 99/100: If still alive, Sum Assured is paid (true maturity)
-- 
-- TERMINOLOGY:
-- - "Maturity" in Western sense = end of policy = survival_benefit_date for LIC
-- - "True Maturity" for LIC = age 99/100 when life cover ends
-- - "Survival Benefit" = Sum Assured + Bonuses paid at end of premium term
-- 
-- EXAMPLE - Jeevan Anand:
--   policy_start_date: 2020-01-01
--   premium_payment_term: 20 years
--   survival_benefit_date: 2040-01-01 (after 20 years)
--   survival_benefit_amount: 10,00,000 (Sum Assured) + 5,00,000 (Bonuses) = 15,00,000
--   life_cover_end_age: 100
--   sum_assured: 10,00,000 (paid again at death, even after survival payout)
-- 
-- Total potential benefit = survival_benefit_amount + sum_assured
-- ============================================================

-- Add new columns to support LIC policy structure
ALTER TABLE personal_finance.insurance_policies 
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'IN',
ADD COLUMN IF NOT EXISTS survival_benefit_date DATE,
ADD COLUMN IF NOT EXISTS survival_benefit_amount DECIMAL(15,2),
ADD COLUMN IF NOT EXISTS life_cover_end_age INTEGER,
ADD COLUMN IF NOT EXISTS life_cover_end_date DATE,
ADD COLUMN IF NOT EXISTS has_extended_life_cover BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS survival_benefit_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS survival_benefit_paid_date DATE,
ADD COLUMN IF NOT EXISTS survival_benefit_paid_amount DECIMAL(15,2);

-- Add comments to clarify field usage
COMMENT ON COLUMN personal_finance.insurance_policies.country IS 'Country of policy (IN=India, CA=Canada). LIC policies have unique structure.';

COMMENT ON COLUMN personal_finance.insurance_policies.maturity_date IS 
'For TERM policies: When coverage ends.
For TRADITIONAL LIC policies: This should be the SURVIVAL BENEFIT date (end of premium term), NOT age 99.
Use life_cover_end_date for when the extended life cover ends.';

COMMENT ON COLUMN personal_finance.insurance_policies.expected_maturity_value IS 
'For TERM policies: NULL (no payout unless death).
For TRADITIONAL LIC: Expected SURVIVAL BENEFIT = Sum Assured + Accumulated Bonuses.
This is what you receive at end of premium term.';

COMMENT ON COLUMN personal_finance.insurance_policies.survival_benefit_date IS 
'LIC ENDOWMENT/WHOLE-LIFE: Date when survival benefit (Sum Assured + Bonuses) is paid out.
Usually = policy_start_date + premium_payment_term years.
NULL for term policies.';

COMMENT ON COLUMN personal_finance.insurance_policies.survival_benefit_amount IS 
'LIC ENDOWMENT/WHOLE-LIFE: Actual or expected payout = Sum Assured + All Bonuses.
This is cash you receive. NULL for term policies.';

COMMENT ON COLUMN personal_finance.insurance_policies.life_cover_end_age IS 
'LIC WHOLE-LIFE: Age when life cover ends (typically 99 or 100 for Jeevan Anand).
After survival_benefit_date, life cover continues until this age.
NULL for term/pure endowment.';

COMMENT ON COLUMN personal_finance.insurance_policies.life_cover_end_date IS 
'Calculated: policyholder DOB + life_cover_end_age.
Or can be explicitly set. This is the TRUE maturity for whole-life portion.';

COMMENT ON COLUMN personal_finance.insurance_policies.has_extended_life_cover IS 
'TRUE if life cover continues after survival benefit payout (Jeevan Anand, Jeevan Umang).
FALSE for pure endowment or term policies.';

COMMENT ON COLUMN personal_finance.insurance_policies.survival_benefit_paid IS 
'Has the survival benefit already been received? Relevant for policies past premium term.';

COMMENT ON COLUMN personal_finance.insurance_policies.survival_benefit_paid_date IS 'Actual date survival benefit was received.';

COMMENT ON COLUMN personal_finance.insurance_policies.survival_benefit_paid_amount IS 'Actual amount received as survival benefit.';

-- ============================================================
-- PLAN TYPE REFERENCE
-- ============================================================
-- Update plan_type column comment with LIC-specific types
COMMENT ON COLUMN personal_finance.insurance_policies.plan_type IS 
'Policy type:
INDIAN LIC (Traditional):
- Endowment: Pure endowment (payout at term end, no extended cover)
- Endowment-Whole-Life: Jeevan Anand style (payout + extended cover to 99/100)
- Money Back: Periodic survival benefits during term
- Whole Life: No endowment, cover until death/99
- ULIP: Unit-linked (market-based returns)
- Pension/Annuity: Jeevan Shanti style

WESTERN/GENERAL:
- Term: Pure protection, no cash value
- Whole Life: Permanent coverage with cash value
- Universal Life: Flexible premium/benefit';

-- ============================================================
-- EXAMPLE DATA COMMENTS
-- ============================================================
-- How to store a Jeevan Anand policy:
-- 
-- INSERT INTO personal_finance.insurance_policies (
--   insurer_name, policy_number, plan_name, plan_type,
--   policy_holder_name, sum_assured, premium_amount, premium_frequency,
--   policy_start_date, 
--   premium_payment_term,         -- 20 (years paying premium)
--   maturity_date,                -- 2040-01-01 (when survival benefit paid)
--   survival_benefit_date,        -- 2040-01-01 (same as maturity_date for Jeevan Anand)
--   expected_maturity_value,      -- 15,00,000 (sum assured + bonuses)
--   survival_benefit_amount,      -- 15,00,000 (same for clarity)
--   has_extended_life_cover,      -- TRUE
--   life_cover_end_age,           -- 100
--   country                       -- 'IN'
-- ) VALUES (
--   'LIC', '123456789', 'Jeevan Anand', 'Endowment-Whole-Life',
--   'Vinay Kumar', 1000000, 50000, 'annual',
--   '2020-01-01',
--   20,
--   '2040-01-01',
--   '2040-01-01',
--   1500000,
--   1500000,
--   TRUE,
--   100,
--   'IN'
-- );

-- ============================================================
-- VIEW: AI-friendly insurance summary with LIC support
-- ============================================================
DROP VIEW IF EXISTS personal_finance.ai_lic_policy_analysis;

CREATE OR REPLACE VIEW personal_finance.ai_lic_policy_analysis AS
SELECT 
  ip.user_id,
  ip.country,
  ip.currency,
  ip.insurer_name,
  ip.policy_number,
  ip.plan_name,
  ip.plan_type,
  ip.sum_assured,
  ip.premium_amount,
  ip.premium_frequency,
  ip.policy_start_date,
  ip.premium_payment_term,
  ip.status,
  
  -- === SURVIVAL BENEFIT (Cash payout at premium term end) ===
  COALESCE(ip.survival_benefit_date, ip.maturity_date) as survival_benefit_date,
  COALESCE(ip.survival_benefit_amount, ip.expected_maturity_value) as survival_benefit_expected,
  ip.survival_benefit_paid,
  ip.survival_benefit_paid_amount,
  
  -- === EXTENDED LIFE COVER (after survival benefit) ===
  ip.has_extended_life_cover,
  ip.life_cover_end_age,
  ip.life_cover_end_date,
  
  -- === CALCULATIONS ===
  -- Years until survival benefit
  CASE 
    WHEN ip.survival_benefit_paid = TRUE THEN 0
    WHEN COALESCE(ip.survival_benefit_date, ip.maturity_date) IS NOT NULL 
    THEN GREATEST(0, EXTRACT(YEAR FROM AGE(COALESCE(ip.survival_benefit_date, ip.maturity_date), CURRENT_DATE))::INTEGER)
    ELSE NULL
  END as years_to_survival_benefit,
  
  -- Premiums remaining
  CASE 
    WHEN ip.status != 'active' THEN 0
    WHEN ip.policy_start_date + (ip.premium_payment_term * INTERVAL '1 year') < CURRENT_DATE THEN 0
    ELSE GREATEST(0, (
      EXTRACT(YEAR FROM AGE(ip.policy_start_date + (ip.premium_payment_term * INTERVAL '1 year'), CURRENT_DATE))::INTEGER
    ))
  END as years_premiums_remaining,
  
  -- Annual premium (normalized)
  ip.premium_amount * CASE ip.premium_frequency
    WHEN 'monthly' THEN 12
    WHEN 'quarterly' THEN 4
    WHEN 'half_yearly' THEN 2
    WHEN 'annual' THEN 1
    WHEN 'single' THEN 0
    ELSE 1
  END as annual_premium,
  
  -- Total premiums remaining (rough estimate)
  CASE 
    WHEN ip.status != 'active' THEN 0
    ELSE (
      ip.premium_amount * CASE ip.premium_frequency
        WHEN 'monthly' THEN 12
        WHEN 'quarterly' THEN 4
        WHEN 'half_yearly' THEN 2
        WHEN 'annual' THEN 1
        ELSE 1
      END * GREATEST(0, (
        EXTRACT(YEAR FROM AGE(ip.policy_start_date + (ip.premium_payment_term * INTERVAL '1 year'), CURRENT_DATE))::INTEGER
      ))
    )
  END as total_premiums_remaining,
  
  -- Current accumulated value (bonuses)
  ip.accrued_bonus + COALESCE(ip.terminal_bonus, 0) as total_bonuses_accumulated,
  
  -- === AI GUIDANCE ===
  CASE 
    WHEN ip.has_extended_life_cover = TRUE AND ip.survival_benefit_paid = TRUE 
    THEN 'MATURED ENDOWMENT WITH ACTIVE LIFE COVER: Survival benefit already received. Life cover continues until age ' || ip.life_cover_end_age || '. Death benefit: ' || ip.sum_assured
    WHEN ip.has_extended_life_cover = TRUE 
    THEN 'ENDOWMENT-CUM-WHOLE-LIFE: Will receive survival benefit of ~' || COALESCE(ip.survival_benefit_amount, ip.expected_maturity_value) || ' at ' || COALESCE(ip.survival_benefit_date, ip.maturity_date) || '. Life cover of ' || ip.sum_assured || ' continues until age ' || ip.life_cover_end_age
    WHEN ip.plan_type = 'Money Back'
    THEN 'MONEY BACK: Periodic survival benefits during term. Check policy for payout schedule.'
    WHEN ip.plan_type = 'Term'
    THEN 'TERM INSURANCE: Pure protection. No payout unless death during term.'
    WHEN ip.plan_type ILIKE '%ULIP%'
    THEN 'ULIP: Market-linked. Fund value: ' || COALESCE(ip.current_fund_value::TEXT, 'N/A') || '. Returns depend on market performance.'
    ELSE 'TRADITIONAL: Check policy for specific terms.'
  END as ai_policy_summary

FROM personal_finance.insurance_policies ip
WHERE ip.status IN ('active', 'paid_up');

COMMENT ON VIEW personal_finance.ai_lic_policy_analysis IS 
'AI-friendly view for Indian LIC policies. Shows survival benefit (cash payout at premium term end) separately from extended life cover (continues until age 99/100).

KEY CONCEPTS:
- survival_benefit_date: When you GET CASH (Sum Assured + Bonuses)
- survival_benefit_expected: How much CASH you receive
- life_cover_end_age: When life insurance ENDS (99/100 for Jeevan Anand)
- sum_assured: Death benefit (paid AGAIN if you die after survival benefit)

TOTAL POTENTIAL VALUE = survival_benefit_expected + sum_assured (if death after survival)';
