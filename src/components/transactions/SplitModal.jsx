import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export function SplitModal({ totalAmount, chartOfAccounts, existingSplits, onSave, onClose }) {
    const [splits, setSplits] = useState([]);

    // Find Misc chart of account (code 'MISC' or '9999', name 'Misc' or 'Miscellaneous')
    const miscCoA = chartOfAccounts.find(
        coa =>
            coa.code === 'MISC' ||
            coa.code === '9999' ||
            (typeof coa.name === 'string' && (coa.name.toLowerCase() === 'misc' || coa.name.toLowerCase() === 'miscellaneous'))
    );

    // Initialize splits
    useEffect(() => {
        if (existingSplits && existingSplits.length > 0) {
            // Load existing splits
            const loadedSplits = existingSplits.map(split => ({
                chartOfAccountId: split.chartOfAccountId || split.chart_of_account_id,
                percent: split.percent?.toString() || '0',
                amount: split.amount?.toString() || '0',
                lastEdited: 'percent',
                isMisc: split.isMisc || false
            }));
            setSplits(loadedSplits);
        } else if (miscCoA) {
            // Initialize with Misc at top and one empty row
            setSplits([
                {
                    chartOfAccountId: miscCoA.id,
                    percent: '100',
                    amount: totalAmount.toFixed(2),
                    lastEdited: 'percent',
                    isMisc: true
                },
                {
                    chartOfAccountId: '',
                    percent: '',
                    amount: '',
                    lastEdited: 'percent',
                    isMisc: false
                }
            ]);
        }
    }, [miscCoA, totalAmount, existingSplits]);

    // Add a new COA row (Misc always at top)
    const addRow = () => {
        setSplits(prevSplits => {
            const miscRow = prevSplits[0];
            const newSplit = {
                chartOfAccountId: '',
                percent: '',
                amount: '',
                lastEdited: 'percent',
                isMisc: false
            };
            return [miscRow, ...prevSplits.slice(1), newSplit];
        });
    };

    // Remove a COA row (never Misc)
    const removeRow = idx => {
        setSplits(prevSplits => {
            // idx is for COA rows, so offset by 1
            const filtered = [prevSplits[0], ...prevSplits.slice(1).filter((_, i) => i !== idx)];
            return recalcMisc(filtered);
        });
    };

    // Handle change and recalc Misc
    const handleChange = (idx, field, value) => {
        setSplits(prevSplits => {
            // idx is for COA rows, so offset by 1
            const updated = prevSplits.map((split, i) => {
                if (i === 0) return split; // Don't edit Misc directly
                if (i !== idx + 1) return split;

                let percent = split.percent;
                let amount = split.amount;
                let lastEdited = split.lastEdited;

                if (field === 'percent') {
                    percent = value;
                    amount = ((parseFloat(value) || 0) / 100 * totalAmount).toFixed(2);
                    lastEdited = 'percent';
                } else if (field === 'amount') {
                    amount = value;
                    percent = ((parseFloat(value) || 0) / totalAmount * 100).toFixed(2);
                    lastEdited = 'amount';
                } else if (field === 'chartOfAccountId') {
                    return { ...split, chartOfAccountId: value };
                }

                return {
                    ...split,
                    percent,
                    amount,
                    lastEdited
                };
            });
            return recalcMisc(updated);
        });
    };

    // Recalculate Misc split so total is 100%
    const recalcMisc = (splitsArr) => {
        const otherPercents = splitsArr
            .slice(1)
            .reduce((sum, s) => sum + (parseFloat(s.percent) || 0), 0);
        const miscPercent = Math.max(0, 100 - otherPercents);
        const miscAmount = (miscPercent / 100 * totalAmount).toFixed(2);
        const updated = splitsArr.map((s, i) =>
            i === 0 ? { ...s, percent: miscPercent.toFixed(2), amount: miscAmount } : s
        );
        return updated;
    };

    const totalPercent = splits.reduce((sum, s) => sum + (parseFloat(s.percent) || 0), 0);
    const totalSplitAmount = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

    // Sort chartOfAccounts alphabetically by name for dropdown
    const sortedChartOfAccounts = [...chartOfAccounts].sort((a, b) => {
        if (!a.name || !b.name) return 0;
        return a.name.localeCompare(b.name);
    });

    // Validate before saving
    const handleSave = () => {
        // Check if all COA rows have a selected account
        const coaRows = splits.slice(1);
        const hasEmptyAccounts = coaRows.some(s => !s.chartOfAccountId && (parseFloat(s.percent) > 0 || parseFloat(s.amount) > 0));

        if (hasEmptyAccounts) {
            alert('Please select a Chart of Account for all split rows with amounts.');
            return;
        }

        if (Math.abs(totalPercent - 100) > 0.01) {
            alert('Total percentage must equal 100%');
            return;
        }

        // Filter out empty rows
        const validSplits = splits.filter(s =>
            s.chartOfAccountId && (parseFloat(s.percent) > 0 || parseFloat(s.amount) > 0)
        );

        onSave(validSplits);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 min-w-[700px] max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-gray-900">Split Transaction</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                        <strong>Total Amount:</strong> ${totalAmount.toFixed(2)}
                    </p>
                    <p className="text-xs text-blue-600 mt-1">
                        The "Misc" row will automatically adjust to ensure the total equals 100%
                    </p>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full mb-4">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">Chart of Account</th>
                                <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">Percentage (%)</th>
                                <th className="text-left px-3 py-2 text-sm font-medium text-gray-700">Amount ($)</th>
                                <th className="text-center px-3 py-2 text-sm font-medium text-gray-700 w-24">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Misc row at top */}
                            {splits.length > 0 && (
                                <tr key="misc" className="bg-gray-100">
                                    <td className="px-3 py-2">
                                        <input
                                            type="text"
                                            value={miscCoA ? `${miscCoA.code} - ${miscCoA.name}` : 'Misc'}
                                            className="border rounded px-3 py-2 bg-gray-200 text-gray-600 w-full font-medium"
                                            readOnly
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            value={parseFloat(splits[0].percent).toFixed(2)}
                                            className="border rounded px-3 py-2 w-full bg-gray-200 text-gray-600"
                                            readOnly
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            value={parseFloat(splits[0].amount).toFixed(2)}
                                            className="border rounded px-3 py-2 w-full bg-gray-200 text-gray-600"
                                            readOnly
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        <span className="text-xs text-gray-500">Auto-calc</span>
                                    </td>
                                </tr>
                            )}

                            {/* COA rows */}
                            {splits.slice(1).map((split, idx) => (
                                <tr key={idx} className="border-b hover:bg-gray-50">
                                    <td className="px-3 py-2">
                                        <select
                                            value={split.chartOfAccountId}
                                            onChange={e => handleChange(idx, 'chartOfAccountId', e.target.value)}
                                            className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Select Chart of Account...</option>
                                            {sortedChartOfAccounts.map(coa => (
                                                <option key={coa.id} value={coa.id}>
                                                    {coa.code} - {coa.name}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            value={split.percent}
                                            min="0"
                                            max="100"
                                            step="0.01"
                                            onChange={e => handleChange(idx, 'percent', e.target.value)}
                                            className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500"
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="px-3 py-2">
                                        <input
                                            type="number"
                                            value={split.amount}
                                            min="0"
                                            max={totalAmount}
                                            step="0.01"
                                            onChange={e => handleChange(idx, 'amount', e.target.value)}
                                            className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500"
                                            placeholder="0.00"
                                        />
                                    </td>
                                    <td className="px-3 py-2 text-center">
                                        {splits.length > 2 && (
                                            <button
                                                onClick={() => removeRow(idx)}
                                                className="text-red-600 hover:text-red-800 text-sm font-medium"
                                            >
                                                Remove
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <button
                        onClick={addRow}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                    >
                        + Add Split Row
                    </button>
                    <div className="text-right">
                        <div className={`text-lg font-bold ${Math.abs(totalPercent - 100) < 0.01 ? 'text-green-600' : 'text-red-600'}`}>
                            Total: {totalPercent.toFixed(2)}%
                        </div>
                        <div className="text-sm text-gray-600">
                            ${totalSplitAmount.toFixed(2)} / ${totalAmount.toFixed(2)}
                        </div>
                    </div>
                </div>

                {Math.abs(totalPercent - 100) > 0.01 && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-800">
                            ⚠️ Total percentage must equal 100%. Current total: {totalPercent.toFixed(2)}%
                        </p>
                    </div>
                )}

                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-medium"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
                        disabled={Math.abs(totalPercent - 100) > 0.01}
                    >
                        Save Split
                    </button>
                </div>
            </div>
        </div>
    );
}