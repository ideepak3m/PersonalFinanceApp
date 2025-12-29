// src/components/investments/InvestmentTransactionForm.jsx
// Form for adding/editing individual investment transactions

import React, { useState, useEffect } from 'react';
import { X, Save, Calendar, DollarSign } from 'lucide-react';
import { investmentTransactionsDB } from '../../services/database';

const TRANSACTION_TYPES = [
    'Security Purchase',
    'Security Sale',
    'Dividend Payment',
    'Dividend Reinvestment',
    'Distribution',
    'Interest Payment',
    'Transfer In',
    'Transfer Out',
    'Stock Split',
    'Merger/Acquisition',
    'Return of Capital',
    'Other'
];

const InvestmentTransactionForm = ({ isOpen, onClose, onSave, transaction = null, accountId }) => {
    const [formData, setFormData] = useState({
        transaction_date: new Date().toISOString().split('T')[0],
        symbol: '',
        security_name: '',
        transaction_type: '',
        units: '',
        price: '',
        amount: '',
        fees: '',
        currency: 'CAD',
        description: ''
    });
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (transaction) {
            setFormData({
                transaction_date: transaction.transaction_date || new Date().toISOString().split('T')[0],
                symbol: transaction.symbol || '',
                security_name: transaction.security_name || '',
                transaction_type: transaction.transaction_type || '',
                units: transaction.units || '',
                price: transaction.price || '',
                amount: transaction.amount || '',
                fees: transaction.fees || '',
                currency: transaction.currency || 'CAD',
                description: transaction.description || ''
            });
        } else {
            setFormData({
                transaction_date: new Date().toISOString().split('T')[0],
                symbol: '',
                security_name: '',
                transaction_type: '',
                units: '',
                price: '',
                amount: '',
                fees: '',
                currency: 'CAD',
                description: ''
            });
        }
        setErrors({});
    }, [transaction, isOpen]);

    const validateForm = () => {
        const newErrors = {};

        if (!formData.transaction_date) {
            newErrors.transaction_date = 'Transaction date is required';
        }

        if (!formData.transaction_type) {
            newErrors.transaction_type = 'Transaction type is required';
        }

        if (!formData.symbol?.trim() && !formData.security_name?.trim()) {
            newErrors.symbol = 'Either symbol or security name is required';
            newErrors.security_name = 'Either symbol or security name is required';
        }

        if (!formData.amount || parseFloat(formData.amount) === 0) {
            newErrors.amount = 'Amount is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setSaving(true);

        try {
            const transactionData = {
                account_id: accountId,
                transaction_date: formData.transaction_date,
                symbol: formData.symbol?.trim() || null,
                security_name: formData.security_name?.trim() || null,
                transaction_type: formData.transaction_type,
                units: formData.units ? parseFloat(formData.units) : null,
                price: formData.price ? parseFloat(formData.price) : null,
                amount: parseFloat(formData.amount),
                fees: formData.fees ? parseFloat(formData.fees) : 0,
                currency: formData.currency,
                description: formData.description?.trim() || null
            };

            if (transaction?.id) {
                await investmentTransactionsDB.update(transaction.id, transactionData);
            } else {
                await investmentTransactionsDB.add(transactionData);
            }

            onSave();
            onClose();
        } catch (error) {
            console.error('Error saving transaction:', error);
            setErrors({ submit: error.message });
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));

        // Auto-calculate amount if units and price are provided
        if (field === 'units' || field === 'price') {
            const units = field === 'units' ? value : formData.units;
            const price = field === 'price' ? value : formData.price;

            if (units && price && !isNaN(units) && !isNaN(price)) {
                const calculatedAmount = parseFloat(units) * parseFloat(price);
                setFormData(prev => ({
                    ...prev,
                    [field]: value,
                    amount: calculatedAmount.toFixed(2)
                }));
                return;
            }
        }

        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[field];
                return newErrors;
            });
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-700 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <DollarSign className="h-5 w-5 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">
                                {transaction ? 'Edit Transaction' : 'Add Transaction'}
                            </h2>
                            <p className="text-sm text-slate-400">
                                {transaction ? 'Update transaction details' : 'Record a new investment transaction'}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* Date and Type */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Transaction Date *
                                </label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="date"
                                        value={formData.transaction_date}
                                        onChange={(e) => handleChange('transaction_date', e.target.value)}
                                        className={`w-full pl-10 pr-4 py-2.5 bg-slate-900 border ${errors.transaction_date ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white focus:ring-2 focus:ring-blue-500`}
                                    />
                                </div>
                                {errors.transaction_date && (
                                    <p className="text-red-400 text-xs mt-1">{errors.transaction_date}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Transaction Type *
                                </label>
                                <select
                                    value={formData.transaction_type}
                                    onChange={(e) => handleChange('transaction_type', e.target.value)}
                                    className={`w-full px-4 py-2.5 bg-slate-900 border ${errors.transaction_type ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white focus:ring-2 focus:ring-blue-500`}
                                >
                                    <option value="">Select type...</option>
                                    {TRANSACTION_TYPES.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                                {errors.transaction_type && (
                                    <p className="text-red-400 text-xs mt-1">{errors.transaction_type}</p>
                                )}
                            </div>
                        </div>

                        {/* Symbol and Security Name */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Symbol
                                </label>
                                <input
                                    type="text"
                                    value={formData.symbol}
                                    onChange={(e) => handleChange('symbol', e.target.value.toUpperCase())}
                                    placeholder="AAPL"
                                    className={`w-full px-4 py-2.5 bg-slate-900 border ${errors.symbol ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white focus:ring-2 focus:ring-blue-500 uppercase`}
                                />
                                {errors.symbol && (
                                    <p className="text-red-400 text-xs mt-1">{errors.symbol}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Security Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.security_name}
                                    onChange={(e) => handleChange('security_name', e.target.value)}
                                    placeholder="Apple Inc."
                                    className={`w-full px-4 py-2.5 bg-slate-900 border ${errors.security_name ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white focus:ring-2 focus:ring-blue-500`}
                                />
                                {errors.security_name && (
                                    <p className="text-red-400 text-xs mt-1">{errors.security_name}</p>
                                )}
                            </div>
                        </div>

                        {/* Units and Price */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Units/Shares
                                </label>
                                <input
                                    type="number"
                                    step="0.000001"
                                    value={formData.units}
                                    onChange={(e) => handleChange('units', e.target.value)}
                                    placeholder="100"
                                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Price per Unit
                                </label>
                                <input
                                    type="number"
                                    step="0.0001"
                                    value={formData.price}
                                    onChange={(e) => handleChange('price', e.target.value)}
                                    placeholder="150.00"
                                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Amount and Fees */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Amount *
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => handleChange('amount', e.target.value)}
                                    placeholder="15000.00"
                                    className={`w-full px-4 py-2.5 bg-slate-900 border ${errors.amount ? 'border-red-500' : 'border-slate-600'} rounded-lg text-white focus:ring-2 focus:ring-blue-500`}
                                />
                                {errors.amount && (
                                    <p className="text-red-400 text-xs mt-1">{errors.amount}</p>
                                )}
                                <p className="text-xs text-slate-400 mt-1">
                                    Auto-calculated from units × price
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    Fees/Commission
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={formData.fees}
                                    onChange={(e) => handleChange('fees', e.target.value)}
                                    placeholder="0.00"
                                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>

                        {/* Currency */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Currency
                            </label>
                            <select
                                value={formData.currency}
                                onChange={(e) => handleChange('currency', e.target.value)}
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="CAD">CAD - Canadian Dollar</option>
                                <option value="USD">USD - US Dollar</option>
                                <option value="INR">INR - Indian Rupee</option>
                            </select>
                        </div>

                        {/* Description */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Description/Notes
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => handleChange('description', e.target.value)}
                                placeholder="Optional notes about this transaction"
                                rows={3}
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>

                        {/* Submit Error */}
                        {errors.submit && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                                <p className="text-red-400 text-sm">{errors.submit}</p>
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-slate-700">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                {transaction ? 'Update' : 'Add'} Transaction
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InvestmentTransactionForm;
