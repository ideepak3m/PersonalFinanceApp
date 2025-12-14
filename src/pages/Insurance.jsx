import React, { useState, useEffect } from 'react';
import {
    fetchInsurancePolicies,
    deleteInsurancePolicy,
    getInsuranceSummary,
    PLAN_TYPES,
    POLICY_STATUSES,
    COMMON_INSURERS
} from '../services/insuranceService';
import InsurancePolicyForm from '../components/insurance/InsurancePolicyForm';
import InsurancePolicyDetail from '../components/insurance/InsurancePolicyDetail';
import InsuranceSummaryCards from '../components/insurance/InsuranceSummaryCards';

const Insurance = () => {
    const [policies, setPolicies] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // UI State
    const [showForm, setShowForm] = useState(false);
    const [editingPolicy, setEditingPolicy] = useState(null);
    const [selectedPolicy, setSelectedPolicy] = useState(null);
    const [viewMode, setViewMode] = useState('cards'); // 'cards' or 'table'

    // Sorting
    const [sortColumn, setSortColumn] = useState('next_premium_due_date');
    const [sortDirection, setSortDirection] = useState('asc');

    // Filters
    const [filters, setFilters] = useState({
        status: '',
        planType: '',
        insurer: ''
    });

    // Load data
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [policiesData, summaryData] = await Promise.all([
                fetchInsurancePolicies(filters),
                getInsuranceSummary()
            ]);

            setPolicies(policiesData || []);
            setSummary(summaryData);
        } catch (err) {
            console.error('Error loading insurance data:', err);
            setError('Failed to load insurance data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [filters]);

    const handleAddPolicy = () => {
        setEditingPolicy(null);
        setShowForm(true);
    };

    const handleEditPolicy = (policy) => {
        setEditingPolicy(policy);
        setShowForm(true);
    };

    const handleDeletePolicy = async (policyId) => {
        if (!window.confirm('Are you sure you want to delete this policy?')) {
            return;
        }

        try {
            await deleteInsurancePolicy(policyId);
            loadData();
        } catch (err) {
            console.error('Error deleting policy:', err);
            setError('Failed to delete policy');
        }
    };

    const handleFormClose = (saved) => {
        setShowForm(false);
        setEditingPolicy(null);
        if (saved) {
            loadData();
        }
    };

    const handleViewPolicy = (policy) => {
        setSelectedPolicy(policy);
    };

    const formatCurrency = (amount, currency = 'INR') => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: 0
        }).format(amount || 0);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const getStatusColor = (status) => {
        const colors = {
            active: 'bg-green-100 text-green-800',
            paid_up: 'bg-blue-100 text-blue-800',
            lapsed: 'bg-red-100 text-red-800',
            matured: 'bg-purple-100 text-purple-800',
            surrendered: 'bg-orange-100 text-orange-800',
            claimed: 'bg-gray-100 text-gray-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    };

    const getPlanTypeLabel = (type) => {
        const found = PLAN_TYPES.find(t => t.value === type);
        return found ? found.label : type;
    };

    const getDaysUntilDue = (dueDate) => {
        if (!dueDate) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(dueDate);
        due.setHours(0, 0, 0, 0);
        const diffTime = due - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    // Calculate FINAL premium due date (last payment that completes the premium payment term)
    const getLastPremiumDueDate = (policy) => {
        if (!policy.policy_start_date || !policy.premium_frequency) return null;
        if (policy.premium_frequency === 'single') return policy.policy_start_date;
        if (!policy.premium_payment_term) return null; // Need payment term to calculate

        const startDate = new Date(policy.policy_start_date);

        // Get months between payments based on frequency
        const frequencyMonths = {
            monthly: 1,
            quarterly: 3,
            half_yearly: 6,
            annual: 12
        };

        const monthsInterval = frequencyMonths[policy.premium_frequency] || 12;

        // Calculate total number of premiums in the payment term
        const totalMonths = policy.premium_payment_term * 12;
        const totalPremiums = Math.floor(totalMonths / monthsInterval);

        // The last premium is at (totalPremiums - 1) intervals from start
        // Because first premium is at start date (interval 0)
        const lastPremiumDate = new Date(startDate);
        lastPremiumDate.setMonth(lastPremiumDate.getMonth() + (totalPremiums - 1) * monthsInterval);

        return lastPremiumDate.toISOString().split('T')[0];
    };

    // Calculate total premiums count based on payment term
    const getTotalPremiumsCount = (policy) => {
        if (!policy.policy_start_date || !policy.premium_frequency) return '-';
        if (policy.premium_frequency === 'single') return '1';
        if (!policy.premium_payment_term) return '-';

        const frequencyMonths = {
            monthly: 1,
            quarterly: 3,
            half_yearly: 6,
            annual: 12
        };

        const monthsInterval = frequencyMonths[policy.premium_frequency] || 12;
        const totalMonths = policy.premium_payment_term * 12;
        const totalPremiums = Math.floor(totalMonths / monthsInterval);

        return totalPremiums;
    };

    // Handle column sorting
    const handleSort = (column) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Get sorted policies
    const getSortedPolicies = () => {
        return [...policies].sort((a, b) => {
            let aValue, bValue;

            switch (sortColumn) {
                case 'insurer_name':
                    aValue = a.insurer_name?.toLowerCase() || '';
                    bValue = b.insurer_name?.toLowerCase() || '';
                    break;
                case 'plan_type':
                    aValue = a.plan_type?.toLowerCase() || '';
                    bValue = b.plan_type?.toLowerCase() || '';
                    break;
                case 'sum_assured':
                    aValue = parseFloat(a.sum_assured) || 0;
                    bValue = parseFloat(b.sum_assured) || 0;
                    break;
                case 'premium_amount':
                    aValue = parseFloat(a.premium_amount) || 0;
                    bValue = parseFloat(b.premium_amount) || 0;
                    break;
                case 'next_premium_due_date':
                    aValue = a.next_premium_due_date ? new Date(a.next_premium_due_date) : new Date('9999-12-31');
                    bValue = b.next_premium_due_date ? new Date(b.next_premium_due_date) : new Date('9999-12-31');
                    break;
                case 'final_payment':
                    aValue = getLastPremiumDueDate(a) ? new Date(getLastPremiumDueDate(a)) : new Date('9999-12-31');
                    bValue = getLastPremiumDueDate(b) ? new Date(getLastPremiumDueDate(b)) : new Date('9999-12-31');
                    break;
                case 'status':
                    aValue = a.status?.toLowerCase() || '';
                    bValue = b.status?.toLowerCase() || '';
                    break;
                default:
                    aValue = a[sortColumn] || '';
                    bValue = b[sortColumn] || '';
            }

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    // Sortable header component
    const SortableHeader = ({ column, label, align = 'left' }) => (
        <th
            className={`px-4 py-3 text-${align} text-xs font-medium text-gray-500 uppercase cursor-pointer hover:bg-gray-100 select-none`}
            onClick={() => handleSort(column)}
        >
            <div className={`flex items-center gap-1 ${align === 'right' ? 'justify-end' : ''}`}>
                {label}
                <span className="text-gray-400">
                    {sortColumn === column ? (
                        sortDirection === 'asc' ? '▲' : '▼'
                    ) : '⇅'}
                </span>
            </div>
        </th>
    );

    if (loading && policies.length === 0) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // If viewing a specific policy detail
    if (selectedPolicy) {
        return (
            <InsurancePolicyDetail
                policyId={selectedPolicy.id}
                onBack={() => {
                    setSelectedPolicy(null);
                    loadData();
                }}
                onEdit={() => {
                    setEditingPolicy(selectedPolicy);
                    setSelectedPolicy(null);
                    setShowForm(true);
                }}
            />
        );
    }

    // If showing form
    if (showForm) {
        return (
            <InsurancePolicyForm
                policy={editingPolicy}
                onClose={handleFormClose}
            />
        );
    }

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Insurance Policies</h1>
                    <p className="text-gray-600">Manage your life and health insurance policies</p>
                </div>
                <button
                    onClick={handleAddPolicy}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Policy
                </button>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                    {error}
                </div>
            )}

            {/* Summary Cards */}
            {summary && <InsuranceSummaryCards summary={summary} formatCurrency={formatCurrency} />}

            {/* Filters */}
            <div className="bg-white rounded-lg shadow-sm border p-4 mb-6">
                <div className="flex flex-wrap gap-4 items-center">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                        <select
                            value={filters.status}
                            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            className="border rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">All Statuses</option>
                            {POLICY_STATUSES.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Plan Type</label>
                        <select
                            value={filters.planType}
                            onChange={(e) => setFilters({ ...filters, planType: e.target.value })}
                            className="border rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">All Types</option>
                            {PLAN_TYPES.map(t => (
                                <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Insurer</label>
                        <select
                            value={filters.insurer}
                            onChange={(e) => setFilters({ ...filters, insurer: e.target.value })}
                            className="border rounded-lg px-3 py-2 text-sm"
                        >
                            <option value="">All Insurers</option>
                            {COMMON_INSURERS.map(i => (
                                <option key={i} value={i}>{i}</option>
                            ))}
                        </select>
                    </div>

                    <div className="ml-auto">
                        <label className="block text-sm font-medium text-gray-700 mb-1">View</label>
                        <div className="flex border rounded-lg overflow-hidden">
                            <button
                                onClick={() => setViewMode('cards')}
                                className={`px-3 py-2 text-sm ${viewMode === 'cards' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                            >
                                Cards
                            </button>
                            <button
                                onClick={() => setViewMode('table')}
                                className={`px-3 py-2 text-sm ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700'}`}
                            >
                                Table
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Policies List */}
            {policies.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
                    <svg className="w-16 h-16 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Insurance Policies</h3>
                    <p className="text-gray-500 mb-4">Get started by adding your first insurance policy.</p>
                    <button
                        onClick={handleAddPolicy}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Add Your First Policy
                    </button>
                </div>
            ) : viewMode === 'cards' ? (
                /* Card View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {policies.map(policy => {
                        const daysUntilDue = getDaysUntilDue(policy.next_premium_due_date);
                        const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                        const isDueSoon = daysUntilDue !== null && daysUntilDue >= 0 && daysUntilDue <= 7;

                        return (
                            <div
                                key={policy.id}
                                className="bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => handleViewPolicy(policy)}
                            >
                                <div className="p-4">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <h3 className="font-semibold text-gray-900">{policy.insurer_name}</h3>
                                            <p className="text-sm text-gray-500">{policy.policy_number}</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(policy.status)}`}>
                                            {policy.status}
                                        </span>
                                    </div>

                                    {/* Plan Details */}
                                    <div className="mb-3">
                                        <p className="text-sm text-gray-600">{policy.plan_name || getPlanTypeLabel(policy.plan_type)}</p>
                                        <p className="text-xs text-gray-500">{getPlanTypeLabel(policy.plan_type)}</p>
                                    </div>

                                    {/* Sum Assured */}
                                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                                        <p className="text-xs text-gray-500">Sum Assured</p>
                                        <p className="text-lg font-bold text-gray-900">
                                            {formatCurrency(policy.sum_assured, policy.currency)}
                                        </p>
                                    </div>

                                    {/* Premium Info */}
                                    <div className="flex justify-between text-sm mb-3">
                                        <div>
                                            <p className="text-gray-500">Premium</p>
                                            <p className="font-medium">{formatCurrency(policy.premium_amount, policy.currency)}</p>
                                            <p className="text-xs text-gray-400 capitalize">{policy.premium_frequency?.replace('_', '-')}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-gray-500">Next Due</p>
                                            {policy.next_premium_due_date ? (
                                                <>
                                                    <p className={`font-medium ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : ''}`}>
                                                        {formatDate(policy.next_premium_due_date)}
                                                    </p>
                                                    {isOverdue && (
                                                        <p className="text-xs text-red-500">Overdue by {Math.abs(daysUntilDue)} days</p>
                                                    )}
                                                    {isDueSoon && !isOverdue && (
                                                        <p className="text-xs text-orange-500">Due in {daysUntilDue} days</p>
                                                    )}
                                                </>
                                            ) : (
                                                <p className="text-gray-400">-</p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Maturity Date */}
                                    {policy.maturity_date && (
                                        <div className="text-sm text-gray-500 border-t pt-2">
                                            Matures: {formatDate(policy.maturity_date)}
                                        </div>
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2 mt-3 pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => handleViewPolicy(policy)}
                                            className="flex-1 text-sm text-blue-600 hover:bg-blue-50 py-1 rounded"
                                        >
                                            View
                                        </button>
                                        <button
                                            onClick={() => handleEditPolicy(policy)}
                                            className="flex-1 text-sm text-gray-600 hover:bg-gray-50 py-1 rounded"
                                        >
                                            Edit
                                        </button>
                                        <button
                                            onClick={() => handleDeletePolicy(policy.id)}
                                            className="flex-1 text-sm text-red-600 hover:bg-red-50 py-1 rounded"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                /* Table View */
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <SortableHeader column="insurer_name" label="Policy" />
                                    <SortableHeader column="plan_type" label="Type" />
                                    <SortableHeader column="sum_assured" label="Sum Assured" align="right" />
                                    <SortableHeader column="premium_amount" label="Premium" align="right" />
                                    <SortableHeader column="next_premium_due_date" label="Next Due" />
                                    <SortableHeader column="final_payment" label="Final Payment" />
                                    <SortableHeader column="status" label="Status" />
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {getSortedPolicies().map((policy, index) => {
                                    const daysUntilDue = getDaysUntilDue(policy.next_premium_due_date);
                                    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

                                    return (
                                        <tr key={policy.id} className={`hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                            <td className="px-4 py-3">
                                                <div>
                                                    <p className="font-medium text-gray-900">{policy.insurer_name}</p>
                                                    <p className="text-sm text-gray-500">{policy.policy_number}</p>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <p className="text-sm">{getPlanTypeLabel(policy.plan_type)}</p>
                                                {policy.plan_name && (
                                                    <p className="text-xs text-gray-500">{policy.plan_name}</p>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right font-medium">
                                                {formatCurrency(policy.sum_assured, policy.currency)}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <p>{formatCurrency(policy.premium_amount, policy.currency)}</p>
                                                <p className="text-xs text-gray-500 capitalize">{policy.premium_frequency?.replace('_', '-')}</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                {policy.next_premium_due_date ? (
                                                    <span className={isOverdue ? 'text-red-600 font-medium' : ''}>
                                                        {formatDate(policy.next_premium_due_date)}
                                                    </span>
                                                ) : '-'}
                                            </td>
                                            <td className="px-4 py-3">
                                                <p>{formatDate(getLastPremiumDueDate(policy))}</p>
                                                <p className="text-xs text-gray-500">{getTotalPremiumsCount(policy)} premiums</p>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(policy.status)}`}>
                                                    {policy.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleViewPolicy(policy)}
                                                        className="text-blue-600 hover:text-blue-800 text-sm"
                                                    >
                                                        View
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditPolicy(policy)}
                                                        className="text-gray-600 hover:text-gray-800 text-sm"
                                                    >
                                                        Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeletePolicy(policy.id)}
                                                        className="text-red-600 hover:text-red-800 text-sm"
                                                    >
                                                        Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Insurance;
