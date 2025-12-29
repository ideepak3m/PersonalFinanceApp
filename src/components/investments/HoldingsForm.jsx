// src/components/investments/HoldingsForm.jsx
// Unified form for managing holdings - Mutual Funds, REITs, Shares, ETFs, etc.

import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Search, TrendingUp, Building2, Calendar, DollarSign, Hash, AlertCircle } from 'lucide-react';
import { holdingsDB, investmentAccountsDB } from '../../services/database';

// Investment type options
const INVESTMENT_TYPES = [
    { value: 'stock', label: 'Stock/Share', icon: '📈' },
    { value: 'etf', label: 'ETF', icon: '📊' },
    { value: 'mutual_fund', label: 'Mutual Fund', icon: '📁' },
    { value: 'reit', label: 'REIT', icon: '🏢' },
    { value: 'bond', label: 'Bond/Fixed Income', icon: '📜' },
    { value: 'gic', label: 'GIC/Term Deposit', icon: '🏦' },
    { value: 'crypto', label: 'Cryptocurrency', icon: '🪙' },
    { value: 'other', label: 'Other', icon: '📦' },
];

const HoldingsForm = ({
    isOpen,
    onClose,
    onSave,
    holding = null,  // null for new, object for edit
    accountId = null,  // pre-select account if provided
    existingSymbols = []  // for autocomplete suggestions
}) => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});
    const [showSymbolSuggestions, setShowSymbolSuggestions] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        account_id: '',
        investment_type: 'stock',
        symbol: '',
        security_name: '',
        units: '',
        price: '',
        book_value: '',
        market_value: '',
        gain_loss: '',
        as_of_date: new Date().toISOString().split('T')[0],
        currency: 'CAD',
        notes: ''
    });

    // Load accounts on mount
    useEffect(() => {
        loadAccounts();
    }, []);

    // Initialize form when editing or when accountId changes
    useEffect(() => {
        if (holding) {
            setFormData({
                account_id: holding.account_id || '',
                investment_type: holding.investment_type || detectSecurityType(holding.security_name),
                symbol: holding.symbol || '',
                security_name: holding.security_name || '',
                units: holding.units?.toString() || '',
                price: holding.price?.toString() || '',
                book_value: holding.book_value?.toString() || '',
                market_value: holding.market_value?.toString() || '',
                gain_loss: holding.gain_loss?.toString() || '',
                as_of_date: holding.as_of_date || new Date().toISOString().split('T')[0],
                currency: holding.currency || 'CAD',
                notes: holding.notes || ''
            });
        } else if (accountId) {
            setFormData(prev => ({ ...prev, account_id: accountId }));
        }
    }, [holding, accountId]);

    // Auto-calculate market value and gain/loss
    useEffect(() => {
        const units = parseFloat(formData.units) || 0;
        const price = parseFloat(formData.price) || 0;
        const bookValue = parseFloat(formData.book_value) || 0;

        if (units > 0 && price > 0) {
            const marketValue = units * price;
            const gainLoss = bookValue > 0 ? marketValue - bookValue : 0;

            setFormData(prev => ({
                ...prev,
                market_value: marketValue.toFixed(2),
                gain_loss: gainLoss.toFixed(2)
            }));
        }
    }, [formData.units, formData.price, formData.book_value]);

    const loadAccounts = async () => {
        try {
            setLoading(true);
            const accountsList = await investmentAccountsDB.getAll();
            setAccounts(accountsList || []);
        } catch (error) {
            console.error('Error loading accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    // Detect security type from name
    const detectSecurityType = (name) => {
        if (!name) return 'stock';
        const lowerName = name.toLowerCase();

        if (lowerName.includes('reit') || lowerName.includes('real estate')) return 'reit';
        if (lowerName.includes('etf') || lowerName.includes('index fund')) return 'etf';
        if (lowerName.includes('fund') || lowerName.includes('class a') || lowerName.includes('class f')) return 'mutual_fund';
        if (lowerName.includes('bond') || lowerName.includes('income')) return 'bond';
        if (lowerName.includes('gic') || lowerName.includes('term')) return 'gic';
        if (lowerName.includes('bitcoin') || lowerName.includes('crypto') || lowerName.includes('eth')) return 'crypto';

        return 'stock';
    };

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

        if (!formData.account_id) {
            newErrors.account_id = 'Please select an account';
        }
        // Either symbol or security_name is required
        if (!formData.symbol?.trim() && !formData.security_name?.trim()) {
            newErrors.symbol = 'Either symbol or security name is required';
            newErrors.security_name = 'Either symbol or security name is required';
        }
        if (!formData.units || parseFloat(formData.units) <= 0) {
            newErrors.units = 'Units must be greater than 0';
        }
        if (!formData.price || parseFloat(formData.price) <= 0) {
            newErrors.price = 'Price must be greater than 0';
        }
        if (!formData.as_of_date) {
            newErrors.as_of_date = 'Date is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) return;

        setSaving(true);
        try {
            const holdingData = {
                account_id: formData.account_id,
                symbol: formData.symbol.toUpperCase().trim(),
                security_name: formData.security_name.trim(),
                investment_type: formData.investment_type,
                units: parseFloat(formData.units),
                price: parseFloat(formData.price),
                book_value: parseFloat(formData.book_value) || null,
                market_value: parseFloat(formData.market_value) || 0,
                gain_loss: parseFloat(formData.gain_loss) || 0,
                as_of_date: formData.as_of_date,
                currency: formData.currency,
                notes: formData.notes?.trim() || null
            };

            if (holding?.id) {
                // Update existing
                await holdingsDB.update(holding.id, holdingData);
            } else {
                // Create new
                await holdingsDB.add(holdingData);
            }

            if (onSave) {
                onSave(holdingData);
            }
            onClose();
        } catch (error) {
            console.error('Error saving holding:', error);
            setErrors({ submit: error.message || 'Failed to save holding' });
        } finally {
            setSaving(false);
        }
    };

    // Filter symbol suggestions
    const filteredSymbols = existingSymbols.filter(s =>
        s.toLowerCase().includes(formData.symbol.toLowerCase())
    ).slice(0, 5);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-700">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">
                                {holding ? 'Edit Holding' : 'Add New Holding'}
                            </h2>
                            <p className="text-sm text-slate-400">
                                Stocks, Mutual Funds, REITs, ETFs, and more
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {errors.submit && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2 text-red-400">
                            <AlertCircle className="h-5 w-5" />
                            {errors.submit}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Account Selection */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Investment Account *
                            </label>
                            <select
                                name="account_id"
                                value={formData.account_id}
                                onChange={handleChange}
                                className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${errors.account_id ? 'border-red-500' : 'border-slate-600'
                                    }`}
                            >
                                <option value="">Select an account...</option>
                                {accounts.map(acc => (
                                    <option key={acc.id} value={acc.id}>
                                        {acc.display_name || `${acc.institution} - ${acc.account_type}`}
                                    </option>
                                ))}
                            </select>
                            {errors.account_id && (
                                <p className="mt-1 text-sm text-red-400">{errors.account_id}</p>
                            )}
                        </div>

                        {/* Investment Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Investment Type
                            </label>
                            <select
                                name="investment_type"
                                value={formData.investment_type}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            >
                                {INVESTMENT_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.icon} {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Symbol */}
                        <div className="relative">
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Symbol/Ticker *
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="symbol"
                                    value={formData.symbol}
                                    onChange={handleChange}
                                    onFocus={() => setShowSymbolSuggestions(true)}
                                    onBlur={() => setTimeout(() => setShowSymbolSuggestions(false), 200)}
                                    placeholder="e.g., AAPL, VFV, XIC"
                                    className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-white uppercase focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${errors.symbol ? 'border-red-500' : 'border-slate-600'
                                        }`}
                                />
                                {showSymbolSuggestions && filteredSymbols.length > 0 && (
                                    <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-lg">
                                        {filteredSymbols.map(symbol => (
                                            <button
                                                key={symbol}
                                                type="button"
                                                onClick={() => {
                                                    setFormData(prev => ({ ...prev, symbol }));
                                                    setShowSymbolSuggestions(false);
                                                }}
                                                className="w-full px-4 py-2 text-left text-white hover:bg-slate-700"
                                            >
                                                {symbol}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {errors.symbol && (
                                <p className="mt-1 text-sm text-red-400">{errors.symbol}</p>
                            )}
                        </div>

                        {/* Security Name */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Security Name *
                            </label>
                            <input
                                type="text"
                                name="security_name"
                                value={formData.security_name}
                                onChange={handleChange}
                                placeholder="e.g., Apple Inc., Vanguard S&P 500 Index ETF"
                                className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${errors.security_name ? 'border-red-500' : 'border-slate-600'
                                    }`}
                            />
                            {errors.security_name && (
                                <p className="mt-1 text-sm text-red-400">{errors.security_name}</p>
                            )}
                        </div>

                        {/* Units */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                <Hash className="inline h-4 w-4 mr-1" />
                                Units/Shares *
                            </label>
                            <input
                                type="number"
                                name="units"
                                value={formData.units}
                                onChange={handleChange}
                                step="0.000001"
                                min="0"
                                placeholder="0.000000"
                                className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${errors.units ? 'border-red-500' : 'border-slate-600'
                                    }`}
                            />
                            {errors.units && (
                                <p className="mt-1 text-sm text-red-400">{errors.units}</p>
                            )}
                        </div>

                        {/* Price */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                <DollarSign className="inline h-4 w-4 mr-1" />
                                Current Price *
                            </label>
                            <input
                                type="number"
                                name="price"
                                value={formData.price}
                                onChange={handleChange}
                                step="0.0001"
                                min="0"
                                placeholder="0.00"
                                className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${errors.price ? 'border-red-500' : 'border-slate-600'
                                    }`}
                            />
                            {errors.price && (
                                <p className="mt-1 text-sm text-red-400">{errors.price}</p>
                            )}
                        </div>

                        {/* Book Value */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Book Value (Cost Basis)
                            </label>
                            <input
                                type="number"
                                name="book_value"
                                value={formData.book_value}
                                onChange={handleChange}
                                step="0.01"
                                min="0"
                                placeholder="Total cost including fees"
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            />
                        </div>

                        {/* Market Value (Auto-calculated) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Market Value
                                <span className="text-xs text-slate-500 ml-2">(auto-calculated)</span>
                            </label>
                            <input
                                type="number"
                                name="market_value"
                                value={formData.market_value}
                                readOnly
                                className="w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-400 cursor-not-allowed"
                            />
                        </div>

                        {/* Gain/Loss (Auto-calculated) */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Gain/Loss
                                <span className="text-xs text-slate-500 ml-2">(auto-calculated)</span>
                            </label>
                            <input
                                type="number"
                                name="gain_loss"
                                value={formData.gain_loss}
                                readOnly
                                className={`w-full px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-lg cursor-not-allowed ${parseFloat(formData.gain_loss) >= 0 ? 'text-emerald-400' : 'text-red-400'
                                    }`}
                            />
                        </div>

                        {/* As of Date */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                <Calendar className="inline h-4 w-4 mr-1" />
                                As of Date *
                            </label>
                            <input
                                type="date"
                                name="as_of_date"
                                value={formData.as_of_date}
                                onChange={handleChange}
                                className={`w-full px-4 py-2.5 bg-slate-900 border rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${errors.as_of_date ? 'border-red-500' : 'border-slate-600'
                                    }`}
                            />
                            {errors.as_of_date && (
                                <p className="mt-1 text-sm text-red-400">{errors.as_of_date}</p>
                            )}
                        </div>

                        {/* Currency */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Currency
                            </label>
                            <select
                                name="currency"
                                value={formData.currency}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                            >
                                <option value="CAD">CAD - Canadian Dollar</option>
                                <option value="USD">USD - US Dollar</option>
                                <option value="INR">INR - Indian Rupee</option>
                                <option value="EUR">EUR - Euro</option>
                                <option value="GBP">GBP - British Pound</option>
                            </select>
                        </div>

                        {/* Notes */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-1">
                                Notes
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                rows={2}
                                placeholder="Optional notes about this holding..."
                                className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-700 bg-slate-800/50">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <div className="animate-spin h-4 w-4 border-2 border-white/30 border-t-white rounded-full" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                {holding ? 'Update Holding' : 'Add Holding'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HoldingsForm;
