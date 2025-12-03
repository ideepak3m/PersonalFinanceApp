# Navigation & Routes Structure

## Sidebar Menu

```jsx
const navigationItems = [
  {
    name: 'Dashboard',
    path: '/',
    icon: 'Home',
    description: 'Net worth, quick actions, summaries'
  },
  {
    name: 'Transactions',
    icon: 'Receipt',
    children: [
      { name: 'Bank & Credit Cards', path: '/accounts', description: 'View bank accounts, import CSV' },
      { name: 'All Transactions', path: '/transactions', description: 'View/filter all transactions' },
    ]
  },
  {
    name: 'Investments',
    icon: 'TrendingUp',
    children: [
      { name: 'Investment Accounts', path: '/investments', description: 'Table of all accounts, click for performance' },
      { name: 'Import Statement', path: '/pdf-reader', description: 'Import PDF statements' },
    ]
  },
  {
    name: 'Reports',
    icon: 'BarChart3',
    children: [
      { name: 'Expense Analysis', path: '/reports/expenses' },
      { name: 'Income Analysis', path: '/reports/income' },
      { name: 'Investment Growth', path: '/reports/investments' },
    ]
  },
  {
    name: 'AI Chat',
    path: '/ai-advisor',
    icon: 'MessageSquare',
    description: 'Ask questions about your finances'
  },
  {
    name: 'Settings',
    icon: 'Settings',
    children: [
      { name: 'Profile', path: '/settings/profile' },
      { name: 'Retirement Info', path: '/settings/retirement' },
      { name: 'Subscriptions', path: '/subscriptions' },
      { name: 'Split Rules', path: '/split-rules' },
    ]
  },
];
```

## Routes (App.jsx)

```jsx
<Routes>
  {/* Dashboard */}
  <Route path="/" element={<Dashboard />} />
  
  {/* Transactions - Bank/Credit Card accounts */}
  <Route path="/accounts" element={<AccountsDashboard />} />
  <Route path="/transactions" element={<Transactions />} />
  
  {/* Investments - Table view, click for performance */}
  <Route path="/investments" element={<InvestmentAccountsDashboard />} />
  <Route path="/investments/:id" element={<InvestmentAccountDetails />} />
  <Route path="/pdf-reader" element={<PDFTableReader />} />
  
  {/* Reports */}
  <Route path="/reports/expenses" element={<ExpenseAnalysis />} />
  <Route path="/reports/income" element={<IncomeAnalysis />} />
  <Route path="/reports/investments" element={<InvestmentGrowth />} />
  <Route path="/analytics" element={<Analytics />} />
  
  {/* AI Chat */}
  <Route path="/ai-advisor" element={<AIAdvisor />} />
  
  {/* Settings */}
  <Route path="/settings/profile" element={<UserProfile />} />
  <Route path="/settings/retirement" element={<RetirementInfo />} />
  <Route path="/subscriptions" element={<SubscriptionManager />} />
  <Route path="/split-rules" element={<MerchantSplitRules />} />
</Routes>
```

## Key Flow Changes

### Transactions Flow
- **No separate Income/Expense** - System determines from category
- **Bank & Credit Cards** page shows all bank accounts with Import CSV button
- When CSV is imported, system recognizes income categories (Salary, Business Income, Rental Income)
- User categorizes transactions, which implicitly marks them as income or expense

### Investments Flow
- **Investment Accounts** shows table of all investment accounts
- Each row has an **Import** button to import new statements
- **Click on account row** → Opens account detail with performance charts
- Performance shows: MTD, QTD, YTD growth, holdings breakdown

## Page Components

### Existing (Working)
- [x] `Dashboard` - Home page
- [x] `AccountsDashboard` - Bank & Credit Card accounts
- [x] `Transactions` - All transactions list
- [x] `InvestmentAccountsDashboard` - Investment accounts table
- [x] `PDFTableReader` - Import PDF statements
- [x] `AIAdvisor` - AI Chat
- [x] `Analytics` - Existing analytics
- [x] `SubscriptionManager` - Manage subscriptions
- [x] `MerchantSplitRules` - Split rules

### To Build
- [ ] `ExpenseAnalysis` - Monthly breakdown, category charts, YoY comparison
- [ ] `IncomeAnalysis` - Income trends and sources
- [ ] `InvestmentGrowth` - Growth charts by account/period
- [ ] `UserProfile` - DOB, province, goals
- [ ] `RetirementInfo` - CPP/OAS entry form
- [ ] `InvestmentAccountDetails` - Performance when clicking account row

## Income vs Expense Detection

When importing CSV, categorization determines type:

### Income Categories
- Salary
- Business Income
- Rental Income
- Dividend Income
- Interest Income
- Government Benefits
- Investment Gains
- Other Income

### Expense Categories
- Everything else (Groceries, Utilities, etc.)

```sql
-- Example view for income detection
CREATE VIEW income_transactions AS
SELECT * FROM transactions t
JOIN category c ON t.category_id = c.id
WHERE c.type = 'income' OR c.name IN (
  'Salary', 'Business Income', 'Rental Income', 
  'Dividend Income', 'Interest Income', 'Government Benefits'
);
```
