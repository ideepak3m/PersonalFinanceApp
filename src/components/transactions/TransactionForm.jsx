import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../services/supabaseClient';
import {
    Receipt,
    DollarSign,
    Calendar,
    Tag,
    Building,
    FileText,
    Save,
    X,
    Loader,
    AlertCircle
} from 'lucide-react';

export const TransactionForm = ({
    transaction = null,
    accounts = [],
    categories = [],
    chartOfAccounts = [],
    onSave,
    onCancel
}) => {
    const { user } = useAuth();
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        date: new Date().toISOString().split('T')[0],
        raw_merchant_name: '',
        description: '',
        amount: '',
        type: 'expense', // expense or income
        account_id: '',
        category_id: '',
        chart_of_account_id: '',
        memo: '',
        currency: 'CAD'
    });

    useEffect(() => {
        if (transaction) {
            setFormData({
                date: transaction.date || new Date().toISOString().split('T')[0],
                raw_merchant_name: transaction.raw_merchant_name || '',
                description: transaction.description || '',
                amount: Math.abs(parseFloat(transaction.amount)) || '',
                type: parseFloat(transaction.amount) >= 0 ? 'income' : 'expense',
                account_id: transaction.account_id || '',
                category_id: transaction.category_id || '',
                chart_of_account_id: transaction.chart_of_account_id || '',
                memo: transaction.memo || '',
                currency: transaction.currency || 'CAD'
            });
        }
    }, [transaction]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setError(null);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.raw_merchant_name && !formData.description) {
            setError('Please enter a merchant name or description');
            return;
        }
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            setError('Please enter a valid amount');
            return;
        }

        setSaving(true);
        setError(null);

        try {
            // Calculate the final amount (negative for expenses, positive for income)
            const finalAmount = formData.type === 'expense'
                ? -Math.abs(parseFloat(formData.amount))
                : Math.abs(parseFloat(formData.amount));

            const transactionData = {
                user_id: user.id,
                date: formData.date,
                raw_merchant_name: formData.raw_merchant_name || formData.description,
                description: formData.description || formData.raw_merchant_name,
                amount: finalAmount,
                currency: formData.currency,
                account_id: formData.account_id || null,
                category_id: formData.category_id || null,
                chart_of_account_id: formData.chart_of_account_id || null,
                memo: formData.memo || null,
                type: formData.type,
                status: formData.category_id || formData.chart_of_account_id ? 'categorized' : 'pending_merchant_mapping'
            };

            let result;
            if (transaction?.id) {
                // Update existing
                const { data, error: updateError } = await supabase
                    .from('transactions')
                    .update(transactionData)
                    .eq('id', transaction.id)
                    .select()
                    .single();

                if (updateError) throw updateError;
                result = data;
            } else {
                // Insert new
                const { data, error: insertError } = await supabase
                    .from('transactions')
                    .insert(transactionData)
                    .select()
                    .single();

                if (insertError) throw insertError;
                result = data;
            }

            if (onSave) {
                onSave(result);
            }
        } catch (err) {
            console.error('Error saving transaction:', err);
            setError(err.message || 'Failed to save transaction');
        } finally {
            setSaving(false);
        }
    };

    const isEditing = !!transaction?.id;

    return (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Receipt className="w-6 h-6 text-indigo-400" />
                    {isEditing ? 'Edit Transaction' : 'Add Transaction'}
                </h2>
                {onCancel && (
                    <button
                        onClick={onCancel}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2 text-red-200 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {error}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Transaction Type */}
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${formData.type === 'expense'
                                ? 'bg-red-500 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                    >
                        Expense
                    </button>
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
                        className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all ${formData.type === 'income'
                                ? 'bg-green-500 text-white'
                                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                    >
                        Income
                    </button>
                </div>

                {/* Date and Amount */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            <Calendar className="w-4 h-4 inline mr-1" />
                            Date *
                        </label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            required
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            <DollarSign className="w-4 h-4 inline mr-1" />
                            Amount *
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                            <input
                                type="number"
                                name="amount"
                                value={formData.amount}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                required
                                placeholder="0.00"
                                className="w-full pl-8 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Merchant Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        <Building className="w-4 h-4 inline mr-1" />
                        Merchant / Payee *
                    </label>
                    <input
                        type="text"
                        name="raw_merchant_name"
                        value={formData.raw_merchant_name}
                        onChange={handleChange}
                        placeholder="e.g., Costco, Amazon, Employer Name"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Description */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        <FileText className="w-4 h-4 inline mr-1" />
                        Description
                    </label>
                    <input
                        type="text"
                        name="description"
                        value={formData.description}
                        onChange={handleChange}
                        placeholder="Optional description"
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Account */}
                {accounts.length > 0 && (
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Account
                        </label>
                        <select
                            name="account_id"
                            value={formData.account_id}
                            onChange={handleChange}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                        >
                            <option value="">Select account...</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name} ({acc.country})
                                </option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Category or Chart of Account */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {categories.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                <Tag className="w-4 h-4 inline mr-1" />
                                Category
                            </label>
                            <select
                                name="category_id"
                                value={formData.category_id}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select category...</option>
                                {categories.map(cat => (
                                    <option key={cat.id} value={cat.id}>
                                        {cat.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                    {chartOfAccounts.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Chart of Account
                            </label>
                            <select
                                name="chart_of_account_id"
                                value={formData.chart_of_account_id}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="">Select account...</option>
                                {chartOfAccounts.map(coa => (
                                    <option key={coa.id} value={coa.id}>
                                        {coa.code} - {coa.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>

                {/* Memo */}
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                        Notes / Memo
                    </label>
                    <textarea
                        name="memo"
                        value={formData.memo}
                        onChange={handleChange}
                        rows={2}
                        placeholder="Any additional notes..."
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                    />
                </div>

                {/* Actions */}
                <div className="flex gap-3 pt-4">
                    <button
                        type="submit"
                        disabled={saving}
                        className="flex-1 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium"
                    >
                        {saving ? (
                            <>
                                <Loader className="w-5 h-5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                {isEditing ? 'Update Transaction' : 'Add Transaction'}
                            </>
                        )}
                    </button>
                    {onCancel && (
                        <button
                            type="button"
                            onClick={onCancel}
                            className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 font-medium"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
};

export default TransactionForm;
