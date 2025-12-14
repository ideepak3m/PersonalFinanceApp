import React, { useState, useEffect } from 'react';
import {
    createInsurancePolicy,
    updateInsurancePolicy,
    PLAN_TYPES,
    PREMIUM_FREQUENCIES,
    POLICY_STATUSES,
    PAYMENT_MODES,
    RELATIONSHIPS,
    RIDER_TYPES,
    COMMON_INSURERS,
    ANNUITY_TYPES,
    ANNUITY_MODES,
    isAnnuityPlan
} from '../../services/insuranceService';

const InsurancePolicyForm = ({ policy, onClose }) => {
    const isEditing = !!policy;

    const [formData, setFormData] = useState({
        // Core Details
        insurer_name: '',
        policy_number: '',
        plan_name: '',
        plan_type: 'endowment',
        policy_holder_name: '',

        // Financial Details
        sum_assured: '',
        premium_amount: '',
        premium_frequency: 'annual',
        currency: 'INR',

        // Timeline
        policy_start_date: '',
        maturity_date: '',
        premium_payment_term: '',
        policy_term: '',

        // Status
        status: 'active',

        // Financial Tracking
        total_premiums_paid: '',
        accrued_bonus: '',
        terminal_bonus: '',
        current_fund_value: '',
        expected_maturity_value: '',
        surrender_value: '',

        // Annuity-specific fields
        purchase_price: '',
        annuity_amount: '',
        annuity_mode: 'monthly',
        annuity_type: 'immediate',
        annuity_start_date: '',
        deferment_period: '',

        // Payment Details
        premium_payment_mode: 'online',
        next_premium_due_date: '',
        last_premium_paid_date: '',

        // Notes
        policy_document_location: '',
        notes: ''
    });

    const [nominees, setNominees] = useState([]);
    const [riders, setRiders] = useState([]);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('basic');

    // Load existing policy data
    useEffect(() => {
        if (policy) {
            setFormData({
                insurer_name: policy.insurer_name || '',
                policy_number: policy.policy_number || '',
                plan_name: policy.plan_name || '',
                plan_type: policy.plan_type || 'endowment',
                policy_holder_name: policy.policy_holder_name || '',
                sum_assured: policy.sum_assured || '',
                premium_amount: policy.premium_amount || '',
                premium_frequency: policy.premium_frequency || 'annual',
                currency: policy.currency || 'INR',
                policy_start_date: policy.policy_start_date || '',
                maturity_date: policy.maturity_date || '',
                premium_payment_term: policy.premium_payment_term || '',
                policy_term: policy.policy_term || '',
                status: policy.status || 'active',
                total_premiums_paid: policy.total_premiums_paid || '',
                accrued_bonus: policy.accrued_bonus || '',
                terminal_bonus: policy.terminal_bonus || '',
                current_fund_value: policy.current_fund_value || '',
                expected_maturity_value: policy.expected_maturity_value || '',
                surrender_value: policy.surrender_value || '',
                // Annuity fields
                purchase_price: policy.purchase_price || '',
                annuity_amount: policy.annuity_amount || '',
                annuity_mode: policy.annuity_mode || 'monthly',
                annuity_type: policy.annuity_type || 'immediate',
                annuity_start_date: policy.annuity_start_date || '',
                deferment_period: policy.deferment_period || '',
                // Payment details
                premium_payment_mode: policy.premium_payment_mode || 'online',
                next_premium_due_date: policy.next_premium_due_date || '',
                last_premium_paid_date: policy.last_premium_paid_date || '',
                policy_document_location: policy.policy_document_location || '',
                notes: policy.notes || ''
            });

            if (policy.nominees) {
                setNominees(policy.nominees);
            }
            if (policy.riders) {
                setRiders(policy.riders);
            }
        }
    }, [policy]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};
        const isAnnuity = isAnnuityPlan(formData.plan_type);

        if (!formData.insurer_name) newErrors.insurer_name = 'Insurer name is required';
        if (!formData.policy_number) newErrors.policy_number = 'Policy number is required';
        if (!formData.plan_type) newErrors.plan_type = 'Plan type is required';
        if (!formData.policy_holder_name) newErrors.policy_holder_name = 'Policy holder name is required';

        // Sum assured validation - not required for annuity plans
        if (!isAnnuity && (!formData.sum_assured || parseFloat(formData.sum_assured) < 0)) {
            newErrors.sum_assured = 'Valid sum assured is required';
        }

        // For annuity plans, require purchase price and annuity amount
        if (isAnnuity) {
            if (!formData.purchase_price || parseFloat(formData.purchase_price) <= 0) {
                newErrors.purchase_price = 'Purchase price is required for annuity plans';
            }
            if (!formData.annuity_amount || parseFloat(formData.annuity_amount) <= 0) {
                newErrors.annuity_amount = 'Annuity/Pension amount is required';
            }
        } else {
            // For non-annuity plans, premium amount is required
            if (!formData.premium_amount || parseFloat(formData.premium_amount) <= 0) {
                newErrors.premium_amount = 'Valid premium amount is required';
            }
        }

        if (!formData.policy_start_date) newErrors.policy_start_date = 'Policy start date is required';

        // Validate nominees total percentage
        if (nominees.length > 0) {
            const totalPercentage = nominees.reduce((sum, n) => sum + parseFloat(n.percentage || 0), 0);
            if (totalPercentage !== 100) {
                newErrors.nominees = `Nominee percentages must total 100% (currently ${totalPercentage}%)`;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            // Switch to tab with first error
            if (errors.nominees) {
                setActiveTab('nominees');
            } else if (errors.purchase_price || errors.annuity_amount) {
                setActiveTab('financial');
            } else {
                setActiveTab('basic');
            }
            return;
        }

        setSaving(true);

        try {
            const dataToSave = {
                ...formData,
                sum_assured: parseFloat(formData.sum_assured) || 0,
                premium_amount: parseFloat(formData.premium_amount) || 0,
                premium_payment_term: formData.premium_payment_term ? parseInt(formData.premium_payment_term) : null,
                policy_term: formData.policy_term ? parseInt(formData.policy_term) : null,
                total_premiums_paid: parseFloat(formData.total_premiums_paid) || 0,
                accrued_bonus: parseFloat(formData.accrued_bonus) || 0,
                terminal_bonus: parseFloat(formData.terminal_bonus) || 0,
                current_fund_value: formData.current_fund_value ? parseFloat(formData.current_fund_value) : null,
                expected_maturity_value: formData.expected_maturity_value ? parseFloat(formData.expected_maturity_value) : null,
                surrender_value: formData.surrender_value ? parseFloat(formData.surrender_value) : null,
                // Annuity fields
                purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
                annuity_amount: formData.annuity_amount ? parseFloat(formData.annuity_amount) : null,
                annuity_mode: formData.annuity_mode || null,
                annuity_type: formData.annuity_type || null,
                annuity_start_date: formData.annuity_start_date || null,
                deferment_period: formData.deferment_period ? parseInt(formData.deferment_period) : null,
                // Dates
                maturity_date: formData.maturity_date || null,
                next_premium_due_date: formData.next_premium_due_date || null,
                last_premium_paid_date: formData.last_premium_paid_date || null,
                nominees,
                riders
            };

            if (isEditing) {
                await updateInsurancePolicy(policy.id, dataToSave);
            } else {
                await createInsurancePolicy(dataToSave);
            }

            onClose(true);
        } catch (err) {
            console.error('Error saving policy:', err);
            setErrors({ submit: 'Failed to save policy. Please try again.' });
        } finally {
            setSaving(false);
        }
    };

    // Nominee management
    const addNominee = () => {
        setNominees([...nominees, {
            nominee_name: '',
            relationship: 'spouse',
            percentage: nominees.length === 0 ? 100 : 0,
            is_minor: false,
            guardian_name: ''
        }]);
    };

    const updateNominee = (index, field, value) => {
        const updated = [...nominees];
        updated[index] = { ...updated[index], [field]: value };
        setNominees(updated);
    };

    const removeNominee = (index) => {
        setNominees(nominees.filter((_, i) => i !== index));
    };

    // Rider management
    const addRider = () => {
        setRiders([...riders, {
            rider_name: '',
            rider_sum_assured: '',
            additional_premium: '',
            status: 'active'
        }]);
    };

    const updateRider = (index, field, value) => {
        const updated = [...riders];
        updated[index] = { ...updated[index], [field]: value };
        setRiders(updated);
    };

    const removeRider = (index) => {
        setRiders(riders.filter((_, i) => i !== index));
    };

    const tabs = [
        { id: 'basic', label: 'Basic Details' },
        { id: 'financial', label: 'Financial' },
        { id: 'nominees', label: 'Nominees' },
        { id: 'riders', label: 'Riders' },
        { id: 'notes', label: 'Notes' }
    ];

    return (
        <div className="p-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                    {isEditing ? 'Edit Policy' : 'Add New Policy'}
                </h1>
                <button
                    onClick={() => onClose(false)}
                    className="text-gray-500 hover:text-gray-700"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Error Banner */}
            {errors.submit && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {errors.submit}
                </div>
            )}

            {/* Tabs */}
            <div className="border-b mb-6">
                <nav className="flex gap-4">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <form onSubmit={handleSubmit}>
                {/* Basic Details Tab */}
                {activeTab === 'basic' && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Insurer */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Insurer Name *
                                </label>
                                <input
                                    type="text"
                                    name="insurer_name"
                                    value={formData.insurer_name}
                                    onChange={handleChange}
                                    list="insurers"
                                    className={`w-full border rounded-lg px-3 py-2 ${errors.insurer_name ? 'border-red-500' : ''}`}
                                    placeholder="e.g., LIC, HDFC Life"
                                />
                                <datalist id="insurers">
                                    {COMMON_INSURERS.map(i => (
                                        <option key={i} value={i} />
                                    ))}
                                </datalist>
                                {errors.insurer_name && (
                                    <p className="text-red-500 text-xs mt-1">{errors.insurer_name}</p>
                                )}
                            </div>

                            {/* Policy Number */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Policy Number *
                                </label>
                                <input
                                    type="text"
                                    name="policy_number"
                                    value={formData.policy_number}
                                    onChange={handleChange}
                                    className={`w-full border rounded-lg px-3 py-2 ${errors.policy_number ? 'border-red-500' : ''}`}
                                />
                                {errors.policy_number && (
                                    <p className="text-red-500 text-xs mt-1">{errors.policy_number}</p>
                                )}
                            </div>

                            {/* Plan Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Plan Type *
                                </label>
                                <select
                                    name="plan_type"
                                    value={formData.plan_type}
                                    onChange={handleChange}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    {PLAN_TYPES.map(t => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Plan Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Plan Name
                                </label>
                                <input
                                    type="text"
                                    name="plan_name"
                                    value={formData.plan_name}
                                    onChange={handleChange}
                                    className="w-full border rounded-lg px-3 py-2"
                                    placeholder="e.g., Jeevan Anand, Click 2 Protect"
                                />
                            </div>

                            {/* Policy Holder */}
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Policy Holder Name *
                                </label>
                                <input
                                    type="text"
                                    name="policy_holder_name"
                                    value={formData.policy_holder_name}
                                    onChange={handleChange}
                                    className={`w-full border rounded-lg px-3 py-2 ${errors.policy_holder_name ? 'border-red-500' : ''}`}
                                />
                                {errors.policy_holder_name && (
                                    <p className="text-red-500 text-xs mt-1">{errors.policy_holder_name}</p>
                                )}
                            </div>

                            {/* Status */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Status
                                </label>
                                <select
                                    name="status"
                                    value={formData.status}
                                    onChange={handleChange}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    {POLICY_STATUSES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Currency */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Currency
                                </label>
                                <select
                                    name="currency"
                                    value={formData.currency}
                                    onChange={handleChange}
                                    className="w-full border rounded-lg px-3 py-2"
                                >
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="CAD">CAD ($)</option>
                                    <option value="GBP">GBP (£)</option>
                                </select>
                            </div>
                        </div>

                        {/* Timeline Section */}
                        <div className="border-t pt-6">
                            <h3 className="font-medium text-gray-900 mb-4">Policy Timeline</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        name="policy_start_date"
                                        value={formData.policy_start_date}
                                        onChange={handleChange}
                                        className={`w-full border rounded-lg px-3 py-2 ${errors.policy_start_date ? 'border-red-500' : ''}`}
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Maturity Date
                                    </label>
                                    <input
                                        type="date"
                                        name="maturity_date"
                                        value={formData.maturity_date}
                                        onChange={handleChange}
                                        className="w-full border rounded-lg px-3 py-2"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Premium Payment Term (yrs)
                                    </label>
                                    <input
                                        type="number"
                                        name="premium_payment_term"
                                        value={formData.premium_payment_term}
                                        onChange={handleChange}
                                        className="w-full border rounded-lg px-3 py-2"
                                        min="1"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Policy Term (yrs)
                                    </label>
                                    <input
                                        type="number"
                                        name="policy_term"
                                        value={formData.policy_term}
                                        onChange={handleChange}
                                        className="w-full border rounded-lg px-3 py-2"
                                        min="1"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Financial Tab */}
                {activeTab === 'financial' && (
                    <div className="space-y-6">
                        {/* Annuity-Specific Section */}
                        {isAnnuityPlan(formData.plan_type) ? (
                            <>
                                {/* Annuity Details */}
                                <div>
                                    <h3 className="font-medium text-gray-900 mb-4">Annuity Details</h3>
                                    <p className="text-sm text-gray-500 mb-4">
                                        For annuity plans like Jeevan Shanti, enter the purchase price and pension details.
                                    </p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Purchase Price *
                                            </label>
                                            <input
                                                type="number"
                                                name="purchase_price"
                                                value={formData.purchase_price}
                                                onChange={handleChange}
                                                className={`w-full border rounded-lg px-3 py-2 ${errors.purchase_price ? 'border-red-500' : ''}`}
                                                min="0"
                                                step="1000"
                                                placeholder="Lump sum paid"
                                            />
                                            {errors.purchase_price && (
                                                <p className="text-red-500 text-xs mt-1">{errors.purchase_price}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Annuity/Pension Amount *
                                            </label>
                                            <input
                                                type="number"
                                                name="annuity_amount"
                                                value={formData.annuity_amount}
                                                onChange={handleChange}
                                                className={`w-full border rounded-lg px-3 py-2 ${errors.annuity_amount ? 'border-red-500' : ''}`}
                                                min="0"
                                                step="100"
                                                placeholder="Pension received per period"
                                            />
                                            {errors.annuity_amount && (
                                                <p className="text-red-500 text-xs mt-1">{errors.annuity_amount}</p>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Annuity Mode
                                            </label>
                                            <select
                                                name="annuity_mode"
                                                value={formData.annuity_mode}
                                                onChange={handleChange}
                                                className="w-full border rounded-lg px-3 py-2"
                                            >
                                                {ANNUITY_MODES.map(m => (
                                                    <option key={m.value} value={m.value}>{m.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Annuity Type
                                            </label>
                                            <select
                                                name="annuity_type"
                                                value={formData.annuity_type}
                                                onChange={handleChange}
                                                className="w-full border rounded-lg px-3 py-2"
                                            >
                                                {ANNUITY_TYPES.map(t => (
                                                    <option key={t.value} value={t.value}>{t.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Annuity Start Date
                                            </label>
                                            <input
                                                type="date"
                                                name="annuity_start_date"
                                                value={formData.annuity_start_date}
                                                onChange={handleChange}
                                                className="w-full border rounded-lg px-3 py-2"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">When pension payments begin</p>
                                        </div>

                                        {formData.annuity_type === 'deferred' && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                                    Deferment Period (Years)
                                                </label>
                                                <input
                                                    type="number"
                                                    name="deferment_period"
                                                    value={formData.deferment_period}
                                                    onChange={handleChange}
                                                    className="w-full border rounded-lg px-3 py-2"
                                                    min="0"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Optional: Sum Assured for annuity with return of purchase price */}
                                <div className="border-t pt-6">
                                    <h3 className="font-medium text-gray-900 mb-4">Death Benefit (if applicable)</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Sum Assured / Return Amount
                                            </label>
                                            <input
                                                type="number"
                                                name="sum_assured"
                                                value={formData.sum_assured}
                                                onChange={handleChange}
                                                className="w-full border rounded-lg px-3 py-2"
                                                min="0"
                                                step="1000"
                                            />
                                            <p className="text-xs text-gray-500 mt-1">Death benefit or return of purchase price (0 if not applicable)</p>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            /* Regular Policy Premium Details */
                            <div>
                                <h3 className="font-medium text-gray-900 mb-4">Premium Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Sum Assured *
                                        </label>
                                        <input
                                            type="number"
                                            name="sum_assured"
                                            value={formData.sum_assured}
                                            onChange={handleChange}
                                            className={`w-full border rounded-lg px-3 py-2 ${errors.sum_assured ? 'border-red-500' : ''}`}
                                            min="0"
                                            step="1000"
                                        />
                                        {errors.sum_assured && (
                                            <p className="text-red-500 text-xs mt-1">{errors.sum_assured}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Premium Amount *
                                        </label>
                                        <input
                                            type="number"
                                            name="premium_amount"
                                            value={formData.premium_amount}
                                            onChange={handleChange}
                                            className={`w-full border rounded-lg px-3 py-2 ${errors.premium_amount ? 'border-red-500' : ''}`}
                                            min="0"
                                            step="100"
                                        />
                                        {errors.premium_amount && (
                                            <p className="text-red-500 text-xs mt-1">{errors.premium_amount}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Premium Frequency
                                        </label>
                                        <select
                                            name="premium_frequency"
                                            value={formData.premium_frequency}
                                            onChange={handleChange}
                                            className="w-full border rounded-lg px-3 py-2"
                                        >
                                            {PREMIUM_FREQUENCIES.map(f => (
                                                <option key={f.value} value={f.value}>{f.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Payment Mode
                                        </label>
                                        <select
                                            name="premium_payment_mode"
                                            value={formData.premium_payment_mode}
                                            onChange={handleChange}
                                            className="w-full border rounded-lg px-3 py-2"
                                        >
                                            {PAYMENT_MODES.map(m => (
                                                <option key={m.value} value={m.value}>{m.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Next Premium Due Date
                                        </label>
                                        <input
                                            type="date"
                                            name="next_premium_due_date"
                                            value={formData.next_premium_due_date}
                                            onChange={handleChange}
                                            className="w-full border rounded-lg px-3 py-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Last Premium Paid Date
                                        </label>
                                        <input
                                            type="date"
                                            name="last_premium_paid_date"
                                            value={formData.last_premium_paid_date}
                                            onChange={handleChange}
                                            className="w-full border rounded-lg px-3 py-2"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Financial Tracking - Show for non-annuity plans */}
                        {!isAnnuityPlan(formData.plan_type) && (
                            <div className="border-t pt-6">
                                <h3 className="font-medium text-gray-900 mb-4">Financial Tracking</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Total Premiums Paid
                                        </label>
                                        <input
                                            type="number"
                                            name="total_premiums_paid"
                                            value={formData.total_premiums_paid}
                                            onChange={handleChange}
                                            className="w-full border rounded-lg px-3 py-2"
                                            min="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Accrued Bonus
                                        </label>
                                        <input
                                            type="number"
                                            name="accrued_bonus"
                                            value={formData.accrued_bonus}
                                            onChange={handleChange}
                                            className="w-full border rounded-lg px-3 py-2"
                                            min="0"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Simple/Reversionary bonus</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Terminal Bonus
                                        </label>
                                        <input
                                            type="number"
                                            name="terminal_bonus"
                                            value={formData.terminal_bonus}
                                            onChange={handleChange}
                                            className="w-full border rounded-lg px-3 py-2"
                                            min="0"
                                        />
                                        <p className="text-xs text-gray-500 mt-1">Estimated/Actual</p>
                                    </div>

                                    {formData.plan_type === 'ulip' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Current Fund Value
                                            </label>
                                            <input
                                                type="number"
                                                name="current_fund_value"
                                                value={formData.current_fund_value}
                                                onChange={handleChange}
                                                className="w-full border rounded-lg px-3 py-2"
                                                min="0"
                                            />
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Expected Maturity Value
                                        </label>
                                        <input
                                            type="number"
                                            name="expected_maturity_value"
                                            value={formData.expected_maturity_value}
                                            onChange={handleChange}
                                            className="w-full border rounded-lg px-3 py-2"
                                            min="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Surrender Value
                                        </label>
                                        <input
                                            type="number"
                                            name="surrender_value"
                                            value={formData.surrender_value}
                                            onChange={handleChange}
                                            className="w-full border rounded-lg px-3 py-2"
                                            min="0"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Nominees Tab */}
                {activeTab === 'nominees' && (
                    <div className="space-y-4">
                        {errors.nominees && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                                {errors.nominees}
                            </div>
                        )}

                        {nominees.map((nominee, index) => (
                            <div key={index} className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-medium">Nominee {index + 1}</h4>
                                    <button
                                        type="button"
                                        onClick={() => removeNominee(index)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                        Remove
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Name *
                                        </label>
                                        <input
                                            type="text"
                                            value={nominee.nominee_name}
                                            onChange={(e) => updateNominee(index, 'nominee_name', e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Relationship *
                                        </label>
                                        <select
                                            value={nominee.relationship}
                                            onChange={(e) => updateNominee(index, 'relationship', e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2"
                                        >
                                            {RELATIONSHIPS.map(r => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Share (%) *
                                        </label>
                                        <input
                                            type="number"
                                            value={nominee.percentage}
                                            onChange={(e) => updateNominee(index, 'percentage', e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2"
                                            min="0"
                                            max="100"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Date of Birth
                                        </label>
                                        <input
                                            type="date"
                                            value={nominee.date_of_birth || ''}
                                            onChange={(e) => updateNominee(index, 'date_of_birth', e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2"
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            checked={nominee.is_minor}
                                            onChange={(e) => updateNominee(index, 'is_minor', e.target.checked)}
                                            className="rounded"
                                        />
                                        <label className="text-sm text-gray-700">Minor</label>
                                    </div>

                                    {nominee.is_minor && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                                Guardian Name
                                            </label>
                                            <input
                                                type="text"
                                                value={nominee.guardian_name || ''}
                                                onChange={(e) => updateNominee(index, 'guardian_name', e.target.value)}
                                                className="w-full border rounded-lg px-3 py-2"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addNominee}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Nominee
                        </button>
                    </div>
                )}

                {/* Riders Tab */}
                {activeTab === 'riders' && (
                    <div className="space-y-4">
                        {riders.map((rider, index) => (
                            <div key={index} className="border rounded-lg p-4 bg-gray-50">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="font-medium">Rider {index + 1}</h4>
                                    <button
                                        type="button"
                                        onClick={() => removeRider(index)}
                                        className="text-red-600 hover:text-red-800 text-sm"
                                    >
                                        Remove
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Rider Type *
                                        </label>
                                        <select
                                            value={rider.rider_name}
                                            onChange={(e) => updateRider(index, 'rider_name', e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2"
                                        >
                                            <option value="">Select Rider</option>
                                            {RIDER_TYPES.map(r => (
                                                <option key={r.value} value={r.value}>{r.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Rider Sum Assured
                                        </label>
                                        <input
                                            type="number"
                                            value={rider.rider_sum_assured || ''}
                                            onChange={(e) => updateRider(index, 'rider_sum_assured', e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2"
                                            min="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Additional Premium
                                        </label>
                                        <input
                                            type="number"
                                            value={rider.additional_premium || ''}
                                            onChange={(e) => updateRider(index, 'additional_premium', e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2"
                                            min="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Status
                                        </label>
                                        <select
                                            value={rider.status}
                                            onChange={(e) => updateRider(index, 'status', e.target.value)}
                                            className="w-full border rounded-lg px-3 py-2"
                                        >
                                            <option value="active">Active</option>
                                            <option value="expired">Expired</option>
                                            <option value="claimed">Claimed</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}

                        <button
                            type="button"
                            onClick={addRider}
                            className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            Add Rider
                        </button>
                    </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Policy Document Location
                            </label>
                            <input
                                type="text"
                                name="policy_document_location"
                                value={formData.policy_document_location}
                                onChange={handleChange}
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="e.g., Bank locker, Google Drive, filing cabinet"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Notes / Comments
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={6}
                                className="w-full border rounded-lg px-3 py-2"
                                placeholder="Loan taken against policy, premium holiday, special conditions, etc."
                            />
                        </div>
                    </div>
                )}

                {/* Form Actions */}
                <div className="flex justify-end gap-3 mt-8 pt-6 border-t">
                    <button
                        type="button"
                        onClick={() => onClose(false)}
                        className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving && (
                            <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                            </svg>
                        )}
                        {isEditing ? 'Update Policy' : 'Add Policy'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default InsurancePolicyForm;
