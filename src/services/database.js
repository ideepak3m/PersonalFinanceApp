// src/services/database.js
import Dexie from 'dexie';

class FinanceDatabase extends Dexie {
    constructor() {
        super('PersonalFinanceDB');

        this.version(1).stores({
            providers: '++id, name, country, type',
            accounts: '++id, country, accountCategory, providerId, accountNumber, name',
            products: '++id, accountId, productType, productCode, purchaseDate',
            productMetadata: '++id, productId, key',
            transactions: '++id, accountId, productId, date, type, category',
            budgets: '++id, category, month, year',
            goals: '++id, name, deadline'
        });
    }
}

const db = new FinanceDatabase();

// Providers
export const providersDB = {
    getAll: async () => await db.providers.toArray(),

    getByCountry: async (country) =>
        await db.providers.where('country').equals(country).toArray(),

    getByType: async (type) =>
        await db.providers.where('type').equals(type).toArray(),

    add: async (provider) => {
        const id = await db.providers.add(provider);
        return await db.providers.get(id);
    },

    update: async (id, updates) => {
        await db.providers.update(id, updates);
        return await db.providers.get(id);
    },

    delete: async (id) => {
        await db.providers.delete(id);
    }
};

// Accounts
export const accountsDB = {
    getAll: async () => await db.accounts.toArray(),

    getAllWithProviders: async () => {
        const accounts = await db.accounts.toArray();
        const providers = await db.providers.toArray();

        return accounts.map(account => ({
            ...account,
            provider: providers.find(p => p.id === account.providerId)
        }));
    },

    getByCategory: async (category) =>
        await db.accounts.where('accountCategory').equals(category).toArray(),

    getByProvider: async (providerId) =>
        await db.accounts.where('providerId').equals(providerId).toArray(),

    getByCountry: async (country) =>
        await db.accounts.where('country').equals(country).toArray(),

    add: async (account) => {
        const id = await db.accounts.add({
            ...account,
            createdAt: account.createdAt || new Date().toISOString()
        });
        return await db.accounts.get(id);
    },

    update: async (id, updates) => {
        await db.accounts.update(id, updates);
        return await db.accounts.get(id);
    },

    delete: async (id) => {
        // Delete associated products and metadata
        const products = await productsDB.getByAccount(id);
        for (const product of products) {
            await productsDB.delete(product.id);
        }
        await db.accounts.delete(id);
    },

    // Get account value (sum of all products)
    getValue: async (accountId) => {
        const products = await productsDB.getByAccount(accountId);
        return products.reduce((sum, p) =>
            sum + (p.quantity * p.currentPrice), 0
        );
    }
};

// Products
export const productsDB = {
    getAll: async () => await db.products.toArray(),

    getByAccount: async (accountId) =>
        await db.products.where('accountId').equals(accountId).toArray(),

    getByType: async (productType) =>
        await db.products.where('productType').equals(productType).toArray(),

    getByAccountAndType: async (accountId, productType) =>
        await db.products
            .where(['accountId', 'productType'])
            .equals([accountId, productType])
            .toArray(),

    add: async (product) => {
        const id = await db.products.add(product);
        return await db.products.get(id);
    },

    update: async (id, updates) => {
        await db.products.update(id, updates);
        return await db.products.get(id);
    },

    delete: async (id) => {
        // Delete associated metadata
        const metadata = await productMetadataDB.getByProduct(id);
        for (const meta of metadata) {
            await db.productMetadata.delete(meta.id);
        }
        await db.products.delete(id);
    },

    // Get product with metadata
    getWithMetadata: async (id) => {
        const product = await db.products.get(id);
        if (product) {
            const metadata = await productMetadataDB.getByProduct(id);
            product.metadata = {};
            metadata.forEach(m => {
                product.metadata[m.key] = m.value;
            });
        }
        return product;
    },

    // Get current value
    getValue: async (id) => {
        const product = await db.products.get(id);
        return product ? product.quantity * product.currentPrice : 0;
    },

    // Get gain/loss
    getGainLoss: async (id) => {
        const product = await db.products.get(id);
        if (!product) return 0;
        const currentValue = product.quantity * product.currentPrice;
        const purchaseValue = product.quantity * product.purchasePrice;
        return currentValue - purchaseValue;
    }
};

// Product Metadata
export const productMetadataDB = {
    getByProduct: async (productId) =>
        await db.productMetadata.where('productId').equals(productId).toArray(),

    get: async (productId, key) =>
        await db.productMetadata
            .where(['productId', 'key'])
            .equals([productId, key])
            .first(),

    set: async (productId, key, value) => {
        const existing = await productMetadataDB.get(productId, key);
        if (existing) {
            await db.productMetadata.update(existing.id, { value });
        } else {
            await db.productMetadata.add({ productId, key, value });
        }
    },

    delete: async (productId, key) => {
        const existing = await productMetadataDB.get(productId, key);
        if (existing) {
            await db.productMetadata.delete(existing.id);
        }
    }
};

// Transactions
export const transactionsDB = {
    getAll: async () =>
        await db.transactions.orderBy('date').reverse().toArray(),

    getByAccount: async (accountId) =>
        await db.transactions
            .where('accountId')
            .equals(accountId)
            .reverse()
            .toArray(),

    getByProduct: async (productId) =>
        await db.transactions
            .where('productId')
            .equals(productId)
            .reverse()
            .toArray(),

    getByDateRange: async (startDate, endDate) =>
        await db.transactions
            .where('date')
            .between(startDate, endDate)
            .toArray(),

    getByType: async (type) =>
        await db.transactions.where('type').equals(type).toArray(),

    add: async (transaction) => {
        const id = await db.transactions.add({
            ...transaction,
            date: transaction.date || new Date().toISOString()
        });
        return await db.transactions.get(id);
    },

    bulkAdd: async (transactions) => {
        await db.transactions.bulkAdd(transactions);
    },

    update: async (id, updates) => {
        await db.transactions.update(id, updates);
        return await db.transactions.get(id);
    },

    delete: async (id) => {
        await db.transactions.delete(id);
    }
};

export default db;
