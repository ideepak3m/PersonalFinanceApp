// SupabaseDatabase.js - Updated for personal_finance schema
import { supabase } from './supabaseClient';

/**
 * Browser cache for frequently used tables
 * Cache expires after 5 minutes
 */
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes in milliseconds
const cache = {
    chartOfAccounts: { data: null, timestamp: 0 },
    merchants: { data: null, timestamp: 0 },
    categories: { data: null, timestamp: 0 }
};

const isCacheValid = (cacheKey) => {
    const cached = cache[cacheKey];
    if (!cached.data) return false;
    return (Date.now() - cached.timestamp) < CACHE_TTL;
};

const getCached = (cacheKey) => {
    if (isCacheValid(cacheKey)) {
        console.log(`✓ Cache hit for ${cacheKey}`);
        return cache[cacheKey].data;
    }
    return null;
};

const setCache = (cacheKey, data) => {
    cache[cacheKey] = { data, timestamp: Date.now() };
    console.log(`✓ Cached ${cacheKey} (${data?.length || 0} items)`);
};

const clearCache = (cacheKey) => {
    if (cacheKey) {
        cache[cacheKey] = { data: null, timestamp: 0 };
        console.log(`✓ Cleared cache for ${cacheKey}`);
    } else {
        // Clear all caches
        Object.keys(cache).forEach(key => {
            cache[key] = { data: null, timestamp: 0 };
        });
        console.log('✓ Cleared all caches');
    }
};

// Export cache utilities
export const cacheUtils = { getCached, setCache, clearCache, isCacheValid };

/**
 * Generic database service factory for personal_finance schema
 * Handles automatic snake_case <-> camelCase conversion
 */
class SupabaseService {
    constructor(tableName, schema = 'personal_finance') {
        this.tableName = tableName;
        this.schema = schema;
    }

    /**
     * Convert camelCase to snake_case
     */
    toSnakeCase(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => this.toSnakeCase(item));

        const converted = {};
        for (const [key, value] of Object.entries(obj)) {
            const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
            converted[snakeKey] = value;
        }
        return converted;
    }

    /**
     * Convert snake_case to camelCase
     */
    toCamelCase(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj.map(item => this.toCamelCase(item));

        const converted = {};
        for (const [key, value] of Object.entries(obj)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            converted[camelKey] = value;
        }
        return converted;
    }

    /**
     * Get table reference with schema
     */
    table() {
        return supabase.from(this.tableName);
    }

    /**
     * Get all records for current user
     */
    async getAll() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await this.table()
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error(`Error fetching from ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Get single record by ID
     */
    async getById(id) {
        try {
            const { data, error } = await this.table()
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error fetching ${this.tableName} by ID:`, error);
            throw error;
        }
    }

    /**
     * Add single record (converts camelCase to snake_case)
     */
    async add(record) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Convert camelCase to snake_case for database
            const snakeCaseRecord = this.toSnakeCase(record);

            // Ensure user_id is set
            if (!snakeCaseRecord.user_id) {
                snakeCaseRecord.user_id = user.id;
            }

            const { data, error } = await this.table()
                .insert([snakeCaseRecord])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error adding to ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Bulk add records
     */
    async bulkAdd(records) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Convert all records to snake_case
            const snakeCaseRecords = records.map(record => {
                const converted = this.toSnakeCase(record);
                if (!converted.user_id) {
                    converted.user_id = user.id;
                }
                return converted;
            });

            const { data, error } = await this.table()
                .insert(snakeCaseRecords)
                .select();

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error(`Error bulk adding to ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Update record by ID
     */
    async update(id, updates) {
        try {
            // Convert camelCase to snake_case
            const snakeCaseUpdates = this.toSnakeCase(updates);

            const { data, error } = await this.table()
                .update(snakeCaseUpdates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error updating ${this.tableName}:`, error);
            throw error;
        }
    }

    /**
     * Delete record by ID
     */
    async delete(id) {
        try {
            const { error } = await this.table()
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error(`Error deleting from ${this.tableName}:`, error);
            throw error;
        }
    }
}

/**
 * Transaction-specific service with additional methods
 */
class TransactionService extends SupabaseService {
    constructor() {
        super('transactions', 'personal_finance');
    }

    /**
     * Get all transactions with related data
     */
    async getAllWithRelations() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await this.table()
                .select(`
                    *,
                    merchant:normalized_merchant_id (
                        id,
                        normalized_name,
                        category:category_id (
                            id,
                            name,
                            is_split_enabled
                        )
                    ),
                    account:account_id (
                        id,
                        name,
                        account_number
                    ),
                    chart_of_account:chart_of_account_id (
                        id,
                        code,
                        name
                    ),
                    splits:transaction_split (
                        id,
                        amount,
                        percentage,
                        chart_of_account:chart_of_account_id (
                            id,
                            code,
                            name
                        )
                    )
                `)
                .eq('user_id', user.id)
                .order('date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching transactions with relations:', error);
            throw error;
        }
    }

    /**
     * Get transactions by date range
     */
    async getByDateRange(startDate, endDate) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await this.table()
                .select('*')
                .eq('user_id', user.id)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching transactions by date range:', error);
            throw error;
        }
    }

    /**
     * Get transactions by account
     */
    async getByAccount(accountId) {
        try {
            const { data, error } = await this.table()
                .select('*')
                .eq('account_id', accountId)
                .order('date', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching transactions by account:', error);
            throw error;
        }
    }
}

/**
 * Transaction Split specific service
 */
class TransactionSplitService extends SupabaseService {
    constructor() {
        super('transaction_split', 'personal_finance');
    }

    /**
     * Get splits for a transaction
     */
    async getByTransactionId(transactionId) {
        try {
            const { data, error } = await this.table()
                .select(`
                    *,
                    chart_of_account:chart_of_account_id (
                        id,
                        code,
                        name
                    )
                `)
                .eq('transaction_id', transactionId);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching transaction splits:', error);
            throw error;
        }
    }

    /**
     * Delete all splits for a transaction
     */
    async deleteByTransactionId(transactionId) {
        try {
            const { error } = await this.table()
                .delete()
                .eq('transaction_id', transactionId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting transaction splits:', error);
            throw error;
        }
    }

    /**
     * Override getAll to fetch all splits (no user_id filter)
     */
    async getAll() {
        try {
            const { data, error } = await this.table()
                .select('*')
                .order('inserted_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching all splits:', error);
            throw error;
        }
    }
}

/**
 * Merchant service without user_id requirement
 */
class MerchantService extends SupabaseService {
    constructor() {
        super('merchant', 'personal_finance');
    }

    /**
     * Get all merchants (no user filter) with caching
     */
    async getAll() {
        try {
            // Try cache first
            const cached = getCached('merchants');
            if (cached) return cached;

            // Fetch from database
            const { data, error } = await this.table()
                .select(`
                    *,
                    category:category_id (
                        id,
                        name,
                        is_split_enabled
                    )
                `)
                .order('normalized_name');

            if (error) throw error;

            const result = data || [];
            setCache('merchants', result);
            return result;
        } catch (error) {
            console.error('Error fetching merchants:', error);
            throw error;
        }
    }

    /**
     * Find merchant by raw name or alias
     * Uses database function if available, falls back to JS filtering
     */
    async getByRawNameOrAlias(rawName) {
        try {
            if (!rawName) return null;

            // Try using the database function (if you've created it)
            const { data: funcResult, error: funcError } = await supabase
                .rpc('search_merchant_by_name_or_alias', {
                    search_term: rawName
                });

            // If function exists and returns result, use it
            if (!funcError && funcResult && funcResult.length > 0) {
                return funcResult[0];
            }

            // Fallback: First try exact normalized_name match (case-insensitive)
            let { data, error } = await this.table()
                .select('*')
                .ilike('normalized_name', rawName)
                .limit(1);

            if (error) {
                console.error('Error searching by normalized_name:', error);
            }

            if (data && data.length > 0) {
                return data[0];
            }

            // Final fallback: Search aliases in JavaScript
            const { data: allMerchants, error: allError } = await this.table()
                .select('*');

            if (allError) {
                console.error('Error fetching all merchants:', allError);
                return null;
            }

            // Search aliases in JavaScript
            const lowerRawName = rawName.toLowerCase();
            const found = allMerchants?.find(merchant => {
                if (Array.isArray(merchant.aliases)) {
                    return merchant.aliases.some(alias =>
                        alias.toLowerCase() === lowerRawName
                    );
                }
                return false;
            });

            return found || null;

        } catch (error) {
            console.error('Error finding merchant:', error);
            return null;
        }
    }

    /**
     * Add merchant (no user_id)
     */
    async add(record) {
        try {
            const snakeCaseRecord = this.toSnakeCase(record);

            const { data, error } = await this.table()
                .insert([snakeCaseRecord])
                .select()
                .single();

            if (error) throw error;
            clearCache('merchants');
            return data;
        } catch (error) {
            console.error('Error adding merchant:', error);
            throw error;
        }
    }
}

/**
 * Category service without user_id requirement
 */
class CategoryService extends SupabaseService {
    constructor() {
        super('category', 'personal_finance');
    }

    /**
     * Get all categories (no user filter) with caching
     */
    async getAll() {
        try {
            // Try cache first
            const cached = getCached('categories');
            if (cached) return cached;

            // Fetch from database
            const { data, error } = await this.table()
                .select('*')
                .order('name');

            if (error) throw error;

            const result = data || [];
            setCache('categories', result);
            return result;
        } catch (error) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    }

    /**
     * Add category (no user_id)
     */
    async add(record) {
        try {
            const snakeCaseRecord = this.toSnakeCase(record);

            const { data, error } = await this.table()
                .insert([snakeCaseRecord])
                .select()
                .single();

            if (error) throw error;
            clearCache('categories');
            return data;
        } catch (error) {
            console.error('Error adding category:', error);
            throw error;
        }
    }
}

/**
 * Belief Tags service without user_id requirement
 */
class BeliefTagsService extends SupabaseService {
    constructor() {
        super('belief_tags', 'personal_finance');
    }

    /**
     * Get all belief tags (no user filter)
     */
    async getAll() {
        try {
            const { data, error } = await this.table()
                .select(`
                    *,
                    category:category_id (
                        id,
                        name
                    )
                `)
                .order('name');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching belief tags:', error);
            throw error;
        }
    }

    /**
     * Add belief tag (no user_id)
     */
    async add(record) {
        try {
            const snakeCaseRecord = this.toSnakeCase(record);

            const { data, error } = await this.table()
                .insert([snakeCaseRecord])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error adding belief tag:', error);
            throw error;
        }
    }
}

/**
 * User Preferences service
 */
class UserPreferencesService extends SupabaseService {
    constructor() {
        super('user_preferences', 'personal_finance');
    }

    /**
     * Get user preferences for a merchant
     */
    async getByMerchant(merchantId) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const { data, error } = await this.table()
                .select('*')
                .eq('user_id', user.id)
                .eq('merchant_id', merchantId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data || null;
        } catch (error) {
            console.error('Error fetching user preferences:', error);
            return null;
        }
    }

    /**
     * Upsert user preference
     */
    async upsert(merchantId, preferences) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            const record = {
                user_id: user.id,
                merchant_id: merchantId,
                preferred_split_json: preferences.preferred_split_json,
                auto_tag_enabled: preferences.auto_tag_enabled ?? true
            };

            const { data, error } = await this.table()
                .upsert(record, { onConflict: 'user_id,merchant_id' })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error upserting user preferences:', error);
            throw error;
        }
    }
}

/**
 * Product Metadata service
 */
class ProductMetadataService extends SupabaseService {
    constructor() {
        super('product_metadata', 'personal_finance');
    }

    /**
     * Get metadata for a product
     */
    async getByProduct(productId) {
        try {
            const { data, error } = await this.table()
                .select('*')
                .eq('product_id', productId);

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching product metadata:', error);
            throw error;
        }
    }
}

/**
 * Chart of Accounts Service with caching
 */
class ChartOfAccountsService extends SupabaseService {
    constructor() {
        super('chart_of_accounts');
    }

    async getAll() {
        // Try cache first
        const cached = getCached('chartOfAccounts');
        if (cached) return cached;

        // Fetch from database
        const data = await super.getAll();
        setCache('chartOfAccounts', data);
        return data;
    }

    async add(item) {
        const result = await super.add(item);
        clearCache('chartOfAccounts');
        return result;
    }

    async update(id, updates) {
        const result = await super.update(id, updates);
        clearCache('chartOfAccounts');
        return result;
    }

    async delete(id) {
        const result = await super.delete(id);
        clearCache('chartOfAccounts');
        return result;
    }
}

// Export service instances
export const supabaseAccountsDB = new SupabaseService('accounts');
export const supabaseTransactionsDB = new TransactionService();
export const supabaseChartOfAccountsDB = new ChartOfAccountsService();
export const supabaseTransactionSplitDB = new TransactionSplitService();
export const supabaseMerchantDB = new MerchantService();
export const supabaseCategoryDB = new CategoryService();
export const supabaseProvidersDB = new SupabaseService('providers');
export const supabaseBudgetsDB = new SupabaseService('budgets');
export const supabaseGoalsDB = new SupabaseService('goals');
export const supabaseProductsDB = new SupabaseService('products');
export const supabaseDescriptionRulesDB = new SupabaseService('description_rules');
export const supabaseBeliefTagsDB = new BeliefTagsService();
export const supabaseUserPreferencesDB = new UserPreferencesService();
export const supabaseProductMetadataDB = new ProductMetadataService();
export const supabaseProfilesDB = new SupabaseService('profiles');

// Legacy/alias exports for backwards compatibility
export const supabaseKnowledgeDB = supabaseBeliefTagsDB;
export const supabaseSettingsDB = supabaseUserPreferencesDB; // If settings maps to user_preferences

// If you have a separate settings table, uncomment this:
// export const supabaseSettingsDB = new SupabaseService('settings');