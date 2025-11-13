export const ACCOUNT_TYPES = {
    canada: {
        name: 'Canada',
        types: [
            { value: 'savings', label: 'Savings Account' },
            { value: 'checking', label: 'Checking Account' },
            { value: 'mutual-funds', label: 'Mutual Funds' },
            { value: 'stocks', label: 'Shares & Stocks' },
            { value: 'reits', label: 'REITs' }
        ]
    },
    india: {
        name: 'India',
        types: [
            { value: 'savings', label: 'Savings Account' },
            { value: 'lic', label: 'LIC Investments' },
            { value: 'mutual-funds', label: 'Mutual Funds' },
            { value: 'real-estate', label: 'Real Estate' }
        ]
    }
};

export const CATEGORIES = [
    'Income', 'Housing', 'Transportation', 'Food',
    'Utilities', 'Healthcare', 'Entertainment',
    'Investment', 'Other'
];

export const NAV_ITEMS = [
    { id: 'accounts', label: 'Accounts', icon: 'DollarSign' },
    { id: 'transactions', label: 'Transactions', icon: 'Upload' },
    { id: 'analytics', label: 'Analytics', icon: 'TrendingUp' },
    { id: 'knowledge', label: 'Knowledge', icon: 'BookOpen' },
    { id: 'ai-advisor', label: 'AI Advisor', icon: 'MessageSquare' }
];