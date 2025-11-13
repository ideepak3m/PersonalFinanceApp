import React, { useState } from 'react';
import { Trash2, Edit } from 'lucide-react';
import { formatCurrency, formatDate } from '../../utils/formatters';

export const TransactionTable = ({ transactions, accounts, onDelete, onEdit }) => {
    const [filter, setFilter] = useState('all');
    const [sortBy, setSortBy] = useState('date');

    if (!transactions || transactions.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500 text-lg">No transactions yet. Upload or add transactions to get started!</p>
            </div>
        );
    }

    const getAccountName = (accountId) => {
        const account = accounts?.find(a => a.id.toString() === accountId?.toString());
        return account?.name || 'Unknown Account';
    };

    const filteredTransactions = transactions.filter(txn => {
        if (filter === 'all') return true;
        if (filter === 'income') return txn.amount > 0;
        if (filter === 'expense') return txn.amount < 0;
        return true;
    });

    const sortedTransactions = [...filteredTransactions].sort((a, b) => {
        if (sortBy === 'date') {
            return new Date(b.date) - new Date(a.date);
        }
        if (sortBy === 'amount') {
            return Math.abs(b.amount) - Math.abs(a.amount);
        }
        return 0;
    });

    return (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-4 border-b border-gray-200 flex flex-wrap gap-4 justify-between items-center">
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilter('all')}
                        className={`px-4 py-2 rounded-md transition-colors ${filter === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('income')}
                        className={`px-4 py-2 rounded-md transition-colors ${filter === 'income'
                                ? 'bg-green-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Income
                    </button>
                    <button
                        onClick={() => setFilter('expense')}
                        className={`px-4 py-2 rounded-md transition-colors ${filter === 'expense'
                                ? 'bg-red-600 text-white'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                            }`}
                    >
                        Expenses
                    </button>
                </div>

                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                    <option value="date">Sort by Date</option>
                    <option value="amount">Sort by Amount</option>
                </select>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Account
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Amount
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedTransactions.map((txn) => (
                            <tr key={txn.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {formatDate(txn.date)}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-900">
                                    {txn.description}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                    {getAccountName(txn.accountId)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded">
                                        {txn.category}
                                    </span>
                                </td>
                                <td className={`px-6 py-4 whitespace-nowrap text-sm text-right font-medium ${txn.amount >= 0 ? 'text-green-600' : 'text-red-600'
                                    }`}>
                                    {formatCurrency(txn.amount)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => onEdit(txn)}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => onDelete(txn.id)}
                                            className="text-red-600 hover:text-red-800"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
