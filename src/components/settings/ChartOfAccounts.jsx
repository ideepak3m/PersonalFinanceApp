
import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Save } from 'lucide-react';
import { supabaseSettingsDB } from '../../services/supabaseDatabase';

const DEFAULT_CHART_OF_ACCOUNTS = [
    { id: 1, code: '1000', name: 'Cash', type: 'Asset', description: 'Cash in hand and bank' },
    { id: 2, code: '1100', name: 'Accounts Receivable', type: 'Asset', description: 'Money owed to you' },
    { id: 3, code: '1200', name: 'Investments', type: 'Asset', description: 'Stocks, bonds, mutual funds' },
    { id: 4, code: '2000', name: 'Accounts Payable', type: 'Liability', description: 'Money you owe' },
    { id: 5, code: '2100', name: 'Credit Cards', type: 'Liability', description: 'Credit card balances' },
    { id: 6, code: '3000', name: 'Equity', type: 'Equity', description: "Owner's equity" },
    { id: 7, code: '4000', name: 'Salary Income', type: 'Income', description: 'Employment income' },
    { id: 8, code: '4100', name: 'Investment Income', type: 'Income', description: 'Dividends, interest, capital gains' },
    { id: 9, code: '5000', name: 'Housing', type: 'Expense', description: 'Rent, mortgage, utilities' },
    { id: 10, code: '5100', name: 'Transportation', type: 'Expense', description: 'Car, gas, public transit' },
    { id: 11, code: '5200', name: 'Food & Dining', type: 'Expense', description: 'Groceries, restaurants' },
    { id: 12, code: '5300', name: 'Healthcare', type: 'Expense', description: 'Medical, insurance' }
];

export const ChartOfAccounts = () => {
    const [accounts, setAccounts] = useState([]);
    const [editingId, setEditingId] = useState(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [formData, setFormData] = useState({
        code: '',
        name: '',
        type: 'Asset',
        description: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchAccounts = async () => {
            setLoading(true);
            try {
                const data = await supabaseSettingsDB.getChartOfAccounts();
                if (data && Array.isArray(data) && data.length > 0) {
                    setAccounts(data);
                } else {
                    setAccounts(DEFAULT_CHART_OF_ACCOUNTS);
                }
            } catch (e) {
                setAccounts(DEFAULT_CHART_OF_ACCOUNTS);
            }
            setLoading(false);
        };
        fetchAccounts();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            await supabaseSettingsDB.setChartOfAccounts(accounts);
            alert('Chart of Accounts saved successfully!');
        } catch (e) {
            alert('Failed to save Chart of Accounts.');
        }
        setSaving(false);
    };

    const handleAdd = () => {
        if (!formData.code || !formData.name) {
            alert('Code and Name are required');
            return;
        }
        const newAccount = {
            id: Date.now(),
            ...formData
        };
        const updated = [...accounts, newAccount];
        setAccounts(updated);
        setFormData({ code: '', name: '', type: 'Asset', description: '' });
        setShowAddForm(false);
    };

    const handleEdit = (account) => {
        setEditingId(account.id);
        setFormData(account);
    };

    const handleUpdate = () => {
        const updated = accounts.map(acc =>
            acc.id === editingId ? { ...acc, ...formData } : acc
        );
        setAccounts(updated);
        setEditingId(null);
        setFormData({ code: '', name: '', type: 'Asset', description: '' });
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this account?')) {
            const updated = accounts.filter(acc => acc.id !== id);
            setAccounts(updated);
        }
    };

    const accountTypes = ['Asset', 'Liability', 'Equity', 'Income', 'Expense'];

    if (loading) {
        return <div className="text-center py-12 text-gray-500">Loading chart of accounts...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                        Chart of Accounts
                    </h2>
                    <p className="text-gray-600">
                        Manage your account categories for financial tracking
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <Plus size={20} />
                        Add Account
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                        disabled={saving}
                    >
                        <Save size={20} />
                        {saving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>

            {/* Add/Edit Form */}
            {(showAddForm || editingId) && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-800 mb-4">
                        {editingId ? 'Edit Account' : 'Add New Account'}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Account Code *
                            </label>
                            <input
                                type="text"
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., 1000"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Account Name *
                            </label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="e.g., Cash"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Type *
                            </label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            >
                                {accountTypes.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Description
                            </label>
                            <input
                                type="text"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="Brief description"
                            />
                        </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                        <button
                            onClick={editingId ? handleUpdate : handleAdd}
                            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                        >
                            {editingId ? 'Update' : 'Add'}
                        </button>
                        <button
                            onClick={() => {
                                setShowAddForm(false);
                                setEditingId(null);
                                setFormData({ code: '', name: '', type: 'Asset', description: '' });
                            }}
                            className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Accounts Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
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
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {accounts.map(account => (
                            <tr key={account.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                    {account.code}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {account.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className={`px-2 py-1 text-xs font-medium rounded ${account.type === 'Asset' ? 'bg-green-100 text-green-800' :
                                        account.type === 'Liability' ? 'bg-red-100 text-red-800' :
                                            account.type === 'Equity' ? 'bg-blue-100 text-blue-800' :
                                                account.type === 'Income' ? 'bg-purple-100 text-purple-800' :
                                                    'bg-orange-100 text-orange-800'
                                        }`}>
                                        {account.type}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-600">
                                    {account.description}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => handleEdit(account)}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            <Edit size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(account.id)}
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
