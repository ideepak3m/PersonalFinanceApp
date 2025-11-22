// src/components/transactions/TransactionList.jsx
// Manager.io-style transaction list with filtering

import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react';
import { SplitModal } from './SplitModal';

export const TransactionList = ({
    transactions,
    accounts,
    chartOfAccounts,
    onDelete,
    onEditSplit
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('all');
    const [sortField, setSortField] = useState('date');
    const [sortDirection, setSortDirection] = useState('desc');
    const [expandedTransaction, setExpandedTransaction] = useState(null);
    const [editSplitTransaction, setEditSplitTransaction] = useState(null);

    // Filter and sort transactions
    const filteredTransactions = useMemo(() => {
        let filtered = transactions;

        // Filter by account
        if (selectedAccount !== 'all') {
            filtered = filtered.filter(t => t.account_id === selectedAccount);
        }

        // Filter by search term
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(t =>
                (t.description?.toLowerCase().includes(lower)) ||
                (t.raw_merchant_name?.toLowerCase().includes(lower)) ||
                (t.memo?.toLowerCase().includes(lower))
            );
        }

        // Sort
        filtered = [...filtered].sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            if (sortField === 'date') {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });

        return filtered;
    }, [transactions, selectedAccount, searchTerm, sortField, sortDirection]);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const SortIcon = ({ field }) => {
        if (sortField !== field) return null;
        return sortDirection === 'asc' ? (
            <ChevronUp className="w-4 h-4 inline ml-1" />
        ) : (
            <ChevronDown className="w-4 h-4 inline ml-1" />
        );
    };

    const getAccountName = (accountId) => {
        const account = accounts.find(a => a.id === accountId);
        return account?.name || 'Unknown';
    };

    const getChartOfAccountName = (coaId) => {
        const coa = chartOfAccounts.find(c => c.id === coaId);
        return coa ? `${coa.code} - ${coa.name}` : '-';
    };

    const toggleExpand = (txnId) => {
        setExpandedTransaction(expandedTransaction === txnId ? null : txnId);
    };

    const handleEditSplit = (txn) => {
        setEditSplitTransaction(txn);
    };

    const handleSplitSave = async (splits) => {
        if (editSplitTransaction) {
            await onEditSplit(editSplitTransaction, splits);
            setEditSplitTransaction(null);
        }
    };

    return (
        <>
            <div className="bg-white rounded-lg shadow border">
                {/* Header with filters */}
                <div className="px-6 py-4 border-b">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-gray-900">
                            All Transactions
                        </h2>
                    </div>

                    <div className="flex gap-4 items-center">
                        {/* Search */}
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search transactions..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        {/* Account filter */}
                        <select
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                            className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Accounts</option>
                            {accounts.map(acc => (
                                <option key={acc.id} value={acc.id}>
                                    {acc.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    <button
                                        onClick={() => handleSort('date')}
                                        className="flex items-center hover:text-gray-700"
                                    >
                                        Date
                                        <SortIcon field="date" />
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Account
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Description
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                    Chart of Account
                                </th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                                    <button
                                        onClick={() => handleSort('amount')}
                                        className="flex items-center ml-auto hover:text-gray-700"
                                    >
                                        Amount
                                        <SortIcon field="amount" />
                                    </button>
                                </th>
                                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredTransactions.map((txn) => {
                                const isExpanded = expandedTransaction === txn.id;

                                return (
                                    <React.Fragment key={txn.id}>
                                        <tr
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                            onClick={() => toggleExpand(txn.id)}
                                        >
                                            {/* Date */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {txn.date}
                                            </td>

                                            {/* Account */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {getAccountName(txn.account_id)}
                                            </td>

                                            {/* Description */}
                                            <td className="px-6 py-4 text-sm">
                                                <div className="font-medium text-gray-900">
                                                    {txn.description || txn.raw_merchant_name}
                                                </div>
                                                {txn.is_split && (
                                                    <span className="inline-block mt-1 px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded">
                                                        Split
                                                    </span>
                                                )}
                                                {txn.memo && (
                                                    <div className="text-xs text-gray-500 mt-1">
                                                        {txn.memo}
                                                    </div>
                                                )}
                                            </td>

                                            {/* Chart of Account */}
                                            <td className="px-6 py-4 text-sm text-gray-600">
                                                {txn.is_split ? (
                                                    <span className="text-purple-600">Multiple</span>
                                                ) : (
                                                    getChartOfAccountName(txn.chart_of_account_id)
                                                )}
                                            </td>

                                            {/* Amount */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                                                <span className={
                                                    txn.amount >= 0
                                                        ? 'text-green-600 font-semibold'
                                                        : 'text-red-600 font-semibold'
                                                }>
                                                    ${Math.abs(txn.amount).toFixed(2)}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {txn.is_split && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleEditSplit(txn);
                                                            }}
                                                            className="text-purple-600 hover:text-purple-800"
                                                            title="Edit Split"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onDelete(txn.id);
                                                        }}
                                                        className="text-red-600 hover:text-red-800"
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded split details */}
                                        {isExpanded && txn.is_split && txn.splits && (
                                            <tr className="bg-purple-50">
                                                <td colSpan="6" className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <div className="font-medium text-gray-700 mb-2">
                                                            Split Details:
                                                        </div>
                                                        <table className="w-full text-sm">
                                                            <thead>
                                                                <tr className="text-gray-600">
                                                                    <th className="text-left py-1">Chart of Account</th>
                                                                    <th className="text-right py-1">Percentage</th>
                                                                    <th className="text-right py-1">Amount</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {txn.splits.map((split, idx) => (
                                                                    <tr key={idx} className="border-t border-purple-200">
                                                                        <td className="py-1">
                                                                            {split.chart_of_account?.code} - {split.chart_of_account?.name}
                                                                        </td>
                                                                        <td className="text-right py-1">
                                                                            {split.percentage}%
                                                                        </td>
                                                                        <td className="text-right py-1 font-medium">
                                                                            ${split.amount.toFixed(2)}
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {filteredTransactions.length === 0 && (
                    <div className="px-6 py-12 text-center text-gray-500">
                        No transactions found
                    </div>
                )}

                {/* Footer with count */}
                <div className="px-6 py-3 border-t bg-gray-50 text-sm text-gray-600">
                    Showing {filteredTransactions.length} of {transactions.length} transactions
                </div>
            </div>

            {/* Edit Split Modal */}
            {editSplitTransaction && (
                <SplitModal
                    totalAmount={Math.abs(editSplitTransaction.amount)}
                    chartOfAccounts={chartOfAccounts}
                    existingSplits={editSplitTransaction.splits}
                    onSave={handleSplitSave}
                    onClose={() => setEditSplitTransaction(null)}
                />
            )}
        </>
    );
};