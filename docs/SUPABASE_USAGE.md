# Using Supabase Database in Your App

## Quick Start

You now have two database options:

### 1. **Dexie (Local Browser Storage)**
- File: `src/services/database.js`
- Works offline
- Data stored per browser/device
- No authentication required

### 2. **Supabase (Cloud Storage)** ⭐ Recommended
- File: `src/services/supabaseDatabase.js`
- Syncs across all devices
- Requires authentication
- Automatic user isolation

## How to Use Supabase Database

### Import the Database Service

```javascript
// Instead of importing local Dexie:
import { accountsDB, transactionsDB } from '../services/database';

// Import Supabase version:
import { supabaseAccountsDB, supabaseTransactionsDB } from '../services/supabaseDatabase';
// Or import the full API:
import supabaseDB from '../services/supabaseDatabase';
```

### Example: Fetch All Accounts

**Before (Dexie - Local):**
```javascript
const accounts = await accountsDB.getAll();
```

**After (Supabase - Cloud):**
```javascript
import { supabaseAccountsDB } from '../services/supabaseDatabase';
const accounts = await supabaseAccountsDB.getAll();
```

### Example: Add a New Transaction

```javascript
import { supabaseTransactionsDB } from '../services/supabaseDatabase';

const newTransaction = await supabaseTransactionsDB.add({
  accountId: 1,
  date: '2025-01-15',
  type: 'expense',
  category: 'groceries',
  amount: 45.50,
  description: 'Grocery shopping',
  currency: 'USD'
});
```

### Example: Get Products with Metadata

```javascript
import { supabaseProductsDB } from '../services/supabaseDatabase';

const product = await supabaseProductsDB.getWithMetadata(productId);
console.log(product.metadata); // { beneficiary: "John Doe", premium: "5000" }
```

## API Methods

All Supabase database services have the same methods as Dexie, so migration is seamless:

### Providers
- `supabaseProvidersDB.getAll()`
- `supabaseProvidersDB.getByCountry(country)`
- `supabaseProvidersDB.add(provider)`
- `supabaseProvidersDB.update(id, updates)`
- `supabaseProvidersDB.delete(id)`

### Accounts
- `supabaseAccountsDB.getAll()`
- `supabaseAccountsDB.getAllWithProviders()`
- `supabaseAccountsDB.getByCategory(category)`
- `supabaseAccountsDB.add(account)`
- `supabaseAccountsDB.getValue(accountId)`

### Products
- `supabaseProductsDB.getAll()`
- `supabaseProductsDB.getByAccount(accountId)`
- `supabaseProductsDB.getWithMetadata(id)`
- `supabaseProductsDB.add(product)`
- `supabaseProductsDB.getValue(id)`
- `supabaseProductsDB.getGainLoss(id)`

### Transactions
- `supabaseTransactionsDB.getAll()`
- `supabaseTransactionsDB.getByAccount(accountId)`
- `supabaseTransactionsDB.getByDateRange(start, end)`
- `supabaseTransactionsDB.add(transaction)`
- `supabaseTransactionsDB.bulkAdd(transactions)`

## Migration Strategy

### Phase 1: Start Using Supabase (Current)
1. Authentication is set up ✅
2. Supabase database service created ✅
3. Test with new accounts/transactions

### Phase 2: Update Components (Next)
Replace local database imports in:
- `src/hooks/useAccounts.js`
- `src/hooks/useTransactions.js`
- `src/components/accounts/*`
- `src/components/transactions/*`

### Phase 3: Hybrid Mode (Optional)
For offline support, you can:
1. Use Supabase when online
2. Fall back to Dexie when offline
3. Sync when connection restored

## Benefits of Supabase

✅ **Multi-Device Sync**: Access your data from any browser  
✅ **Automatic Backups**: Never lose your financial data  
✅ **Row Level Security**: Your data is private and secure  
✅ **Real-time Updates**: Changes sync instantly  
✅ **Free Tier**: 500MB database, 2GB bandwidth/month  
✅ **Relational Database**: PostgreSQL with all its power  

## Field Name Mapping

Note: Supabase uses snake_case (PostgreSQL convention), while Dexie uses camelCase:

| Dexie (Local) | Supabase (Cloud) |
|---------------|------------------|
| `providerId` | `provider_id` |
| `accountId` | `account_id` |
| `productType` | `product_type` |
| `productName` | `product_name` |
| `currentPrice` | `current_price` |
| `purchaseDate` | `purchase_date` |

The service layer handles this automatically! 🎉

## Testing Your Setup

1. **Start the dev server**: `npm run dev`
2. **Visit**: `http://localhost:5173/signup`
3. **Create an account** with your email
4. **Check Supabase dashboard**: You should see your user in Authentication
5. **Try adding data**: It will automatically save to cloud!

## Troubleshooting

### "Missing Supabase environment variables"
- Make sure `.env.local` exists with your Supabase URL and anon key
- Restart your dev server after creating `.env.local`

### "User is not authenticated"
- Make sure you're logged in
- Check if `user` exists in `useAuth()` hook

### "Insert violates row-level security policy"
- Make sure the SQL from `SUPABASE_SETUP.md` was run
- Check that `user_id` is being set correctly

## Next Steps

Want me to:
1. **Migrate existing components** to use Supabase?
2. **Add offline sync** with Dexie as local cache?
3. **Create data migration tool** to move localStorage → Supabase?
4. **Add real-time subscriptions** for live updates?

Let me know what you'd like to do next! 🚀
