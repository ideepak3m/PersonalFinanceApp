// src/components/transactions/ImprovedSplitModal.jsx
// Auto-calculating split modal with Misc row

import React, { useState, useEffect, useMemo } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

export const ImprovedSplitModal = ({
    transaction,
    totalAmount,
    chartOfAccounts,
    existingSplits = [],
    onSave,
    onClose
}) => {
    const [splits, setSplits] = useState([]);

    // Find Misc COA from database (memoized)
    const miscCOA = useMemo(() =>
        chartOfAccounts.find(coa =>
            coa.name?.toLowerCase() === 'misc' ||
            coa.name?.toLowerCase() === 'miscellaneous' ||
            coa.code?.toLowerCase() === 'misc' ||
            coa.code?.toLowerCase() === '9999'
        ), [chartOfAccounts]
    );

    // Sort Chart of Accounts alphabetically by NAME (memoized)
    const sortedChartOfAccounts = useMemo(() =>
        [...chartOfAccounts].sort((a, b) => (a.name || '').localeCompare(b.name || '')),
        [chartOfAccounts]
    );

    useEffect(() => {
        if (existingSplits && existingSplits.length > 0) {
            // Load existing splits and identify Misc row
            // Handle both database field names (chart_of_account_id, percentage) and in-memory field names (chartOfAccountId, percent)
            const loadedSplits = existingSplits.map(s => {
                const coaId = s.chart_of_account_id || s.chartOfAccountId;
                const isMiscRow = coaId === miscCOA?.id;
                return {
                    id: s.id || Math.random(),
                    description: s.description || (isMiscRow ? 'Misc' : transaction.description),
                    chartOfAccountId: coaId,
                    percent: s.percentage || s.percent || 0,
                    amount: s.amount || 0,
                    isMisc: isMiscRow
                };
            });

            // Sort so Misc row is always first
            loadedSplits.sort((a, b) => {
                if (a.isMisc) return -1;
                if (b.isMisc) return 1;
                return 0;
            });

            // Check if Misc row exists
            const hasMiscRow = loadedSplits.some(s => s.isMisc);

            if (!hasMiscRow) {
                // Add Misc row at the beginning if it doesn't exist
                const otherPercent = loadedSplits.reduce((sum, s) => sum + (parseFloat(s.percent) || 0), 0);
                const otherAmount = loadedSplits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

                loadedSplits.unshift({
                    id: 'misc-' + Date.now(),
                    description: 'Misc',
                    chartOfAccountId: miscCOA?.id || '',
                    percent: 100 - otherPercent,
                    amount: totalAmount - otherAmount,
                    isMisc: true
                });
            }

            setSplits(loadedSplits);
        } else {
            // Initialize with Misc row at 100% with Misc COA
            setSplits([{
                id: 1,
                description: 'Misc',
                chartOfAccountId: miscCOA?.id || '',
                percent: 100,
                amount: totalAmount,
                isMisc: true
            }]);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Calculate remaining for Misc row
    const calculateMiscRemaining = (currentSplits) => {
        const otherSplits = currentSplits.filter(s => !s.isMisc);
        const totalOtherPercent = otherSplits.reduce((sum, s) => sum + (parseFloat(s.percent) || 0), 0);
        const totalOtherAmount = otherSplits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

        return {
            percent: 100 - totalOtherPercent,
            amount: totalAmount - totalOtherAmount
        };
    };

    // Update Misc row
    const updateMiscRow = (newSplits) => {
        const remaining = calculateMiscRemaining(newSplits);
        return newSplits.map(s =>
            s.isMisc
                ? { ...s, percent: remaining.percent, amount: remaining.amount }
                : s
        );
    };

    // Handle percent change
    const handlePercentChange = (id, value) => {
        const numValue = parseFloat(value) || 0;

        let updated = splits.map(s =>
            s.id === id
                ? {
                    ...s,
                    percent: numValue,
                    amount: (numValue / 100) * totalAmount
                }
                : s
        );

        updated = updateMiscRow(updated);
        setSplits(updated);
    };

    // Handle amount change
    const handleAmountChange = (id, value) => {
        const numValue = parseFloat(value) || 0;

        let updated = splits.map(s =>
            s.id === id
                ? {
                    ...s,
                    amount: numValue,
                    percent: (numValue / totalAmount) * 100
                }
                : s
        );

        updated = updateMiscRow(updated);
        setSplits(updated);
    };

    // Handle COA change
    const handleCoAChange = (id, coaId) => {
        setSplits(splits.map(s =>
            s.id === id ? { ...s, chartOfAccountId: coaId } : s
        ));
    };

    // Handle description change
    const handleDescriptionChange = (id, desc) => {
        setSplits(splits.map(s =>
            s.id === id ? { ...s, description: desc } : s
        ));
    };

    // Add new split row
    const handleAddSplit = () => {
        const newSplits = [...splits, {
            id: Date.now(),
            description: '',
            chartOfAccountId: '',
            percent: 0,
            amount: 0,
            isMisc: false
        }];
        setSplits(updateMiscRow(newSplits));
    };

    // Remove split row
    const handleRemoveSplit = (id) => {
        const updated = splits.filter(s => s.id !== id);
        setSplits(updateMiscRow(updated));
    };

    // Validate and save
    const handleSave = () => {
        // Check if Misc COA exists
        if (!miscCOA) {
            alert('Please ensure Misc Chart of Account exists in your COA table');
            return;
        }

        // Prepare final splits (keep Misc if it has remaining value)
        const finalSplits = splits.filter(s => {
            if (s.isMisc) {
                return s.percent > 0.01; // Keep Misc only if has remaining value
            }
            return true; // Keep all non-Misc splits
        }).map(s => {
            // Ensure Misc row has correct COA
            if (s.isMisc) {
                return { ...s, chartOfAccountId: miscCOA.id };
            }
            return s;
        });

        // Validate
        if (finalSplits.length === 0) {
            alert('Please add at least one split');
            return;
        }

        const hasEmptyCoa = finalSplits.some(s => !s.chartOfAccountId);
        if (hasEmptyCoa) {
            alert('Please select a Chart of Account for all splits');
            return;
        }

        const totalPercent = finalSplits.reduce((sum, s) => sum + (parseFloat(s.percent) || 0), 0);
        if (Math.abs(totalPercent - 100) > 0.01) {
            alert(`Splits must total 100% (currently ${totalPercent.toFixed(1)}%)`);
            return;
        }

        onSave(finalSplits);
    };

    const totalPercent = splits.reduce((sum, s) => sum + (parseFloat(s.percent) || 0), 0);
    const totalSplitAmount = splits.reduce((sum, s) => sum + (parseFloat(s.amount) || 0), 0);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center bg-purple-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Split Transaction</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {transaction.description} - Total: ${totalAmount.toFixed(2)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Table */}
                <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
                    <table className="w-full">
                        <thead className="bg-gray-50 sticky top-0">
                            <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    #
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Description
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Chart of Account
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    %
                                </th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                                    Amount ($)
                                </th>
                                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                                    Action
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {splits.map((split, index) => (
                                <tr
                                    key={split.id}
                                    className={split.isMisc ? 'bg-yellow-50' : 'hover:bg-gray-50'}
                                >
                                    {/* Row Number */}
                                    <td className="px-4 py-3 text-sm font-medium text-gray-700">
                                        {index + 1}
                                    </td>

                                    {/* Description */}
                                    <td className="px-4 py-3">
                                        {split.isMisc ? (
                                            <span className="text-sm font-medium text-gray-600">
                                                Misc (Remaining)
                                            </span>
                                        ) : (
                                            <input
                                                type="text"
                                                value={split.description}
                                                onChange={(e) => handleDescriptionChange(split.id, e.target.value)}
                                                placeholder="Description..."
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            />
                                        )}
                                    </td>

                                    {/* Chart of Account */}
                                    <td className="px-4 py-3">
                                        {split.isMisc ? (
                                            <span className="text-sm font-medium text-gray-600">
                                                {miscCOA ? `${miscCOA.code} - ${miscCOA.name}` : 'Misc'}
                                            </span>
                                        ) : (
                                            <select
                                                value={split.chartOfAccountId}
                                                onChange={(e) => handleCoAChange(split.id, e.target.value)}
                                                className="w-full px-2 py-1 border rounded text-sm"
                                            >
                                                <option value="">Select...</option>
                                                {sortedChartOfAccounts.map(coa => (
                                                    <option key={coa.id} value={coa.id}>
                                                        {coa.code} - {coa.name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </td>

                                    {/* Percent */}
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            value={split.percent.toFixed(2)}
                                            onChange={(e) => handlePercentChange(split.id, e.target.value)}
                                            disabled={split.isMisc}
                                            step="0.01"
                                            min="0"
                                            max="100"
                                            className="w-20 px-2 py-1 border rounded text-sm text-right disabled:bg-gray-100"
                                        />
                                    </td>

                                    {/* Amount */}
                                    <td className="px-4 py-3">
                                        <input
                                            type="number"
                                            value={split.amount.toFixed(2)}
                                            onChange={(e) => handleAmountChange(split.id, e.target.value)}
                                            disabled={split.isMisc}
                                            step="0.01"
                                            min="0"
                                            className="w-24 px-2 py-1 border rounded text-sm text-right disabled:bg-gray-100"
                                        />
                                    </td>

                                    {/* Actions */}
                                    <td className="px-4 py-3 text-center">
                                        {!split.isMisc && (
                                            <button
                                                onClick={() => handleRemoveSplit(split.id)}
                                                className="text-red-600 hover:text-red-800"
                                                title="Remove"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot className="bg-gray-100 font-semibold">
                            <tr>
                                <td className="px-4 py-3"></td>
                                <td className="px-4 py-3 text-sm text-gray-700">TOTAL</td>
                                <td className="px-4 py-3"></td>
                                <td className="px-4 py-3 text-sm text-right">
                                    <span className={totalPercent === 100 ? 'text-green-600' : 'text-red-600'}>
                                        {totalPercent.toFixed(2)}%
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-right">
                                    <span className={Math.abs(totalSplitAmount - totalAmount) < 0.01 ? 'text-green-600' : 'text-red-600'}>
                                        ${totalSplitAmount.toFixed(2)}
                                    </span>
                                </td>
                                <td className="px-4 py-3"></td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Add Split Button */}
                    <button
                        onClick={handleAddSplit}
                        className="mt-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                        <Plus className="w-4 h-4" />
                        Add Split Line
                    </button>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50 flex justify-between items-center">
                    <div className="text-sm text-gray-600">
                        {Math.abs(totalPercent - 100) < 0.01 ? (
                            <span className="text-green-600 font-medium">✓ Splits total 100%</span>
                        ) : (
                            <span className="text-red-600 font-medium">
                                ⚠ Splits must total 100% (currently {totalPercent.toFixed(1)}%)
                            </span>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 border rounded hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                        >
                            Save Split
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};