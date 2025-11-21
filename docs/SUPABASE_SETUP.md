# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" or "Sign In"
3. Sign up with GitHub (recommended) or email
4. Click "New Project"
5. Fill in:
   - **Project Name**: `personal-finance-app` (or your choice)
   - **Database Password**: Create a strong password and **SAVE IT**
   - **Region**: Choose closest to you (e.g., US East, Asia Southeast)
   - **Pricing Plan**: Free
6. Click "Create new project"
7. Wait 2-3 minutes for setup to complete

## Step 2: Get Your API Keys

Once your project is created:

1. Go to **Project Settings** (gear icon in sidebar)
2. Click **API** in the left menu
3. Copy these values (we'll need them):
   - **Project URL**: `https://xxxxxxxxxxxxx.supabase.co`
   - **anon public key**: `eyJhbGc...` (long string)

## Step 3: Create Database Tables

1. Go to **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy and paste the SQL below
4. Click **Run** (or press Ctrl/Cmd + Enter)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Providers table
CREATE TABLE providers (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Accounts table
CREATE TABLE accounts (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    country TEXT NOT NULL,
    account_category TEXT NOT NULL,
    provider_id BIGINT REFERENCES providers(id) ON DELETE CASCADE,
    account_number TEXT,
    name TEXT NOT NULL,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
    product_type TEXT NOT NULL,
    product_name TEXT NOT NULL,
    product_code TEXT,
    quantity NUMERIC DEFAULT 0,
    purchase_price NUMERIC DEFAULT 0,
    current_price NUMERIC DEFAULT 0,
    purchase_date DATE,
    maturity_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Product Metadata table
CREATE TABLE product_metadata (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE CASCADE,
    key TEXT NOT NULL,
    value TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(product_id, key)
);

-- Transactions table
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id BIGINT REFERENCES accounts(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    type TEXT NOT NULL,
    category TEXT,
    amount NUMERIC NOT NULL,
    description TEXT,
    currency TEXT DEFAULT 'USD',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Budgets table
CREATE TABLE budgets (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    category TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, category, month, year)
);

-- Goals table
CREATE TABLE goals (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    target_amount NUMERIC NOT NULL,
    current_amount NUMERIC DEFAULT 0,
    deadline DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_providers_user_id ON providers(user_id);
CREATE INDEX idx_providers_country ON providers(country);
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_provider_id ON accounts(provider_id);
CREATE INDEX idx_products_user_id ON products(user_id);
CREATE INDEX idx_products_account_id ON products(account_id);
CREATE INDEX idx_product_metadata_product_id ON product_metadata(product_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_account_id ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_budgets_user_id ON budgets(user_id);
CREATE INDEX idx_goals_user_id ON goals(user_id);

-- Enable Row Level Security (RLS)
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies (users can only see their own data)
CREATE POLICY "Users can view their own providers" ON providers
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own providers" ON providers
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own providers" ON providers
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own providers" ON providers
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own accounts" ON accounts
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own accounts" ON accounts
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own accounts" ON accounts
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own accounts" ON accounts
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own products" ON products
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own products" ON products
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own products" ON products
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own products" ON products
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own product_metadata" ON product_metadata
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own product_metadata" ON product_metadata
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own product_metadata" ON product_metadata
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own product_metadata" ON product_metadata
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own transactions" ON transactions
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own budgets" ON budgets
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budgets" ON budgets
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budgets" ON budgets
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own budgets" ON budgets
    FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own goals" ON goals
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own goals" ON goals
    FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own goals" ON goals
    FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own goals" ON goals
    FOR DELETE USING (auth.uid() = user_id);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_providers_updated_at BEFORE UPDATE ON providers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_product_metadata_updated_at BEFORE UPDATE ON product_metadata
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_budgets_updated_at BEFORE UPDATE ON budgets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Step 4: Verify Tables Were Created

1. Go to **Table Editor** in the left sidebar
2. You should see all tables:
   - providers
   - accounts
   - products
   - product_metadata
   - transactions
   - budgets
   - goals

## Step 5: Configure Authentication

1. Go to **Authentication** → **Providers** in the left sidebar
2. **Email** should be enabled by default
3. Optional: Enable other providers (Google, GitHub, etc.)
4. Go to **Authentication** → **URL Configuration**
5. Add your site URL when you deploy (for now, use `http://localhost:5173`)

## Step 6: Add Environment Variables to Your App

Create a file: `.env.local` in your project root:

```env
VITE_SUPABASE_URL=your_project_url_here
VITE_SUPABASE_PK_KEY=your_anon_key_here
```

**Replace with your actual values from Step 2!**

⚠️ **Important**: Add `.env.local` to `.gitignore` so you don't commit your keys!

## Step 7: Ready for Integration

Once you've completed these steps, let me know and I'll:
1. Install Supabase client library
2. Create authentication components (login/signup)
3. Update database.js to sync with Supabase
4. Add offline-first sync logic

---

## Security Features Included

✅ **Row Level Security (RLS)**: Users can only access their own data  
✅ **User Authentication**: Required to access any data  
✅ **Automatic Timestamps**: Track when records are created/updated  
✅ **Foreign Keys**: Maintain data integrity  
✅ **Indexes**: Fast queries for large datasets  
✅ **Cascade Deletes**: Clean up related data automatically  

---

## Next Steps

1. ✅ Create Supabase project
2. ✅ Copy API keys
3. ✅ Run SQL to create tables
4. ✅ Add .env.local file
5. ⏳ Let me know when ready, and I'll integrate!
