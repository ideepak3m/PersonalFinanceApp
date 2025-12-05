// src/services/transactionBusinessLogic.js
// Core business logic separated from UI

import {
    supabaseTransactionsDB,
    supabaseTransactionSplitDB,
    supabaseMerchantDB,
    supabaseCategoryDB
} from './pocketbaseDatabase';

class TransactionBusinessLogic {
    /**
     * Normalize merchant name by removing common suffixes, numbers, and cleaning up
     */
    normalizeMerchantName(rawName) {
        if (!rawName) return '';

        let normalized = rawName.trim();

        // Remove common patterns
        normalized = normalized
            // Remove store numbers like #010, W526, etc.
            .replace(/\s*[#W]\d+\s*$/i, '')
            .replace(/\s*#\d+$/i, '')
            // Remove trailing numbers
            .replace(/\s+\d+$/, '')
            // Remove asterisks (often used in card transactions)
            .replace(/\*/g, ' ')
            // Remove multiple spaces
            .replace(/\s+/g, ' ')
            .trim();

        // Capitalize first letter of each word for consistency
        normalized = normalized
            .toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        return normalized;
    }

    /**
     * Validate UUID format
     */
    isValidUUID(uuid) {
        if (!uuid || typeof uuid !== 'string') return false;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
    }

    /**
     * Find merchant by name or alias
     */
    async findMerchant(rawName, merchantsList) {
        if (!rawName) return null;

        const lower = rawName.toLowerCase();

        // Try normalized name match
        let merchant = merchantsList.find(
            m => m.normalized_name?.toLowerCase() === lower
        );
        if (merchant) return merchant;

        // Try alias match
        merchant = merchantsList.find(
            m => Array.isArray(m.aliases) &&
                m.aliases.map(a => a.toLowerCase()).includes(lower)
        );
        if (merchant) return merchant;

        // Fallback to database search
        return await supabaseMerchantDB.getByRawNameOrAlias(rawName);
    }

    /**
     * Get suggested Chart of Account based on description
     */
    getSuggestedChartOfAccount(description, chartOfAccounts) {
        if (!description || !chartOfAccounts.length) return null;

        const lower = description.toLowerCase();
        const match = chartOfAccounts.find(coa =>
            lower.includes(coa.name.toLowerCase()) ||
            (coa.description && lower.includes(coa.description.toLowerCase()))
        );

        return match || null;
    }

    /**
     * Check if a category allows splitting
     */
    isSplitEnabled(categoryId, categoriesList) {
        const category = categoriesList.find(c => c.id === categoryId);
        return category?.is_split_enabled || false;
    }

    /**
     * Normalize transaction for database storage
     */
    normalizeTransaction(txn) {
        return {
            user_id: txn.user_id,
            date: txn.date,
            raw_merchant_name: txn.description || txn.raw_merchant_name,
            normalized_merchant_id: this.isValidUUID(txn.normalized_merchant_id)
                ? txn.normalized_merchant_id
                : null,
            amount: txn.amount,
            currency: txn.currency || 'USD',
            is_split: txn.is_split || false,
            notes: txn.notes || null,
            account_id: this.isValidUUID(txn.account_id) ? txn.account_id : null,
            category_id: this.isValidUUID(txn.category_id) ? txn.category_id : null,
            chart_of_account_id: this.isValidUUID(txn.chart_of_account_id)
                ? txn.chart_of_account_id
                : null,
            split_chart_of_account_id: this.isValidUUID(txn.split_chart_of_account_id)
                ? txn.split_chart_of_account_id
                : null,
            description: txn.description || txn.raw_merchant_name,
            memo: txn.memo || null,
            product_id: this.isValidUUID(txn.product_id) ? txn.product_id : null,
            type: txn.type || null
        };
    }

    /**
     * Validate split percentages total 100%
     */
    validateSplits(splits) {
        if (!splits || splits.length === 0) {
            return { valid: false, error: 'No splits provided' };
        }

        const totalPercent = splits.reduce((sum, s) =>
            sum + (parseFloat(s.percent) || 0), 0
        );

        if (Math.abs(totalPercent - 100) > 0.01) {
            return {
                valid: false,
                error: `Splits must total 100% (currently ${totalPercent.toFixed(1)}%)`
            };
        }

        // Validate each split has a chart of account
        const invalidSplits = splits.filter(s => !this.isValidUUID(s.chartOfAccountId));
        if (invalidSplits.length > 0) {
            return {
                valid: false,
                error: 'All splits must have a valid Chart of Account'
            };
        }

        return { valid: true };
    }

    /**
     * Save a split transaction
     */
    async saveSplitTransaction(transaction, splits) {
        // Validate splits
        const validation = this.validateSplits(splits);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Normalize and save main transaction
        const txnToSave = this.normalizeTransaction({
            ...transaction,
            is_split: true,
            chart_of_account_id: null,
            split_chart_of_account_id: splits[0].chartOfAccountId
        });

        const savedTransaction = await supabaseTransactionsDB.add(txnToSave);

        // Create split records
        const splitRecords = splits.map(split => ({
            transaction_id: savedTransaction.id,
            category_id: transaction.category_id,
            percentage: parseFloat(split.percent),
            amount: (parseFloat(split.percent) / 100) * Math.abs(transaction.amount),
            chart_of_account_id: split.chartOfAccountId,
            belief_tag: split.beliefTag || null
        }));

        await supabaseTransactionSplitDB.bulkAdd(splitRecords);

        return savedTransaction;
    }

    /**
     * Update splits for existing transaction
     */
    async updateSplitTransaction(transactionId, transaction, splits) {
        // Validate splits
        const validation = this.validateSplits(splits);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Update transaction to mark as split
        await supabaseTransactionsDB.update(transactionId, {
            is_split: true,
            chart_of_account_id: null,
            split_chart_of_account_id: splits[0].chartOfAccountId
        });

        // Delete old splits
        await supabaseTransactionSplitDB.deleteByTransactionId(transactionId);

        // Create new split records
        const splitRecords = splits.map(split => ({
            transaction_id: transactionId,
            category_id: transaction.category_id,
            percentage: parseFloat(split.percent),
            amount: (parseFloat(split.percent) / 100) * Math.abs(transaction.amount),
            chart_of_account_id: split.chartOfAccountId,
            belief_tag: split.beliefTag || null
        }));

        await supabaseTransactionSplitDB.bulkAdd(splitRecords);

        return true;
    }

    /**
     * Bulk save transactions
     */
    async bulkSaveTransactions(transactions) {
        const normalized = transactions.map(txn => this.normalizeTransaction(txn));
        return await supabaseTransactionsDB.bulkAdd(normalized);
    }

    /**
     * Create or update merchant
     */
    async createMerchant(name, categoryId, aliases = []) {
        const normalizedName = this.normalizeMerchantName(name);

        return await supabaseMerchantDB.add({
            normalized_name: normalizedName,
            category_id: categoryId,
            aliases: aliases.length > 0 ? aliases : [name]
        });
    }

    /**
     * Enrich transaction with merchant and category data
     */
    async enrichTransaction(transaction, merchants, categories) {
        const merchant = await this.findMerchant(
            transaction.description || transaction.raw_merchant_name,
            merchants
        );

        if (!merchant) {
            return {
                ...transaction,
                needsCategorization: true
            };
        }

        const category = categories.find(c => c.id === merchant.category_id);
        const suggestedCoA = this.getSuggestedChartOfAccount(
            transaction.description,
            []
        );

        return {
            ...transaction,
            normalized_merchant_id: merchant.id,
            category_id: merchant.category_id,
            merchant,
            category,
            needsSplit: category?.is_split_enabled || false,
            suggested_chart_of_account_id: suggestedCoA?.id || null
        };
    }

    /**
     * Batch enrich transactions
     */
    async enrichTransactions(transactions, merchants, categories, chartOfAccounts) {
        const enriched = [];

        for (const txn of transactions) {
            const merchant = await this.findMerchant(
                txn.description || txn.raw_merchant_name,
                merchants
            );

            if (!merchant) {
                enriched.push({
                    ...txn,
                    status: 'needs_categorization',
                    needsCategorization: true
                });
                continue;
            }

            const category = categories.find(c => c.id === merchant.category_id);
            const suggestedCoA = this.getSuggestedChartOfAccount(
                txn.description,
                chartOfAccounts
            );

            enriched.push({
                ...txn,
                normalized_merchant_id: merchant.id,
                category_id: merchant.category_id,
                merchant,
                category,
                status: category?.is_split_enabled ? 'needs_split' : 'needs_chart_of_account',
                needsSplit: category?.is_split_enabled || false,
                chart_of_account_id: suggestedCoA?.id || null
            });
        }

        return enriched;
    }
}

// Export singleton instance
export const transactionLogic = new TransactionBusinessLogic();