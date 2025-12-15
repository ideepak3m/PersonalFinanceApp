// src/pages/Liabilities.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Plus,
    Edit2,
    Trash2,
    CreditCard,
    Home,
    Car,
    GraduationCap,
    Landmark,
    DollarSign,
    X,
    AlertCircle,
    TrendingDown
} from 'lucide-react';
import { liabilitiesDB, propertiesDB } from '../services/database';

const LIABILITY_TYPES = [
    { value: 'mortgage', label: 'Mortgage', icon: Home, color: 'text-blue-400' },
    { value: 'car_loan', label: 'Car Loan', icon: Car, color: 'text-green-400' },
    { value: 'student_loan', label: 'Student Loan', icon: GraduationCap, color: 'text-purple-400' },
    { value: 'personal_loan', label: 'Personal Loan', icon: DollarSign, color: 'text-yellow-400' },
    { value: 'line_of_credit', label: 'Line of Credit', icon: Landmark, color: 'text-cyan-400' },
    { value: 'credit_card', label: 'Credit Card', icon: CreditCard, color: 'text-red-400' },
    { value: 'medical_debt', label: 'Medical Debt', icon: AlertCircle, color: 'text-pink-400' },
    { value: 'tax_debt', label: 'Tax Debt', icon: Landmark, color: 'text-orange-400' },
    { value: 'family_loan', label: 'Family Loan', icon: DollarSign, color: 'text-indigo-400' },
    { value: 'business_loan', label: 'Business Loan', icon: Landmark, color: 'text-teal-400' },
    { value: 'other', label: 'Other', icon: DollarSign, color: 'text-gray-400' }
];

const RATE_TYPES = [
    { value: 'fixed', label: 'Fixed Rate' },
    { value: 'variable', label: 'Variable Rate' },
    { value: 'prime_plus', label: 'Prime + Offset' },
    { value: 'prime_minus', label: 'Prime - Offset' }
];

const PAYMENT_FREQUENCIES = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'bi_weekly', label: 'Bi-Weekly' },
    { value: 'semi_monthly', label: 'Semi-Monthly' },
    { value: 'monthly', label: 'Monthly' }
];

const COUNTRIES = [
    { value: 'Canada', label: 'Canada' },
    { value: 'India', label: 'India' },
    { value: 'USA', label: 'USA' },
    { value: 'Malaysia', label: 'Malaysia' },
    { value: 'Singapore', label: 'Singapore' }
];

export const Liabilities = () => {
    const navigate = useNavigate();
    const [liabilities, setLiabilities] = useState([]);
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingLiability, setEditingLiability] = useState(null);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        liability_name: '',
        liability_type: 'credit_card',
        current_balance: '',
        credit_limit: '',
        original_amount: '',
        interest_rate: '',
        rate_type: 'fixed',
        prime_rate_offset: '',
        monthly_payment: '',
        minimum_payment: '',
        payment_frequency: 'monthly',
        start_date: '',
        payoff_date: '',
        property_id: '',
        is_active: true,
        country: 'Canada',
        currency: 'CAD',
        lender: '',
        account_number: '',
        notes: ''
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [liabilitiesResult, propertiesResult] = await Promise.all([
                liabilitiesDB.getAll(),
                propertiesDB.getAll()
            ]);
            setLiabilities(liabilitiesResult || []);
            setProperties(propertiesResult || []);
        } catch (error) {
            console.error('Error loading liabilities:', error);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData({
            liability_name: '',
            liability_type: 'credit_card',
            current_balance: '',
            credit_limit: '',
            original_amount: '',
            interest_rate: '',
            rate_type: 'fixed',
            prime_rate_offset: '',
            monthly_payment: '',
            minimum_payment: '',
            payment_frequency: 'monthly',
            start_date: '',
            payoff_date: '',
            property_id: '',
            is_active: true,
            country: 'Canada',
            currency: 'CAD',
            lender: '',
            account_number: '',
            notes: ''
        });
        setEditingLiability(null);
    };

    const handleAddNew = () => {
        resetForm();
        setShowModal(true);
    };

    const handleEdit = (liability) => {
        setEditingLiability(liability);
        setFormData({
            liability_name: liability.liability_name || '',
            liability_type: liability.liability_type || 'credit_card',
            current_balance: liability.current_balance || '',
            credit_limit: liability.credit_limit || '',
            original_amount: liability.original_amount || '',
            interest_rate: liability.interest_rate || '',
            rate_type: liability.rate_type || 'fixed',
            prime_rate_offset: liability.prime_rate_offset || '',
            monthly_payment: liability.monthly_payment || '',
            minimum_payment: liability.minimum_payment || '',
            payment_frequency: liability.payment_frequency || 'monthly',
            start_date: liability.start_date ? liability.start_date.split('T')[0] : '',
            payoff_date: liability.payoff_date ? liability.payoff_date.split('T')[0] : '',
            property_id: liability.property_id || '',
            is_active: liability.is_active ?? true,
            country: liability.country || 'Canada',
            currency: liability.currency || 'CAD',
            lender: liability.lender || '',
            account_number: liability.account_number || '',
            notes: liability.notes || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this liability?')) return;

        try {
            await liabilitiesDB.delete(id);
            await loadData();
        } catch (error) {
            console.error('Error deleting liability:', error);
            alert(`Failed to delete: ${error.message}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const dataToSave = {
                ...formData,
                current_balance: parseFloat(formData.current_balance) || 0,
                credit_limit: formData.credit_limit ? parseFloat(formData.credit_limit) : null,
                original_amount: formData.original_amount ? parseFloat(formData.original_amount) : null,
                interest_rate: formData.interest_rate ? parseFloat(formData.interest_rate) : null,
                prime_rate_offset: formData.prime_rate_offset ? parseFloat(formData.prime_rate_offset) : null,
                monthly_payment: formData.monthly_payment ? parseFloat(formData.monthly_payment) : null,
                minimum_payment: formData.minimum_payment ? parseFloat(formData.minimum_payment) : null,
                property_id: formData.property_id || null,
                start_date: formData.start_date || null,
                payoff_date: formData.payoff_date || null
            };

            if (editingLiability) {
                await liabilitiesDB.update(editingLiability.id, dataToSave);
            } else {
                await liabilitiesDB.add(dataToSave);
            }

            setShowModal(false);
            resetForm();
            await loadData();
        } catch (error) {
            console.error('Error saving liability:', error);
            alert(`Failed to save: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const formatCurrency = (value, currency = 'CAD') => {
        if (value === null || value === undefined) return '-';
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    // Calculate totals
    const totalLiabilities = liabilities
        .filter(l => l.is_active)
        .reduce((sum, l) => sum + (l.current_balance || 0), 0);

    const totalMonthlyPayments = liabilities
        .filter(l => l.is_active)
        .reduce((sum, l) => sum + (l.monthly_payment || l.minimum_payment || 0), 0);

    const liabilitiesByType = LIABILITY_TYPES.map(type => ({
        ...type,
        items: liabilities.filter(l => l.liability_type === type.value && l.is_active),
        total: liabilities
            .filter(l => l.liability_type === type.value && l.is_active)
            .reduce((sum, l) => sum + (l.current_balance || 0), 0)
    })).filter(t => t.items.length > 0);

    const isRevolvingCredit = ['line_of_credit', 'credit_card'].includes(formData.liability_type);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-white">Liabilities</h1>
                    <p className="text-gray-400">Track your debts and obligations</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Liability
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <TrendingDown className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Liabilities</p>
                            <p className="text-2xl font-semibold text-red-400">{formatCurrency(totalLiabilities)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-orange-500/20 rounded-lg">
                            <DollarSign className="w-5 h-5 text-orange-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Monthly Payments</p>
                            <p className="text-2xl font-semibold text-orange-400">{formatCurrency(totalMonthlyPayments)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <CreditCard className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Active Liabilities</p>
                            <p className="text-2xl font-semibold text-white">{liabilities.filter(l => l.is_active).length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Liabilities List by Type */}
            {liabilities.length === 0 ? (
                <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                    <CreditCard className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">No liabilities tracked yet</p>
                    <p className="text-gray-500 text-sm mt-1">Add your debts to track them and help AI understand your financial situation</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {liabilitiesByType.map(typeGroup => {
                        const TypeIcon = typeGroup.icon;
                        return (
                            <div key={typeGroup.value} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                                <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <TypeIcon className={`w-5 h-5 ${typeGroup.color}`} />
                                        <h3 className="font-semibold text-white">{typeGroup.label}</h3>
                                        <span className="text-sm text-gray-400">({typeGroup.items.length})</span>
                                    </div>
                                    <p className="text-red-400 font-medium">{formatCurrency(typeGroup.total)}</p>
                                </div>
                                <div className="divide-y divide-gray-700">
                                    {typeGroup.items.map(liability => (
                                        <div key={liability.id} className="px-5 py-4 hover:bg-gray-700/30">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-medium text-white">{liability.liability_name}</h4>
                                                        {liability.lender && (
                                                            <span className="text-xs text-gray-500">• {liability.lender}</span>
                                                        )}
                                                        {!liability.is_active && (
                                                            <span className="text-xs px-2 py-0.5 bg-gray-600 text-gray-300 rounded">Paid Off</span>
                                                        )}
                                                    </div>
                                                    <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                        <div>
                                                            <p className="text-gray-500">Balance</p>
                                                            <p className="text-red-400 font-medium">{formatCurrency(liability.current_balance)}</p>
                                                        </div>
                                                        {liability.credit_limit && (
                                                            <div>
                                                                <p className="text-gray-500">Credit Limit</p>
                                                                <p className="text-white">{formatCurrency(liability.credit_limit)}</p>
                                                            </div>
                                                        )}
                                                        <div>
                                                            <p className="text-gray-500">Rate</p>
                                                            <p className="text-white">
                                                                {liability.rate_type === 'prime_plus' || liability.rate_type === 'prime_minus'
                                                                    ? `Prime ${liability.prime_rate_offset >= 0 ? '+' : ''}${liability.prime_rate_offset || 0}%`
                                                                    : liability.interest_rate ? `${liability.interest_rate}%` : '-'
                                                                }
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-gray-500">Payment</p>
                                                            <p className="text-white">
                                                                {liability.monthly_payment
                                                                    ? formatCurrency(liability.monthly_payment)
                                                                    : liability.minimum_payment
                                                                        ? `${formatCurrency(liability.minimum_payment)} min`
                                                                        : '-'
                                                                }
                                                            </p>
                                                        </div>
                                                        {liability.payoff_date && (
                                                            <div>
                                                                <p className="text-gray-500">Payoff Date</p>
                                                                <p className="text-white">{formatDate(liability.payoff_date)}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {liability.notes && (
                                                        <p className="mt-2 text-sm text-gray-500 italic">{liability.notes}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-1 ml-4">
                                                    <button
                                                        onClick={() => handleEdit(liability)}
                                                        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                                                        title="Edit"
                                                    >
                                                        <Edit2 className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(liability.id)}
                                                        className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">
                                {editingLiability ? 'Edit Liability' : 'Add Liability'}
                            </h2>
                            <button onClick={() => setShowModal(false)} className="p-1 text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Name *</label>
                                    <input
                                        type="text"
                                        value={formData.liability_name}
                                        onChange={e => handleInputChange('liability_name', e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        placeholder="e.g., TD Credit Card, Car Loan"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Type *</label>
                                    <select
                                        value={formData.liability_type}
                                        onChange={e => handleInputChange('liability_type', e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    >
                                        {LIABILITY_TYPES.map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Current Balance *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={formData.current_balance}
                                        onChange={e => handleInputChange('current_balance', e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        required
                                    />
                                </div>
                                {isRevolvingCredit && (
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Credit Limit</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.credit_limit}
                                            onChange={e => handleInputChange('credit_limit', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                )}
                                {!isRevolvingCredit && (
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Original Loan Amount</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={formData.original_amount}
                                            onChange={e => handleInputChange('original_amount', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Interest & Payments */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-400 uppercase">Interest & Payments</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Rate Type</label>
                                        <select
                                            value={formData.rate_type}
                                            onChange={e => handleInputChange('rate_type', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        >
                                            {RATE_TYPES.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">
                                            {formData.rate_type === 'prime_plus' || formData.rate_type === 'prime_minus'
                                                ? 'Prime Offset (%)'
                                                : 'Interest Rate (%)'}
                                        </label>
                                        {formData.rate_type === 'prime_plus' || formData.rate_type === 'prime_minus' ? (
                                            <div className="flex items-center gap-2">
                                                <span className="text-white">Prime</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={formData.prime_rate_offset}
                                                    onChange={e => handleInputChange('prime_rate_offset', e.target.value)}
                                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                                    placeholder="e.g., 0.5 or -0.25"
                                                />
                                                <span className="text-gray-400">%</span>
                                            </div>
                                        ) : (
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={formData.interest_rate}
                                                onChange={e => handleInputChange('interest_rate', e.target.value)}
                                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            />
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">
                                            {isRevolvingCredit ? 'Minimum Payment' : 'Monthly Payment'}
                                        </label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={isRevolvingCredit ? formData.minimum_payment : formData.monthly_payment}
                                            onChange={e => handleInputChange(isRevolvingCredit ? 'minimum_payment' : 'monthly_payment', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Payment Frequency</label>
                                        <select
                                            value={formData.payment_frequency}
                                            onChange={e => handleInputChange('payment_frequency', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        >
                                            {PAYMENT_FREQUENCIES.map(t => (
                                                <option key={t.value} value={t.value}>{t.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Dates & Details */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-400 uppercase">Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Lender/Institution</label>
                                        <input
                                            type="text"
                                            value={formData.lender}
                                            onChange={e => handleInputChange('lender', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            placeholder="e.g., TD Bank, Honda Finance"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Country</label>
                                        <select
                                            value={formData.country}
                                            onChange={e => handleInputChange('country', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        >
                                            {COUNTRIES.map(c => (
                                                <option key={c.value} value={c.value}>{c.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Start Date</label>
                                        <input
                                            type="date"
                                            value={formData.start_date}
                                            onChange={e => handleInputChange('start_date', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                    {!isRevolvingCredit && (
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Payoff Date</label>
                                            <input
                                                type="date"
                                                value={formData.payoff_date}
                                                onChange={e => handleInputChange('payoff_date', e.target.value)}
                                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            />
                                        </div>
                                    )}
                                    {formData.liability_type === 'mortgage' && (
                                        <div className="md:col-span-2">
                                            <label className="block text-sm text-gray-400 mb-1">Linked Property</label>
                                            <select
                                                value={formData.property_id}
                                                onChange={e => handleInputChange('property_id', e.target.value)}
                                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            >
                                                <option value="">-- Select Property --</option>
                                                {properties.map(p => (
                                                    <option key={p.id} value={p.id}>{p.property_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Notes (for AI context)</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={e => handleInputChange('notes', e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    rows={3}
                                    placeholder="e.g., 'Usually paid in full monthly', 'Emergency backup', 'Honda Civic 2022'"
                                />
                            </div>

                            {/* Status */}
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="is_active"
                                    checked={formData.is_active}
                                    onChange={e => handleInputChange('is_active', e.target.checked)}
                                    className="rounded bg-gray-700 border-gray-600 text-indigo-600"
                                />
                                <label htmlFor="is_active" className="text-sm text-gray-300">
                                    Active (uncheck if paid off)
                                </label>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
                                >
                                    {saving ? 'Saving...' : editingLiability ? 'Update' : 'Add Liability'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Liabilities;
