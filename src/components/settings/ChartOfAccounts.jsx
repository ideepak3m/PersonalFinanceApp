
import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, Loader } from 'lucide-react';
import { supabaseChartOfAccountsDB } from '../../services/pocketbaseDatabase';

// Account types for personal finance
const ACCOUNT_TYPES = [
    { value: 'asset', label: 'Asset', color: 'bg-green-100 text-green-800', description: 'What you own (cash, investments, property)' },
    { value: 'liability', label: 'Liability', color: 'bg-red-100 text-red-800', description: 'What you owe (loans, credit cards)' },
    { value: 'equity', label: 'Equity', color: 'bg-blue-100 text-blue-800', description: 'Net worth adjustments' },
    { value: 'income', label: 'Income', color: 'bg-purple-100 text-purple-800', description: 'Money coming in (salary, dividends)' },
    { value: 'expense', label: 'Expense', color: 'bg-orange-100 text-orange-800', description: 'Money going out (groceries, utilities)' },
    { value: 'transfer', label: 'Transfer', color: 'bg-gray-100 text-gray-800', description: 'Internal transfers (credit card payments)' },
];

export const ChartOfAccounts = () => {
    const [accounts, setAccounts] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        account_type: 'expense',
        description: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        setLoading(true);
        try {
            const data = await supabaseChartOfAccountsDB.getAll();
            // Sort by account_type then by name
            const sorted = (data || []).sort((a, b) => {
                if (a.account_type !== b.account_type) {
                    return a.account_type.localeCompare(b.account_type);
                }
                return a.name.localeCompare(b.name);
            });
            setAccounts(sorted);
        } catch (error) {
            console.error('Error loading chart of accounts:', error);
            alert('Failed to load chart of accounts');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        if (!formData.name.trim()) {
            alert('Account name is required');
            return;
        }

        // Check for duplicate name
        const exists = accounts.some(a =>
            a.name.toLowerCase() === formData.name.trim().toLowerCase()
        );
        if (exists) {
            alert('An account with this name already exists');
            return;
        }

        // Generate code if not provided
        let code = formData.code.trim();
        if (!code) {
            // Auto-generate code based on account type
            const typePrefix = {
                'asset': '1',
                'liability': '2',
                'equity': '3',
                'income': '4',
                'expense': '5',
                'transfer': '6'
            };
            const prefix = typePrefix[formData.account_type] || '9';
            const existingCodes = accounts
                .filter(a => a.code?.startsWith(prefix))
                .map(a => parseInt(a.code) || 0);
            const maxCode = existingCodes.length > 0 ? Math.max(...existingCodes) : parseInt(prefix + '000');
            code = String(maxCode + 1);
        }

        setSaving(true);
        try {
            await supabaseChartOfAccountsDB.add({
                code: code,
                name: formData.name.trim(),
                account_type: formData.account_type,
                description: formData.description.trim() || null
            });
            await loadAccounts();
            setFormData({ code: '', name: '', account_type: 'expense', description: '' });
            setShowAddForm(false);
        } catch (error) {
            console.error('Error adding account:', error);
            alert('Failed to add account');
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (account) => {
        setEditingId(account.id);
        setFormData({
            code: account.code || '',
            name: account.name,
            account_type: account.account_type || 'expense',
            description: account.description || ''
        });
        setShowAddForm(false);
    };

    const handleUpdate = async () => {
        if (!formData.name.trim()) {
            alert('Account name is required');
            return;
        }

        // Check for duplicate name (excluding current account)
        const exists = accounts.some(a =>
            a.id !== editingId &&
            a.name.toLowerCase() === formData.name.trim().toLowerCase()
        );
        if (exists) {
            alert('An account with this name already exists');
            return;
        }

        setSaving(true);
        try {
            await supabaseChartOfAccountsDB.update(editingId, {
                name: formData.name.trim(),
                account_type: formData.account_type,
                description: formData.description.trim() || null
            });
            await loadAccounts();
            setEditingId(null);
            setFormData({ code: '', name: '', account_type: 'expense', description: '' });
        } catch (error) {
            console.error('Error updating account:', error);
            alert('Failed to update account');
        } finally {
            setSaving(false);
        }
    };

    const cancelEdit = () => {
        setEditingId(null);
        setShowAddForm(false);
        setFormData({ code: '', name: '', account_type: 'expense', description: '' });
    };

    const getTypeColor = (type) => {
        const found = ACCOUNT_TYPES.find(t => t.value === type?.toLowerCase());
        return found?.color || 'bg-gray-100 text-gray-800';
    };

    const getTypeLabel = (type) => {
        const found = ACCOUNT_TYPES.find(t => t.value === type?.toLowerCase());
        return found?.label || type || 'Unknown';
    };

    const filteredAccounts = filterType === 'all'
        ? accounts
        : accounts.filter(a => a.account_type?.toLowerCase() === filterType);

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="ml-2 text-gray-500">Loading chart of accounts...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800">
                        Chart of Accounts
                    </h2>
                    <p className="text-gray-600 text-sm mt-1">
                        Manage your account categories for financial tracking ({accounts.length} accounts)
                    </p>
                </div>
                <button
                    onClick={() => {
                        setShowAddForm(true);
                        setEditingId(null);
                        setFormData({ code: '', name: '', account_type: 'expense', description: '' });
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                >
                    <Plus size={20} />
                    Add Account
                </button>
            </div>

            {/* Filter by Type */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterType === 'all'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                >
                    All ({accounts.length})
                </button>
                {ACCOUNT_TYPES.map(type => {
                    const count = accounts.filter(a => a.account_type?.toLowerCase() === type.value).length;
                    return (
                        <button
                            key={type.value}
                            onClick={() => setFilterType(type.value)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterType === type.value
                                ? 'bg-indigo-600 text-white'
                                : `${type.color} hover:opacity-80`
                                }`}
                        >
                            {type.label} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Add/Edit Form */}
            {(showAddForm || editingId) && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">
                        {editingId ? 'Edit Account' : 'Add New Account'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Account Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="e.g., Groceries"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Account Type *
                            </label>
                            <select
                                value={formData.account_type}
                                onChange={(e) => setFormData({ ...formData, account_type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                            >
                                {ACCOUNT_TYPES.map(type => (
                                    <option key={type.value} value={type.value}>
                                        {type.label} - {type.description}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Code {editingId && <span className="text-gray-400 font-normal">(read-only)</span>}
                            </label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${editingId ? 'bg-gray-100 text-gray-500' : ''}`}
                                placeholder="Auto-generated if blank"
                                readOnly={!!editingId}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                placeholder="Optional description"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={editingId ? handleUpdate : handleAdd}
                            disabled={saving}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader className="w-4 h-4 animate-spin" />
                            ) : (
                                <Save size={16} />
                            )}
                            {editingId ? 'Update' : 'Add'}
                        </button>
                        <button
                            onClick={cancelEdit}
                            className="flex items-center gap-2 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                        >
                            <X size={16} />
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Accounts Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                <table className="w-full">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Code
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Type
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                            </th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                                Edit
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredAccounts.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                                    No accounts found
                                </td>
                            </tr>
                        ) : (
                            filteredAccounts.map(account => (
                                <tr
                                    key={account.id}
                                    className={`hover:bg-gray-50 ${editingId === account.id ? 'bg-indigo-50' : ''}`}
                                >
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                                        {account.code || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {account.name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(account.account_type)}`}>
                                            {getTypeLabel(account.account_type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">
                                        {account.description || '-'}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                        <button
                                            onClick={() => handleEdit(account)}
                                            className="p-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded"
                                            title="Edit account"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* Account Type Legend */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="font-medium text-gray-700 mb-3">Account Type Guide</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {ACCOUNT_TYPES.map(type => (
                        <div key={type.value} className="flex items-start gap-2">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${type.color} whitespace-nowrap`}>
                                {type.label}
                            </span>
                            <span className="text-sm text-gray-600">{type.description}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
