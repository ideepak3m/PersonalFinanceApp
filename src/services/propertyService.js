/**
 * Property Service - Handles property CRUD and rental income linking
 */

import { propertiesDB, mortgagesDB, mortgageTermsDB, mortgagePaymentsDB, transactionsDB } from './database';

/**
 * Get all properties for current user
 */
export async function getProperties() {
    try {
        const properties = await propertiesDB.getAll();
        return { success: true, properties };
    } catch (error) {
        console.error('Error fetching properties:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get a single property by ID with its mortgages
 */
export async function getPropertyById(propertyId) {
    try {
        const property = await propertiesDB.getById(propertyId);

        // Get associated mortgages
        const allMortgages = await mortgagesDB.getAll();
        const mortgages = allMortgages.filter(m => m.property_id === propertyId);

        // Get current terms for each mortgage
        const allTerms = await mortgageTermsDB.getAll();
        const mortgagesWithTerms = mortgages.map(mortgage => {
            const currentTerm = allTerms.find(t =>
                t.mortgage_id === mortgage.id && t.is_current_term
            );
            return { ...mortgage, currentTerm };
        });

        return {
            success: true,
            property: { ...property, mortgages: mortgagesWithTerms }
        };
    } catch (error) {
        console.error('Error fetching property:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get properties with summary (equity, mortgages count)
 */
export async function getPropertiesWithSummary() {
    try {
        const properties = await propertiesDB.getAll();
        const mortgages = await mortgagesDB.getAll();

        const propertiesWithSummary = properties.map(property => {
            const propertyMortgages = mortgages.filter(m =>
                m.property_id === property.id && m.is_active
            );

            const totalMortgageBalance = propertyMortgages.reduce(
                (sum, m) => sum + (m.current_balance || 0), 0
            );

            const marketValue = property.current_market_value || property.purchase_price;
            const estimatedEquity = marketValue - totalMortgageBalance;

            const totalClosingCosts = (property.down_payment || 0) +
                (property.land_transfer_tax || 0) +
                (property.legal_fees || 0) +
                (property.home_inspection || 0) +
                (property.appraisal_fee || 0) +
                (property.other_closing_costs || 0);

            return {
                ...property,
                activeMortgagesCount: propertyMortgages.length,
                totalMortgageBalance,
                estimatedEquity,
                totalClosingCosts,
                marketValue
            };
        });

        return { success: true, properties: propertiesWithSummary };
    } catch (error) {
        console.error('Error fetching properties with summary:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add a new property
 */
export async function addProperty(propertyData) {
    try {
        const property = await propertiesDB.add(propertyData);
        return { success: true, property };
    } catch (error) {
        console.error('Error adding property:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Update a property
 */
export async function updateProperty(propertyId, propertyData) {
    try {
        const property = await propertiesDB.update(propertyId, propertyData);
        return { success: true, property };
    } catch (error) {
        console.error('Error updating property:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete a property (will cascade to mortgages)
 */
export async function deleteProperty(propertyId) {
    try {
        await propertiesDB.delete(propertyId);
        return { success: true };
    } catch (error) {
        console.error('Error deleting property:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get rental income transactions for a property
 * Searches transactions for descriptions matching property name or address
 */
export async function getRentalIncomeForProperty(propertyId, startDate = null, endDate = null) {
    try {
        const property = await propertiesDB.getById(propertyId);
        if (!property) {
            return { success: false, error: 'Property not found' };
        }

        // Get all income transactions (positive amounts or 'Income' category)
        const allTransactions = await transactionsDB.getAll();

        // Filter for income transactions that might be rental income
        // This is a basic implementation - could be enhanced with linked_property_id
        const rentalTransactions = allTransactions.filter(txn => {
            const amount = parseFloat(txn.amount || 0);
            if (amount <= 0) return false;

            // Apply date filters if provided
            if (startDate && new Date(txn.transaction_date) < new Date(startDate)) return false;
            if (endDate && new Date(txn.transaction_date) > new Date(endDate)) return false;

            // Check if description contains property name or address
            const desc = (txn.description || '').toLowerCase();
            const propertyName = (property.property_name || '').toLowerCase();
            const address = (property.address || '').toLowerCase();

            // Look for rental-related keywords
            const isRentalKeyword = desc.includes('rent') ||
                desc.includes('tenant') ||
                desc.includes('lease');

            // Check if mentions property
            const mentionsProperty = (propertyName && desc.includes(propertyName)) ||
                (address && desc.includes(address));

            return isRentalKeyword || mentionsProperty;
        });

        const totalRentalIncome = rentalTransactions.reduce(
            (sum, txn) => sum + parseFloat(txn.amount || 0), 0
        );

        return {
            success: true,
            transactions: rentalTransactions,
            totalRentalIncome,
            count: rentalTransactions.length
        };
    } catch (error) {
        console.error('Error fetching rental income:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Link a transaction to a property as rental income
 * This would require adding a linked_property_id column to transactions
 */
export async function linkTransactionToProperty(transactionId, propertyId) {
    try {
        // Note: This requires adding linked_property_id column to transactions table
        await transactionsDB.update(transactionId, { linked_property_id: propertyId });
        return { success: true };
    } catch (error) {
        console.error('Error linking transaction to property:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get all linked rental income transactions for a property
 */
export async function getLinkedRentalIncome(propertyId) {
    try {
        const allTransactions = await transactionsDB.getAll();
        const linkedTransactions = allTransactions.filter(
            txn => txn.linked_property_id === propertyId
        );

        const totalIncome = linkedTransactions.reduce(
            (sum, txn) => sum + parseFloat(txn.amount || 0), 0
        );

        return {
            success: true,
            transactions: linkedTransactions,
            totalIncome,
            count: linkedTransactions.length
        };
    } catch (error) {
        console.error('Error fetching linked rental income:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get property investment summary (for investment properties)
 */
export async function getPropertyInvestmentSummary(propertyId) {
    try {
        const property = await propertiesDB.getById(propertyId);
        if (!property) {
            return { success: false, error: 'Property not found' };
        }

        if (property.is_primary_residence) {
            return {
                success: true,
                summary: {
                    isInvestmentProperty: false,
                    message: 'This is a primary residence, not an investment property'
                }
            };
        }

        // Get mortgages
        const allMortgages = await mortgagesDB.getAll();
        const mortgages = allMortgages.filter(m => m.property_id === propertyId);

        const totalMortgageBalance = mortgages
            .filter(m => m.is_active)
            .reduce((sum, m) => sum + (m.current_balance || 0), 0);

        const marketValue = property.current_market_value || property.purchase_price;
        const equity = marketValue - totalMortgageBalance;

        // Calculate ROI (simplified)
        const totalInvested = property.purchase_price +
            (property.down_payment || 0) +
            (property.land_transfer_tax || 0) +
            (property.legal_fees || 0) +
            (property.other_closing_costs || 0);

        // Use expected monthly rent to calculate annual rental income
        const annualRentalIncome = (property.expected_monthly_rent || 0) * 12;

        // Gross Rental Yield
        const grossRentalYield = marketValue > 0
            ? (annualRentalIncome / marketValue) * 100
            : 0;

        return {
            success: true,
            summary: {
                isInvestmentProperty: true,
                property,
                marketValue,
                equity,
                totalMortgageBalance,
                totalInvested,
                annualRentalIncome,
                grossRentalYield: grossRentalYield.toFixed(2),
                mortgagesCount: mortgages.length
            }
        };
    } catch (error) {
        console.error('Error fetching property investment summary:', error);
        return { success: false, error: error.message };
    }
}

// ============ Mortgage-related functions ============

/**
 * Get all mortgages for a property with current term
 */
export async function getMortgagesForProperty(propertyId) {
    try {
        const allMortgages = await mortgagesDB.getAll();
        const mortgages = allMortgages.filter(m => m.property_id === propertyId);

        // Get all terms to find current term for each mortgage
        const allTerms = await mortgageTermsDB.getAll();

        const mortgagesWithTerms = mortgages.map(mortgage => {
            const currentTerm = allTerms.find(t =>
                t.mortgage_id === mortgage.id && t.is_current_term
            );
            return { ...mortgage, currentTerm };
        });

        return { success: true, mortgages: mortgagesWithTerms };
    } catch (error) {
        console.error('Error fetching mortgages:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add a mortgage with initial term
 */
export async function addMortgageWithTerm(mortgageData, termData) {
    try {
        // Add mortgage - include term fields that exist on legacy mortgages table
        // (Supabase has these as NOT NULL on mortgages table)
        const mortgage = await mortgagesDB.add({
            ...mortgageData,
            lender: termData.lender || '',
            interest_rate: termData.interest_rate || 0,
            amortization_years: mortgageData.original_amortization_years || 25,
            term_years: termData.term_years || 5,
            term_end_date: termData.term_end_date || null,
            payment_frequency: termData.payment_frequency || 'monthly',
            regular_payment_amount: termData.regular_payment_amount || 0,
            payment_start_date: termData.term_start_date || mortgageData.loan_date
        });

        // Add initial term
        const term = await mortgageTermsDB.add({
            ...termData,
            mortgage_id: mortgage.id,
            term_number: 1,
            is_current_term: true,
            renewal_type: 'original'
        });

        return { success: true, mortgage, term };
    } catch (error) {
        console.error('Error adding mortgage with term:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Add a renewal/refinance term to existing mortgage
 */
export async function addMortgageTerm(mortgageId, termData) {
    try {
        // Get existing terms to determine term number
        const allTerms = await mortgageTermsDB.getAll();
        const existingTerms = allTerms.filter(t => t.mortgage_id === mortgageId);
        const nextTermNumber = existingTerms.length + 1;

        // Mark previous current term as not current
        const currentTerm = existingTerms.find(t => t.is_current_term);
        if (currentTerm) {
            await mortgageTermsDB.update(currentTerm.id, {
                is_current_term: false,
                balance_at_term_end: termData.balance_at_term_start || currentTerm.balance_at_term_start
            });
        }

        // Update mortgage with current lender if provided
        if (termData.lender) {
            await mortgagesDB.update(mortgageId, { lender: termData.lender });
        }

        // Add new term
        const term = await mortgageTermsDB.add({
            ...termData,
            mortgage_id: mortgageId,
            term_number: nextTermNumber,
            is_current_term: true
        });

        return { success: true, term };
    } catch (error) {
        console.error('Error adding mortgage term:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Get mortgage history (all terms)
 */
export async function getMortgageHistory(mortgageId) {
    try {
        const allTerms = await mortgageTermsDB.getAll();
        const terms = allTerms
            .filter(t => t.mortgage_id === mortgageId)
            .sort((a, b) => a.term_number - b.term_number);

        return { success: true, terms };
    } catch (error) {
        console.error('Error fetching mortgage history:', error);
        return { success: false, error: error.message };
    }
}

export default {
    getProperties,
    getPropertyById,
    getPropertiesWithSummary,
    addProperty,
    updateProperty,
    deleteProperty,
    getRentalIncomeForProperty,
    linkTransactionToProperty,
    getLinkedRentalIncome,
    getPropertyInvestmentSummary,
    getMortgagesForProperty,
    addMortgageWithTerm,
    addMortgageTerm,
    getMortgageHistory
};
