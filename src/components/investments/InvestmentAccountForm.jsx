// src/components/investments/InvestmentAccountForm.jsx
import React, { useState, useEffect } from 'react';
import { X, Save, Building2 } from 'lucide-react';
import { getInvestmentManagers, createInvestmentManager } from '../../services/investmentDataService';
import { investmentAccountsDB } from '../../services/database';

const ACCOUNT_TYPES = [
    'RRSP',
    'TFSA',
    'RESP',
    'Non-Registered',
    'LIRA',
    'RRIF',
    'Margin',
    'Cash',
    'Other'
];

const InvestmentAccountForm = ({ isOpen, onClose, onSave }) => {
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [showNewManager, setShowNewManager] = useState(false);
    const [newManagerName, setNewManagerName] = useState('');

    const [formData, setFormData] = useState({
        display_name: '',
        account_type: 'RRSP',
        account_number: '',
        manager_id: '',
        institution: '',
        notes: ''
    });

    useEffect(() => {
        if (isOpen) {
            loadManagers();
        }
    }, [isOpen]);

    const loadManagers = async () => {
        setLoading(true);
        try {
            const result = await getInvestmentManagers();
            if (result.success) {
                setManagers(result.managers || []);
            }
        } catch (error) {
            console.error('Error loading managers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateManager = async () => {
        if (!newManagerName.trim()) {
            alert('Please enter a manager name');
            return;
        }

        try {
            const result = await createInvestmentManager({ name: newManagerName.trim() });
            if (result.success && result.manager) {
                setManagers(prev => [...prev, result.manager]);
                setFormData(prev => ({ ...prev, manager_id: result.manager.id }));
                setNewManagerName('');
                setShowNewManager(false);
            }
        } catch (error) {
            console.error('Error creating manager:', error);
            alert('Failed to create manager');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.display_name.trim()) {
            alert('Please enter a display name');
            return;
        }

        setSaving(true);
        try {
            const accountData = {
                display_name: formData.display_name.trim(),
                account_type: formData.account_type,
                account_number: formData.account_number?.trim() || null,
                manager_id: formData.manager_id || null,
                institution: formData.institution?.trim() || null,
                currency: 'CAD',
                notes: formData.notes?.trim() || null
            };

            await investmentAccountsDB.add(accountData);

            onSave();
            handleClose();
        } catch (error) {
            console.error('Error creating account:', error);
            alert('Failed to create account: ' + error.message);
        } finally {
            setSaving(false);
        }
    };

    const handleClose = () => {
        setFormData({
            display_name: '',
            account_type: 'RRSP',
            account_number: '',
            manager_id: '',
            institution: '',
            notes: ''
        });
        setShowNewManager(false);
        setNewManagerName('');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-gray-200 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 rounded-lg">
                            <Building2 className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-semibold text-gray-900">Add Investment Account</h2>
                            <p className="text-sm text-gray-500">Create a new investment account</p>
                        </div>
                    </div>
                    <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X className="h-5 w-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                    <div className="space-y-4">
                        {/* Display Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Display Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="display_name"
                                value={formData.display_name}
                                onChange={handleChange}
                                placeholder="e.g., My RRSP - Olympia"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                required
                            />
                        </div>

                        {/* Account Type */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Account Type <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="account_type"
                                value={formData.account_type}
                                onChange={handleChange}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                required
                            >
                                {ACCOUNT_TYPES.map(type => (
                                    <option key={type} value={type}>{type}</option>
                                ))}
                            </select>
                        </div>

                        {/* Account Number */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Account Number (Optional)
                            </label>
                            <input
                                type="text"
                                name="account_number"
                                value={formData.account_number}
                                onChange={handleChange}
                                placeholder="Account number"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Investment Manager */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Investment Manager (Optional)
                            </label>
                            {!showNewManager ? (
                                <div className="flex gap-2">
                                    <select
                                        name="manager_id"
                                        value={formData.manager_id}
                                        onChange={handleChange}
                                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        disabled={loading}
                                    >
                                        <option value="">Select a manager...</option>
                                        {managers.map(manager => (
                                            <option key={manager.id} value={manager.id}>
                                                {manager.name}
                                            </option>
                                        ))}
                                    </select>
                                    <button
                                        type="button"
                                        onClick={() => setShowNewManager(true)}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        + New
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newManagerName}
                                        onChange={(e) => setNewManagerName(e.target.value)}
                                        placeholder="Manager name"
                                        className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleCreateManager}
                                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                    >
                                        Create
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowNewManager(false);
                                            setNewManagerName('');
                                        }}
                                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Institution */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Institution (Optional)
                            </label>
                            <input
                                type="text"
                                name="institution"
                                value={formData.institution}
                                onChange={handleChange}
                                placeholder="e.g., Olympia Trust Company"
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>

                        {/* Notes */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Notes (Optional)
                            </label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleChange}
                                placeholder="Additional notes..."
                                rows={3}
                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200">
                    <button
                        type="button"
                        onClick={handleClose}
                        className="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        {saving ? 'Creating...' : 'Create Account'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default InvestmentAccountForm;
