Example: LIC Insurance Account with Multiple Policies
// Provider
{
  id: 3,
  name: 'LIC (Life Insurance Corporation)',
  country: 'india',
  type: 'insurance'
}

// Account (Insurance wrapper)
{
  id: 3,
  country: 'india',
  accountCategory: 'insurance',
  providerId: 3,
  accountNumber: null,
  name: 'LIC Policies',
  currency: 'INR',
  createdAt: '2020-05-10'
}

// Products (individual policies)
[
  {
    id: 5,
    accountId: 3,
    productType: 'endowment',
    productName: 'Jeevan Anand',
    productCode: '123456789',      // Policy number
    quantity: 1,
    purchasePrice: 25000,          // Annual premium
    currentPrice: 500000,          // Sum assured
    purchaseDate: '2020-05-10',
    maturityDate: '2040-05-10'
  },
  {
    id: 6,
    accountId: 3,
    productType: 'endowment',
    productName: 'Jeevan Umang',
    productCode: '987654321',
    quantity: 1,
    purchasePrice: 50000,
    currentPrice: 1000000,
    purchaseDate: '2021-06-15',
    maturityDate: '2045-06-15'
  },
  {
    id: 7,
    accountId: 3,
    productType: 'money_back',
    productName: 'Money Back Policy - 20 Year',
    productCode: '456789123',
    quantity: 1,
    purchasePrice: 30000,
    currentPrice: 600000,
    purchaseDate: '2019-03-20',
    maturityDate: '2039-03-20'
  }
]

// Product Metadata (policy-specific details)
productMetadata: [
  {
    id: 3,
    productId: 5,
    key: 'nominee',
    value: 'Spouse Name'
  },
  {
    id: 4,
    productId: 5,
    key: 'premiumFrequency',
    value: 'annual'
  },
  {
    id: 5,
    productId: 5,
    key: 'bonusAccumulated',
    value: '25000'
  },
  {
    id: 6,
    productId: 6,
    key: 'nominee',
    value: 'Child Name'
  },
  {
    id: 7,
    productId: 6,
    key: 'premiumFrequency',
    value: 'annual'
  },
  {
    id: 8,
    productId: 7,
    key: 'nominee',
    value: 'Parent Name'
  },
  {
    id: 9,
    productId: 7,
    key: 'moneyBackSchedule',
    value: '20%,25%,30%,25%' // Payback percentages
  }
]

Example: Indian Mutual Fund Account
// Provider
{
  id: 4,
  name: 'ICICI Prudential',
  country: 'india',
  type: 'brokerage'
}

// Account
{
  id: 4,
  country: 'india',
  accountCategory: 'general',
  providerId: 4,
  accountNumber: 'ICICI-MF-789',
  name: 'ICICI Mutual Funds',
  currency: 'INR',
  createdAt: '2021-08-15'
}

// Products (different mutual funds)
[
  {
    id: 8,
    accountId: 4,
    productType: 'mutual_fund',
    productName: 'ICICI Bluechip Fund',
    productCode: 'INF109K01234',
    quantity: 1500,                // Units
    purchasePrice: 55.50,          // NAV at purchase
    currentPrice: 68.20,           // Current NAV
    purchaseDate: '2021-08-15',
    maturityDate: null
  },
  {
    id: 9,
    accountId: 4,
    productType: 'mutual_fund',
    productName: 'ICICI Balanced Advantage',
    productCode: 'INF109K01567',
    quantity: 800,
    purchasePrice: 42.30,
    currentPrice: 48.75,
    purchaseDate: '2022-02-10',
    maturityDate: null
  }
]

// Metadata
productMetadata: [
  {
    id: 10,
    productId: 8,
    key: 'sipAmount',
    value: '5000'
  },
  {
    id: 11,
    productId: 8,
    key: 'sipDate',
    value: '5' // 5th of every month
  },
  {
    id: 12,
    productId: 8,
    key: 'folioNumber',
    value: '12345/67'
  }
]

Example: TFSA with Mixed Holdings
// Account
{
  id: 5,
  country: 'canada',
  accountCategory: 'tfsa',
  providerId: 2,                  // Questrade
  accountNumber: 'QT-TFSA-001',
  name: 'Questrade TFSA',
  currency: 'CAD',
  createdAt: '2022-01-01'
}

// Products (stocks, ETFs, GICs all in one TFSA)
[
  {
    id: 10,
    accountId: 5,
    productType: 'etf',
    productName: 'iShares Core S&P 500',
    productCode: 'XUS.TO',
    quantity: 200,
    purchasePrice: 38.50,
    currentPrice: 42.30,
    purchaseDate: '2022-03-15',
    maturityDate: null
  },
  {
    id: 11,
    accountId: 5,
    productType: 'stock',
    productName: 'TD Bank',
    productCode: 'TD.TO',
    quantity: 100,
    purchasePrice: 85.00,
    currentPrice: 92.50,
    purchaseDate: '2022-06-20',
    maturityDate: null
  },
  {
    id: 12,
    accountId: 5,
    productType: 'gic',
    productName: 'TD 1-Year GIC',
    productCode: 'GIC-2024-001',
    quantity: 1,
    purchasePrice: 10000,
    currentPrice: 10450,           // With interest
    purchaseDate: '2023-01-01',
    maturityDate: '2024-01-01'
  },
  {
    id: 13,
    accountId: 5,
    productType: 'reit',
    productName: 'Canadian Apartment Properties REIT',
    productCode: 'CAR-UN.TO',
    quantity: 50,
    purchasePrice: 52.00,
    currentPrice: 48.75,
    purchaseDate: '2023-08-10',
    maturityDate: null
  }
]

## **Summary of Structure:**
```
Provider(LIC, Questrade, TD Bank)
  └── Account(RRSP, TFSA, Insurance wrapper)
       └── Products(Stocks, ETFs, Policies, Mutual Funds)
            └── Product Metadata(Nominee, SIP date, etc.)
            └── Transactions(Buy, Sell, Premium payments)