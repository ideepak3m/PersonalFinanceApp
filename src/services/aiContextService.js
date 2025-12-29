// AI Context Service - Fetches pre-computed financial context from Supabase views
import { supabase } from './supabaseClient';

/**
 * Fetch all AI context views for the current user
 * These views are pre-computed in the database for efficient AI queries
 */
export const fetchAIContext = async () => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Fetch all context views in parallel
        const [
            masterContext,
            cashFlow,
            netWorth,
            portfolio,
            portfolioGrowth,
            portfolioIncome,
            investmentTransactions,
            securityPerformance,
            holdingsDetail,
            properties,
            liabilities,
            insurance,
            licPolicies,
            retirementByCountry,
            riskProfile,
            usageInstructions,
            canadaBenefits
        ] = await Promise.all([
            supabase.from('ai_master_context').select('*').eq('user_id', user.id).single(),
            supabase.from('ai_cash_flow_analysis').select('*').eq('user_id', user.id),
            supabase.from('ai_net_worth_summary').select('*').eq('user_id', user.id),
            supabase.from('ai_portfolio_analysis').select('*').eq('user_id', user.id),
            supabase.from('ai_portfolio_growth').select('*').eq('user_id', user.id),
            supabase.from('ai_portfolio_income').select('*').eq('user_id', user.id),
            supabase.from('ai_investment_transactions').select('*').eq('user_id', user.id),
            supabase.from('ai_security_performance').select('*').eq('user_id', user.id),
            supabase.from('ai_holdings_detail').select('*').eq('user_id', user.id),
            supabase.from('ai_property_summary').select('*').eq('user_id', user.id),
            supabase.from('ai_liability_summary').select('*').eq('user_id', user.id),
            supabase.from('ai_insurance_summary').select('*').eq('user_id', user.id),
            supabase.from('ai_lic_policy_analysis').select('*').eq('user_id', user.id),
            supabase.from('ai_retirement_by_country').select('*').eq('user_id', user.id),
            supabase.from('ai_risk_profile').select('*').eq('user_id', user.id).single(),
            supabase.from('ai_usage_instructions').select('*'),
            supabase.from('ai_canada_benefits_reference').select('*').eq('year', 2025)
        ]);

        return {
            success: true,
            data: {
                masterContext: masterContext.data,
                cashFlow: cashFlow.data || [],
                netWorth: netWorth.data || [],
                portfolio: portfolio.data || [],
                portfolioGrowth: portfolioGrowth.data || [],
                portfolioIncome: portfolioIncome.data || [],
                investmentTransactions: investmentTransactions.data || [],
                securityPerformance: securityPerformance.data || [],
                holdingsDetail: holdingsDetail.data || [],
                properties: properties.data || [],
                liabilities: liabilities.data || [],
                insurance: insurance.data || [],
                licPolicies: licPolicies.data || [],
                retirementByCountry: retirementByCountry.data || [],
                riskProfile: riskProfile.data,
                usageInstructions: usageInstructions.data || [],
                canadaBenefits: canadaBenefits.data || []
            }
        };
    } catch (error) {
        console.error('Error fetching AI context:', error);
        return {
            success: false,
            error: error.message,
            data: null
        };
    }
};

/**
 * Format currency value for display
 */
const formatCurrency = (amount, currency = 'CAD') => {
    if (amount === null || amount === undefined) return 'N/A';
    const formatter = new Intl.NumberFormat('en-CA', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
    return formatter.format(amount);
};

/**
 * Build the AI system prompt with user's financial context
 */
export const buildSystemPrompt = (context) => {
    if (!context || !context.masterContext) {
        return getBaseSystemPrompt();
    }

    const mc = context.masterContext;
    const instructions = context.usageInstructions?.map(i => `${i.topic}:\n${i.instructions}`).join('\n\n') || '';

    // Build context sections
    const profileSection = mc ? `
## USER PROFILE
- Age: ${mc.age} years old
- Country: ${mc.country}
- Province: ${mc.province || 'N/A'}
- Employment: ${mc.employment_status || 'N/A'}
- Marital Status: ${mc.marital_status || 'N/A'}
- Risk Tolerance: ${mc.risk_tolerance || 'moderate'}
- Expected Retirement Age: ${mc.expected_retirement_age || 65}
- Years to Retirement: ${mc.years_to_retirement || 'N/A'}
- Income Type: ${mc.income_type || 'salaried'} ${mc.business_income_is_variable ? '(VARIABLE - use annual totals)' : ''}
` : '';

    const netWorthSection = context.netWorth?.length > 0 ? `
## NET WORTH BY CURRENCY
${context.netWorth.map(nw => `
### ${nw.currency}
- Bank Accounts: ${formatCurrency(nw.bank_account_total, nw.currency)}
- Investments: ${formatCurrency(nw.investment_portfolio_total, nw.currency)}
- Property Equity: ${formatCurrency(nw.property_equity_total, nw.currency)}
- Insurance Cash Value: ${formatCurrency(nw.insurance_cash_value, nw.currency)}
- Mortgages: ${formatCurrency(nw.mortgage_total, nw.currency)}
- Other Liabilities: ${formatCurrency(nw.other_liabilities_total, nw.currency)}
- **Net Worth: ${formatCurrency(nw.net_worth, nw.currency)}**
`).join('\n')}
` : '';

    const cashFlowSection = context.cashFlow?.length > 0 ? `
## CASH FLOW ANALYSIS
${context.cashFlow.map(cf => `
### ${cf.currency} Cash Flow (Last 12 months)
- Income Type: **${cf.income_type}** ${cf.business_income_is_variable ? '⚠️ VARIABLE INCOME' : ''}
${cf.income_type === 'business_owner' ? `
- Annual Business Income: ${formatCurrency(cf.annual_business_income, cf.currency)} (USE THIS, not monthly avg)
- Annual Salary Income: ${formatCurrency(cf.annual_salary_income, cf.currency)}
` : `
- Monthly Salary: ${formatCurrency(cf.avg_monthly_salary_income, cf.currency)}
`}
- Monthly Personal Income: ${formatCurrency(cf.avg_monthly_personal_income, cf.currency)}
- Monthly Personal Expenses: ${formatCurrency(cf.avg_monthly_personal_expenses, cf.currency)}
- Monthly Surplus: ${formatCurrency(cf.avg_monthly_personal_surplus, cf.currency)}
- Savings Rate: ${cf.savings_rate_percent || 0}%
${cf.annual_rental_income_actual > 0 ? `
### Investment Property Performance
- Rental Income (Annual): ${formatCurrency(cf.annual_rental_income_actual, cf.currency)}
- Investment Mortgage (Annual): ${formatCurrency(cf.annual_mortgage_investment_expected, cf.currency)}
- Net Rental Cash Flow: ${formatCurrency(cf.annual_rental_net_cash_flow, cf.currency)}
` : ''}
${cf.ai_expense_note ? `\n**AI Note:** ${cf.ai_expense_note}` : ''}
`).join('\n')}
` : '';

    const portfolioSection = context.portfolio?.length > 0 ? `
## INVESTMENT PORTFOLIO SUMMARY
${context.portfolio.map(p => `
### ${p.currency} Portfolio (${p.country})
- Total Value: ${formatCurrency(p.total_portfolio_value, p.currency)}
- Unrealized Gain: ${formatCurrency(p.total_unrealized_gain, p.currency)} (${p.overall_return_percent}%)
- Equity Allocation: ${p.equity_allocation_percent}%
- Fixed Income: ${p.fixed_income_allocation_percent}%
- Holdings: ${p.number_of_holdings} across ${p.number_of_accounts} accounts
`).join('\n')}
` : '';

    // Portfolio growth with detailed breakdown
    const portfolioGrowthSection = context.portfolioGrowth?.length > 0 ? `
## PORTFOLIO GROWTH ANALYSIS
${context.portfolioGrowth.map(pg => `
### ${pg.currency} Portfolio Performance
- Book Value (Cost): ${formatCurrency(pg.total_book_value, pg.currency)}
- Market Value: ${formatCurrency(pg.total_market_value, pg.currency)}
- Total Gain/Loss: ${formatCurrency(pg.total_gain_loss, pg.currency)}
- **Overall Return: ${pg.overall_return_percent}%**

#### By Account Type:
${pg.by_account_type ? pg.by_account_type.map(a =>
        `- ${a.account_type}: ${formatCurrency(a.market_value, pg.currency)} (${a.return_percent}% return)`
    ).join('\n') : 'No data'}

${pg.top_gainers && pg.top_gainers.length > 0 ? `
#### Top Gainers:
${pg.top_gainers.slice(0, 5).map(g =>
        `- ${g.symbol} (${g.security_name}): +${formatCurrency(g.gain_loss, pg.currency)} (+${g.return_percent}%)`
    ).join('\n')}` : ''}

${pg.top_losers && pg.top_losers.length > 0 ? `
#### Top Losers:
${pg.top_losers.slice(0, 5).map(l =>
        `- ${l.symbol} (${l.security_name}): ${formatCurrency(l.gain_loss, pg.currency)} (${l.return_percent}%)`
    ).join('\n')}` : ''}
`).join('\n')}
` : '';

    // Individual holdings detail (limited to avoid token overflow)
    const holdingsSection = context.holdingsDetail?.length > 0 ? `
## INDIVIDUAL HOLDINGS (${context.holdingsDetail.length} positions)
${Object.entries(
        context.holdingsDetail.reduce((acc, h) => {
            const key = `${h.currency}_${h.account_type}`;
            if (!acc[key]) acc[key] = { currency: h.currency, accountType: h.account_type, holdings: [] };
            acc[key].holdings.push(h);
            return acc;
        }, {})
    ).map(([key, group]) => `
### ${group.accountType} (${group.currency})
| Symbol | Security | Units | Avg Cost | Price | Value | Gain/Loss | Return |
|--------|----------|-------|----------|-------|-------|-----------|--------|
${group.holdings.slice(0, 20).map(h =>
        `| ${h.symbol} | ${h.security_name?.substring(0, 25) || 'N/A'} | ${h.units?.toFixed(2)} | ${h.avg_cost_per_unit?.toFixed(2)} | ${h.current_price?.toFixed(2)} | ${formatCurrency(h.market_value, h.currency)} | ${formatCurrency(h.gain_loss, h.currency)} | ${h.return_percent}% |`
    ).join('\n')}
${group.holdings.length > 20 ? `\n... and ${group.holdings.length - 20} more holdings` : ''}
`).join('\n')}
` : '';

    // Portfolio income summary
    const portfolioIncomeSection = context.portfolioIncome?.length > 0 ? `
## PORTFOLIO INCOME (Dividends & Interest)
${context.portfolioIncome.map(pi => `
### ${pi.account_type} (${pi.currency} - ${pi.country})
- Annual Dividend Income: ${formatCurrency(pi.annual_dividend_income, pi.currency)}
- Annual Interest Income: ${formatCurrency(pi.annual_interest_income, pi.currency)}
- YTD Dividend Income: ${formatCurrency(pi.ytd_dividend_income, pi.currency)}
- YTD Interest Income: ${formatCurrency(pi.ytd_interest_income, pi.currency)}
- Lifetime Dividends: ${formatCurrency(pi.lifetime_dividend_income, pi.currency)}
- Lifetime Interest: ${formatCurrency(pi.lifetime_interest_income, pi.currency)}
- Income-Generating Holdings: ${pi.income_generating_holdings}
`).join('\n')}
` : '';

    // Investment transactions summary by security
    const investmentTransactionsSection = context.investmentTransactions?.length > 0 ? `
## INVESTMENT TRANSACTION HISTORY
${Object.entries(
        context.investmentTransactions.reduce((acc, it) => {
            if (!acc[it.currency]) acc[it.currency] = [];
            acc[it.currency].push(it);
            return acc;
        }, {})
    ).map(([currency, transactions]) => `
### ${currency} Transaction Summary
| Symbol | Security | Buys | Sells | Dividends | Total Bought | Total Sold | Total Dividends | Net Invested | Months |
|--------|----------|------|-------|-----------|--------------|------------|-----------------|--------------|--------|
${transactions.slice(0, 30).map(t =>
        `| ${t.symbol || 'N/A'} | ${t.security_name?.substring(0, 15) || 'N/A'} | ${t.buy_count} | ${t.sell_count} | ${t.dividend_count} | ${formatCurrency(t.total_bought, currency)} | ${formatCurrency(t.total_sold, currency)} | ${formatCurrency(t.total_dividends, currency)} | ${formatCurrency(t.net_invested, currency)} | ${t.holding_months || 0} |`
    ).join('\n')}
${transactions.length > 30 ? `\n... and ${transactions.length - 30} more securities` : ''}
`).join('\n')}
` : '';

    // Security-level performance with transaction history
    const securityPerformanceSection = context.securityPerformance?.length > 0 ? `
## SECURITY PERFORMANCE (Transaction-Based Returns)
${Object.entries(
        context.securityPerformance.reduce((acc, sp) => {
            if (!acc[sp.currency]) acc[sp.currency] = [];
            acc[sp.currency].push(sp);
            return acc;
        }, {})
    ).map(([currency, securities]) => `
### ${currency} Securities
| Symbol | Security | Cost | Current | Dividends | Unrealized | Total Return | Annualized | Months Held |
|--------|----------|------|---------|-----------|------------|--------------|------------|-------------|
${securities.slice(0, 25).map(s =>
        `| ${s.symbol} | ${s.security_name?.substring(0, 20) || 'N/A'} | ${formatCurrency(s.total_cost, currency)} | ${formatCurrency(s.current_value, currency)} | ${formatCurrency(s.total_dividends, currency)} | ${formatCurrency(s.unrealized_gain, currency)} | ${s.total_return_percent}% | ${s.annualized_return_percent || 'N/A'}% | ${s.holding_months || 0} |`
    ).join('\n')}
${securities.length > 25 ? `\n... and ${securities.length - 25} more securities` : ''}
`).join('\n')}
` : '';

    const propertySection = context.properties?.length > 0 ? `
## REAL ESTATE
${context.properties.map(p => `
### ${p.currency} Properties
- Total Properties: ${p.total_properties} (${p.primary_residences} primary, ${p.investment_properties} investment)
- Total Value: ${formatCurrency(p.total_property_value, p.currency)}
- Total Equity: ${formatCurrency(p.total_equity, p.currency)}
- Annual Rental Income: ${formatCurrency(p.annual_rental_income, p.currency)}
- Annual Mortgage Payments: ${formatCurrency(p.annual_mortgage_payments, p.currency)}
`).join('\n')}
` : '';

    const insuranceSection = context.insurance?.length > 0 ? `
## INSURANCE COVERAGE
${context.insurance.map(ins => `
### ${ins.currency} (${ins.country})
- Life Coverage: ${formatCurrency(ins.total_life_coverage, ins.currency)}
- Annual Premiums: ${formatCurrency(ins.annual_premium_cost, ins.currency)}
- Survival Benefits Expected: ${formatCurrency(ins.total_survival_benefit_expected, ins.currency)}
- Policies with Extended Cover: ${ins.policies_with_extended_cover || 0}
`).join('\n')}
` : '';

    const licSection = context.licPolicies?.length > 0 ? `
## INDIAN LIC POLICIES (Detailed)
${context.licPolicies.map(p => `
### ${p.plan_name} (${p.policy_number})
- Type: ${p.plan_type}
- Sum Assured: ${formatCurrency(p.sum_assured, p.currency)}
- Survival Benefit Date: ${p.survival_benefit_date || 'N/A'}
- Survival Benefit Expected: ${formatCurrency(p.survival_benefit_expected, p.currency)}
- Years to Payout: ${p.years_to_survival_benefit || 'N/A'}
- Extended Life Cover: ${p.has_extended_life_cover ? `Yes (until age ${p.life_cover_end_age})` : 'No'}
- Annual Premium: ${formatCurrency(p.annual_premium, p.currency)}
- Premiums Remaining: ${p.years_premiums_remaining || 0} years
- **AI Summary:** ${p.ai_policy_summary}
`).join('\n')}
` : '';

    const retirementSection = context.retirementByCountry?.length > 0 ? `
## RETIREMENT ASSETS BY COUNTRY
${context.retirementByCountry.map(r => `
### ${r.country} (${r.currency})
- Investment Portfolio: ${formatCurrency(r.investment_portfolio, r.currency)}
- Cash & Savings: ${formatCurrency(r.cash_and_savings, r.currency)}
- Real Estate Equity: ${formatCurrency(r.real_estate_equity, r.currency)}
- Insurance Values: ${formatCurrency(r.insurance_maturity_value, r.currency)}
- **Total Liquid: ${formatCurrency(r.total_liquid_assets, r.currency)}**
- **Total Net Assets: ${formatCurrency(r.total_net_assets, r.currency)}**
`).join('\n')}
` : '';

    const riskSection = context.riskProfile ? `
## RISK INDICATORS
- Emergency Fund: ${context.riskProfile.emergency_fund_months || 'N/A'} months of expenses
- Debt-to-Income: ${context.riskProfile.debt_to_income_percent || 0}%
- RRSP Room: ${formatCurrency(context.riskProfile.rrsp_contribution_room, 'CAD')}
- TFSA Room: ${formatCurrency(context.riskProfile.tfsa_contribution_room, 'CAD')}
` : '';

    const canadaBenefitsSection = context.canadaBenefits?.length > 0 ? `
## CANADIAN RETIREMENT BENEFITS REFERENCE (2025)
${context.canadaBenefits.map(b => `- ${b.benefit_name}: ${b.notes}`).join('\n')}
` : '';

    return `${getBaseSystemPrompt()}

=== USER'S FINANCIAL DATA ===
${profileSection}
${netWorthSection}
${cashFlowSection}
${portfolioSection}
${portfolioGrowthSection}
${portfolioIncomeSection}
${investmentTransactionsSection}
${securityPerformanceSection}
${holdingsSection}
${propertySection}
${insuranceSection}
${licSection}
${retirementSection}
${riskSection}
${canadaBenefitsSection}

=== IMPORTANT INSTRUCTIONS ===
${instructions}

Remember: 
- NEVER combine different currencies
- For business owners, use ANNUAL totals not monthly averages
- Separate personal cash flow from investment property cash flow
- For LIC policies, survival_benefit_date is when user gets cash (not age 100)
- Always cite specific numbers from the user's data when answering
- When discussing investment performance, reference the return_percent for each holding
- The holdings data includes book value (cost basis), market value, and gain/loss for each position
- Use investment transaction history to calculate actual returns and growth rates
`;
};

/**
 * Base system prompt without user context
 */
const getBaseSystemPrompt = () => `You are a personal financial advisor AI for a comprehensive personal finance application. You have access to the user's complete financial picture including:

- Bank accounts and balances
- Investment portfolios (stocks, ETFs, mutual funds, bonds)
- Real estate properties and mortgages
- Insurance policies (including Indian LIC policies)
- Liabilities and debts
- Income and expense analysis
- Retirement planning data

YOUR SCOPE:
✅ Investment suitability based on user's risk tolerance and data
✅ "Can I afford X?" questions using their actual cash flow
✅ Retirement income projections using their assets
✅ Analysis of their specific financial situation
✅ Canadian retirement benefits (CPP, OAS) knowledge
✅ Indian LIC insurance policy analysis

❌ DO NOT provide general market advice or specific stock picks
❌ DO NOT recommend specific mutual funds or ETFs by name
❌ DO NOT provide tax advice (recommend a tax professional)

FORMATTING GUIDELINES:
- Use markdown for formatting (bold, lists, headers)
- Format currency values clearly with symbols
- When showing numbers, always include the currency
- Be concise but thorough
- Cite specific data from their profile when relevant

MULTI-COUNTRY AWARENESS:
The user may have assets in multiple countries (Canada, India, etc.). 
- NEVER add CAD + INR + USD together - keep currencies separate
- When discussing retirement, ask where they plan to retire
- Consider tax implications of different jurisdictions (but recommend professional advice)

BUSINESS OWNER HANDLING:
If income_type is "business_owner":
- Their income is from owner draws (variable)
- DO NOT use monthly averages - they're misleading
- Use ANNUAL totals divided by 12 for fair comparison
- Some months may show $0 income with large draws in others - this is normal

INDIAN LIC INSURANCE POLICIES:
LIC policies (Jeevan Anand, Money Back) work differently:
- Survival benefit = cash payout at end of premium term
- Extended life cover may continue AFTER the payout until age 99/100
- Use survival_benefit_date for retirement planning (when they get cash)
- sum_assured is death benefit (protection, not retirement income)
`;

export default { fetchAIContext, buildSystemPrompt };
