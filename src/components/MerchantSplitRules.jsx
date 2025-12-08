// src/components/MerchantSplitRules.jsx
import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import {
    merchantSplitRulesDB,
    chartOfAccountsDB,
    merchantDB
} from '../services/database';
import './MerchantSplitRules.css';

export const MerchantSplitRules = () => {
    const [splitRules, setSplitRules] = useState([]);
    const [chartOfAccounts, setChartOfAccounts] = useState([]);
    const [merchants, setMerchants] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingRule, setEditingRule] = useState(null);

    // Form state
    const [merchantFriendlyName, setMerchantFriendlyName] = useState('');
    const [splits, setSplits] = useState([{ categoryId: '', percentage: '' }]);
    const [validationError, setValidationError] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [rules, coa, merchs] = await Promise.all([
                merchantSplitRulesDB.getAll(),
                chartOfAccountsDB.getAll(),
                merchantDB.getAll()
            ]);

            setSplitRules(rules || []);

            // Sort chart of accounts alphabetically by name
            const sortedCoa = (coa || []).sort((a, b) =>
                (a.name || '').localeCompare(b.name || '')
            );
            setChartOfAccounts(sortedCoa);

            // Get unique merchant friendly names and sort alphabetically
            const uniqueMerchants = Array.from(
                new Map((merchs || []).map(m => [m.normalized_name, m])).values()
            ).sort((a, b) =>
                (a.normalized_name || '').localeCompare(b.normalized_name || '')
            );
            setMerchants(uniqueMerchants);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load split rules');
        } finally {
            setLoading(false);
        }
    };

    const handleAddNew = () => {
        setEditingRule(null);
        setMerchantFriendlyName('');
        setSplits([{ categoryId: '', percentage: '' }]);
        setValidationError('');
        setShowModal(true);
    };

    const handleEdit = (rule) => {
        setEditingRule(rule);
        setMerchantFriendlyName(rule.merchant_friendly_name || '');

        // Parse splits from JSONB
        const parsedSplits = Array.isArray(rule.splits)
            ? rule.splits.map(s => ({
                categoryId: s.category_id || s.chart_of_account_id || '',
                percentage: s.percentage || ''
            }))
            : [{ categoryId: '', percentage: '' }];

        setSplits(parsedSplits);
        setValidationError('');
        setShowModal(true);
    };

    const handleDelete = async (ruleId) => {
        if (!confirm('Are you sure you want to delete this split rule?')) {
            return;
        }

        try {
            setLoading(true);
            await merchantSplitRulesDB.delete(ruleId);
            await loadData();
            alert('Split rule deleted successfully');
        } catch (error) {
            console.error('Error deleting split rule:', error);
            alert('Failed to delete split rule: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleAddSplit = () => {
        setSplits([...splits, { categoryId: '', percentage: '' }]);
    };

    const handleRemoveSplit = (index) => {
        if (splits.length > 1) {
            setSplits(splits.filter((_, i) => i !== index));
        }
    };

    const handleSplitChange = (index, field, value) => {
        const newSplits = [...splits];
        newSplits[index][field] = value;
        setSplits(newSplits);
        setValidationError('');
    };

    const validateForm = () => {
        if (!merchantFriendlyName.trim()) {
            setValidationError('Merchant friendly name is required');
            return false;
        }

        const validSplits = splits.filter(s => s.categoryId && s.percentage);
        if (validSplits.length === 0) {
            setValidationError('At least one split with category and percentage is required');
            return false;
        }

        const totalPercentage = validSplits.reduce((sum, s) => sum + parseFloat(s.percentage || 0), 0);
        if (Math.abs(totalPercentage - 100) > 0.01) {
            setValidationError(`Total percentage must equal 100% (currently ${totalPercentage.toFixed(2)}%)`);
            return false;
        }

        return true;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }

        try {
            setLoading(true);

            // Filter out empty splits
            const validSplits = splits
                .filter(s => s.categoryId && s.percentage)
                .map(s => ({
                    chart_of_account_id: s.categoryId,
                    percentage: parseFloat(s.percentage)
                }));

            const ruleData = {
                merchant_friendly_name: merchantFriendlyName.trim(),
                splits: validSplits
            };

            if (editingRule) {
                // Update existing rule
                await merchantSplitRulesDB.update(editingRule.id, ruleData);
                alert('Split rule updated successfully');
            } else {
                // Add new rule
                await merchantSplitRulesDB.add(ruleData);
                alert('Split rule added successfully');
            }

            setShowModal(false);
            await loadData();
        } catch (error) {
            console.error('Error saving split rule:', error);
            alert('Failed to save split rule: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const getCategoryName = (categoryId) => {
        const coa = chartOfAccounts.find(c => c.id === categoryId);
        return coa ? `${coa.code} - ${coa.name}` : 'Unknown';
    };

    const formatSplitDisplay = (splits) => {
        if (!Array.isArray(splits) || splits.length === 0) {
            return 'No splits defined';
        }

        return splits.map(s => {
            const categoryId = s.category_id || s.chart_of_account_id;
            const categoryName = getCategoryName(categoryId);
            return `${categoryName}: ${s.percentage}%`;
        }).join(', ');
    };

    const totalPercentage = splits.reduce((sum, s) => sum + parseFloat(s.percentage || 0), 0);
    const percentageColor = Math.abs(totalPercentage - 100) < 0.01 ? 'text-green-600' : 'text-red-600';

    return (
        <div className="merchant-split-rules-container">
            <div className="header">
                <div>
                    <h1 className="title">Merchant Split Rules</h1>
                    <p className="subtitle">
                        Manage default split configurations for merchants
                    </p>
                </div>
                <button
                    className="btn btn-primary"
                    onClick={handleAddNew}
                    disabled={loading}
                >
                    <Plus size={20} />
                    Add Split Rule
                </button>
            </div>

            {loading && !showModal && (
                <div className="loading">Loading split rules...</div>
            )}

            {!loading && splitRules.length === 0 && (
                <div className="empty-state">
                    <p>No split rules defined yet.</p>
                    <p className="text-sm">Click "Add Split Rule" to create your first one.</p>
                </div>
            )}

            {!loading && splitRules.length > 0 && (
                <div className="table-container">
                    <table className="split-rules-table">
                        <thead>
                            <tr>
                                <th>Merchant Friendly Name</th>
                                <th>Split Configuration</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {splitRules.map(rule => (
                                <tr key={rule.id}>
                                    <td className="merchant-name">
                                        {rule.merchant_friendly_name}
                                    </td>
                                    <td className="split-config">
                                        {formatSplitDisplay(rule.splits)}
                                    </td>
                                    <td className="date-cell">
                                        {new Date(rule.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="actions-cell">
                                        <button
                                            className="btn-icon btn-edit"
                                            onClick={() => handleEdit(rule)}
                                            title="Edit"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            className="btn-icon btn-delete"
                                            onClick={() => handleDelete(rule.id)}
                                            title="Delete"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{editingRule ? 'Edit' : 'Add'} Split Rule</h2>
                            <button
                                className="btn-close"
                                onClick={() => setShowModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="modal-body">
                            {/* Merchant Friendly Name */}
                            <div className="form-group">
                                <label>Merchant Friendly Name *</label>
                                {editingRule ? (
                                    // Show as read-only text when editing
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={merchantFriendlyName}
                                        disabled
                                        style={{ backgroundColor: '#f3f4f6', cursor: 'not-allowed' }}
                                    />
                                ) : (
                                    // Show as dropdown when adding new
                                    <select
                                        className="form-control"
                                        value={merchantFriendlyName}
                                        onChange={(e) => setMerchantFriendlyName(e.target.value)}
                                    >
                                        <option value="">Select Merchant...</option>
                                        {merchants
                                            .filter(m => {
                                                // Filter out merchants that already have split rules
                                                return !splitRules.some(rule =>
                                                    rule.merchant_friendly_name === m.normalized_name
                                                );
                                            })
                                            .map(merchant => (
                                                <option key={merchant.id} value={merchant.normalized_name}>
                                                    {merchant.normalized_name}
                                                </option>
                                            ))
                                        }
                                    </select>
                                )}
                                <small className="form-hint">
                                    {editingRule
                                        ? 'Merchant name cannot be changed when editing'
                                        : 'Select from existing merchant names'
                                    }
                                </small>
                            </div>

                            {/* Split Configuration */}
                            <div className="form-group">
                                <div className="splits-header">
                                    <label>Split Configuration *</label>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        onClick={handleAddSplit}
                                    >
                                        <Plus size={16} />
                                        Add Split
                                    </button>
                                </div>

                                {splits.map((split, index) => (
                                    <div key={index} className="split-row">
                                        <div className="split-category">
                                            <select
                                                className="form-control"
                                                value={split.categoryId}
                                                onChange={(e) =>
                                                    handleSplitChange(index, 'categoryId', e.target.value)
                                                }
                                            >
                                                <option value="">Select Category...</option>
                                                {chartOfAccounts.map(coa => (
                                                    <option key={coa.id} value={coa.id}>
                                                        {coa.code} - {coa.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="split-percentage">
                                            <input
                                                type="number"
                                                className="form-control"
                                                value={split.percentage}
                                                onChange={(e) =>
                                                    handleSplitChange(index, 'percentage', e.target.value)
                                                }
                                                placeholder="%"
                                                min="0"
                                                max="100"
                                                step="0.01"
                                            />
                                            <span className="percentage-symbol">%</span>
                                        </div>
                                        {splits.length > 1 && (
                                            <button
                                                className="btn-icon btn-delete"
                                                onClick={() => handleRemoveSplit(index)}
                                                title="Remove"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                ))}

                                <div className="split-total">
                                    <span>Total:</span>
                                    <span className={percentageColor}>
                                        {totalPercentage.toFixed(2)}%
                                    </span>
                                </div>
                            </div>

                            {validationError && (
                                <div className="validation-error">
                                    {validationError}
                                </div>
                            )}
                        </div>

                        <div className="modal-footer">
                            <button
                                className="btn btn-secondary"
                                onClick={() => setShowModal(false)}
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleSave}
                                disabled={loading}
                            >
                                <Save size={18} />
                                {loading ? 'Saving...' : 'Save Split Rule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MerchantSplitRules;
