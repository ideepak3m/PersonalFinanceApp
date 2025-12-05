// src/pages/InvestmentAccountsDashboard.jsx
import React, { useEffect, useState } from 'react';
import { Search, TrendingUp, Calendar, Building2, ChevronRight, RefreshCw, Edit2, X } from 'lucide-react';
import {
    getInvestmentAccounts,
    getLastTransactionDates,
    getLastHoldingsDates,
    getLatestMarketValues,
    getInvestmentManagers,
    updateInvestmentAccount
} from '../services/pocketbaseInvestmentDataService';
import InvestmentAccountDetailsModal from '../components/investments/InvestmentAccountDetailsModal';

export const InvestmentAccountsDashboard = () => {
    const [accounts, setAccounts] = useState([]);
    const [managers, setManagers] = useState([]);
    const [lastTransactionDates, setLastTransactionDates] = useState({});
    const [lastHoldingsDates, setLastHoldingsDates] = useState({});
    const [marketValues, setMarketValues] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedAccount, setSelectedAccount] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Rename modal state
    const [showRenameModal, setShowRenameModal] = useState(false);
    const [accountToRename, setAccountToRename] = useState(null);
    const [newDisplayName, setNewDisplayName] = useState('');
    const [newManagerId, setNewManagerId] = useState('');
    const [renaming, setRenaming] = useState(false);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            const [accountsResult, managersResult, txnDatesResult, holdingsDatesResult, marketValuesResult] = await Promise.all([
                getInvestmentAccounts(),
                getInvestmentManagers(),
                getLastTransactionDates(),
                getLastHoldingsDates(),
                getLatestMarketValues()
            ]);

            if (accountsResult.success) {
                setAccounts(accountsResult.accounts);
            }

            if (managersResult.success) {
                setManagers(managersResult.managers);
            }

            if (txnDatesResult.success) {
                setLastTransactionDates(txnDatesResult.dates);
            }

            if (holdingsDatesResult.success) {
                setLastHoldingsDates(holdingsDatesResult.dates);
            }

            if (marketValuesResult.success) {
                setMarketValues(marketValuesResult.values);
            }

        } catch (error) {
            console.error('Error loading investment accounts:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccountClick = (account) => {
        setSelectedAccount(account);
        setShowDetailsModal(true);
    };

    const handleRenameClick = (e, account) => {
        e.stopPropagation(); // Prevent row click
        setAccountToRename(account);
        setNewDisplayName(account.display_name || '');
        setNewManagerId(account.manager_id || '');
        setShowRenameModal(true);
    };

    const handleRenameSubmit = async () => {
        if (!newDisplayName.trim()) {
            alert('Please enter a display name');
            return;
        }

        setRenaming(true);
        try {
            const result = await updateInvestmentAccount(accountToRename.id, {
                displayName: newDisplayName.trim(),
                managerId: newManagerId || null
            });

            if (result.success) {
                // Refresh the accounts list
                await loadData();
                setShowRenameModal(false);
                setAccountToRename(null);
            } else {
                alert(`Failed to rename: ${result.error}`);
            }
        } catch (error) {
            console.error('Error renaming account:', error);
            alert('Failed to rename account');
        } finally {
            setRenaming(false);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '-';
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 2
        }).format(value);
    };

    // Group accounts by manager
    const groupedAccounts = accounts.reduce((groups, account) => {
        const managerName = account.manager?.name || 'Unassigned';
        if (!groups[managerName]) {
            groups[managerName] = [];
        }
        groups[managerName].push(account);
        return groups;
    }, {});

    const filteredAccounts = accounts.filter(acc => {
        const searchLower = searchTerm.toLowerCase();
        return (
            acc.display_name?.toLowerCase().includes(searchLower) ||
            acc.institution?.toLowerCase().includes(searchLower) ||
            acc.account_type?.toLowerCase().includes(searchLower) ||
            acc.manager?.name?.toLowerCase().includes(searchLower)
        );
    });

    // Calculate total portfolio value from market values
    const totalPortfolioValue = Object.values(marketValues).reduce((sum, value) => sum + (value || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Investment Accounts</h1>
                    <p className="text-gray-600 mt-1">
                        Total Portfolio Value: <span className="font-bold text-green-600">{formatCurrency(totalPortfolioValue)}</span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search accounts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-lg"
                        />
                    </div>
                    <button
                        onClick={loadData}
                        disabled={loading}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Total Accounts</div>
                    <div className="text-2xl font-bold text-gray-900">{accounts.length}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Investment Managers</div>
                    <div className="text-2xl font-bold text-gray-900">{managers.length}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Account Types</div>
                    <div className="text-2xl font-bold text-gray-900">
                        {new Set(accounts.map(a => a.account_type)).size}
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="text-sm text-gray-500">Portfolio Value</div>
                    <div className="text-2xl font-bold text-green-600">{formatCurrency(totalPortfolioValue)}</div>
                </div>
            </div>

            {/* Accounts Table */}
            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Account</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manager</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Last Holdings</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Last Transaction</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Latest Value</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-24">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {loading ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                                    Loading accounts...
                                </td>
                            </tr>
                        ) : filteredAccounts.length === 0 ? (
                            <tr>
                                <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                    {searchTerm ? 'No accounts match your search' : 'No investment accounts found'}
                                </td>
                            </tr>
                        ) : (
                            filteredAccounts.map((account) => {
                                const lastHoldingsDate = lastHoldingsDates[account.id];
                                const lastTxnDate = lastTransactionDates[account.id];

                                return (
                                    <tr
                                        key={account.id}
                                        className="hover:bg-gray-50 cursor-pointer"
                                        onClick={() => handleAccountClick(account)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">
                                                {account.display_name || `${account.institution} ${account.account_type}`}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {account.institution} • {account.account_number}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                                {account.account_type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">
                                            {account.manager ? (
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-4 h-4 text-gray-400" />
                                                    {account.manager.name}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {formatDate(lastHoldingsDate)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-center">
                                            <div className="flex items-center justify-center gap-1">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {formatDate(lastTxnDate)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-semibold text-green-600">
                                                {formatCurrency(marketValues[account.id] || 0)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={(e) => handleRenameClick(e, account)}
                                                    className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                                    title="Rename account"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <ChevronRight className="w-5 h-5 text-gray-400" />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Account Details Modal */}
            {showDetailsModal && selectedAccount && (
                <InvestmentAccountDetailsModal
                    account={selectedAccount}
                    onClose={() => {
                        setShowDetailsModal(false);
                        setSelectedAccount(null);
                    }}
                />
            )}

            {/* Rename Account Modal */}
            {showRenameModal && accountToRename && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
                        <div className="flex items-center justify-between px-6 py-4 border-b">
                            <h3 className="text-lg font-semibold text-gray-900">Rename Account</h3>
                            <button
                                onClick={() => {
                                    setShowRenameModal(false);
                                    setAccountToRename(null);
                                    setNewDisplayName('');
                                }}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="px-6 py-4">
                            <div className="mb-4">
                                <div className="text-sm text-gray-500 mb-1">Current Account</div>
                                <div className="text-sm font-medium text-gray-900">
                                    {accountToRename.institution} • {accountToRename.account_number}
                                </div>
                                <div className="text-xs text-gray-500">{accountToRename.account_type}</div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Display Name
                                </label>
                                <input
                                    type="text"
                                    value={newDisplayName}
                                    onChange={(e) => setNewDisplayName(e.target.value)}
                                    placeholder="Enter a friendly name for this account"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    autoFocus
                                />
                                <p className="mt-1 text-xs text-gray-500">
                                    Leave empty to use the default: {accountToRename.institution} {accountToRename.account_type}
                                </p>
                            </div>
                        </div>
                        <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50">
                            <button
                                onClick={() => {
                                    setShowRenameModal(false);
                                    setAccountToRename(null);
                                    setNewDisplayName('');
                                }}
                                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleRenameSubmit}
                                disabled={renaming}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                            >
                                {renaming ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    'Save'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InvestmentAccountsDashboard;
