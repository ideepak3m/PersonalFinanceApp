import { supabase } from './supabaseClient';

// ============================================================
// INSURANCE POLICIES
// ============================================================

/**
 * Fetch all insurance policies for the current user
 */
export const fetchInsurancePolicies = async (filters = {}) => {
    let query = supabase
        .from('insurance_policies')
        .select(`
            *,
            nominees:insurance_nominees(*),
            riders:insurance_riders(*)
        `)
        .order('next_premium_due_date', { ascending: true, nullsFirst: false });

    // Apply filters
    if (filters.status) {
        query = query.eq('status', filters.status);
    }
    if (filters.planType) {
        query = query.eq('plan_type', filters.planType);
    }
    if (filters.insurer) {
        query = query.eq('insurer_name', filters.insurer);
    }

    const { data, error } = await query;

    if (error) {
        console.error('Error fetching insurance policies:', error);
        throw error;
    }

    return data;
};

/**
 * Fetch a single insurance policy with all related data
 */
export const fetchInsurancePolicyById = async (policyId) => {
    const { data, error } = await supabase
        .from('insurance_policies')
        .select(`
            *,
            nominees:insurance_nominees(*),
            riders:insurance_riders(*),
            premium_payments:insurance_premium_payments(
                *
            ),
            bonus_history:insurance_bonus_history(*)
        `)
        .eq('id', policyId)
        .single();

    if (error) {
        console.error('Error fetching insurance policy:', error);
        throw error;
    }

    return data;
};

/**
 * Create a new insurance policy
 */
export const createInsurancePolicy = async (policyData) => {
    const { data: { user } } = await supabase.auth.getUser();

    const { nominees, riders, ...policy } = policyData;

    // Insert policy
    const { data: newPolicy, error: policyError } = await supabase
        .from('insurance_policies')
        .insert([{ ...policy, user_id: user.id }])
        .select()
        .single();

    if (policyError) {
        console.error('Error creating insurance policy:', policyError);
        throw policyError;
    }

    // Insert nominees if provided
    if (nominees && nominees.length > 0) {
        const nomineesWithPolicyId = nominees.map(n => ({
            ...n,
            policy_id: newPolicy.id
        }));

        const { error: nomineeError } = await supabase
            .from('insurance_nominees')
            .insert(nomineesWithPolicyId);

        if (nomineeError) {
            console.error('Error adding nominees:', nomineeError);
        }
    }

    // Insert riders if provided
    if (riders && riders.length > 0) {
        const ridersWithPolicyId = riders.map(r => ({
            ...r,
            policy_id: newPolicy.id
        }));

        const { error: riderError } = await supabase
            .from('insurance_riders')
            .insert(ridersWithPolicyId);

        if (riderError) {
            console.error('Error adding riders:', riderError);
        }
    }

    return newPolicy;
};

/**
 * Update an existing insurance policy
 */
export const updateInsurancePolicy = async (policyId, updates) => {
    const { nominees, riders, premium_payments, bonus_history, ...policyUpdates } = updates;

    const { data, error } = await supabase
        .from('insurance_policies')
        .update({ ...policyUpdates, updated_at: new Date().toISOString() })
        .eq('id', policyId)
        .select()
        .single();

    if (error) {
        console.error('Error updating insurance policy:', error);
        throw error;
    }

    return data;
};

/**
 * Delete an insurance policy
 */
export const deleteInsurancePolicy = async (policyId) => {
    const { error } = await supabase
        .from('insurance_policies')
        .delete()
        .eq('id', policyId);

    if (error) {
        console.error('Error deleting insurance policy:', error);
        throw error;
    }

    return true;
};

// ============================================================
// NOMINEES
// ============================================================

/**
 * Add a nominee to a policy
 */
export const addNominee = async (policyId, nomineeData) => {
    const { data, error } = await supabase
        .from('insurance_nominees')
        .insert([{ ...nomineeData, policy_id: policyId }])
        .select()
        .single();

    if (error) {
        console.error('Error adding nominee:', error);
        throw error;
    }

    return data;
};

/**
 * Update a nominee
 */
export const updateNominee = async (nomineeId, updates) => {
    const { data, error } = await supabase
        .from('insurance_nominees')
        .update(updates)
        .eq('id', nomineeId)
        .select()
        .single();

    if (error) {
        console.error('Error updating nominee:', error);
        throw error;
    }

    return data;
};

/**
 * Delete a nominee
 */
export const deleteNominee = async (nomineeId) => {
    const { error } = await supabase
        .from('insurance_nominees')
        .delete()
        .eq('id', nomineeId);

    if (error) {
        console.error('Error deleting nominee:', error);
        throw error;
    }

    return true;
};

// ============================================================
// RIDERS
// ============================================================

/**
 * Add a rider to a policy
 */
export const addRider = async (policyId, riderData) => {
    const { data, error } = await supabase
        .from('insurance_riders')
        .insert([{ ...riderData, policy_id: policyId }])
        .select()
        .single();

    if (error) {
        console.error('Error adding rider:', error);
        throw error;
    }

    return data;
};

/**
 * Update a rider
 */
export const updateRider = async (riderId, updates) => {
    const { data, error } = await supabase
        .from('insurance_riders')
        .update(updates)
        .eq('id', riderId)
        .select()
        .single();

    if (error) {
        console.error('Error updating rider:', error);
        throw error;
    }

    return data;
};

/**
 * Delete a rider
 */
export const deleteRider = async (riderId) => {
    const { error } = await supabase
        .from('insurance_riders')
        .delete()
        .eq('id', riderId);

    if (error) {
        console.error('Error deleting rider:', error);
        throw error;
    }

    return true;
};

// ============================================================
// PREMIUM PAYMENTS
// ============================================================

/**
 * Record a premium payment
 */
export const recordPremiumPayment = async (policyId, paymentData) => {
    const { data, error } = await supabase
        .from('insurance_premium_payments')
        .insert([{ ...paymentData, policy_id: policyId }])
        .select()
        .single();

    if (error) {
        console.error('Error recording premium payment:', error);
        throw error;
    }

    return data;
};

/**
 * Get premium payment history for a policy
 */
export const getPremiumPayments = async (policyId) => {
    const { data, error } = await supabase
        .from('insurance_premium_payments')
        .select('*')
        .eq('policy_id', policyId)
        .order('payment_date', { ascending: false });

    if (error) {
        console.error('Error fetching premium payments:', error);
        throw error;
    }

    return data;
};

/**
 * Delete a premium payment record
 */
export const deletePremiumPayment = async (paymentId) => {
    const { error } = await supabase
        .from('insurance_premium_payments')
        .delete()
        .eq('id', paymentId);

    if (error) {
        console.error('Error deleting premium payment:', error);
        throw error;
    }

    return true;
};

// ============================================================
// BONUS HISTORY
// ============================================================

/**
 * Record a bonus declaration
 */
export const recordBonus = async (policyId, bonusData) => {
    const { data, error } = await supabase
        .from('insurance_bonus_history')
        .insert([{ ...bonusData, policy_id: policyId }])
        .select()
        .single();

    if (error) {
        console.error('Error recording bonus:', error);
        throw error;
    }

    return data;
};

/**
 * Get bonus history for a policy
 */
export const getBonusHistory = async (policyId) => {
    const { data, error } = await supabase
        .from('insurance_bonus_history')
        .select('*')
        .eq('policy_id', policyId)
        .order('financial_year', { ascending: false });

    if (error) {
        console.error('Error fetching bonus history:', error);
        throw error;
    }

    return data;
};

// ============================================================
// ANALYTICS & SUMMARY
// ============================================================

/**
 * Get insurance summary statistics
 */
export const getInsuranceSummary = async () => {
    const { data: policies, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('status', 'active');

    if (error) {
        console.error('Error fetching insurance summary:', error);
        throw error;
    }

    const summary = {
        totalPolicies: policies.length,
        totalSumAssured: policies.reduce((sum, p) => sum + parseFloat(p.sum_assured || 0), 0),
        totalAnnualPremium: policies.reduce((sum, p) => {
            const premium = parseFloat(p.premium_amount || 0);
            const freq = p.premium_frequency;
            const multiplier = {
                'monthly': 12,
                'quarterly': 4,
                'half_yearly': 2,
                'annual': 1,
                'single': 0
            };
            return sum + (premium * (multiplier[freq] || 1));
        }, 0),
        totalPremiumsPaid: policies.reduce((sum, p) => sum + parseFloat(p.total_premiums_paid || 0), 0),
        totalAccruedBonus: policies.reduce((sum, p) => sum + parseFloat(p.accrued_bonus || 0), 0),
        totalExpectedMaturity: policies.reduce((sum, p) => sum + parseFloat(p.expected_maturity_value || 0), 0),
        byPlanType: {},
        byInsurer: {},
        upcomingPremiums: []
    };

    // Group by plan type
    policies.forEach(p => {
        if (!summary.byPlanType[p.plan_type]) {
            summary.byPlanType[p.plan_type] = { count: 0, sumAssured: 0 };
        }
        summary.byPlanType[p.plan_type].count++;
        summary.byPlanType[p.plan_type].sumAssured += parseFloat(p.sum_assured || 0);
    });

    // Group by insurer
    policies.forEach(p => {
        if (!summary.byInsurer[p.insurer_name]) {
            summary.byInsurer[p.insurer_name] = { count: 0, sumAssured: 0 };
        }
        summary.byInsurer[p.insurer_name].count++;
        summary.byInsurer[p.insurer_name].sumAssured += parseFloat(p.sum_assured || 0);
    });

    // Upcoming premiums (next 30 days)
    const today = new Date();
    const thirtyDaysLater = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    summary.upcomingPremiums = policies
        .filter(p => {
            if (!p.next_premium_due_date) return false;
            const dueDate = new Date(p.next_premium_due_date);
            return dueDate >= today && dueDate <= thirtyDaysLater;
        })
        .map(p => ({
            policyNumber: p.policy_number,
            insurer: p.insurer_name,
            dueDate: p.next_premium_due_date,
            amount: p.premium_amount
        }))
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

    return summary;
};

/**
 * Get policies with upcoming premium due dates
 */
export const getUpcomingPremiums = async (days = 30) => {
    const today = new Date().toISOString().split('T')[0];
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('status', 'active')
        .gte('next_premium_due_date', today)
        .lte('next_premium_due_date', futureDate)
        .order('next_premium_due_date', { ascending: true });

    if (error) {
        console.error('Error fetching upcoming premiums:', error);
        throw error;
    }

    return data;
};

/**
 * Get overdue premiums
 */
export const getOverduePremiums = async () => {
    const today = new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
        .from('insurance_policies')
        .select('*')
        .eq('status', 'active')
        .lt('next_premium_due_date', today)
        .order('next_premium_due_date', { ascending: true });

    if (error) {
        console.error('Error fetching overdue premiums:', error);
        throw error;
    }

    return data;
};

// ============================================================
// CONSTANTS
// ============================================================

export const PLAN_TYPES = [
    { value: 'term', label: 'Term Insurance' },
    { value: 'endowment', label: 'Endowment Plan' },
    { value: 'money_back', label: 'Money Back Plan' },
    { value: 'whole_life', label: 'Whole Life' },
    { value: 'ulip', label: 'ULIP' },
    { value: 'pension', label: 'Pension Plan' },
    { value: 'child', label: 'Child Plan' },
    { value: 'health', label: 'Health Insurance' },
    { value: 'critical_illness', label: 'Critical Illness' },
    { value: 'accident', label: 'Accident Insurance' },
    { value: 'annuity', label: 'Annuity' }
];

export const PREMIUM_FREQUENCIES = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'quarterly', label: 'Quarterly' },
    { value: 'half_yearly', label: 'Half-Yearly' },
    { value: 'annual', label: 'Annual' },
    { value: 'single', label: 'Single Premium' }
];

export const POLICY_STATUSES = [
    { value: 'active', label: 'Active' },
    { value: 'paid_up', label: 'Paid-up' },
    { value: 'lapsed', label: 'Lapsed' },
    { value: 'matured', label: 'Matured' },
    { value: 'surrendered', label: 'Surrendered' },
    { value: 'claimed', label: 'Claimed' }
];

export const PAYMENT_MODES = [
    { value: 'online', label: 'Online/Net Banking' },
    { value: 'auto_debit', label: 'Auto Debit/ECS' },
    { value: 'upi', label: 'UPI' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'cash', label: 'Cash' },
    { value: 'card', label: 'Credit/Debit Card' }
];

export const RELATIONSHIPS = [
    { value: 'spouse', label: 'Spouse' },
    { value: 'son', label: 'Son' },
    { value: 'daughter', label: 'Daughter' },
    { value: 'father', label: 'Father' },
    { value: 'mother', label: 'Mother' },
    { value: 'brother', label: 'Brother' },
    { value: 'sister', label: 'Sister' },
    { value: 'other', label: 'Other' }
];

export const RIDER_TYPES = [
    { value: 'accidental_death', label: 'Accidental Death Benefit' },
    { value: 'critical_illness', label: 'Critical Illness' },
    { value: 'waiver_of_premium', label: 'Waiver of Premium' },
    { value: 'permanent_disability', label: 'Permanent Disability' },
    { value: 'hospital_cash', label: 'Hospital Cash' },
    { value: 'income_benefit', label: 'Income Benefit' },
    { value: 'term_rider', label: 'Term Rider' }
];

export const COMMON_INSURERS = [
    'LIC',
    'HDFC Life',
    'ICICI Prudential',
    'SBI Life',
    'Max Life',
    'Bajaj Allianz',
    'Tata AIA',
    'Kotak Life',
    'PNB MetLife',
    'Aditya Birla Sun Life',
    'Canara HSBC',
    'Aegon Life',
    'Aviva',
    'Bharti AXA',
    'Exide Life',
    'Future Generali',
    'IDBI Federal',
    'IndiaFirst',
    'Pramerica',
    'Reliance Nippon',
    'Sahara Life',
    'Shriram Life',
    'Star Union Dai-ichi'
];
