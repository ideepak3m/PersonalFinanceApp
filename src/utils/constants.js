// src/utils/constants.js

export const PROVIDER_TYPES = {
    BANK: 'bank',
    BROKERAGE: 'brokerage',
    INSURANCE: 'insurance',
    CREDIT_UNION: 'credit_union',
    ROBO_ADVISOR: 'robo_advisor'
};

export const ACCOUNT_CATEGORIES = {
    // Tax-Advantaged/Retirement Accounts
    RRSP: 'rrsp',                    // Registered Retirement Savings Plan (Canada)
    TFSA: 'tfsa',                    // Tax-Free Savings Account (Canada)
    RESP: 'resp',                    // Registered Education Savings Plan (Canada)
    FHSA: 'fhsa',                    // First Home Savings Account (Canada)
    LIRA: 'lira',                    // Locked-In Retirement Account (Canada)
    PPF: 'ppf',                      // Public Provident Fund (India)
    NPS: 'nps',                      // National Pension System (India)
    EPF: 'epf',                      // Employee Provident Fund (India)
    RETIREMENT: 'retirement',        // Generic retirement account

    // Standard Banking
    CHECKING: 'checking',            // Checking/Current account
    SAVINGS: 'savings',              // Savings account

    // Insurance
    INSURANCE: 'insurance',          // Insurance wrapper account

    // Investment Accounts
    BROKERAGE: 'brokerage',          // Standard investment/brokerage account
    NON_REGISTERED: 'non_registered', // Taxable investment account
    MARGIN: 'margin',                // Margin trading account

    // Special Purpose
    EDUCATION: 'education',          // Education savings
    HEALTH_SAVINGS: 'health_savings', // Health Savings Account
    TRUST: 'trust',                  // Trust account
    GENERAL: 'general',               // General purpose account

    //Credit cards
    CREDIT_CARD: 'credit_card'
};

export const PRODUCT_TYPES = {
    // Cash & Bank Deposits
    CASH: 'cash',
    SAVINGS_DEPOSIT: 'savings_deposit',
    FIXED_DEPOSIT: 'fixed_deposit',     // India
    GIC: 'gic',                         // Guaranteed Investment Certificate (Canada)
    TERM_DEPOSIT: 'term_deposit',       // Generic term deposit

    // Equities (Stocks & Shares)
    STOCK: 'stock',                     // Individual stocks/shares
    ETF: 'etf',                         // Exchange Traded Fund

    // Fixed Income
    BOND: 'bond',                       // Corporate/Government bonds
    TREASURY: 'treasury',               // Treasury bills/bonds
    DEBENTURE: 'debenture',            // India

    // Mutual Funds & Index Funds
    MUTUAL_FUND: 'mutual_fund',        // Actively managed mutual funds
    INDEX_FUND: 'index_fund',          // Index tracking funds
    EQUITY_FUND: 'equity_fund',        // Equity mutual funds
    DEBT_FUND: 'debt_fund',            // Debt mutual funds
    HYBRID_FUND: 'hybrid_fund',        // Balanced funds

    // Real Estate
    REIT: 'reit',                      // Real Estate Investment Trust
    REAL_ESTATE: 'real_estate',        // Direct property

    // Insurance Products (Universal - applicable to LIC, Sun Life, etc.)
    TERM_INSURANCE: 'term_insurance',           // Pure term life insurance
    WHOLE_LIFE: 'whole_life',                   // Whole life insurance
    ENDOWMENT: 'endowment',                     // Endowment policy (India - LIC Jeevan Anand, etc.)
    MONEY_BACK: 'money_back',                   // Money back policy (India)
    ULIP: 'ulip',                               // Unit Linked Insurance Plan (India)
    CHILD_PLAN: 'child_plan',                   // Child insurance plans
    PENSION_PLAN: 'pension_plan',               // Pension/annuity plans
    CRITICAL_ILLNESS: 'critical_illness',       // Critical illness insurance
    DISABILITY_INSURANCE: 'disability_insurance', // Disability coverage
    HEALTH_INSURANCE: 'health_insurance',       // Medical/health insurance

    // Other Investments
    CRYPTOCURRENCY: 'cryptocurrency',   // Bitcoin, Ethereum, etc.
    COMMODITY: 'commodity',             // Gold, Silver, etc.
    PRECIOUS_METALS: 'precious_metals', // Physical gold, silver
    ALTERNATIVE: 'alternative',         // Alternative investments
    PRIVATE_EQUITY: 'private_equity',   // Private equity
    HEDGE_FUND: 'hedge_fund'           // Hedge funds
};

export const TRANSACTION_TYPES = {
    DEPOSIT: 'deposit',
    WITHDRAWAL: 'withdrawal',
    BUY: 'buy',
    SELL: 'sell',
    DIVIDEND: 'dividend',
    INTEREST: 'interest',
    FEE: 'fee',
    PREMIUM: 'premium',              // Insurance premium payment
    CLAIM: 'claim',                  // Insurance claim received
    CONTRIBUTION: 'contribution',    // RRSP/TFSA contribution
    TRANSFER_IN: 'transfer_in',
    TRANSFER_OUT: 'transfer_out'
};

// Organized groupings for UI display
export const ACCOUNT_CATEGORY_GROUPS = {
    'Retirement Accounts': [
        { value: 'rrsp', label: 'RRSP (Canada)', country: 'canada' },
        { value: 'lira', label: 'LIRA (Canada)', country: 'canada' },
        { value: 'ppf', label: 'PPF (India)', country: 'india' },
        { value: 'nps', label: 'NPS (India)', country: 'india' },
        { value: 'epf', label: 'EPF (India)', country: 'india' },
        { value: 'retirement', label: 'Retirement Account (Generic)', country: 'all' }
    ],
    'Tax-Advantaged Accounts': [
        { value: 'tfsa', label: 'TFSA (Canada)', country: 'canada' },
        { value: 'fhsa', label: 'FHSA (Canada)', country: 'canada' },
        { value: 'resp', label: 'RESP (Canada)', country: 'canada' }
    ],
    'Banking Accounts': [
        { value: 'checking', label: 'Checking/Current Account', country: 'all' },
        { value: 'savings', label: 'Savings Account', country: 'all' }
    ],
    'Investment Accounts': [
        { value: 'brokerage', label: 'Brokerage Account', country: 'all' },
        { value: 'non_registered', label: 'Non-Registered/Taxable', country: 'all' },
        { value: 'margin', label: 'Margin Account', country: 'all' }
    ],
    'Insurance Accounts': [
        { value: 'insurance', label: 'Insurance Account', country: 'all' }
    ],
    'Special Purpose': [
        { value: 'education', label: 'Education Savings', country: 'all' },
        { value: 'health_savings', label: 'Health Savings Account', country: 'all' },
        { value: 'trust', label: 'Trust Account', country: 'all' },
        { value: 'general', label: 'General Account', country: 'all' }
    ],
    'Credit Cards': [
        { value: 'credit_card', label: 'Credit Card', country: 'all' }
    ]
};

export const PRODUCT_TYPE_GROUPS = {
    'Cash & Deposits': [
        { value: 'cash', label: 'Cash' },
        { value: 'savings_deposit', label: 'Savings Deposit' },
        { value: 'fixed_deposit', label: 'Fixed Deposit (FD)' },
        { value: 'gic', label: 'GIC (Canada)' },
        { value: 'term_deposit', label: 'Term Deposit' }
    ],
    'Stocks & Shares': [
        { value: 'stock', label: 'Individual Stock/Share' },
        { value: 'etf', label: 'ETF' }
    ],
    'Mutual Funds': [
        { value: 'mutual_fund', label: 'Mutual Fund' },
        { value: 'index_fund', label: 'Index Fund' },
        { value: 'equity_fund', label: 'Equity Fund' },
        { value: 'debt_fund', label: 'Debt Fund' },
        { value: 'hybrid_fund', label: 'Balanced/Hybrid Fund' }
    ],
    'Fixed Income': [
        { value: 'bond', label: 'Bond' },
        { value: 'treasury', label: 'Treasury' },
        { value: 'debenture', label: 'Debenture' }
    ],
    'Real Estate': [
        { value: 'reit', label: 'REIT' },
        { value: 'real_estate', label: 'Real Estate Property' }
    ],
    'Life Insurance': [
        { value: 'term_insurance', label: 'Term Life Insurance' },
        { value: 'whole_life', label: 'Whole Life Insurance' },
        { value: 'endowment', label: 'Endowment Policy' },
        { value: 'money_back', label: 'Money Back Policy' },
        { value: 'ulip', label: 'ULIP' },
        { value: 'child_plan', label: 'Child Plan' },
        { value: 'pension_plan', label: 'Pension/Annuity Plan' }
    ],
    'Health & Protection Insurance': [
        { value: 'health_insurance', label: 'Health/Medical Insurance' },
        { value: 'critical_illness', label: 'Critical Illness Insurance' },
        { value: 'disability_insurance', label: 'Disability Insurance' }
    ],
    'Alternative Investments': [
        { value: 'cryptocurrency', label: 'Cryptocurrency' },
        { value: 'commodity', label: 'Commodity' },
        { value: 'precious_metals', label: 'Precious Metals' },
        { value: 'private_equity', label: 'Private Equity' },
        { value: 'hedge_fund', label: 'Hedge Fund' },
        { value: 'alternative', label: 'Other Alternative' }
    ]
};

// Legacy support - keeping old structure for backwards compatibility
export const ACCOUNT_TYPES = {
    canada: {
        name: 'Canada',
        types: [
            { value: 'savings', label: 'Savings Account' },
            { value: 'checking', label: 'Checking Account' },
            { value: 'rrsp', label: 'RRSP' },
            { value: 'tfsa', label: 'TFSA' },
            { value: 'fhsa', label: 'FHSA' },
            { value: 'resp', label: 'RESP' },
            { value: 'brokerage', label: 'Brokerage Account' },
            { value: 'insurance', label: 'Insurance' },
            { value: "credit_card", label: "Credit Card" }
        ]
    },
    india: {
        name: 'India',
        types: [
            { value: 'savings', label: 'Savings Account' },
            { value: 'ppf', label: 'PPF' },
            { value: 'epf', label: 'EPF' },
            { value: 'nps', label: 'NPS' },
            { value: 'brokerage', label: 'Brokerage/Demat Account' },
            { value: 'insurance', label: 'Insurance' }
        ]
    }
};

export const CATEGORIES = [
    'Income', 'Housing', 'Transportation', 'Food',
    'Utilities', 'Healthcare', 'Entertainment',
    'Investment', 'Insurance', 'Other', 'Credit Card'
];

export const NAV_ITEMS = [
    { id: 'accounts', label: 'Accounts', icon: 'DollarSign' },
    { id: 'transactions', label: 'Transactions', icon: 'Upload' },
    { id: 'analytics', label: 'Analytics', icon: 'TrendingUp' },
    { id: 'knowledge', label: 'Knowledge', icon: 'BookOpen' },
    { id: 'ai-advisor', label: 'AI Advisor', icon: 'MessageSquare' },
    { id: 'settings', label: 'Settings', icon: 'Settings' }
];