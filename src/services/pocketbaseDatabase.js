// PocketBase Database Services - mirrors supabaseDatabase.js structure
import { pb } from './pocketbaseClient';

/**
 * Query Builder that mimics Supabase's chainable API
 * Allows: table().select(...).eq(...).or(...).order(...) patterns
 */
class PocketBaseQueryBuilder {
    constructor(collectionName) {
        this.collectionName = collectionName;
        this._filters = [];
        this._orFilters = [];
        this._sort = '';
        this._expand = [];
        this._selectFields = '*';
    }

    select(fields) {
        // Parse Supabase-style select with relations like: *, merchant:normalized_merchant_id(...)
        this._selectFields = fields;

        // Extract expand relations from Supabase format
        const relationMatch = fields.match(/(\w+):(\w+)\s*\(/g);
        if (relationMatch) {
            // For now, we'll handle relations manually after fetch
            this._relations = relationMatch.map(r => {
                const [alias, field] = r.replace('(', '').split(':');
                return { alias, field };
            });
        }
        return this;
    }

    eq(field, value) {
        this._filters.push(`${field} = "${value}"`);
        return this;
    }

    neq(field, value) {
        this._filters.push(`${field} != "${value}"`);
        return this;
    }

    gt(field, value) {
        this._filters.push(`${field} > "${value}"`);
        return this;
    }

    gte(field, value) {
        this._filters.push(`${field} >= "${value}"`);
        return this;
    }

    lt(field, value) {
        this._filters.push(`${field} < "${value}"`);
        return this;
    }

    lte(field, value) {
        this._filters.push(`${field} <= "${value}"`);
        return this;
    }

    like(field, value) {
        this._filters.push(`${field} ~ "${value}"`);
        return this;
    }

    or(orFilter) {
        // Parse Supabase OR filter format: "field1.eq.value1,field2.eq.value2"
        // Convert to PocketBase format
        const conditions = orFilter.split(',').map(cond => {
            const parts = cond.split('.');
            if (parts.length >= 3) {
                const field = parts[0];
                const op = parts[1];
                const value = parts.slice(2).join('.');

                switch (op) {
                    case 'eq': return `${field} = "${value}"`;
                    case 'neq': return `${field} != "${value}"`;
                    case 'gt': return `${field} > "${value}"`;
                    case 'gte': return `${field} >= "${value}"`;
                    case 'lt': return `${field} < "${value}"`;
                    case 'lte': return `${field} <= "${value}"`;
                    case 'like': return `${field} ~ "${value}"`;
                    default: return `${field} = "${value}"`;
                }
            }
            return cond;
        });

        this._orFilters.push(`(${conditions.join(' || ')})`);
        return this;
    }

    order(field, options = {}) {
        const direction = options.ascending === false ? '-' : '';
        this._sort = `${direction}${field}`;
        return this;
    }

    in(field, values) {
        // PocketBase uses: field = "val1" || field = "val2" || ...
        if (values && values.length > 0) {
            const conditions = values.map(v => `${field} = "${v}"`).join(' || ');
            this._filters.push(`(${conditions})`);
        }
        return this;
    }

    // Execute the query - this is called automatically when awaited due to thenable
    async then(resolve, reject) {
        try {
            const result = await this._execute();
            resolve(result);
        } catch (error) {
            reject(error);
        }
    }

    async _execute() {
        try {
            let filter = this._filters.join(' && ');

            if (this._orFilters.length > 0) {
                const orPart = this._orFilters.join(' && ');
                filter = filter ? `${filter} && ${orPart}` : orPart;
            }

            const options = {};
            if (filter) options.filter = filter;
            if (this._sort) options.sort = this._sort;

            const data = await pb.collection(this.collectionName).getFullList(options);

            // Handle relations if needed
            if (this._relations && this._relations.length > 0) {
                // Fetch related data and join
                for (const rel of this._relations) {
                    if (rel.field === 'normalized_merchant_id') {
                        const merchants = await pb.collection('merchant').getFullList();
                        const merchantMap = {};
                        merchants.forEach(m => {
                            if (m.supabase_id) merchantMap[m.supabase_id] = m;
                            merchantMap[m.id] = m;
                        });

                        data.forEach(record => {
                            record.merchant = record.normalized_merchant_id
                                ? merchantMap[record.normalized_merchant_id]
                                : null;
                        });
                    }
                }
            }

            return { data, error: null };
        } catch (error) {
            console.error(`PocketBase query error:`, error);
            return { data: null, error };
        }
    }
}

// ============ User ID Helper ============
// Cache the default user_id from user_profile table
let cachedUserId = null;

export async function getDefaultUserId() {
    if (cachedUserId) return cachedUserId;

    try {
        const profiles = await pb.collection('user_profile').getFullList({ limit: 1 });
        if (profiles.length > 0) {
            cachedUserId = profiles[0].user_id;
            console.log('✓ Default user_id loaded:', cachedUserId);
            return cachedUserId;
        }
    } catch (error) {
        console.error('Error fetching default user_id:', error);
    }
    return null;
}

// Clear cache (useful for logout/login scenarios)
export function clearUserIdCache() {
    cachedUserId = null;
}

/**
 * Base service class for PocketBase collections
 */
class PocketBaseService {
    constructor(collectionName) {
        this.collectionName = collectionName;
        this._supabaseIdCache = new Map(); // Cache supabase_id -> pocketbase_id mappings
    }

    collection() {
        return pb.collection(this.collectionName);
    }

    // Returns a query builder for Supabase-style chaining: .select().eq().in().order()
    table() {
        return new PocketBaseQueryBuilder(this.collectionName);
    }

    async getAll(options = {}) {
        try {
            const records = await this.collection().getFullList(options);
            // Build cache for supabase_id lookups
            records.forEach(r => {
                if (r.supabase_id) {
                    this._supabaseIdCache.set(r.supabase_id, r.id);
                }
            });
            return records;
        } catch (error) {
            console.error(`Error fetching ${this.collectionName}:`, error);
            throw error;
        }
    }

    // Get record by supabase_id (the original Supabase UUID)
    async getBySupabaseId(supabaseId) {
        try {
            // Check cache first
            if (this._supabaseIdCache.has(supabaseId)) {
                const pbId = this._supabaseIdCache.get(supabaseId);
                return await this.collection().getOne(pbId);
            }
            // Query by supabase_id field
            const records = await this.collection().getFullList({
                filter: `supabase_id = "${supabaseId}"`,
                limit: 1
            });
            if (records.length > 0) {
                this._supabaseIdCache.set(supabaseId, records[0].id);
                return records[0];
            }
            return null;
        } catch (error) {
            console.error(`Error fetching ${this.collectionName} by supabase_id:`, error);
            return null;
        }
    }

    // Get PocketBase ID from Supabase ID
    async getPocketBaseId(supabaseId) {
        if (!supabaseId) return null;

        // Check cache first
        if (this._supabaseIdCache.has(supabaseId)) {
            return this._supabaseIdCache.get(supabaseId);
        }

        // It might already be a PocketBase ID (15 char alphanumeric)
        if (/^[a-z0-9]{15}$/.test(supabaseId)) {
            return supabaseId;
        }

        // Query by supabase_id
        const record = await this.getBySupabaseId(supabaseId);
        return record ? record.id : null;
    }

    async getById(id) {
        try {
            // First try as PocketBase ID
            if (/^[a-z0-9]{15}$/.test(id)) {
                return await this.collection().getOne(id);
            }
            // Otherwise try as supabase_id
            return await this.getBySupabaseId(id);
        } catch (error) {
            // If PocketBase ID lookup fails, try supabase_id
            const record = await this.getBySupabaseId(id);
            if (record) return record;
            console.error(`Error fetching ${this.collectionName} by id:`, error);
            throw error;
        }
    }

    async add(data) {
        try {
            // Auto-add user_id if not provided
            if (!data.user_id) {
                const userId = await getDefaultUserId();
                if (userId) {
                    data = { ...data, user_id: userId };
                }
            }
            return await this.collection().create(data);
        } catch (error) {
            console.error(`Error adding to ${this.collectionName}:`, error);
            throw error;
        }
    }

    async update(id, data) {
        try {
            // Resolve to PocketBase ID if needed
            const pbId = await this.getPocketBaseId(id) || id;
            return await this.collection().update(pbId, data);
        } catch (error) {
            console.error(`Error updating ${this.collectionName}:`, error);
            throw error;
        }
    }

    async delete(id) {
        try {
            // Resolve to PocketBase ID if needed
            const pbId = await this.getPocketBaseId(id) || id;
            return await this.collection().delete(pbId);
        } catch (error) {
            console.error(`Error deleting from ${this.collectionName}:`, error);
            throw error;
        }
    }

    async query(filter, options = {}) {
        try {
            return await this.collection().getFullList({
                filter,
                ...options
            });
        } catch (error) {
            console.error(`Error querying ${this.collectionName}:`, error);
            throw error;
        }
    }
}

// ============ Collection Services ============

class AccountsService extends PocketBaseService {
    constructor() {
        super('accounts');
    }

    async getByUserId(userId) {
        return this.query(`user_id = "${userId}"`);
    }
}

class TransactionsService extends PocketBaseService {
    constructor() {
        super('transactions');
    }

    async getByAccountId(accountId) {
        return this.query(`account_id = "${accountId}"`, { sort: '-date' });
    }

    async getByDateRange(startDate, endDate) {
        return this.query(`date >= "${startDate}" && date <= "${endDate}"`, { sort: '-date' });
    }

    async getAllWithRelations() {
        // Get all transactions with merchant data expanded
        const records = await this.getAll({ sort: '-date' });

        // Expand merchant data
        const merchantService = new MerchantService();
        const merchants = await merchantService.getAll();
        const merchantMap = {};
        merchants.forEach(m => {
            if (m.supabase_id) merchantMap[m.supabase_id] = m;
            merchantMap[m.id] = m;
        });

        return records.map(r => ({
            ...r,
            merchant: r.normalized_merchant_id ? merchantMap[r.normalized_merchant_id] : null
        }));
    }

    async getUncategorized() {
        return this.query(`status = "uncategorized"`, { sort: '-date' });
    }

    async getUncategorizedOrSuspense(accountId, suspenseId) {
        // Get uncategorized OR suspense transactions for an account
        let filter = `account_id = "${accountId}" && (status = "uncategorized"`;
        if (suspenseId) {
            filter += ` || chart_of_account_id = "${suspenseId}"`;
        }
        filter += ')';

        const records = await this.query(filter, { sort: '-date' });

        // Expand merchant data
        const merchantService = new MerchantService();
        const merchants = await merchantService.getAll();
        const merchantMap = {};
        merchants.forEach(m => {
            if (m.supabase_id) merchantMap[m.supabase_id] = m;
            merchantMap[m.id] = m;
        });

        return records.map(r => ({
            ...r,
            merchant: r.normalized_merchant_id ? merchantMap[r.normalized_merchant_id] : null
        }));
    }

    async getByAccountIdWithMerchant(accountId, options = {}) {
        const { startDate, endDate } = options;
        let filter = `account_id = "${accountId}"`;

        if (startDate && endDate) {
            filter += ` && date >= "${startDate}" && date <= "${endDate}"`;
        }

        const records = await this.query(filter, { sort: '-date' });

        // Expand merchant data
        const merchantService = new MerchantService();
        const merchants = await merchantService.getAll();
        const merchantMap = {};
        merchants.forEach(m => {
            if (m.supabase_id) merchantMap[m.supabase_id] = m;
            merchantMap[m.id] = m;
        });

        return records.map(r => ({
            ...r,
            merchant: r.normalized_merchant_id ? merchantMap[r.normalized_merchant_id] : null
        }));
    }

    /**
     * Supabase-compatible table() method - returns a query builder-like object
     * This allows existing code patterns like: supabaseTransactionsDB.table().select(...).eq(...)
     */
    table() {
        return new PocketBaseQueryBuilder(this.collectionName);
    }
}

class ChartOfAccountsService extends PocketBaseService {
    constructor() {
        super('chart_of_accounts');
    }

    async getByType(accountType) {
        return this.query(`account_type = "${accountType}"`);
    }

    async getActive() {
        return this.query(`is_active = true`);
    }
}

class CategoryService extends PocketBaseService {
    constructor() {
        super('category');
    }
}

class MerchantService extends PocketBaseService {
    constructor() {
        super('merchant');
    }

    async findByName(name) {
        try {
            const records = await this.query(`normalized_name ~ "${name}"`);
            return records[0] || null;
        } catch {
            return null;
        }
    }
}

class MerchantSplitRulesService extends PocketBaseService {
    constructor() {
        super('merchant_split_rules');
    }

    async getByMerchantName(merchantFriendlyName) {
        try {
            if (!merchantFriendlyName) return null;
            const records = await this.query(`merchant_friendly_name = "${merchantFriendlyName}"`);
            return records[0] || null;
        } catch {
            return null;
        }
    }
}

class TransactionSplitService extends PocketBaseService {
    constructor() {
        super('transaction_split');
    }

    async getByTransactionId(transactionId) {
        return this.query(`transaction_id = "${transactionId}"`);
    }

    async deleteByTransactionId(transactionId) {
        try {
            const records = await this.query(`transaction_id = "${transactionId}"`);
            for (const record of records) {
                await this.delete(record.id);
            }
            return true;
        } catch (error) {
            console.error('Error deleting transaction splits:', error);
            throw error;
        }
    }
}

class HoldingsService extends PocketBaseService {
    constructor() {
        super('holdings');
    }

    async getByAccountId(accountId) {
        return this.query(`account_id = "${accountId}"`);
    }

    async getBySymbol(symbol) {
        return this.query(`symbol = "${symbol}"`);
    }
}

class HoldingSnapshotsService extends PocketBaseService {
    constructor() {
        super('holding_snapshots');
    }

    async getByDateRange(startDate, endDate) {
        return this.query(`snapshot_date >= "${startDate}" && snapshot_date <= "${endDate}"`, { sort: 'snapshot_date' });
    }
}

class InvestmentAccountsService extends PocketBaseService {
    constructor() {
        super('investment_accounts');
    }
}

class InvestmentManagersService extends PocketBaseService {
    constructor() {
        super('investment_managers');
    }
}

class InvestmentTransactionsService extends PocketBaseService {
    constructor() {
        super('investment_transactions');
    }

    async getByAccountId(accountId) {
        return this.query(`account_id = "${accountId}"`, { sort: '-transaction_date' });
    }
}

class CashTransactionsService extends PocketBaseService {
    constructor() {
        super('cash_transactions');
    }
}

class ImportStagingService extends PocketBaseService {
    constructor() {
        super('import_staging');
    }

    async getPending() {
        return this.query(`status = "pending"`, { sort: '-uploaded_at' });
    }
}

class ImportRawDataService extends PocketBaseService {
    constructor() {
        super('import_raw_data');
    }

    async getByStagingId(stagingId) {
        return this.query(`staging_id = "${stagingId}"`);
    }
}

class ColumnMappingsService extends PocketBaseService {
    constructor() {
        super('column_mappings');
    }

    async getByAccountAndType(accountId, fileType) {
        return this.query(`account_id = "${accountId}" && file_type = "${fileType}"`);
    }
}

class DescriptionRulesService extends PocketBaseService {
    constructor() {
        super('description_rules');
    }
}

class UserProfileService extends PocketBaseService {
    constructor() {
        super('user_profile');
    }

    async getByUserId(userId) {
        try {
            const records = await this.query(`user_id = "${userId}"`);
            return records[0] || null;
        } catch {
            return null;
        }
    }
}

class GovernmentBenefitsService extends PocketBaseService {
    constructor() {
        super('government_benefits');
    }

    async getByUserId(userId) {
        try {
            const records = await this.query(`user_id = "${userId}"`);
            return records[0] || null;
        } catch {
            return null;
        }
    }
}

class ProfilesService extends PocketBaseService {
    constructor() {
        super('profiles');
    }
}

class AIExtractionLogsService extends PocketBaseService {
    constructor() {
        super('ai_extraction_logs');
    }
}

// ============ Export Service Instances ============

export const pbAccountsDB = new AccountsService();
export const pbTransactionsDB = new TransactionsService();
export const pbChartOfAccountsDB = new ChartOfAccountsService();
export const pbCategoryDB = new CategoryService();
export const pbMerchantDB = new MerchantService();
export const pbMerchantSplitRulesDB = new MerchantSplitRulesService();
export const pbTransactionSplitDB = new TransactionSplitService();
export const pbHoldingsDB = new HoldingsService();
export const pbHoldingSnapshotsDB = new HoldingSnapshotsService();
export const pbInvestmentAccountsDB = new InvestmentAccountsService();
export const pbInvestmentManagersDB = new InvestmentManagersService();
export const pbInvestmentTransactionsDB = new InvestmentTransactionsService();
export const pbCashTransactionsDB = new CashTransactionsService();
export const pbImportStagingDB = new ImportStagingService();
export const pbImportRawDataDB = new ImportRawDataService();
export const pbColumnMappingsDB = new ColumnMappingsService();
export const pbDescriptionRulesDB = new DescriptionRulesService();
export const pbUserProfileDB = new UserProfileService();
export const pbGovernmentBenefitsDB = new GovernmentBenefitsService();
export const pbProfilesDB = new ProfilesService();
export const pbAIExtractionLogsDB = new AIExtractionLogsService();

// ============ Supabase-compatible aliases (for easy migration) ============
// These allow changing import path from supabaseDatabase to pocketbaseDatabase
export const supabaseAccountsDB = pbAccountsDB;
export const supabaseTransactionsDB = pbTransactionsDB;
export const supabaseChartOfAccountsDB = pbChartOfAccountsDB;
export const supabaseCategoryDB = pbCategoryDB;
export const supabaseMerchantDB = pbMerchantDB;
export const supabaseMerchantSplitRulesDB = pbMerchantSplitRulesDB;
export const supabaseTransactionSplitDB = pbTransactionSplitDB;
export const supabaseHoldingsDB = pbHoldingsDB;
export const supabaseHoldingSnapshotsDB = pbHoldingSnapshotsDB;
export const supabaseInvestmentAccountsDB = pbInvestmentAccountsDB;
export const supabaseInvestmentManagersDB = pbInvestmentManagersDB;
export const supabaseInvestmentTransactionsDB = pbInvestmentTransactionsDB;
export const supabaseCashTransactionsDB = pbCashTransactionsDB;
export const supabaseImportStagingDB = pbImportStagingDB;
export const supabaseImportRawDataDB = pbImportRawDataDB;
export const supabaseColumnMappingsDB = pbColumnMappingsDB;
export const supabaseDescriptionRulesDB = pbDescriptionRulesDB;
export const supabaseUserProfileDB = pbUserProfileDB;
export const supabaseGovernmentBenefitsDB = pbGovernmentBenefitsDB;
export const supabaseProfilesDB = pbProfilesDB;
export const supabaseAIExtractionLogsDB = pbAIExtractionLogsDB;

// Additional services that may be used (create placeholder classes if needed)
class ProvidersService extends PocketBaseService {
    constructor() { super('providers'); }
}
class BudgetsService extends PocketBaseService {
    constructor() { super('budgets'); }
}
class GoalsService extends PocketBaseService {
    constructor() { super('goals'); }
}
class ProductsService extends PocketBaseService {
    constructor() { super('products'); }
}
class BeliefTagsService extends PocketBaseService {
    constructor() { super('belief_tags'); }
}
class SubscriptionHistoryService extends PocketBaseService {
    constructor() { super('subscription_history'); }
}
class UserPreferencesService extends PocketBaseService {
    constructor() { super('user_preferences'); }
}

export const supabaseProvidersDB = new ProvidersService();
export const supabaseBudgetsDB = new BudgetsService();
export const supabaseGoalsDB = new GoalsService();
export const supabaseProductsDB = new ProductsService();
export const supabaseBeliefTagsDB = new BeliefTagsService();
export const supabaseSubscriptionHistoryDB = new SubscriptionHistoryService();
export const supabaseUserPreferencesDB = new UserPreferencesService();

// Legacy aliases
export const supabaseKnowledgeDB = supabaseBeliefTagsDB;
export const supabaseSettingsDB = supabaseUserPreferencesDB;
