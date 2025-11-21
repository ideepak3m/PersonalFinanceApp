import React, { useState, useEffect } from 'react';

export function SplitModal({ totalAmount, chartOfAccounts, onSave, onClose }) {
    const [splits, setSplits] = useState([]);

    // Find Misc chart of account (code 'MISC' or '9999', name 'Misc' or 'Miscellaneous')
    const miscCoA = chartOfAccounts.find(
        coa =>
            coa.code === 'MISC' ||
            coa.code === '9999' ||
            (typeof coa.name === 'string' && (coa.name.toLowerCase() === 'misc' || coa.name.toLowerCase() === 'miscellaneous'))
    );

    // Initialize splits: Misc at top, one COA row
    useEffect(() => {
        if (miscCoA) {
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
    }, [miscCoA, totalAmount]);

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
            i === 0 ? { ...s, percent: miscPercent.toString(), amount: miscAmount } : s
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

    return (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 min-w-[600px] max-w-2xl">
                <h2 className="text-lg font-semibold mb-4">Split Transaction</h2>
                <table className="w-full mb-4">
                    <thead>
                        <tr>
                            <th className="text-left">Chart of Account</th>
                            <th className="text-left">%</th>
                            <th className="text-left">Amount</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* Misc row at top */}
                        {splits.length > 0 && (
                            <tr key="misc">
                                <td>
                                    <input
                                        type="text"
                                        value={miscCoA ? miscCoA.name : 'Misc'}
                                        className="border rounded px-2 py-1 bg-gray-100 text-gray-500"
                                        readOnly
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={splits[0].percent}
                                        className="border rounded px-2 py-1 w-28 bg-gray-100 text-gray-500"
                                        readOnly
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={splits[0].amount}
                                        className="border rounded px-2 py-1 w-24 bg-gray-100 text-gray-500"
                                        readOnly
                                    />
                                </td>
                                <td></td>
                            </tr>
                        )}
                        {/* COA rows */}
                        {splits.slice(1).map((split, idx) => (
                            <tr key={idx}>
                                <td>
                                    <select
                                        value={split.chartOfAccountId}
                                        onChange={e => handleChange(idx, 'chartOfAccountId', e.target.value)}
                                        className="border rounded px-2 py-1"
                                    >
                                        <option value="">Select...</option>
                                        {sortedChartOfAccounts.map(coa => (
                                            <option key={coa.id} value={coa.id}>{coa.name}</option>
                                        ))}
                                    </select>
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={split.percent}
                                        min="0"
                                        max="100"
                                        onChange={e => handleChange(idx, 'percent', e.target.value)}
                                        className="border rounded px-2 py-1 w-28"
                                    />
                                </td>
                                <td>
                                    <input
                                        type="number"
                                        value={split.amount}
                                        min="0"
                                        max={totalAmount}
                                        onChange={e => handleChange(idx, 'amount', e.target.value)}
                                        className="border rounded px-2 py-1 w-24"
                                    />
                                </td>
                                <td>
                                    {splits.length > 2 && (
                                        <button onClick={() => removeRow(idx)} className="text-red-600">Remove</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <div className="flex justify-between items-center mb-2">
                    <button onClick={addRow} className="px-3 py-1 bg-blue-600 text-white rounded">Add Split</button>
                    <div className="text-sm text-gray-700">
                        Total: {totalPercent}% (${totalSplitAmount.toFixed(2)} / ${totalAmount.toFixed(2)})
                    </div>
                </div>
                <div className="flex gap-2 justify-end">
                    <button onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">Cancel</button>
                    <button
                        onClick={() => onSave(splits)}
                        className="px-4 py-2 bg-green-600 text-white rounded"
                        disabled={totalPercent !== 100}
                    >
                        Save
                    </button>
                </div>
                {totalPercent !== 100 && (
                    <div className="text-red-600 text-sm mt-2">Total percentage must be 100%.</div>
                )}
            </div>
        </div>
    );
}
