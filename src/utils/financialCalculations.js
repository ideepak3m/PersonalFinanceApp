/**
 * Financial Calculation Utilities
 * 
 * These functions provide estimates and projections for:
 * - Insurance surrender values
 * - LIC bonus calculations (India)
 * - Retirement expense projections
 * - Life insurance needs assessment
 * 
 * Note: These are ESTIMATES based on industry thumb rules.
 * Actual values may vary. Always verify with official documents.
 */

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Calculate years since policy start date
 */
export const calculateYearsPaid = (policy) => {
    if (!policy.policy_start_date) return 0;
    const startDate = new Date(policy.policy_start_date);
    const today = new Date();
    const years = (today - startDate) / (1000 * 60 * 60 * 24 * 365.25);
    return Math.floor(years);
};

/**
 * Calculate age from date of birth
 */
export const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return 0;
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
        age--;
    }
    return age;
};

// ============================================================
// INSURANCE SURRENDER VALUE ESTIMATION
// ============================================================

/**
 * Estimate surrender value for insurance policies
 * 
 * THUMB RULE:
 * - Years 0-2: No surrender value
 * - Years 2-3: 30% of premiums paid
 * - Years 3-5: 50% of premiums paid
 * - Years 5-7: 70% of premiums paid
 * - Years 7+: 90% of premiums paid
 * + Any vested bonuses
 * 
 * @param {Object} policy - Insurance policy object
 * @returns {Object} Estimated surrender value breakdown
 */
export const estimateSurrenderValue = (policy) => {
    const yearsPaid = calculateYearsPaid(policy);

    // Calculate total premiums paid based on frequency
    const frequencyMultiplier = {
        'monthly': 12,
        'quarterly': 4,
        'half_yearly': 2,
        'semi_annual': 2,
        'annual': 1,
        'single': 0 // Single premium handled separately
    };

    const multiplier = frequencyMultiplier[policy.premium_frequency?.toLowerCase()] || 1;
    const totalPremiumsPaid = (policy.premium_amount || 0) * multiplier * yearsPaid;

    // Determine surrender value rate based on years paid
    let surrenderValueRate;
    let rateDescription;

    if (yearsPaid < 2) {
        surrenderValueRate = 0;
        rateDescription = 'No surrender value (less than 2 years)';
    } else if (yearsPaid < 3) {
        surrenderValueRate = 0.30;
        rateDescription = '30% of premiums (2-3 years)';
    } else if (yearsPaid < 5) {
        surrenderValueRate = 0.50;
        rateDescription = '50% of premiums (3-5 years)';
    } else if (yearsPaid < 7) {
        surrenderValueRate = 0.70;
        rateDescription = '70% of premiums (5-7 years)';
    } else {
        surrenderValueRate = 0.90;
        rateDescription = '90% of premiums (7+ years)';
    }

    // Get bonus estimates
    const bonuses = estimateLICBonus(policy);

    // Calculate surrender value
    const premiumComponent = totalPremiumsPaid * surrenderValueRate;
    const bonusComponent = bonuses.simpleBonus; // Only simple bonus is vested
    const totalSurrenderValue = premiumComponent + bonusComponent;

    return {
        yearsPaid,
        totalPremiumsPaid,
        surrenderValueRate,
        rateDescription,
        premiumComponent,
        bonusComponent,
        totalSurrenderValue,
        note: 'This is an estimate. Actual surrender value may vary based on policy terms.'
    };
};

// ============================================================
// LIC BONUS ESTIMATION (INDIA)
// ============================================================

/**
 * LIC Bonus rates per ₹1,000 sum assured per year
 * These are approximate rates and may change annually
 */
const LIC_BONUS_RATES = {
    'Jeevan Anand': 50,
    'Jeevan Umang': 48,
    'Jeevan Tarang': 45,
    'Jeevan Lakshya': 46,
    'Jeevan Labh': 47,
    'New Endowment': 45,
    'Endowment': 45,
    'Money Back': 40,
    'New Money Back': 42,
    'Whole Life': 48,
    'default': 45 // Conservative average
};

/**
 * Estimate LIC bonus for participating policies
 * 
 * THUMB RULE:
 * - Simple Bonus: ₹40-50 per ₹1,000 sum assured per year
 * - Terminal Bonus: 8-10% of sum assured (only at maturity)
 * - Total return: ~5-6% CAGR over policy term
 * 
 * @param {Object} policy - Insurance policy object
 * @returns {Object} Bonus breakdown
 */
export const estimateLICBonus = (policy) => {
    const yearsPaid = calculateYearsPaid(policy);
    const sumAssured = policy.sum_assured || 0;
    const planName = policy.plan_name || '';

    // Find matching bonus rate
    let bonusRate = LIC_BONUS_RATES.default;
    for (const [plan, rate] of Object.entries(LIC_BONUS_RATES)) {
        if (planName.toLowerCase().includes(plan.toLowerCase())) {
            bonusRate = rate;
            break;
        }
    }

    // Calculate simple (reversionary) bonus
    // Formula: (Sum Assured / 1000) × Rate × Years
    const simpleBonus = (sumAssured / 1000) * bonusRate * yearsPaid;

    // Terminal bonus (approximate, paid only at maturity/death)
    // Higher for longer-term policies
    let terminalBonusRate;
    if (planName.toLowerCase().includes('jeevan anand')) {
        terminalBonusRate = 0.10; // 10% for Jeevan Anand
    } else if (planName.toLowerCase().includes('whole life')) {
        terminalBonusRate = 0.12; // 12% for Whole Life
    } else {
        terminalBonusRate = 0.08; // 8% default
    }

    const terminalBonus = sumAssured * terminalBonusRate;

    // Loyalty additions (for policies 15+ years)
    const loyaltyAddition = yearsPaid >= 15 ? sumAssured * 0.02 : 0;

    return {
        planName,
        bonusRatePerThousand: bonusRate,
        yearsPaid,
        sumAssured,
        simpleBonus: Math.round(simpleBonus),
        terminalBonus: Math.round(terminalBonus),
        loyaltyAddition: Math.round(loyaltyAddition),
        total: Math.round(simpleBonus + terminalBonus + loyaltyAddition),
        maturityValue: Math.round(sumAssured + simpleBonus + terminalBonus + loyaltyAddition),
        note: 'Simple bonus accrues yearly. Terminal bonus only paid at maturity/death claim.'
    };
};

/**
 * Calculate estimated maturity value for LIC policies
 * Maturity Value = Sum Assured + Accrued Bonus + Terminal Bonus
 * 
 * @param {Object} policy - Insurance policy object
 * @returns {number} Estimated maturity value
 */
export const calculateEstimatedMaturityValue = (policy) => {
    const sumAssured = policy.sum_assured || 0;
    const accruedBonus = policy.accrued_bonus || 0;
    const terminalBonus = policy.terminal_bonus || 0;

    // If bonuses are already tracked, use those
    if (accruedBonus > 0 || terminalBonus > 0) {
        return sumAssured + accruedBonus + terminalBonus;
    }

    // Otherwise, estimate bonuses
    const bonuses = estimateLICBonus(policy);
    return bonuses.maturityValue;
};

// ============================================================
// RETIREMENT EXPENSE PROJECTIONS
// ============================================================

/**
 * Project retirement expenses based on current spending
 * 
 * THUMB RULE:
 * - Retirement = Current expenses - Things that end + Things that increase
 * - Typically: 65-80% of current total expenses
 * - Or: 75-85% of current take-home (excluding savings & debt)
 * 
 * @param {Object} currentExpenses - Current expense breakdown by category
 * @param {Object} liabilities - Current liabilities/debts
 * @returns {Object} Retirement expense projection
 */
export const projectRetirementExpenses = (currentExpenses, liabilities = {}) => {
    const retirement = {
        willEnd: {},
        willContinue: {},
        willIncrease: {},
        willDecrease: {}
    };

    // Expenses that END at retirement
    retirement.willEnd = {
        mortgage: liabilities.mortgage?.monthly_payment
            ? liabilities.mortgage.monthly_payment * 12
            : 0,
        carPayment: liabilities.carLoan?.monthly_payment
            ? liabilities.carLoan.monthly_payment * 12
            : 0,
        lifeInsurancePremiums: (currentExpenses.lifeInsurance || 0) * 0.70, // 70% likely to end
        disabilityInsurance: currentExpenses.disabilityInsurance || 0, // Ends at retirement
        workRelatedCosts: (currentExpenses.transportation || 0) * 0.30, // 30% work-related
        retirementSavings: currentExpenses.rrspContributions || currentExpenses.savings || 0,
        childExpenses: (currentExpenses.education || 0) + (currentExpenses.childcare || 0)
    };

    // Expenses that INCREASE
    retirement.willIncrease = {
        healthcare: (currentExpenses.health || 0) * 0.50, // 50% increase (no employer coverage)
        prescriptions: 3000, // New expense, ~$250/month
        travel: (currentExpenses.travel || 0) * 0.30, // 30% increase (more time)
        entertainment: (currentExpenses.entertainment || 0) * 0.20, // 20% increase
        hobbies: (currentExpenses.hobbies || 0) * 0.40 // 40% increase (more time)
    };

    // Expenses that DECREASE
    retirement.willDecrease = {
        transportation: (currentExpenses.transportation || 0) * 0.30, // 30% reduction
        clothing: (currentExpenses.clothing || 0) * 0.50, // 50% reduction
        dining: (currentExpenses.dining || 0) * 0.10 // 10% reduction
    };

    // Expenses that CONTINUE as-is (or minor changes)
    retirement.willContinue = {
        propertyTax: currentExpenses.propertyTax || 0,
        homeInsurance: currentExpenses.homeInsurance || 0,
        utilities: currentExpenses.utilities || 0,
        groceries: (currentExpenses.groceries || 0) * 0.90, // 10% reduction
        phoneInternet: currentExpenses.phoneInternet || 0,
        homeMainenance: currentExpenses.homeMaintenance || 0
    };

    // Calculate totals
    const totalEnds = Object.values(retirement.willEnd).reduce((a, b) => a + b, 0);
    const totalIncreases = Object.values(retirement.willIncrease).reduce((a, b) => a + b, 0);
    const totalDecreases = Object.values(retirement.willDecrease).reduce((a, b) => a + b, 0);
    const totalContinues = Object.values(retirement.willContinue).reduce((a, b) => a + b, 0);

    const currentTotal = Object.values(currentExpenses).reduce((a, b) => a + (b || 0), 0);
    const retirementTotal = currentTotal - totalEnds + totalIncreases - totalDecreases;

    return {
        currentAnnual: Math.round(currentTotal),
        retirementAnnual: Math.round(retirementTotal),
        percentageOfCurrent: Math.round((retirementTotal / currentTotal) * 100),
        monthlyRetirement: Math.round(retirementTotal / 12),
        breakdown: retirement,
        summary: {
            expensesThatEnd: Math.round(totalEnds),
            expensesThatIncrease: Math.round(totalIncreases),
            expensesThatDecrease: Math.round(totalDecreases),
            expensesThatContinue: Math.round(totalContinues)
        },
        note: 'Rule of thumb: Plan for 70-80% of current expenses in retirement'
    };
};

// ============================================================
// LIFE INSURANCE NEEDS ASSESSMENT
// ============================================================

/**
 * Estimate life insurance needed using multiple methods
 * 
 * Methods used:
 * 1. DIME Method: Debt + Income + Mortgage + Education
 * 2. Income Multiplier: 10-15× annual income
 * 3. Human Life Value: Present value of future earnings
 * 
 * THUMB RULE:
 * - Life insurance needed: 10-15× annual income
 * - OR: DIME method (Debt + Income + Mortgage + Education)
 * - Term insurance cost: 0.5-1.5% of sum assured annually
 * 
 * @param {Object} userProfile - User profile with income, age, dependents
 * @param {Object} liabilities - Current debts and obligations
 * @returns {Object} Insurance needs assessment
 */
export const estimateInsuranceNeeded = (userProfile, liabilities = {}) => {
    const age = calculateAge(userProfile.date_of_birth);
    const income = userProfile.current_annual_income || 0;
    const dependents = userProfile.dependents || 0;
    const retirementAge = userProfile.expected_retirement_age || 65;

    // Calculate total debt
    const totalDebt = Object.values(liabilities).reduce((sum, liability) => {
        return sum + (liability?.current_balance || 0);
    }, 0);

    // DIME Method: Debt + Income + Mortgage + Education
    const dime = {
        debt: totalDebt,
        income: income * 10, // 10 years of income replacement
        mortgage: liabilities.mortgage?.current_balance || 0,
        education: dependents * 100000 // $100k per child for education
    };
    const dimeTotal = dime.debt + dime.income + dime.mortgage + dime.education;

    // Income Multiplier Method
    // Younger = higher multiplier
    const multiplier = age < 35 ? 15 : (age < 45 ? 12 : (age < 55 ? 10 : 8));
    const incomeMultiplierTotal = income * multiplier;

    // Human Life Value Method
    // Present value of future earnings until retirement
    const yearsToRetirement = Math.max(0, retirementAge - age);
    const netIncome = income * 0.75; // After taxes (approximate)
    const discountRate = 0.03; // 3% discount rate

    // Present value of annuity formula
    let humanLifeValue = 0;
    if (discountRate > 0 && yearsToRetirement > 0) {
        humanLifeValue = netIncome * ((1 - Math.pow(1 + discountRate, -yearsToRetirement)) / discountRate);
    }

    // Determine recommended coverage
    const minimum = Math.min(dimeTotal, incomeMultiplierTotal, humanLifeValue);
    const maximum = Math.max(dimeTotal, incomeMultiplierTotal, humanLifeValue);
    const recommended = (dimeTotal + incomeMultiplierTotal + humanLifeValue) / 3;

    // Estimate annual premium for term insurance
    // Base rate varies by age (rough estimates)
    let premiumRatePerLakh; // per ₹1 lakh sum assured
    if (age < 30) premiumRatePerLakh = 500;
    else if (age < 40) premiumRatePerLakh = 700;
    else if (age < 50) premiumRatePerLakh = 1200;
    else premiumRatePerLakh = 2000;

    const estimatedAnnualPremium = (recommended / 100000) * premiumRatePerLakh;

    return {
        age,
        income,
        dependents,
        yearsToRetirement,

        minimum: Math.round(minimum),
        recommended: Math.round(recommended),
        maximum: Math.round(maximum),

        breakdown: {
            dimeMethod: {
                total: Math.round(dimeTotal),
                components: dime,
                description: 'Debt + Income (10yr) + Mortgage + Education'
            },
            incomeMultiplier: {
                total: Math.round(incomeMultiplierTotal),
                multiplier,
                description: `${multiplier}× annual income (age-based)`
            },
            humanLifeValue: {
                total: Math.round(humanLifeValue),
                yearsToRetirement,
                description: 'Present value of future earnings'
            }
        },

        estimatedAnnualPremium: Math.round(estimatedAnnualPremium),
        estimatedMonthlyPremium: Math.round(estimatedAnnualPremium / 12),

        coverage: {
            current: userProfile.current_life_coverage || 0,
            gap: Math.max(0, Math.round(recommended - (userProfile.current_life_coverage || 0)))
        },

        note: 'These are estimates. Actual premiums depend on health, lifestyle, and policy terms.'
    };
};

// ============================================================
// RISK PROFILE INFERENCE
// ============================================================

/**
 * Calculate emergency fund coverage in months
 * @param {Object} userData - User financial data
 * @returns {number} Months of expenses covered
 */
export const calculateEmergencyFundMonths = (userData) => {
    const liquidAssets = (userData.checking_balance || 0) + (userData.savings_balance || 0);
    const monthlyExpenses = userData.monthly_expenses || userData.avg_monthly_expenses || 0;

    if (monthlyExpenses <= 0) return 0;
    return liquidAssets / monthlyExpenses;
};

/**
 * Calculate savings rate as a decimal (0-1)
 * @param {Object} userData - User financial data
 * @returns {number} Savings rate (0.15 = 15%)
 */
export const calculateSavingsRate = (userData) => {
    const income = userData.monthly_income || userData.avg_monthly_income || 0;
    const expenses = userData.monthly_expenses || userData.avg_monthly_expenses || 0;

    if (income <= 0) return 0;
    return Math.max(0, (income - expenses) / income);
};

/**
 * Calculate debt-to-income ratio as a decimal
 * @param {Object} userData - User financial data
 * @returns {number} Debt-to-income ratio (0.35 = 35%)
 */
export const calculateDebtToIncome = (userData) => {
    const monthlyDebtPayments = userData.monthly_debt_payments || 0;
    const monthlyIncome = userData.monthly_income || userData.avg_monthly_income || 0;

    if (monthlyIncome <= 0) return 0;
    return monthlyDebtPayments / monthlyIncome;
};

/**
 * Get equity percentage of investment portfolio
 * @param {Object} userData - User financial data
 * @returns {number} Equity percentage (0.6 = 60%)
 */
export const getEquityPercentage = (userData) => {
    const totalPortfolio = userData.total_portfolio_value || 0;
    const equityValue = (userData.stock_value || 0) +
        (userData.etf_value || 0) +
        (userData.mutual_fund_value || 0);

    if (totalPortfolio <= 0) return null;
    return equityValue / totalPortfolio;
};

/**
 * Infer risk profile based on user's financial situation
 * 
 * Factors considered:
 * 1. Age & Time Horizon (years to retirement)
 * 2. Emergency Fund Coverage (months of expenses)
 * 3. Savings Rate (% of income saved)
 * 4. Debt Level (debt-to-income ratio)
 * 5. Current Portfolio Allocation (equity %)
 * 
 * THUMB RULE:
 * - Conservative: 20-40% equity
 * - Moderate: 40-60% equity
 * - Moderate-Aggressive: 60-75% equity
 * - Aggressive: 75-90% equity
 * - Age-based rule: (100 - age)% in equity
 * 
 * @param {Object} userData - User profile and financial data
 * @returns {Object} Risk profile assessment
 */
export const inferRiskProfile = (userData) => {
    const scores = [];
    const breakdown = {};

    // 1. Age & Time Horizon (0-10)
    // More years to retirement = can take more risk
    const age = calculateAge(userData.date_of_birth);
    const yearsToRetirement = (userData.expected_retirement_age || 65) - age;
    const timeScore = Math.min(10, Math.max(0, yearsToRetirement / 3));
    scores.push(timeScore);
    breakdown.timeHorizon = {
        score: Math.round(timeScore * 10) / 10,
        age,
        yearsToRetirement,
        description: yearsToRetirement > 20 ? 'Long horizon - can take more risk' :
            yearsToRetirement > 10 ? 'Medium horizon - balanced approach' :
                'Short horizon - preserve capital'
    };

    // 2. Emergency Fund (0-10)
    // More months covered = can take more risk
    const monthsOfExpenses = calculateEmergencyFundMonths(userData);
    const emergencyScore = Math.min(10, monthsOfExpenses * 1.5);
    scores.push(emergencyScore);
    breakdown.emergencyFund = {
        score: Math.round(emergencyScore * 10) / 10,
        months: Math.round(monthsOfExpenses * 10) / 10,
        description: monthsOfExpenses >= 6 ? 'Adequate emergency fund' :
            monthsOfExpenses >= 3 ? 'Minimum coverage - build more' :
                'Insufficient - prioritize building emergency fund'
    };

    // 3. Savings Rate (0-10)
    // Higher savings rate = can take more risk
    const savingsRate = userData.savings_rate || calculateSavingsRate(userData);
    const savingsScore = Math.min(10, savingsRate * 33); // 30% = ~10 points
    scores.push(savingsScore);
    breakdown.savingsRate = {
        score: Math.round(savingsScore * 10) / 10,
        rate: Math.round(savingsRate * 1000) / 10, // Convert to percentage
        description: savingsRate >= 0.20 ? 'Excellent savings rate' :
            savingsRate >= 0.10 ? 'Good savings rate' :
                'Low savings rate - increase if possible'
    };

    // 4. Debt Level (0-10)
    // Lower debt = can take more risk
    const debtToIncome = calculateDebtToIncome(userData);
    const debtScore = Math.max(0, 10 - (debtToIncome * 25)); // 40% DTI = 0 points
    scores.push(debtScore);
    breakdown.debtLevel = {
        score: Math.round(debtScore * 10) / 10,
        debtToIncomePercent: Math.round(debtToIncome * 1000) / 10,
        description: debtToIncome <= 0.20 ? 'Low debt - healthy position' :
            debtToIncome <= 0.35 ? 'Moderate debt - manageable' :
                'High debt - prioritize debt reduction'
    };

    // 5. Current Portfolio Allocation (0-10)
    // Used as indicator of current risk tolerance
    const equityPercent = getEquityPercentage(userData);
    const allocationScore = equityPercent !== null ? equityPercent * 10 : 5; // Default to moderate
    scores.push(allocationScore);
    breakdown.currentAllocation = {
        score: Math.round(allocationScore * 10) / 10,
        equityPercent: equityPercent !== null ? Math.round(equityPercent * 100) : 'Unknown',
        description: equityPercent === null ? 'No portfolio data available' :
            equityPercent >= 0.75 ? 'Aggressive current allocation' :
                equityPercent >= 0.50 ? 'Balanced current allocation' :
                    'Conservative current allocation'
    };

    // Calculate average score
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    // Map to risk category
    let category, recommendedEquity, description;
    if (avgScore < 3) {
        category = 'Conservative';
        recommendedEquity = '20-40%';
        description = 'Focus on capital preservation with minimal equity exposure';
    } else if (avgScore < 5) {
        category = 'Moderate';
        recommendedEquity = '40-60%';
        description = 'Balanced approach between growth and stability';
    } else if (avgScore < 7) {
        category = 'Moderate-Aggressive';
        recommendedEquity = '60-75%';
        description = 'Growth-oriented with significant equity allocation';
    } else {
        category = 'Aggressive';
        recommendedEquity = '75-90%';
        description = 'Maximum growth focus with high equity exposure';
    }

    // Age-based recommendation for comparison
    const ageBasedEquity = Math.max(20, Math.min(90, 100 - age));

    return {
        score: Math.round(avgScore * 10) / 10,
        category,
        recommendedEquity,
        description,

        breakdown,

        ageBasedRule: {
            formula: '100 - age',
            recommendedEquity: `${ageBasedEquity}%`,
            note: 'Traditional rule of thumb - may be too conservative for some'
        },

        recommendations: [
            avgScore < 3 && 'Consider bonds, GICs, and dividend-paying stocks',
            avgScore >= 3 && avgScore < 5 && 'Mix of index funds, balanced funds, and some bonds',
            avgScore >= 5 && avgScore < 7 && 'Diversified equity funds with some fixed income',
            avgScore >= 7 && 'Growth stocks, equity ETFs, with minimal bonds',
            monthsOfExpenses < 3 && 'Priority: Build emergency fund to 3-6 months',
            debtToIncome > 0.35 && 'Priority: Reduce high-interest debt'
        ].filter(Boolean),

        note: 'This is an automated assessment. Consider your personal circumstances and consult a financial advisor.'
    };
};

// ============================================================
// EXPORT SUMMARY
// ============================================================

export default {
    calculateYearsPaid,
    calculateAge,
    estimateSurrenderValue,
    estimateLICBonus,
    calculateEstimatedMaturityValue,
    projectRetirementExpenses,
    estimateInsuranceNeeded,
    calculateEmergencyFundMonths,
    calculateSavingsRate,
    calculateDebtToIncome,
    getEquityPercentage,
    inferRiskProfile,
    LIC_BONUS_RATES
};
