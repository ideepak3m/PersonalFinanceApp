// src/components/investments/UpdateHoldingsPriceForm.jsx
// Form for updating NAV/price of holdings (especially for mutual funds)

import React, { useState, useEffect } from 'react';
import { X, Save, TrendingUp, RefreshCw } from 'lucide-react';
import { holdingsDB, priceHistoryDB } from '../../services/database';

const UpdateHoldingsPriceForm = ({ isOpen, onClose, onSave, holdings = [], accountId }) => {
    const [priceUpdates, setPriceUpdates] = useState([]);
    const [asOfDate, setAsOfDate] = useState(new Date().toISOString().split('T')[0]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && holdings.length > 0) {
            // Initialize price updates from current holdings
            setPriceUpdates(holdings.map(h => ({
                id: h.id,
                symbol: h.symbol,
                security_name: h.security_name,
                units: h.units,
                current_price: h.price,
                new_price: h.price,
                book_value: h.book_value,
                currency: h.currency
            })));
        }
    }, [isOpen, holdings]);

    const handlePriceChange = (index, newPrice) => {
        setPriceUpdates(prev => {
            const updated = [...prev];
            // Keep as string to preserve all decimal places during input
            updated[index] = { ...updated[index], new_price: newPrice };
            return updated;
        });
    };

    const calculateNewValues = (units, newPrice, bookValue) => {
        const price = parseFloat(newPrice) || 0;
        const marketValue = units * price;
        const gainLoss = marketValue - bookValue;
        const returnPercent = bookValue > 0 ? ((gainLoss / bookValue) * 100).toFixed(2) : 0;
        return { marketValue, gainLoss, returnPercent };
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);

        try {
            const updates = priceUpdates.filter(u => {
                const currentPrice = parseFloat(u.current_price) || 0;
                const newPrice = parseFloat(u.new_price) || 0;
                return newPrice !== currentPrice && newPrice > 0;
            });

            if (updates.length === 0) {
                setError('No price changes detected');
                setSaving(false);
                return;
            }

            for (const update of updates) {
                const newPrice = parseFloat(update.new_price);
                const { marketValue, gainLoss } = calculateNewValues(
                    update.units,
                    newPrice,
                    update.book_value
                );

                // Update holdings table
                await holdingsDB.update(update.id, {
                    price: newPrice,
                    market_value: marketValue,
                    gain_loss: gainLoss,
                    as_of_date: asOfDate
                });

                // Insert into price_history table
                await priceHistoryDB.addPrice(
                    update.symbol,
                    newPrice,
                    asOfDate,
                    update.currency,
                    update.security_name
                );
            }

            onSave();
            onClose();
        } catch (err) {
            console.error('Error updating prices:', err);
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const applyPriceToAll = (price) => {
        const numPrice = parseFloat(price);
        if (!numPrice || numPrice <= 0) return;

        setPriceUpdates(prev =>
            prev.map(u => ({ ...u, new_price: numPrice }))
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden border border-slate-700 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-500/20 rounded-lg">
                            <TrendingUp className="h-5 w-5 text-emerald-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-white">Update NAV/Prices</h2>
                            <p className="text-sm text-slate-400">
                                Update unit prices for mutual funds or other holdings
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-6">
                        {/* As of Date */}
                        <div className="flex items-center gap-4">
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    As of Date
                                </label>
                                <input
                                    type="date"
                                    value={asOfDate}
                                    onChange={(e) => setAsOfDate(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white focus:ring-2 focus:ring-emerald-500"
                                />
                            </div>
                        </div>

                        {/* Info */}
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
                            <p className="text-sm text-blue-300">
                                <strong>Tip:</strong> Only change prices that need updating. Market value and gain/loss will be automatically recalculated based on the new price.
                            </p>
                        </div>

                        {/* Holdings Price Update Table */}
                        <div className="overflow-x-auto bg-slate-900/50 rounded-lg border border-slate-700">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-800">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-slate-300 font-medium">Symbol</th>
                                        <th className="px-4 py-3 text-left text-slate-300 font-medium">Security</th>
                                        <th className="px-4 py-3 text-right text-slate-300 font-medium">Units</th>
                                        <th className="px-4 py-3 text-right text-slate-300 font-medium">Current Price</th>
                                        <th className="px-4 py-3 text-right text-slate-300 font-medium">New Price</th>
                                        <th className="px-4 py-3 text-right text-slate-300 font-medium">New Market Value</th>
                                        <th className="px-4 py-3 text-right text-slate-300 font-medium">Change</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {priceUpdates.map((update, idx) => {
                                        const { marketValue, gainLoss, returnPercent } = calculateNewValues(
                                            update.units,
                                            update.new_price,
                                            update.book_value
                                        );

                                        return (
                                            <tr key={update.id} className="border-t border-slate-700">
                                                <td className="px-4 py-3 text-white font-medium">{update.symbol}</td>
                                                <td className="px-4 py-3 text-slate-300 max-w-xs truncate">
                                                    {update.security_name}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-300">
                                                    {parseFloat(update.units).toFixed(4)}
                                                </td>
                                                <td className="px-4 py-3 text-right text-slate-400">
                                                    ${parseFloat(update.current_price).toFixed(4)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="number"
                                                        step="0.0001"
                                                        value={update.new_price}
                                                        onChange={(e) => handlePriceChange(idx, e.target.value)}
                                                        className="w-32 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-white text-right focus:ring-2 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-right text-white font-medium">
                                                    ${marketValue.toFixed(2)}
                                                </td>
                                                <td className={`px-4 py-3 text-right font-medium ${gainLoss >= 0 ? 'text-emerald-400' : 'text-red-400'
                                                    }`}>
                                                    {gainLoss >= 0 ? '+' : ''}{returnPercent}%
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary */}
                        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <div className="text-sm text-slate-400">Holdings</div>
                                    <div className="text-2xl font-bold text-white">{priceUpdates.length}</div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-400">Changes</div>
                                    <div className="text-2xl font-bold text-emerald-400">
                                        {priceUpdates.filter(u => {
                                            const currentPrice = parseFloat(u.current_price) || 0;
                                            const newPrice = parseFloat(u.new_price) || 0;
                                            return newPrice !== currentPrice && newPrice > 0;
                                        }).length}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-sm text-slate-400">New Total Value</div>
                                    <div className="text-2xl font-bold text-white">
                                        ${priceUpdates.reduce((sum, u) =>
                                            sum + calculateNewValues(u.units, u.new_price, u.book_value).marketValue
                                            , 0).toFixed(2)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
                                <p className="text-red-400 text-sm">{error}</p>
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
                        disabled={saving || priceUpdates.filter(u => {
                            const currentPrice = parseFloat(u.current_price) || 0;
                            const newPrice = parseFloat(u.new_price) || 0;
                            return newPrice !== currentPrice && newPrice > 0;
                        }).length === 0}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <>
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                Updating...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" />
                                Update {priceUpdates.filter(u => {
                                    const currentPrice = parseFloat(u.current_price) || 0;
                                    const newPrice = parseFloat(u.new_price) || 0;
                                    return newPrice !== currentPrice && newPrice > 0;
                                }).length} Prices
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UpdateHoldingsPriceForm;
