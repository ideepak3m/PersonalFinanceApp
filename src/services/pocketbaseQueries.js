/**
 * PocketBase Query Utilities
 * Replaces Supabase views with JavaScript query functions
 * These provide the same aggregate/computed data as the original views
 */

/**
 * Monthly Cash Flow - equivalent to monthly_cash_flow view
 * @param {PocketBase} pb - PocketBase instance
 * @param {string} userId - User ID to filter by
 * @returns {Promise<Array>} Monthly cash flow data
 */
export async function getMonthlyCashFlow(pb, userId) {
    const transactions = await pb.collection('transactions').getFullList({
        filter: userId ? `user_id = "${userId}"` : '',
    });

    const monthlyData = {};

    for (const t of transactions) {
        if (!t.date) continue;
        const month = t.date.substring(0, 7); // YYYY-MM

        if (!monthlyData[month]) {
            monthlyData[month] = {
                month: `${month}-01`,
                total_income: 0,
                total_expenses: 0,
                net_savings: 0,
                total_transactions: 0,
                income_count: 0,
                expense_count: 0,
            };
        }

        const isIncome = t.type === 'income' || (t.type === null && t.amount > 0);
        const isExpense = t.type === 'expense' || (t.type === null && t.amount < 0);

        if (isIncome) {
            monthlyData[month].total_income += Math.abs(t.amount);
            monthlyData[month].income_count++;
        } else if (isExpense) {
            monthlyData[month].total_expenses += Math.abs(t.amount);
            monthlyData[month].expense_count++;
        }

        monthlyData[month].total_transactions++;
    }

    // Calculate net savings
    for (const month of Object.keys(monthlyData)) {
        monthlyData[month].net_savings =
            monthlyData[month].total_income - monthlyData[month].total_expenses;
    }

    return Object.values(monthlyData).sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * Annual Cash Flow - equivalent to annual_cash_flow view
 * @param {PocketBase} pb - PocketBase instance
 * @param {string} userId - User ID to filter by
 * @returns {Promise<Array>} Annual cash flow data
 */
export async function getAnnualCashFlow(pb, userId) {
    const monthly = await getMonthlyCashFlow(pb, userId);

    const yearlyData = {};

    for (const m of monthly) {
        const year = m.month.substring(0, 4);

        if (!yearlyData[year]) {
            yearlyData[year] = {
                year: parseInt(year),
                annual_income: 0,
                annual_expenses: 0,
                annual_savings: 0,
                months: 0,
            };
        }

        yearlyData[year].annual_income += m.total_income;
        yearlyData[year].annual_expenses += m.total_expenses;
        yearlyData[year].annual_savings += m.net_savings;
        yearlyData[year].months++;
    }

    // Calculate averages and savings rate
    for (const year of Object.keys(yearlyData)) {
        const y = yearlyData[year];
        y.annual_savings_rate = y.annual_income > 0
            ? Math.round((y.annual_savings / y.annual_income) * 10000) / 100
            : 0;
        y.avg_monthly_income = y.annual_income / y.months;
        y.avg_monthly_expenses = y.annual_expenses / y.months;
    }

    return Object.values(yearlyData).sort((a, b) => b.year - a.year);
}

/**
 * Investment Net Worth - equivalent to investment_net_worth view
 * @param {PocketBase} pb - PocketBase instance
 * @param {string} userId - User ID to filter by
 * @returns {Promise<Object>} Net worth summary
 */
export async function getInvestmentNetWorth(pb, userId) {
    const holdings = await pb.collection('holdings').getFullList({
        filter: userId ? `user_id = "${userId}"` : '',
    });

    const accountIds = new Set();
    let total_market_value = 0;
    let total_book_cost = 0;
    let total_unrealized_gain = 0;

    for (const h of holdings) {
        total_market_value += h.market_value || 0;
        total_book_cost += h.book_value || 0;
        total_unrealized_gain += h.gain_loss || 0;
        if (h.account_id) accountIds.add(h.account_id);
    }

    return {
        user_id: userId,
        total_market_value,
        total_book_cost,
        total_unrealized_gain,
        num_accounts: accountIds.size,
        num_positions: holdings.length,
    };
}

/**
 * Portfolio by Account Type - equivalent to portfolio_by_account_type view
 * @param {PocketBase} pb - PocketBase instance
 * @param {string} userId - User ID to filter by
 * @returns {Promise<Array>} Portfolio breakdown by account type
 */
export async function getPortfolioByAccountType(pb, userId) {
    const holdings = await pb.collection('holdings').getFullList({
        filter: userId ? `user_id = "${userId}"` : '',
    });

    const byType = {};

    for (const h of holdings) {
        const type = h.account_type || 'Unknown';

        if (!byType[type]) {
            byType[type] = {
                account_type: type,
                account_ids: new Set(),
                num_holdings: 0,
                total_value: 0,
                total_cost: 0,
                total_gain_loss: 0,
            };
        }

        byType[type].num_holdings++;
        byType[type].total_value += h.market_value || 0;
        byType[type].total_cost += h.book_value || 0;
        byType[type].total_gain_loss += h.gain_loss || 0;
        if (h.account_id) byType[type].account_ids.add(h.account_id);
    }

    return Object.values(byType).map(t => ({
        ...t,
        num_accounts: t.account_ids.size,
        overall_return_pct: t.total_cost > 0
            ? ((t.total_value - t.total_cost) / t.total_cost) * 100
            : 0,
    }));
}

/**
 * Portfolio by Asset Class - equivalent to portfolio_by_asset_class view
 * @param {PocketBase} pb - PocketBase instance
 * @param {string} userId - User ID to filter by
 * @returns {Promise<Array>} Portfolio breakdown by asset class
 */
export async function getPortfolioByAssetClass(pb, userId) {
    const holdings = await pb.collection('holdings').getFullList({
        filter: userId ? `user_id = "${userId}"` : '',
    });

    const byClass = {};
    let totalValue = 0;

    for (const h of holdings) {
        const assetClass = h.category || 'unclassified';
        totalValue += h.market_value || 0;

        if (!byClass[assetClass]) {
            byClass[assetClass] = {
                asset_class: assetClass,
                num_holdings: 0,
                total_value: 0,
            };
        }

        byClass[assetClass].num_holdings++;
        byClass[assetClass].total_value += h.market_value || 0;
    }

    return Object.values(byClass).map(c => ({
        ...c,
        allocation_pct: totalValue > 0
            ? Math.round((c.total_value / totalValue) * 10000) / 100
            : 0,
    }));
}

/**
 * Portfolio by Geography - equivalent to portfolio_by_geography view
 * @param {PocketBase} pb - PocketBase instance
 * @param {string} userId - User ID to filter by
 * @returns {Promise<Array>} Portfolio breakdown by geography
 */
export async function getPortfolioByGeography(pb, userId) {
    const holdings = await pb.collection('holdings').getFullList({
        filter: userId ? `user_id = "${userId}"` : '',
    });

    const byGeo = {};
    let totalValue = 0;

    for (const h of holdings) {
        const geo = h.geography || 'unclassified';
        totalValue += h.market_value || 0;

        if (!byGeo[geo]) {
            byGeo[geo] = {
                geography: geo,
                total_value: 0,
            };
        }

        byGeo[geo].total_value += h.market_value || 0;
    }

    return Object.values(byGeo).map(g => ({
        ...g,
        allocation_pct: totalValue > 0
            ? Math.round((g.total_value / totalValue) * 10000) / 100
            : 0,
    }));
}

/**
 * Portfolio Growth - equivalent to portfolio_growth view
 * @param {PocketBase} pb - PocketBase instance
 * @param {string} userId - User ID to filter by
 * @returns {Promise<Array>} Portfolio growth over time
 */
export async function getPortfolioGrowth(pb, userId) {
    const snapshots = await pb.collection('holding_snapshots').getFullList({
        filter: userId ? `user_id = "${userId}"` : '',
        sort: 'snapshot_date',
    });

    const byDate = {};

    for (const s of snapshots) {
        const date = s.snapshot_date;

        if (!byDate[date]) {
            byDate[date] = {
                snapshot_date: date,
                total_value: 0,
                total_cost: 0,
                total_gain_loss: 0,
                num_positions: 0,
            };
        }

        byDate[date].total_value += s.market_value || 0;
        byDate[date].total_cost += s.book_cost || 0;
        byDate[date].total_gain_loss += s.unrealized_gain_loss || 0;
        byDate[date].num_positions++;
    }

    return Object.values(byDate);
}

/**
 * Expense by Category - equivalent to expense_by_category view
 * @param {PocketBase} pb - PocketBase instance
 * @param {string} userId - User ID to filter by
 * @returns {Promise<Array>} Expenses grouped by category
 */
export async function getExpenseByCategory(pb, userId) {
    const transactions = await pb.collection('transactions').getFullList({
        filter: userId
            ? `user_id = "${userId}" && (type = "expense" || amount < 0)`
            : '(type = "expense" || amount < 0)',
    });

    // Get categories
    const categories = await pb.collection('category').getFullList();
    const categoryMap = {};
    for (const c of categories) {
        categoryMap[c.id] = c.name;
    }

    const byMonth = {};

    for (const t of transactions) {
        if (!t.date) continue;
        const month = t.date.substring(0, 7);
        const category = categoryMap[t.category_id] || 'Uncategorized';
        const key = `${month}_${category}`;

        if (!byMonth[key]) {
            byMonth[key] = {
                month: `${month}-01`,
                category,
                total_amount: 0,
                transaction_count: 0,
            };
        }

        byMonth[key].total_amount += Math.abs(t.amount);
        byMonth[key].transaction_count++;
    }

    return Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * Savings Rate Trend - equivalent to savings_rate_trend view
 * @param {PocketBase} pb - PocketBase instance
 * @param {string} userId - User ID to filter by
 * @returns {Promise<Array>} Savings rate over time
 */
export async function getSavingsRateTrend(pb, userId) {
    const monthly = await getMonthlyCashFlow(pb, userId);

    return monthly.map(m => ({
        ...m,
        savings_rate_percent: m.total_income > 0
            ? Math.round((m.net_savings / m.total_income) * 10000) / 100
            : 0,
    }));
}

/**
 * Search merchant by name or alias - equivalent to search_merchant_by_name_or_alias function
 * @param {PocketBase} pb - PocketBase instance
 * @param {string} searchTerm - Term to search for
 * @returns {Promise<Object|null>} Matching merchant or null
 */
export async function searchMerchantByNameOrAlias(pb, searchTerm) {
    const searchLower = searchTerm.toLowerCase();

    // First try exact match on normalized_name
    try {
        const merchants = await pb.collection('merchant').getFullList({
            filter: `normalized_name ~ "${searchTerm}"`,
        });

        for (const m of merchants) {
            if (m.normalized_name.toLowerCase() === searchLower) {
                return m;
            }
            // Check aliases
            if (m.aliases && Array.isArray(m.aliases)) {
                for (const alias of m.aliases) {
                    if (alias.toLowerCase() === searchLower) {
                        return m;
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error searching merchant:', e);
    }

    return null;
}

/**
 * Income by Source - equivalent to income_by_source view
 * @param {PocketBase} pb - PocketBase instance
 * @param {string} userId - User ID to filter by
 * @returns {Promise<Array>} Income grouped by source/category
 */
export async function getIncomeBySource(pb, userId) {
    const transactions = await pb.collection('transactions').getFullList({
        filter: userId
            ? `user_id = "${userId}" && (type = "income" || amount > 0)`
            : '(type = "income" || amount > 0)',
    });

    // Get categories
    const categories = await pb.collection('category').getFullList();
    const categoryMap = {};
    for (const c of categories) {
        categoryMap[c.id] = c.name;
    }

    const byMonth = {};

    for (const t of transactions) {
        if (!t.date) continue;
        const month = t.date.substring(0, 7);
        const source = categoryMap[t.category_id] || 'Other Income';
        const key = `${month}_${source}`;

        if (!byMonth[key]) {
            byMonth[key] = {
                month: `${month}-01`,
                source,
                total_amount: 0,
                transaction_count: 0,
            };
        }

        byMonth[key].total_amount += Math.abs(t.amount);
        byMonth[key].transaction_count++;
    }

    return Object.values(byMonth).sort((a, b) => b.month.localeCompare(a.month));
}

/**
 * Retirement Summary - equivalent to retirement_summary view
 * Joins user_profile with government_benefits
 * @param {PocketBase} pb - PocketBase instance
 * @param {string} userId - User ID to filter by
 * @returns {Promise<Object|null>} Retirement summary data
 */
export async function getRetirementSummary(pb, userId) {
    try {
        // Get user profile
        const profiles = await pb.collection('user_profile').getFullList({
            filter: userId ? `user_id = "${userId}"` : '',
        });

        if (profiles.length === 0) return null;
        const up = profiles[0];

        // Get government benefits
        const benefits = await pb.collection('government_benefits').getFullList({
            filter: userId ? `user_id = "${userId}"` : '',
        });
        const gb = benefits.length > 0 ? benefits[0] : {};

        // Calculate current age
        const dob = up.date_of_birth ? new Date(up.date_of_birth) : null;
        const currentAge = dob
            ? Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000))
            : null;

        const yearsToRetirement = up.expected_retirement_age && currentAge
            ? up.expected_retirement_age - currentAge
            : null;

        const totalMonthlyBenefits =
            (gb.cpp_at_65 || 0) +
            (gb.oas_estimated_monthly || 0) +
            (gb.pension_estimated_monthly || 0);

        return {
            user_id: userId,
            date_of_birth: up.date_of_birth,
            current_age: currentAge,
            expected_retirement_age: up.expected_retirement_age,
            years_to_retirement: yearsToRetirement,
            current_annual_income: up.current_annual_income,
            desired_retirement_income: up.desired_retirement_income,
            risk_tolerance: up.risk_tolerance,
            rrsp_contribution_room: up.rrsp_contribution_room,
            tfsa_contribution_room: up.tfsa_contribution_room,
            cpp_at_65: gb.cpp_at_65,
            cpp_planned_start_age: gb.cpp_planned_start_age,
            oas_estimated_monthly: gb.oas_estimated_monthly,
            oas_planned_start_age: gb.oas_planned_start_age,
            has_employer_pension: gb.has_employer_pension,
            pension_estimated_monthly: gb.pension_estimated_monthly,
            total_monthly_benefits_at_65: totalMonthlyBenefits,
            total_annual_benefits_at_65: totalMonthlyBenefits * 12,
        };
    } catch (e) {
        console.error('Error getting retirement summary:', e);
        return null;
    }
}

/**
 * Purge old import raw data - equivalent to purge_old_import_raw_data function
 * @param {PocketBase} pb - PocketBase instance
 * @param {number} daysOld - Delete records older than this many days (default 30)
 * @returns {Promise<number>} Number of deleted records
 */
export async function purgeOldImportRawData(pb, daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffStr = cutoffDate.toISOString();

    // Get staging records that are imported and old
    const stagingRecords = await pb.collection('import_staging').getFullList({
        filter: `status = "imported" && imported_at < "${cutoffStr}"`,
    });

    const stagingIds = stagingRecords.map(s => s.id);
    if (stagingIds.length === 0) return 0;

    // Delete raw data for those staging records
    let deletedCount = 0;
    for (const stagingId of stagingIds) {
        const rawRecords = await pb.collection('import_raw_data').getFullList({
            filter: `staging_id = "${stagingId}"`,
        });

        for (const r of rawRecords) {
            try {
                await pb.collection('import_raw_data').delete(r.id);
                deletedCount++;
            } catch (e) {
                console.error(`Failed to delete raw data ${r.id}:`, e.message);
            }
        }
    }

    return deletedCount;
}

/**
 * Purge imported staging records - equivalent to purge_imported_staging function
 * @param {PocketBase} pb - PocketBase instance
 * @param {number} daysOld - Delete records older than this many days (default 90)
 * @returns {Promise<number>} Number of deleted records
 */
export async function purgeImportedStaging(pb, daysOld = 90) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffStr = cutoffDate.toISOString();

    const records = await pb.collection('import_staging').getFullList({
        filter: `status = "imported" && imported_at < "${cutoffStr}"`,
    });

    let deletedCount = 0;
    for (const r of records) {
        try {
            await pb.collection('import_staging').delete(r.id);
            deletedCount++;
        } catch (e) {
            console.error(`Failed to delete staging ${r.id}:`, e.message);
        }
    }

    return deletedCount;
}

export default {
    getMonthlyCashFlow,
    getAnnualCashFlow,
    getInvestmentNetWorth,
    getPortfolioByAccountType,
    getPortfolioByAssetClass,
    getPortfolioByGeography,
    getPortfolioGrowth,
    getExpenseByCategory,
    getSavingsRateTrend,
    searchMerchantByNameOrAlias,
    getIncomeBySource,
    getRetirementSummary,
    purgeOldImportRawData,
    purgeImportedStaging,
};
