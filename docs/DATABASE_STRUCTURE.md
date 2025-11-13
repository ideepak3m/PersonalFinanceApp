# Personal Finance Database Structure

## Overview
This application uses **Dexie.js** (a wrapper around IndexedDB) for local storage. The database is designed to be universal, supporting multiple countries, various account types, and diverse investment products including insurance policies.

## Why Dexie?
- ✅ **Local-first**: All data stored on device (privacy & offline access)
- ✅ **Cross-platform**: Works in browsers and can be used with mobile apps (React Native, Capacitor)
- ✅ **Fast**: IndexedDB is much faster than localStorage
- ✅ **Structured**: Proper database with indexes and relationships
- ✅ **Sync-ready**: Can add cloud sync later without changing structure

---

## Database Schema

### 1. **Providers** (Financial Institutions)
Financial institutions where you hold accounts (banks, insurance companies, brokerages).

```javascript
{
  id: number (auto-increment),
  name: string,              // "TD Bank", "LIC", "Questrade"
  country: string,           // "canada", "india"
  type: string               // "bank", "insurance", "brokerage", "credit_union", "robo_advisor"
}
```

**Examples:**
- TD Bank (Canada, bank)
- LIC - Life Insurance Corporation (India, insurance)
- Questrade (Canada, brokerage)
- ICICI Prudential (India, brokerage)

---

### 2. **Accounts** (Account Containers)
Accounts are containers that hold various products/investments.

```javascript
{
  id: number (auto-increment),
  country: string,                // "canada", "india"
  accountCategory: string,        // "rrsp", "tfsa", "insurance", "savings", etc.
  providerId: number,             // Link to provider
  accountNumber: string,          // Account/policy number
  name: string,                   // Display name
  currency: string,               // "CAD", "INR", "USD"
  createdAt: string              // ISO date
}
```

**Account Categories:**
- **Retirement**: `rrsp`, `tfsa`, `lira`, `ppf`, `nps`, `epf`, `retirement`
- **Banking**: `checking`, `savings`
- **Investment**: `brokerage`, `non_registered`, `margin`
- **Insurance**: `insurance`
- **Special**: `education`, `health_savings`, `trust`, `general`

---

### 3. **Products** (Individual Holdings/Policies)
Individual investments, stocks, insurance policies within an account.

```javascript
{
  id: number (auto-increment),
  accountId: number,              // Parent account
  productType: string,            // "stock", "etf", "endowment", "mutual_fund", etc.
  productName: string,            // Display name
  productCode: string,            // Ticker symbol or policy number
  quantity: number,               // Number of units/shares/policies
  purchasePrice: number,          // Price per unit at purchase
  currentPrice: number,           // Current price per unit
  purchaseDate: string,           // ISO date
  maturityDate: string | null    // ISO date or null
}
```

**Product Types:**

| Category | Types |
|----------|-------|
| **Cash & Deposits** | `cash`, `savings_deposit`, `fixed_deposit`, `gic`, `term_deposit` |
| **Stocks & Shares** | `stock`, `etf` |
| **Mutual Funds** | `mutual_fund`, `index_fund`, `equity_fund`, `debt_fund`, `hybrid_fund` |
| **Fixed Income** | `bond`, `treasury`, `debenture` |
| **Real Estate** | `reit`, `real_estate` |
| **Life Insurance** | `term_insurance`, `whole_life`, `endowment`, `money_back`, `ulip`, `child_plan`, `pension_plan` |
| **Health Insurance** | `health_insurance`, `critical_illness`, `disability_insurance` |
| **Alternative** | `cryptocurrency`, `commodity`, `precious_metals`, `private_equity`, `hedge_fund` |

---

### 4. **Product Metadata** (Flexible Key-Value Storage)
Store additional product-specific information.

```javascript
{
  id: number (auto-increment),
  productId: number,        // Link to product
  key: string,              // Metadata key
  value: string             // Metadata value
}
```

**Common Metadata Keys:**
- Insurance: `nominee`, `premiumFrequency`, `bonusAccumulated`, `maturityAmount`
- Mutual Funds: `sipAmount`, `sipDate`, `folioNumber`, `exitLoad`
- Stocks: `sector`, `exchange`, `dividendYield`

---

### 5. **Transactions**
All financial transactions (buys, sells, premiums, etc.)

```javascript
{
  id: number (auto-increment),
  accountId: number,        // Link to account
  productId: number,        // Link to product (optional)
  date: string,             // ISO date
  type: string,             // Transaction type
  category: string,         // Budget category
  amount: number,           // Transaction amount
  description: string,      // Notes
  currency: string          // "CAD", "INR", "USD"
}
```

**Transaction Types:**
`deposit`, `withdrawal`, `buy`, `sell`, `dividend`, `interest`, `fee`, `premium`, `claim`, `contribution`, `transfer_in`, `transfer_out`

---

## Real-World Examples

### Example 1: LIC Insurance Account (India)
Multiple policies under one insurance provider.

```javascript
// Provider
{ id: 1, name: 'LIC', country: 'india', type: 'insurance' }

// Account (Insurance wrapper)
{
  id: 1,
  country: 'india',
  accountCategory: 'insurance',
  providerId: 1,
  name: 'LIC Policies',
  currency: 'INR'
}

// Products (Individual policies)
[
  {
    id: 1,
    accountId: 1,
    productType: 'endowment',
    productName: 'Jeevan Anand',
    productCode: '123456789',      // Policy number
    quantity: 1,
    purchasePrice: 25000,          // Annual premium
    currentPrice: 500000,          // Sum assured
    maturityDate: '2040-05-10'
  },
  {
    id: 2,
    accountId: 1,
    productType: 'money_back',
    productName: 'Money Back - 20 Year',
    productCode: '987654321',
    quantity: 1,
    purchasePrice: 30000,
    currentPrice: 600000,
    maturityDate: '2039-03-20'
  }
]

// Metadata
[
  { productId: 1, key: 'nominee', value: 'Spouse Name' },
  { productId: 1, key: 'premiumFrequency', value: 'annual' },
  { productId: 1, key: 'bonusAccumulated', value: '25000' }
]
```

### Example 2: TFSA with Mixed Holdings (Canada)
One account with stocks, ETFs, GICs, and REITs.

```javascript
// Provider
{ id: 2, name: 'Questrade', country: 'canada', type: 'brokerage' }

// Account
{
  id: 2,
  country: 'canada',
  accountCategory: 'tfsa',
  providerId: 2,
  accountNumber: 'QT-TFSA-001',
  name: 'Questrade TFSA',
  currency: 'CAD'
}

// Products (Various holdings)
[
  {
    id: 3,
    accountId: 2,
    productType: 'etf',
    productName: 'iShares Core S&P 500',
    productCode: 'XUS.TO',
    quantity: 200,
    purchasePrice: 38.50,
    currentPrice: 42.30
  },
  {
    id: 4,
    accountId: 2,
    productType: 'stock',
    productName: 'TD Bank',
    productCode: 'TD.TO',
    quantity: 100,
    purchasePrice: 85.00,
    currentPrice: 92.50
  },
  {
    id: 5,
    accountId: 2,
    productType: 'gic',
    productName: 'TD 1-Year GIC',
    productCode: 'GIC-2024-001',
    quantity: 1,
    purchasePrice: 10000,
    currentPrice: 10450,
    maturityDate: '2024-01-01'
  }
]
```

### Example 3: Indian Mutual Funds
```javascript
// Provider
{ id: 3, name: 'ICICI Prudential', country: 'india', type: 'brokerage' }

// Account
{
  id: 3,
  country: 'india',
  accountCategory: 'general',
  providerId: 3,
  name: 'ICICI Mutual Funds',
  currency: 'INR'
}

// Products
[
  {
    id: 6,
    accountId: 3,
    productType: 'mutual_fund',
    productName: 'ICICI Bluechip Fund',
    productCode: 'INF109K01234',
    quantity: 1500,            // Units
    purchasePrice: 55.50,      // NAV at purchase
    currentPrice: 68.20        // Current NAV
  }
]

// Metadata
[
  { productId: 6, key: 'sipAmount', value: '5000' },
  { productId: 6, key: 'sipDate', value: '5' }
]
```

---

## Key Design Benefits

### ✅ Universal Structure
- Works for any country (Canada, India, USA, UK, etc.)
- Works for any financial institution
- Works for any product type

### ✅ Flexible
- **Account** is just a container
- **Products** can be anything (stocks, policies, funds, real estate)
- **Metadata** allows unlimited custom fields without schema changes

### ✅ Scalable
- Can handle simple banking accounts
- Can handle complex insurance portfolios
- Can handle mixed investment accounts

### ✅ Future-Proof
- Easy to add new product types
- Easy to add new account categories
- Easy to extend with cloud sync

---

## Database Hierarchy

```
Provider (Financial Institution)
  └── Account (Container - RRSP, Insurance, etc.)
       ├── Product 1 (Stock, Policy, Fund)
       │    └── Metadata (nominee, SIP, etc.)
       ├── Product 2
       │    └── Metadata
       └── Product 3
            └── Metadata

Transactions (linked to Account/Product)
```

---

## Mobile App Compatibility

This database structure works perfectly for mobile apps because:
- **IndexedDB/Dexie** has equivalents in mobile (SQLite, Realm)
- The schema is straightforward to migrate
- Local-first approach means offline functionality
- Can add sync layer (Firebase, Supabase) later

---

## Next Steps for Implementation

1. ✅ Database schema defined
2. ✅ Constants and enums created
3. 🔄 Update UI to use new database structure
4. 🔄 Create migration from localStorage to Dexie
5. 🔄 Add product management UI
6. 🔄 Add metadata editor
7. 🔄 Add transaction tracking
8. 🔄 Add portfolio analytics

---

## Questions?

The structure supports:
- ✅ Multiple insurance policies under one provider (LIC)
- ✅ Universal product types (stocks, mutual funds, insurance, etc.)
- ✅ Universal account categories (RRSP, TFSA, PPF, Insurance, etc.)
- ✅ Country-agnostic design
- ✅ Mobile app ready
