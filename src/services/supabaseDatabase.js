// src/services/supabaseDatabase.js
import { supabase } from './supabaseClient';

// Helper to get current user ID
const getUserId = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id;
};

// Providers
export const supabaseProvidersDB = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .order('name');
    if (error) throw error;
    return data;
  },

  getByCountry: async (country) => {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('country', country);
    if (error) throw error;
    return data;
  },

  getByType: async (type) => {
    const { data, error } = await supabase
      .from('providers')
      .select('*')
      .eq('type', type);
    if (error) throw error;
    return data;
  },

  add: async (provider) => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('providers')
      .insert([{ ...provider, user_id: userId }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('providers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('providers')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Accounts
export const supabaseAccountsDB = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*, providers(*)')
      .order('name');
    if (error) throw error;
    return data;
  },

  getAllWithProviders: async () => {
    return await supabaseAccountsDB.getAll();
  },

  getByCategory: async (category) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('account_category', category);
    if (error) throw error;
    return data;
  },

  getByProvider: async (providerId) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('provider_id', providerId);
    if (error) throw error;
    return data;
  },

  getByCountry: async (country) => {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('country', country);
    if (error) throw error;
    return data;
  },

  add: async (account) => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('accounts')
      .insert([{
        ...account,
        user_id: userId,
        provider_id: account.providerId
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('accounts')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  getValue: async (accountId) => {
    const { data, error } = await supabase
      .from('products')
      .select('quantity, current_price')
      .eq('account_id', accountId);
    if (error) throw error;
    return data.reduce((sum, p) => sum + (p.quantity * p.current_price), 0);
  }
};

// Products
export const supabaseProductsDB = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('product_name');
    if (error) throw error;
    return data;
  },

  getByAccount: async (accountId) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('account_id', accountId);
    if (error) throw error;
    return data;
  },

  getByType: async (productType) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_type', productType);
    if (error) throw error;
    return data;
  },

  getByAccountAndType: async (accountId, productType) => {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('account_id', accountId)
      .eq('product_type', productType);
    if (error) throw error;
    return data;
  },

  add: async (product) => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('products')
      .insert([{
        ...product,
        user_id: userId,
        account_id: product.accountId,
        product_type: product.productType,
        product_name: product.productName,
        product_code: product.productCode,
        purchase_price: product.purchasePrice,
        current_price: product.currentPrice,
        purchase_date: product.purchaseDate,
        maturity_date: product.maturityDate
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  getWithMetadata: async (id) => {
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();
    if (productError) throw productError;

    const { data: metadata, error: metaError } = await supabase
      .from('product_metadata')
      .select('*')
      .eq('product_id', id);
    if (metaError) throw metaError;

    product.metadata = {};
    metadata.forEach(m => {
      product.metadata[m.key] = m.value;
    });
    return product;
  },

  getValue: async (id) => {
    const { data, error } = await supabase
      .from('products')
      .select('quantity, current_price')
      .eq('id', id)
      .single();
    if (error) throw error;
    return data.quantity * data.current_price;
  },

  getGainLoss: async (id) => {
    const { data, error } = await supabase
      .from('products')
      .select('quantity, current_price, purchase_price')
      .eq('id', id)
      .single();
    if (error) throw error;
    const currentValue = data.quantity * data.current_price;
    const purchaseValue = data.quantity * data.purchase_price;
    return currentValue - purchaseValue;
  }
};

// Product Metadata
export const supabaseProductMetadataDB = {
  getByProduct: async (productId) => {
    const { data, error } = await supabase
      .from('product_metadata')
      .select('*')
      .eq('product_id', productId);
    if (error) throw error;
    return data;
  },

  get: async (productId, key) => {
    const { data, error } = await supabase
      .from('product_metadata')
      .select('*')
      .eq('product_id', productId)
      .eq('key', key)
      .single();
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  set: async (productId, key, value) => {
    const userId = await getUserId();
    const existing = await supabaseProductMetadataDB.get(productId, key);
    
    if (existing) {
      const { error } = await supabase
        .from('product_metadata')
        .update({ value })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('product_metadata')
        .insert([{
          product_id: productId,
          user_id: userId,
          key,
          value
        }]);
      if (error) throw error;
    }
  },

  delete: async (productId, key) => {
    const { error } = await supabase
      .from('product_metadata')
      .delete()
      .eq('product_id', productId)
      .eq('key', key);
    if (error) throw error;
  }
};

// Transactions
export const supabaseTransactionsDB = {
  getAll: async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  getByAccount: async (accountId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  getByProduct: async (productId) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('product_id', productId)
      .order('date', { ascending: false });
    if (error) throw error;
    return data;
  },

  getByDateRange: async (startDate, endDate) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date');
    if (error) throw error;
    return data;
  },

  getByType: async (type) => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('type', type);
    if (error) throw error;
    return data;
  },

  add: async (transaction) => {
    const userId = await getUserId();
    const { data, error } = await supabase
      .from('transactions')
      .insert([{
        ...transaction,
        user_id: userId,
        account_id: transaction.accountId,
        product_id: transaction.productId
      }])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  bulkAdd: async (transactions) => {
    const userId = await getUserId();
    const records = transactions.map(t => ({
      ...t,
      user_id: userId,
      account_id: t.accountId,
      product_id: t.productId
    }));
    const { error } = await supabase
      .from('transactions')
      .insert(records);
    if (error) throw error;
  },

  update: async (id, updates) => {
    const { data, error } = await supabase
      .from('transactions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  delete: async (id) => {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
    if (error) throw error;
  }
};

// Export combined API
export const supabaseDB = {
  providers: supabaseProvidersDB,
  accounts: supabaseAccountsDB,
  products: supabaseProductsDB,
  productMetadata: supabaseProductMetadataDB,
  transactions: supabaseTransactionsDB
};

export default supabaseDB;
