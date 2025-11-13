export const calculateTotalBalance = (accounts) => {
    return accounts.reduce((sum, account) => sum + (account.balance || 0), 0);
};

export const calculateCategoryTotals = (transactions) => {
    const totals = {};
    transactions.forEach(txn => {
        const category = txn.category || 'Other';
        totals[category] = (totals[category] || 0) + Math.abs(txn.amount);
    });
    return totals;
};

export const calculateMonthlyTrend = (transactions, months = 6) => {
    const now = new Date();
    const monthlyData = [];

    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleString('en-US', { month: 'short' });

        const monthTransactions = transactions.filter(txn => {
            const txnDate = new Date(txn.date);
            return txnDate.getMonth() === date.getMonth() &&
                txnDate.getFullYear() === date.getFullYear();
        });

        const income = monthTransactions
            .filter(txn => txn.amount > 0)
            .reduce((sum, txn) => sum + txn.amount, 0);

        const expenses = Math.abs(monthTransactions
            .filter(txn => txn.amount < 0)
            .reduce((sum, txn) => sum + txn.amount, 0));

        monthlyData.push({
            month: monthName,
            income,
            expenses,
            net: income - expenses
        });
    }

    return monthlyData;
};

export const calculateGrowthRate = (current, previous) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
};

export const calculateAccountDistribution = (accounts) => {
    const total = calculateTotalBalance(accounts);
    return accounts.map(account => ({
        ...account,
        percentage: total > 0 ? (account.balance / total) * 100 : 0
    }));
};
