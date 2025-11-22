// src/components/transactions/EditCoAModal.jsx
import React, { useState } from 'react';
import { X, Search, Check } from 'lucide-react';

export const EditCoAModal = ({ transaction, chartOfAccounts, onSave, onClose }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCoA, setSelectedCoA] = useState(
        transaction.suggestion?.chartOfAccountId || ''
    );

    const filteredCoA = chartOfAccounts.filter(coa =>
        coa.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAcceptSuggestion = () => {
        if (transaction.suggestion?.chartOfAccountId) {
            onSave(transaction.suggestion.chartOfAccountId);
        }
    };

    const handleSave = () => {
        if (selectedCoA) {
            onSave(selectedCoA);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Edit Transaction</h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {transaction.description} - ${Math.abs(transaction.amount).toFixed(2)}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-6 py-4">
                    {/* Show suggestion if available */}
                    {transaction.suggestion?.type === 'coa' && (
                        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="font-medium text-blue-900">
                                        💡 Suggested Chart of Account
                                    </div>
                                    <div className="text-lg font-semibold text-blue-700 mt-2">
                                        {transaction.suggestion.chartOfAccountName}
                                    </div>
                                    <div className="text-sm text-blue-600 mt-1">
                                        {transaction.suggestion.reason}
                                    </div>
                                </div>
                                <button
                                    onClick={handleAcceptSuggestion}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Check className="w-4 h-4" />
                                    Accept
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Search Box */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Or search for a different Chart of Account:
                        </label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Type to search..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                autoFocus
                            />
                        </div>
                    </div>

                    {/* Results List */}
                    <div className="border rounded-lg max-h-96 overflow-y-auto">
                        {filteredCoA.length === 0 ? (
                            <div className="px-4 py-8 text-center text-gray-500">
                                No accounts found
                            </div>
                        ) : (
                            <div className="divide-y">
                                {filteredCoA.map((coa) => (
                                    <button
                                        key={coa.id}
                                        onClick={() => setSelectedCoA(coa.id)}
                                        className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${selectedCoA === coa.id ? 'bg-blue-50 border-l-4 border-blue-600' : ''
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="font-medium text-gray-900">
                                                {coa.name}
                                            </div>
                                            {selectedCoA === coa.id && (
                                                <Check className="w-5 h-5 text-blue-600" />
                                            )}
                                        </div>
                                        {coa.description && (
                                            <div className="text-sm text-gray-500 mt-1">
                                                {coa.description}
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border rounded-lg hover:bg-gray-100"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={!selectedCoA}
                        className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        Save Selection
                    </button>
                </div>
            </div>
        </div>
    );
};