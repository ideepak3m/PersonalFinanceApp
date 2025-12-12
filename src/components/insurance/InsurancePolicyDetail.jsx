import React, { useState, useEffect } from 'react';
import {
    fetchInsurancePolicyById,
    recordPremiumPayment,
    deletePremiumPayment,
    recordBonus,
    PLAN_TYPES,
    PREMIUM_FREQUENCIES,
    POLICY_STATUSES,
    PAYMENT_MODES,
    RELATIONSHIPS,
    RIDER_TYPES
} from '../../services/insuranceService';

const InsurancePolicyDetail = ({ policyId, onBack, onEdit }) => {
    const [policy, setPolicy] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');

    // Modal states
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [showBonusModal, setShowBonusModal] = useState(false);
    const [newPremium, setNewPremium] = useState({
        payment_date: new Date().toISOString().split('T')[0],
        amount: '',
        payment_mode: 'online',
        reference_number: '',
        financial_year: '',
        is_late_payment: false,
        late_fee: '',
        notes: ''
    });
    const [newBonus, setNewBonus] = useState({
        financial_year: '',
        bonus_type: 'simple',
        bonus_rate: '',
        bonus_amount: '',
        declared_date: '',
        notes: ''
    });

    const loadPolicy = async () => {
        try {
            setLoading(true);
            const data = await fetchInsurancePolicyById(policyId);
            setPolicy(data);
        } catch (err) {
            console.error('Error loading policy:', err);
            setError('Failed to load policy details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPolicy();
    }, [policyId]);

    const formatCurrency = (amount, currency = 'INR') => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            paid_up: 'bg-blue-100 text-blue-800',
            lapsed: 'bg-red-100 text-red-800',
            matured: 'bg-purple-100 text-purple-800',
            surrendered: 'bg-orange-100 text-orange-800',
            claimed: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getPlanTypeLabel = (type) => {
        const found = PLAN_TYPES.find(t => t.value === type);
        return found ? found.label : type;
    };

    const getRelationshipLabel = (rel) => {
        const found = RELATIONSHIPS.find(r => r.value === rel);
        return found ? found.label : rel;
    };

    const getRiderLabel = (rider) => {
        const found = RIDER_TYPES.find(r => r.value === rider);
        return found ? found.label : rider;
    };

    const handleAddPremium = async (e) => {
        e.preventDefault();
        try {
            await recordPremiumPayment(policyId, {
                ...newPremium,
                amount: parseFloat(newPremium.amount),
                late_fee: newPremium.late_fee ? parseFloat(newPremium.late_fee) : 0
            });
            setShowPremiumModal(false);
            setNewPremium({
                payment_date: new Date().toISOString().split('T')[0],
                amount: policy?.premium_amount || '',
                payment_mode: 'online',
                reference_number: '',
                financial_year: '',
                is_late_payment: false,
                late_fee: '',
                notes: ''
            });
            loadPolicy();
        } catch (err) {
            console.error('Error recording premium:', err);
        }
    };

    const handleDeletePremium = async (paymentId) => {
        if (!window.confirm('Delete this premium payment record?')) return;
        try {
            await deletePremiumPayment(paymentId);
            loadPolicy();
        } catch (err) {
            console.error('Error deleting premium:', err);
        }
    };

    const handleAddBonus = async (e) => {
        e.preventDefault();
        try {
            await recordBonus(policyId, {
                ...newBonus,
                bonus_rate: newBonus.bonus_rate ? parseFloat(newBonus.bonus_rate) : null,
                bonus_amount: parseFloat(newBonus.bonus_amount)
            });
            setShowBonusModal(false);
            setNewBonus({
                financial_year: '',
                bonus_type: 'simple',
                bonus_rate: '',
                bonus_amount: '',
                declared_date: '',
                notes: ''
            });
            loadPolicy();
        } catch (err) {
            console.error('Error recording bonus:', err);
        }
    };

    // Calculate years remaining
    const getYearsRemaining = () => {
        if (!policy?.maturity_date) return null;
        const today = new Date();
        const maturity = new Date(policy.maturity_date);
        const years = (maturity - today) / (1000 * 60 * 60 * 24 * 365);
        return Math.max(0, Math.round(years * 10) / 10);
    };

    // Calculate premium progress
    const getPremiumProgress = () => {
        if (!policy?.premium_payment_term || !policy?.policy_start_date) return null;
        const startYear = new Date(policy.policy_start_date).getFullYear();
        const currentYear = new Date().getFullYear();
        const yearsPaid = currentYear - startYear;
        const progress = Math.min(100, (yearsPaid / policy.premium_payment_term) * 100);
        return { yearsPaid, totalYears: policy.premium_payment_term, progress };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error || !policy) {
        return (
            <div className="p-6">
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                    {error || 'Policy not found'}
                </div>
                <button onClick={onBack} className="mt-4 text-blue-600 hover:text-blue-800">
                    ← Back to Policies
                </button>
            </div>
        );
    }

    const yearsRemaining = getYearsRemaining();
    const premiumProgress = getPremiumProgress();

    return (
        <div className="p-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
                <div>
                    <button
                        onClick={onBack}
                        className="text-blue-600 hover:text-blue-800 text-sm mb-2 flex items-center gap-1"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        Back to Policies
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">{policy.insurer_name}</h1>
                    <p className="text-gray-500">Policy No: {policy.policy_number}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(policy.status)}`}>
                        {policy.status}
                    </span>
                    <button
                        onClick={onEdit}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Edit Policy
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <p className="text-sm text-gray-500">Sum Assured</p>
                    <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(policy.sum_assured, policy.currency)}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <p className="text-sm text-gray-500">Total Premiums Paid</p>
                    <p className="text-xl font-bold text-gray-900">
                        {formatCurrency(policy.total_premiums_paid, policy.currency)}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <p className="text-sm text-gray-500">Accrued Bonus</p>
                    <p className="text-xl font-bold text-green-600">
                        {formatCurrency((policy.accrued_bonus || 0) + (policy.terminal_bonus || 0), policy.currency)}
                    </p>
                </div>
                <div className="bg-white rounded-lg shadow-sm border p-4">
                    <p className="text-sm text-gray-500">Expected Maturity</p>
                    <p className="text-xl font-bold text-blue-600">
                        {policy.expected_maturity_value
                            ? formatCurrency(policy.expected_maturity_value, policy.currency)
                            : '-'}
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="border-b mb-6">
                <nav className="flex gap-4">
                    {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'premiums', label: 'Premium Payments' },
                        { id: 'bonuses', label: 'Bonuses' },
                        { id: 'nominees', label: 'Nominees' },
                        { id: 'riders', label: 'Riders' }
                    ].map(tab => (
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

            {/* Overview Tab */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Policy Details */}
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Policy Details</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Plan Type</p>
                                <p className="font-medium">{getPlanTypeLabel(policy.plan_type)}</p>
                            </div>
                            {policy.plan_name && (
                                <div>
                                    <p className="text-sm text-gray-500">Plan Name</p>
                                    <p className="font-medium">{policy.plan_name}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-gray-500">Policy Holder</p>
                                <p className="font-medium">{policy.policy_holder_name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Start Date</p>
                                <p className="font-medium">{formatDate(policy.policy_start_date)}</p>
                            </div>
                            {policy.maturity_date && (
                                <div>
                                    <p className="text-sm text-gray-500">Maturity Date</p>
                                    <p className="font-medium">{formatDate(policy.maturity_date)}</p>
                                    {yearsRemaining !== null && (
                                        <p className="text-xs text-gray-400">{yearsRemaining} years remaining</p>
                                    )}
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-gray-500">Policy Term</p>
                                <p className="font-medium">{policy.policy_term ? `${policy.policy_term} years` : '-'}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Premium Payment Term</p>
                                <p className="font-medium">{policy.premium_payment_term ? `${policy.premium_payment_term} years` : '-'}</p>
                            </div>
                        </div>

                        {/* Premium Progress */}
                        {premiumProgress && (
                            <div className="mt-6 pt-4 border-t">
                                <div className="flex justify-between text-sm mb-2">
                                    <span>Premium Payment Progress</span>
                                    <span>{premiumProgress.yearsPaid} of {premiumProgress.totalYears} years</span>
                                </div>
                                <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all"
                                        style={{ width: `${premiumProgress.progress}%` }}
                                    ></div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Premium Info */}
                    <div className="bg-white rounded-lg shadow-sm border p-6">
                        <h3 className="font-semibold text-gray-900 mb-4">Premium Information</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <p className="text-sm text-gray-500">Premium Amount</p>
                                <p className="font-medium">{formatCurrency(policy.premium_amount, policy.currency)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Frequency</p>
                                <p className="font-medium capitalize">{policy.premium_frequency?.replace('_', '-')}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Payment Mode</p>
                                <p className="font-medium capitalize">{policy.premium_payment_mode?.replace('_', ' ')}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-500">Next Due Date</p>
                                <p className="font-medium">{formatDate(policy.next_premium_due_date)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Financial Values (for non-term plans) */}
                    {policy.plan_type !== 'term' && (
                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Financial Values</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-gray-500">Accrued Bonus</p>
                                    <p className="font-medium text-green-600">{formatCurrency(policy.accrued_bonus, policy.currency)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500">Terminal Bonus (Est.)</p>
                                    <p className="font-medium text-green-600">{formatCurrency(policy.terminal_bonus, policy.currency)}</p>
                                </div>
                                {policy.plan_type === 'ulip' && policy.current_fund_value && (
                                    <div>
                                        <p className="text-sm text-gray-500">Current Fund Value</p>
                                        <p className="font-medium">{formatCurrency(policy.current_fund_value, policy.currency)}</p>
                                    </div>
                                )}
                                {policy.surrender_value && (
                                    <div>
                                        <p className="text-sm text-gray-500">Surrender Value</p>
                                        <p className="font-medium">{formatCurrency(policy.surrender_value, policy.currency)}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    {(policy.policy_document_location || policy.notes) && (
                        <div className="bg-white rounded-lg shadow-sm border p-6">
                            <h3 className="font-semibold text-gray-900 mb-4">Notes & Documents</h3>
                            {policy.policy_document_location && (
                                <div className="mb-3">
                                    <p className="text-sm text-gray-500">Document Location</p>
                                    <p>{policy.policy_document_location}</p>
                                </div>
                            )}
                            {policy.notes && (
                                <div>
                                    <p className="text-sm text-gray-500">Notes</p>
                                    <p className="whitespace-pre-wrap">{policy.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Premium Payments Tab */}
            {activeTab === 'premiums' && (
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Premium Payment History</h3>
                        <button
                            onClick={() => {
                                setNewPremium(prev => ({ ...prev, amount: policy.premium_amount }));
                                setShowPremiumModal(true);
                            }}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
                        >
                            Record Payment
                        </button>
                    </div>

                    {policy.premium_payments?.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mode</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">FY</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {policy.premium_payments.map(payment => (
                                        <tr key={payment.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">{formatDate(payment.payment_date)}</td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                {formatCurrency(payment.amount, policy.currency)}
                                                {payment.late_fee > 0 && (
                                                    <span className="text-xs text-red-500 ml-1">
                                                        (+{formatCurrency(payment.late_fee, policy.currency)} late fee)
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 capitalize">{payment.payment_mode?.replace('_', ' ')}</td>
                                            <td className="px-4 py-3 text-sm text-gray-500">{payment.reference_number || '-'}</td>
                                            <td className="px-4 py-3 text-sm">{payment.financial_year || '-'}</td>
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleDeletePremium(payment.id)}
                                                    className="text-red-600 hover:text-red-800 text-sm"
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            No premium payments recorded yet
                        </div>
                    )}
                </div>
            )}

            {/* Bonuses Tab */}
            {activeTab === 'bonuses' && (
                <div className="bg-white rounded-lg shadow-sm border">
                    <div className="p-4 border-b flex justify-between items-center">
                        <h3 className="font-semibold text-gray-900">Bonus History</h3>
                        <button
                            onClick={() => setShowBonusModal(true)}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700"
                        >
                            Record Bonus
                        </button>
                    </div>

                    {policy.bonus_history?.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">FY</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Declared</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {policy.bonus_history.map(bonus => (
                                        <tr key={bonus.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3">{bonus.financial_year}</td>
                                            <td className="px-4 py-3 capitalize">{bonus.bonus_type}</td>
                                            <td className="px-4 py-3 text-right">
                                                {bonus.bonus_rate ? `₹${bonus.bonus_rate}/1000` : '-'}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium text-green-600">
                                                {formatCurrency(bonus.bonus_amount, policy.currency)}
                                            </td>
                                            <td className="px-4 py-3 text-sm">{formatDate(bonus.declared_date)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-gray-50">
                                    <tr>
                                        <td colSpan="3" className="px-4 py-3 font-medium text-right">Total Bonus:</td>
                                        <td className="px-4 py-3 text-right font-bold text-green-600">
                                            {formatCurrency(
                                                policy.bonus_history.reduce((sum, b) => sum + parseFloat(b.bonus_amount || 0), 0),
                                                policy.currency
                                            )}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ) : (
                        <div className="p-8 text-center text-gray-500">
                            No bonuses recorded yet
                        </div>
                    )}
                </div>
            )}

            {/* Nominees Tab */}
            {activeTab === 'nominees' && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Nominees</h3>

                    {policy.nominees?.length > 0 ? (
                        <div className="space-y-4">
                            {policy.nominees.map((nominee, index) => (
                                <div key={nominee.id || index} className="border rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-gray-900">{nominee.nominee_name}</p>
                                            <p className="text-sm text-gray-500">{getRelationshipLabel(nominee.relationship)}</p>
                                            {nominee.is_minor && (
                                                <p className="text-xs text-orange-600 mt-1">
                                                    Minor - Guardian: {nominee.guardian_name || 'Not specified'}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="text-2xl font-bold text-blue-600">{nominee.percentage}%</p>
                                            <p className="text-xs text-gray-500">Share</p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No nominees added</p>
                    )}
                </div>
            )}

            {/* Riders Tab */}
            {activeTab === 'riders' && (
                <div className="bg-white rounded-lg shadow-sm border p-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Riders</h3>

                    {policy.riders?.length > 0 ? (
                        <div className="space-y-4">
                            {policy.riders.map((rider, index) => (
                                <div key={rider.id || index} className="border rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-gray-900">{getRiderLabel(rider.rider_name)}</p>
                                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${rider.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    rider.status === 'claimed' ? 'bg-blue-100 text-blue-800' :
                                                        'bg-gray-100 text-gray-800'
                                                }`}>
                                                {rider.status}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            {rider.rider_sum_assured && (
                                                <div>
                                                    <p className="font-bold">{formatCurrency(rider.rider_sum_assured, policy.currency)}</p>
                                                    <p className="text-xs text-gray-500">Sum Assured</p>
                                                </div>
                                            )}
                                            {rider.additional_premium > 0 && (
                                                <p className="text-sm text-gray-500 mt-1">
                                                    +{formatCurrency(rider.additional_premium, policy.currency)}/yr
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-gray-500">No riders attached</p>
                    )}
                </div>
            )}

            {/* Premium Payment Modal */}
            {showPremiumModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Record Premium Payment</h3>
                        <form onSubmit={handleAddPremium}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Date</label>
                                    <input
                                        type="date"
                                        value={newPremium.payment_date}
                                        onChange={(e) => setNewPremium({ ...newPremium, payment_date: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                                    <input
                                        type="number"
                                        value={newPremium.amount}
                                        onChange={(e) => setNewPremium({ ...newPremium, amount: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode</label>
                                    <select
                                        value={newPremium.payment_mode}
                                        onChange={(e) => setNewPremium({ ...newPremium, payment_mode: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                    >
                                        {PAYMENT_MODES.map(m => (
                                            <option key={m.value} value={m.value}>{m.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                                    <input
                                        type="text"
                                        value={newPremium.reference_number}
                                        onChange={(e) => setNewPremium({ ...newPremium, reference_number: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                        placeholder="Transaction ID"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
                                    <input
                                        type="text"
                                        value={newPremium.financial_year}
                                        onChange={(e) => setNewPremium({ ...newPremium, financial_year: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                        placeholder="e.g., 2024-25"
                                    />
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={newPremium.is_late_payment}
                                        onChange={(e) => setNewPremium({ ...newPremium, is_late_payment: e.target.checked })}
                                        className="rounded"
                                    />
                                    <label className="text-sm text-gray-700">Late Payment</label>
                                </div>
                                {newPremium.is_late_payment && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Late Fee</label>
                                        <input
                                            type="number"
                                            value={newPremium.late_fee}
                                            onChange={(e) => setNewPremium({ ...newPremium, late_fee: e.target.value })}
                                            className="w-full border rounded-lg px-3 py-2"
                                        />
                                    </div>
                                )}
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowPremiumModal(false)}
                                    className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Bonus Modal */}
            {showBonusModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <h3 className="text-lg font-semibold mb-4">Record Bonus</h3>
                        <form onSubmit={handleAddBonus}>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
                                    <input
                                        type="text"
                                        value={newBonus.financial_year}
                                        onChange={(e) => setNewBonus({ ...newBonus, financial_year: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                        placeholder="e.g., 2024-25"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Type</label>
                                    <select
                                        value={newBonus.bonus_type}
                                        onChange={(e) => setNewBonus({ ...newBonus, bonus_type: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                    >
                                        <option value="simple">Simple/Reversionary</option>
                                        <option value="terminal">Terminal Bonus</option>
                                        <option value="loyalty">Loyalty Bonus</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Rate (per ₹1000 SA)</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={newBonus.bonus_rate}
                                        onChange={(e) => setNewBonus({ ...newBonus, bonus_rate: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                        placeholder="e.g., 48"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Bonus Amount</label>
                                    <input
                                        type="number"
                                        value={newBonus.bonus_amount}
                                        onChange={(e) => setNewBonus({ ...newBonus, bonus_amount: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Declaration Date</label>
                                    <input
                                        type="date"
                                        value={newBonus.declared_date}
                                        onChange={(e) => setNewBonus({ ...newBonus, declared_date: e.target.value })}
                                        className="w-full border rounded-lg px-3 py-2"
                                    />
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowBonusModal(false)}
                                    className="px-4 py-2 text-gray-700 border rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                                >
                                    Save
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InsurancePolicyDetail;
