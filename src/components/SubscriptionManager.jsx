import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
    supabaseMerchantDB,
    supabaseSubscriptionHistoryDB
} from '../services/pocketbaseDatabase';
import './SubscriptionManager.css';

const SubscriptionManager = () => {
    const { user } = useAuth();
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'active', 'inactive'
    const [sortBy, setSortBy] = useState('name'); // 'name', 'amount', 'renewalDate'
    const [showActionModal, setShowActionModal] = useState(false);
    const [selectedSubscription, setSelectedSubscription] = useState(null);
    const [actionType, setActionType] = useState(''); // 'activate' or 'deactivate'
    const [reason, setReason] = useState('');
    const [notes, setNotes] = useState('');
    const [showHistory, setShowHistory] = useState(false);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        loadSubscriptions();
    }, []);

    const loadSubscriptions = async () => {
        try {
            setLoading(true);

            const allMerchants = await supabaseMerchantDB.getAll();
            // Filter subscriptions and sort by name
            const data = (allMerchants || [])
                .filter(m => m.is_subscription)
                .sort((a, b) => (a.normalized_name || '').localeCompare(b.normalized_name || ''));

            setSubscriptions(data);
        } catch (error) {
            console.error('Error loading subscriptions:', error);
            alert('Failed to load subscriptions');
        } finally {
            setLoading(false);
        }
    };

    const getFilteredSubscriptions = () => {
        let filtered = [...subscriptions];

        // Filter by status
        if (filterStatus === 'active') {
            filtered = filtered.filter(s => s.is_subscription_active);
        } else if (filterStatus === 'inactive') {
            filtered = filtered.filter(s => !s.is_subscription_active);
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'name') {
                return a.normalized_name.localeCompare(b.normalized_name);
            } else if (sortBy === 'amount') {
                return (b.subscription_amount || 0) - (a.subscription_amount || 0);
            } else if (sortBy === 'renewalDate') {
                const dateA = a.subscription_renewal_date ? new Date(a.subscription_renewal_date) : new Date('9999-12-31');
                const dateB = b.subscription_renewal_date ? new Date(b.subscription_renewal_date) : new Date('9999-12-31');
                return dateA - dateB;
            }
            return 0;
        });

        return filtered;
    };

    const calculateMonthlyTotal = () => {
        return subscriptions
            .filter(s => s.is_subscription_active)
            .reduce((total, sub) => {
                const amount = sub.subscription_amount || 0;
                const frequency = sub.subscription_frequency || 'monthly';

                // Convert to monthly equivalent
                let monthlyAmount = amount;
                if (frequency === 'yearly') monthlyAmount = amount / 12;
                else if (frequency === 'quarterly') monthlyAmount = amount / 3;
                else if (frequency === 'weekly') monthlyAmount = amount * 4.33; // Average weeks per month

                return total + monthlyAmount;
            }, 0);
    };

    const calculateYearlyTotal = () => {
        return calculateMonthlyTotal() * 12;
    };

    const handleToggleStatus = (subscription) => {
        setSelectedSubscription(subscription);
        setActionType(subscription.is_subscription_active ? 'deactivate' : 'activate');
        setReason('');
        setNotes('');
        setShowActionModal(true);
    };

    const submitStatusChange = async () => {
        if (!reason.trim()) {
            alert('Please provide a reason for this change');
            return;
        }

        try {
            const newStatus = actionType === 'activate';
            const now = new Date().toISOString();

            // Update merchant table
            const merchantUpdate = {
                is_subscription_active: newStatus,
                updated_at: now
            };

            if (actionType === 'deactivate') {
                merchantUpdate.subscription_deactivated_at = now;
            } else {
                merchantUpdate.subscription_reactivated_at = now;
            }

            await supabaseMerchantDB.update(selectedSubscription.id, merchantUpdate);

            // Insert into subscription_history
            await supabaseSubscriptionHistoryDB.add({
                merchant_id: selectedSubscription.id,
                user_id: user.id,
                action: actionType === 'activate' ? 'activated' : 'deactivated',
                action_date: now,
                reason: reason.trim(),
                notes: notes.trim() || null
            });

            // Refresh subscriptions
            await loadSubscriptions();
            setShowActionModal(false);
            setSelectedSubscription(null);
        } catch (error) {
            console.error('Error updating subscription status:', error);
            alert('Failed to update subscription status');
        }
    };

    const loadHistory = async (merchantId) => {
        try {
            const allHistory = await supabaseSubscriptionHistoryDB.getAll();
            // Filter by merchant_id and sort by date descending
            const data = (allHistory || [])
                .filter(h => h.merchant_id === merchantId)
                .sort((a, b) => new Date(b.action_date) - new Date(a.action_date));

            setHistory(data);
            setShowHistory(true);
        } catch (error) {
            console.error('Error loading history:', error);
            alert('Failed to load subscription history');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount || 0);
    };

    const getFrequencyLabel = (frequency) => {
        const labels = {
            'monthly': 'Monthly',
            'yearly': 'Yearly',
            'quarterly': 'Quarterly',
            'weekly': 'Weekly'
        };
        return labels[frequency] || frequency || 'N/A';
    };

    const filteredSubscriptions = getFilteredSubscriptions();
    const activeCount = subscriptions.filter(s => s.is_subscription_active).length;
    const inactiveCount = subscriptions.filter(s => !s.is_subscription_active).length;

    if (loading) {
        return <div className="subscription-manager loading">Loading subscriptions...</div>;
    }

    return (
        <div className="subscription-manager">
            <div className="subscription-header">
                <h1>Subscription Manager</h1>
                <div className="subscription-summary">
                    <div className="summary-card">
                        <span className="summary-label">Total Subscriptions</span>
                        <span className="summary-value">{subscriptions.length}</span>
                    </div>
                    <div className="summary-card active">
                        <span className="summary-label">Active</span>
                        <span className="summary-value">{activeCount}</span>
                    </div>
                    <div className="summary-card inactive">
                        <span className="summary-label">Inactive</span>
                        <span className="summary-value">{inactiveCount}</span>
                    </div>
                    <div className="summary-card cost">
                        <span className="summary-label">Monthly Cost</span>
                        <span className="summary-value">{formatCurrency(calculateMonthlyTotal())}</span>
                    </div>
                    <div className="summary-card cost">
                        <span className="summary-label">Yearly Cost</span>
                        <span className="summary-value">{formatCurrency(calculateYearlyTotal())}</span>
                    </div>
                </div>
            </div>

            <div className="subscription-controls">
                <div className="filter-group">
                    <label>Filter:</label>
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                        <option value="all">All Subscriptions</option>
                        <option value="active">Active Only</option>
                        <option value="inactive">Inactive Only</option>
                    </select>
                </div>
                <div className="sort-group">
                    <label>Sort by:</label>
                    <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                        <option value="name">Name</option>
                        <option value="amount">Amount</option>
                        <option value="renewalDate">Renewal Date</option>
                    </select>
                </div>
            </div>

            <div className="subscription-list">
                {filteredSubscriptions.length === 0 ? (
                    <div className="no-subscriptions">
                        {filterStatus === 'all'
                            ? 'No subscriptions found. Mark merchants as subscriptions to track them here.'
                            : `No ${filterStatus} subscriptions found.`}
                    </div>
                ) : (
                    <table className="subscription-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Name</th>
                                <th>Frequency</th>
                                <th>Amount</th>
                                <th>Renewal Date</th>
                                <th>Last Changed</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSubscriptions.map(sub => (
                                <tr key={sub.id} className={sub.is_subscription_active ? 'active' : 'inactive'}>
                                    <td>
                                        <span className={`status-badge ${sub.is_subscription_active ? 'active' : 'inactive'}`}>
                                            {sub.is_subscription_active ? '✓ Active' : '✗ Inactive'}
                                        </span>
                                    </td>
                                    <td className="subscription-name">{sub.normalized_name}</td>
                                    <td>{getFrequencyLabel(sub.subscription_frequency)}</td>
                                    <td className="amount">{formatCurrency(sub.subscription_amount)}</td>
                                    <td>{formatDate(sub.subscription_renewal_date)}</td>
                                    <td className="last-changed">
                                        {sub.is_subscription_active
                                            ? formatDate(sub.subscription_reactivated_at || sub.inserted_at)
                                            : formatDate(sub.subscription_deactivated_at)}
                                    </td>
                                    <td className="actions">
                                        <button
                                            className={`toggle-btn ${sub.is_subscription_active ? 'deactivate' : 'activate'}`}
                                            onClick={() => handleToggleStatus(sub)}
                                        >
                                            {sub.is_subscription_active ? 'Deactivate' : 'Activate'}
                                        </button>
                                        <button
                                            className="history-btn"
                                            onClick={() => loadHistory(sub.id)}
                                        >
                                            History
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Action Modal */}
            {showActionModal && (
                <div className="modal-overlay" onClick={() => setShowActionModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h2>{actionType === 'activate' ? 'Activate' : 'Deactivate'} Subscription</h2>
                        <p className="modal-subscription-name">{selectedSubscription?.normalized_name}</p>

                        <div className="form-group">
                            <label>Reason *</label>
                            <select
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                            >
                                <option value="">Select a reason...</option>
                                {actionType === 'deactivate' ? (
                                    <>
                                        <option value="Travel">Travel / Out of country</option>
                                        <option value="Season">Seasonal / Off-season</option>
                                        <option value="Budget">Budget / Cost cutting</option>
                                        <option value="Not Using">Not using enough</option>
                                        <option value="Alternative">Found alternative</option>
                                        <option value="Other">Other</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="Back">Back in country</option>
                                        <option value="Season">Season started</option>
                                        <option value="Need">Need it again</option>
                                        <option value="Other">Other</option>
                                    </>
                                )}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Notes (Optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add any additional context..."
                                rows="3"
                            />
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowActionModal(false)}>
                                Cancel
                            </button>
                            <button
                                className={`btn-confirm ${actionType}`}
                                onClick={submitStatusChange}
                                disabled={!reason}
                            >
                                {actionType === 'activate' ? 'Activate' : 'Deactivate'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {showHistory && (
                <div className="modal-overlay" onClick={() => setShowHistory(false)}>
                    <div className="modal-content history-modal" onClick={(e) => e.stopPropagation()}>
                        <h2>Subscription History</h2>
                        {history.length === 0 ? (
                            <p className="no-history">No history records found.</p>
                        ) : (
                            <div className="history-list">
                                {history.map(record => (
                                    <div key={record.id} className={`history-item ${record.action}`}>
                                        <div className="history-header">
                                            <span className={`history-action ${record.action}`}>
                                                {record.action === 'activated' ? '✓ Activated' : '✗ Deactivated'}
                                            </span>
                                            <span className="history-date">{formatDate(record.action_date)}</span>
                                        </div>
                                        <div className="history-details">
                                            <div className="history-reason">
                                                <strong>Reason:</strong> {record.reason}
                                            </div>
                                            {record.notes && (
                                                <div className="history-notes">
                                                    <strong>Notes:</strong> {record.notes}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowHistory(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionManager;
