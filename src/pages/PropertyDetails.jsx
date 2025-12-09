// src/pages/PropertyDetails.jsx
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Home,
    Building2,
    Plus,
    Edit2,
    Trash2,
    MapPin,
    Calendar,
    TrendingUp,
    X,
    Banknote,
    Percent,
    Clock,
    RefreshCw,
    Link2,
    Unlink,
    DollarSign,
    PiggyBank,
    History
} from 'lucide-react';
import {
    getPropertyById,
    updateProperty,
    getMortgagesForProperty,
    getMortgageHistory,
    addMortgageWithTerm,
    addMortgageTerm,
    getPropertyInvestmentSummary,
    getRentalIncomeForProperty,
    linkTransactionToProperty
} from '../services/propertyService';
import { mortgagesDB, mortgageTermsDB } from '../services/database';

const MORTGAGE_TYPES = [
    { value: 'fixed', label: 'Fixed Rate Mortgage' },
    { value: 'variable', label: 'Variable Rate Mortgage' },
    { value: 'adjustable', label: 'Adjustable Rate Mortgage' },
    { value: 'heloc', label: 'HELOC' },
    { value: 'reverse', label: 'Reverse Mortgage' }
];

const RATE_TYPES = [
    { value: 'fixed', label: 'Fixed Rate' },
    { value: 'variable', label: 'Variable Rate' },
    { value: 'adjustable', label: 'Adjustable Rate' },
    { value: 'prime_plus', label: 'Prime + Offset' },
    { value: 'prime_minus', label: 'Prime - Offset' }
];

const PAYMENT_FREQUENCIES = [
    { value: 'monthly', label: 'Monthly' },
    { value: 'bi_weekly', label: 'Bi-Weekly' },
    { value: 'accelerated_bi_weekly', label: 'Accelerated Bi-Weekly' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'accelerated_weekly', label: 'Accelerated Weekly' },
    { value: 'semi_monthly', label: 'Semi-Monthly' }
];

const RENEWAL_TYPES = [
    { value: 'original', label: 'Original Term' },
    { value: 'renewal', label: 'Renewal' },
    { value: 'refinance', label: 'Refinance' },
    { value: 'transfer', label: 'Transfer' }
];

export const PropertyDetails = () => {
    const { propertyId } = useParams();
    const navigate = useNavigate();

    const [property, setProperty] = useState(null);
    const [mortgages, setMortgages] = useState([]);
    const [investmentSummary, setInvestmentSummary] = useState(null);
    const [rentalIncome, setRentalIncome] = useState(null);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [showMortgageModal, setShowMortgageModal] = useState(false);
    const [showTermModal, setShowTermModal] = useState(false);
    const [showRentalModal, setShowRentalModal] = useState(false);
    const [editingMortgage, setEditingMortgage] = useState(null);
    const [selectedMortgageForTerm, setSelectedMortgageForTerm] = useState(null);
    const [mortgageHistory, setMortgageHistory] = useState([]);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('overview');

    // Mortgage form state
    const [mortgageForm, setMortgageForm] = useState({
        mortgage_name: '',
        mortgage_type: 'fixed',
        original_loan_amount: '',
        loan_date: '',
        original_amortization_years: '25',
        current_balance: '',
        is_active: true,
        notes: '',
        // Initial term fields
        lender: '',
        interest_rate: '',
        rate_type: 'fixed',
        prime_rate_offset: '',
        term_years: '5',
        term_start_date: '',
        term_end_date: '',
        payment_frequency: 'monthly',
        regular_payment_amount: '',
        balance_at_term_start: ''
    });

    // Term form state (for renewals)
    const [termForm, setTermForm] = useState({
        lender: '',
        interest_rate: '',
        rate_type: 'fixed',
        prime_rate_offset: '',
        term_years: '5',
        term_start_date: '',
        term_end_date: '',
        payment_frequency: 'monthly',
        regular_payment_amount: '',
        balance_at_term_start: '',
        renewal_type: 'renewal',
        notes: ''
    });

    useEffect(() => {
        if (propertyId) {
            loadPropertyData();
        }
    }, [propertyId]);

    const loadPropertyData = async () => {
        setLoading(true);
        try {
            const [propertyResult, mortgagesResult, summaryResult, rentalResult] = await Promise.all([
                getPropertyById(propertyId),
                getMortgagesForProperty(propertyId),
                getPropertyInvestmentSummary(propertyId),
                getRentalIncomeForProperty(propertyId)
            ]);

            if (propertyResult.success) {
                setProperty(propertyResult.property);
            }
            if (mortgagesResult.success) {
                setMortgages(mortgagesResult.mortgages);
            }
            if (summaryResult.success) {
                setInvestmentSummary(summaryResult.summary);
            }
            if (rentalResult.success) {
                setRentalIncome(rentalResult);
            }
        } catch (error) {
            console.error('Error loading property data:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (value) => {
        if (value === null || value === undefined) return '-';
        return new Intl.NumberFormat('en-CA', {
            style: 'currency',
            currency: 'CAD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const formatPercent = (value) => {
        if (value === null || value === undefined) return '-';
        return `${parseFloat(value).toFixed(2)}%`;
    };

    // Mortgage handlers
    const handleAddMortgage = () => {
        setEditingMortgage(null);
        setMortgageForm({
            mortgage_name: '',
            mortgage_type: 'fixed',
            original_loan_amount: '',
            loan_date: '',
            original_amortization_years: '25',
            current_balance: '',
            is_active: true,
            notes: '',
            lender: '',
            interest_rate: '',
            rate_type: 'fixed',
            prime_rate_offset: '',
            term_years: '5',
            term_start_date: '',
            term_end_date: '',
            payment_frequency: 'monthly',
            regular_payment_amount: '',
            balance_at_term_start: ''
        });
        setShowMortgageModal(true);
    };

    const handleSaveMortgage = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const mortgageData = {
                property_id: propertyId,
                mortgage_name: mortgageForm.mortgage_name,
                mortgage_type: mortgageForm.mortgage_type,
                original_loan_amount: parseFloat(mortgageForm.original_loan_amount) || 0,
                loan_date: mortgageForm.loan_date,
                original_amortization_years: parseInt(mortgageForm.original_amortization_years) || 25,
                current_balance: parseFloat(mortgageForm.current_balance) || parseFloat(mortgageForm.original_loan_amount) || 0,
                is_active: mortgageForm.is_active,
                notes: mortgageForm.notes
            };

            const termData = {
                lender: mortgageForm.lender,
                interest_rate: parseFloat(mortgageForm.interest_rate) || 0,
                rate_type: mortgageForm.rate_type,
                prime_rate_offset: mortgageForm.prime_rate_offset ? parseFloat(mortgageForm.prime_rate_offset) : null,
                term_years: parseInt(mortgageForm.term_years) || 5,
                term_start_date: mortgageForm.term_start_date || mortgageForm.loan_date,
                term_end_date: mortgageForm.term_end_date || null,
                payment_frequency: mortgageForm.payment_frequency,
                regular_payment_amount: parseFloat(mortgageForm.regular_payment_amount) || 0,
                balance_at_term_start: parseFloat(mortgageForm.balance_at_term_start) || parseFloat(mortgageForm.original_loan_amount) || 0
            };

            const result = await addMortgageWithTerm(mortgageData, termData);

            if (result.success) {
                setShowMortgageModal(false);
                await loadPropertyData();
            } else {
                alert(`Failed to save mortgage: ${result.error}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteMortgage = async (mortgageId) => {
        if (!window.confirm('Delete this mortgage and all its terms?')) return;

        try {
            await mortgagesDB.delete(mortgageId);
            await loadPropertyData();
        } catch (error) {
            alert(`Error deleting mortgage: ${error.message}`);
        }
    };

    // Term (Renewal) handlers
    const handleAddRenewal = (mortgage) => {
        setSelectedMortgageForTerm(mortgage);
        setTermForm({
            lender: mortgage.currentTerm?.lender || '',
            interest_rate: '',
            rate_type: mortgage.currentTerm?.rate_type || 'fixed',
            prime_rate_offset: '',
            term_years: '5',
            term_start_date: '',
            term_end_date: '',
            payment_frequency: mortgage.currentTerm?.payment_frequency || 'monthly',
            regular_payment_amount: '',
            balance_at_term_start: mortgage.current_balance || '',
            renewal_type: 'renewal',
            notes: ''
        });
        setShowTermModal(true);
    };

    const handleSaveTerm = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            const termData = {
                lender: termForm.lender,
                interest_rate: parseFloat(termForm.interest_rate) || 0,
                rate_type: termForm.rate_type,
                prime_rate_offset: termForm.prime_rate_offset ? parseFloat(termForm.prime_rate_offset) : null,
                term_years: parseInt(termForm.term_years) || 5,
                term_start_date: termForm.term_start_date,
                term_end_date: termForm.term_end_date || null,
                payment_frequency: termForm.payment_frequency,
                regular_payment_amount: parseFloat(termForm.regular_payment_amount) || 0,
                balance_at_term_start: parseFloat(termForm.balance_at_term_start) || 0,
                renewal_type: termForm.renewal_type,
                notes: termForm.notes
            };

            const result = await addMortgageTerm(selectedMortgageForTerm.id, termData);

            if (result.success) {
                // Update mortgage current balance
                await mortgagesDB.update(selectedMortgageForTerm.id, {
                    current_balance: termData.balance_at_term_start
                });

                setShowTermModal(false);
                await loadPropertyData();
            } else {
                alert(`Failed to add term: ${result.error}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleViewHistory = async (mortgage) => {
        const result = await getMortgageHistory(mortgage.id);
        if (result.success) {
            setMortgageHistory(result.terms);
            setSelectedMortgageForTerm(mortgage);
            setShowHistoryModal(true);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="text-center py-12">
                <p className="text-gray-400">Property not found</p>
                <button
                    onClick={() => navigate('/properties')}
                    className="mt-4 text-indigo-400 hover:text-indigo-300"
                >
                    Back to Properties
                </button>
            </div>
        );
    }

    const marketValue = property.current_market_value || property.purchase_price;
    const totalMortgageBalance = mortgages
        .filter(m => m.is_active)
        .reduce((sum, m) => sum + (m.current_balance || 0), 0);
    const equity = marketValue - totalMortgageBalance;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/properties')}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex-1">
                    <h1 className="text-2xl font-bold text-white">{property.property_name}</h1>
                    {property.address && (
                        <p className="text-gray-400 flex items-center gap-2 mt-1">
                            <MapPin className="w-4 h-4" />
                            {property.address}
                        </p>
                    )}
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${property.is_primary_residence
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-green-500/20 text-green-300'
                    }`}>
                    {property.is_primary_residence ? 'Primary Residence' : 'Investment Property'}
                </span>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Market Value</p>
                            <p className="text-xl font-semibold text-white">{formatCurrency(marketValue)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Equity</p>
                            <p className="text-xl font-semibold text-green-400">{formatCurrency(equity)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <Banknote className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Mortgage Balance</p>
                            <p className="text-xl font-semibold text-red-400">{formatCurrency(totalMortgageBalance)}</p>
                        </div>
                    </div>
                </div>

                {!property.is_primary_residence && rentalIncome && (
                    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-500/20 rounded-lg">
                                <DollarSign className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <p className="text-gray-400 text-sm">Rental Income</p>
                                <p className="text-xl font-semibold text-purple-400">{formatCurrency(rentalIncome.totalRentalIncome)}</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-700">
                <nav className="flex gap-4">
                    {['overview', 'mortgages', 'rental'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === tab
                                ? 'border-indigo-500 text-indigo-400'
                                : 'border-transparent text-gray-400 hover:text-white'
                                }`}
                        >
                            {tab === 'overview' && 'Overview'}
                            {tab === 'mortgages' && `Mortgages (${mortgages.length})`}
                            {tab === 'rental' && 'Rental Income'}
                        </button>
                    ))}
                </nav>
            </div>

            {/* Tab Content */}
            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Property Details */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Property Details</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Purchase Date</span>
                                <span className="text-white">{formatDate(property.purchase_date)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Purchase Price</span>
                                <span className="text-white">{formatCurrency(property.purchase_price)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Down Payment</span>
                                <span className="text-white">{formatCurrency(property.down_payment)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Current Market Value</span>
                                <span className="text-white">{formatCurrency(marketValue)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Annual Property Tax</span>
                                <span className="text-white">{formatCurrency(property.property_tax_annual)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Monthly HOA Fees</span>
                                <span className="text-white">{formatCurrency(property.hoa_monthly || 0)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Closing Costs */}
                    <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Closing Costs</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <span className="text-gray-400">Land Transfer Tax</span>
                                <span className="text-white">{formatCurrency(property.land_transfer_tax)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Legal Fees</span>
                                <span className="text-white">{formatCurrency(property.legal_fees)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Home Inspection</span>
                                <span className="text-white">{formatCurrency(property.home_inspection)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Appraisal Fee</span>
                                <span className="text-white">{formatCurrency(property.appraisal_fee)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-400">Other Costs</span>
                                <span className="text-white">{formatCurrency(property.other_closing_costs)}</span>
                            </div>
                            <div className="flex justify-between pt-3 border-t border-gray-700">
                                <span className="text-gray-300 font-medium">Total Closing Costs</span>
                                <span className="text-white font-medium">
                                    {formatCurrency(
                                        (property.land_transfer_tax || 0) +
                                        (property.legal_fees || 0) +
                                        (property.home_inspection || 0) +
                                        (property.appraisal_fee || 0) +
                                        (property.other_closing_costs || 0)
                                    )}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Investment Summary (for non-primary) */}
                    {!property.is_primary_residence && investmentSummary?.isInvestmentProperty && (
                        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 lg:col-span-2">
                            <h3 className="text-lg font-semibold text-white mb-4">Investment Summary</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-gray-400 text-sm">Total Invested</p>
                                    <p className="text-white font-medium">{formatCurrency(investmentSummary.totalInvested)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Annual Rental Income</p>
                                    <p className="text-purple-400 font-medium">{formatCurrency(investmentSummary.annualRentalIncome)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Gross Rental Yield</p>
                                    <p className="text-green-400 font-medium">{investmentSummary.grossRentalYield}%</p>
                                </div>
                                <div>
                                    <p className="text-gray-400 text-sm">Equity</p>
                                    <p className="text-green-400 font-medium">{formatCurrency(investmentSummary.equity)}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'mortgages' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-white">Mortgages</h3>
                        <button
                            onClick={handleAddMortgage}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Add Mortgage
                        </button>
                    </div>

                    {mortgages.length === 0 ? (
                        <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                            <Banknote className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">No mortgages added yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {mortgages.map(mortgage => (
                                <div key={mortgage.id} className="bg-gray-800 rounded-xl p-5 border border-gray-700">
                                    <div className="flex items-start justify-between mb-4">
                                        <div>
                                            <h4 className="font-semibold text-white">{mortgage.mortgage_name}</h4>
                                            <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
                                                {MORTGAGE_TYPES.find(t => t.value === mortgage.mortgage_type)?.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded text-xs ${mortgage.is_active
                                                ? 'bg-green-500/20 text-green-300'
                                                : 'bg-gray-600 text-gray-400'
                                                }`}>
                                                {mortgage.is_active ? 'Active' : 'Closed'}
                                            </span>
                                            <button
                                                onClick={() => handleViewHistory(mortgage)}
                                                className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                                                title="View History"
                                            >
                                                <History className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteMortgage(mortgage.id)}
                                                className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div>
                                            <p className="text-gray-500 text-xs">Original Amount</p>
                                            <p className="text-white">{formatCurrency(mortgage.original_loan_amount)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs">Current Balance</p>
                                            <p className="text-red-400 font-medium">{formatCurrency(mortgage.current_balance)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs">Amortization</p>
                                            <p className="text-white">{mortgage.original_amortization_years} years</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-500 text-xs">Start Date</p>
                                            <p className="text-white">{formatDate(mortgage.loan_date)}</p>
                                        </div>
                                    </div>

                                    {/* Current Term Info */}
                                    {mortgage.currentTerm && (
                                        <div className="bg-gray-700/50 rounded-lg p-4 mb-4">
                                            <h5 className="text-sm font-medium text-gray-300 mb-3">Current Term</h5>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-gray-500 text-xs">Lender</p>
                                                    <p className="text-white text-sm">{mortgage.currentTerm.lender}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Interest Rate</p>
                                                    <p className="text-white text-sm">{formatPercent(mortgage.currentTerm.interest_rate)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Payment</p>
                                                    <p className="text-white text-sm">{formatCurrency(mortgage.currentTerm.regular_payment_amount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Term Ends</p>
                                                    <p className="text-white text-sm">{formatDate(mortgage.currentTerm.term_end_date)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {mortgage.is_active && (
                                        <button
                                            onClick={() => handleAddRenewal(mortgage)}
                                            className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300"
                                        >
                                            <RefreshCw className="w-4 h-4" />
                                            Add Renewal / Refinance
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'rental' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-white">Rental Income</h3>
                    </div>

                    {property.is_primary_residence ? (
                        <div className="bg-gray-800 rounded-xl p-8 text-center border border-gray-700">
                            <Home className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                            <p className="text-gray-400">This is your primary residence</p>
                            <p className="text-gray-500 text-sm mt-1">Rental income tracking is available for investment properties</p>
                        </div>
                    ) : (
                        <>
                            {/* Summary */}
                            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-gray-400 text-sm">Expected Monthly Rent</p>
                                        <p className="text-2xl font-semibold text-purple-400">
                                            {formatCurrency(property.expected_monthly_rent || 0)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Annual Rental Income</p>
                                        <p className="text-xl font-semibold text-white">
                                            {formatCurrency((property.expected_monthly_rent || 0) * 12)}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Gross Yield</p>
                                        <p className="text-xl font-semibold text-green-400">
                                            {marketValue > 0
                                                ? ((property.expected_monthly_rent || 0) * 12 / marketValue * 100).toFixed(2)
                                                : '0.00'
                                            }%
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 text-sm">Net Monthly (Est.)</p>
                                        <p className="text-xl font-semibold text-green-400">
                                            {formatCurrency(
                                                (property.expected_monthly_rent || 0) -
                                                (property.hoa_monthly || 0) -
                                                ((property.property_tax_annual || 0) / 12)
                                            )}
                                        </p>
                                        <p className="text-gray-500 text-xs mt-1">After HOA & taxes</p>
                                    </div>
                                </div>
                            </div>

                            {/* Detected Transactions */}
                            {rentalIncome?.transactions?.length > 0 && (
                                <div className="bg-gray-800 rounded-xl border border-gray-700">
                                    <div className="px-4 py-3 border-b border-gray-700">
                                        <h4 className="font-medium text-white">Detected Rental Transactions</h4>
                                        <p className="text-gray-500 text-sm">Transactions matching rental keywords or property name</p>
                                    </div>
                                    <div className="divide-y divide-gray-700">
                                        {rentalIncome.transactions.slice(0, 10).map(txn => (
                                            <div key={txn.id} className="px-4 py-3 flex items-center justify-between">
                                                <div>
                                                    <p className="text-white text-sm">{txn.description}</p>
                                                    <p className="text-gray-500 text-xs">{formatDate(txn.transaction_date)}</p>
                                                </div>
                                                <p className="text-green-400 font-medium">{formatCurrency(txn.amount)}</p>
                                            </div>
                                        ))}
                                    </div>
                                    {rentalIncome.transactions.length > 10 && (
                                        <div className="px-4 py-3 text-center border-t border-gray-700">
                                            <p className="text-gray-500 text-sm">
                                                +{rentalIncome.transactions.length - 10} more transactions
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Add Mortgage Modal */}
            {showMortgageModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">Add Mortgage</h2>
                            <button onClick={() => setShowMortgageModal(false)} className="p-1 text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveMortgage} className="p-6 space-y-6">
                            {/* Mortgage Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-400 uppercase">Mortgage Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Mortgage Name *</label>
                                        <input
                                            type="text"
                                            value={mortgageForm.mortgage_name}
                                            onChange={e => setMortgageForm(p => ({ ...p, mortgage_name: e.target.value }))}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            placeholder="e.g., Primary Mortgage"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Type *</label>
                                        <select
                                            value={mortgageForm.mortgage_type}
                                            onChange={e => setMortgageForm(p => ({ ...p, mortgage_type: e.target.value }))}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        >
                                            {MORTGAGE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Original Amount *</label>
                                        <input
                                            type="number"
                                            value={mortgageForm.original_loan_amount}
                                            onChange={e => setMortgageForm(p => ({ ...p, original_loan_amount: e.target.value }))}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Original Loan Date *</label>
                                        <input
                                            type="date"
                                            value={mortgageForm.loan_date}
                                            onChange={e => setMortgageForm(p => ({ ...p, loan_date: e.target.value }))}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Amortization (years)</label>
                                        <input
                                            type="number"
                                            value={mortgageForm.original_amortization_years}
                                            onChange={e => setMortgageForm(p => ({ ...p, original_amortization_years: e.target.value }))}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Current Balance</label>
                                        <input
                                            type="number"
                                            value={mortgageForm.current_balance}
                                            onChange={e => setMortgageForm(p => ({ ...p, current_balance: e.target.value }))}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            placeholder="Leave blank to use original amount"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Initial Term */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-400 uppercase">Initial Term Details</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Lender *</label>
                                        <input
                                            type="text"
                                            value={mortgageForm.lender}
                                            onChange={e => setMortgageForm(p => ({ ...p, lender: e.target.value }))}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Interest Rate (%) *</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={mortgageForm.interest_rate}
                                            onChange={e => setMortgageForm(p => ({ ...p, interest_rate: e.target.value }))}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Rate Type</label>
                                        <select
                                            value={mortgageForm.rate_type}
                                            onChange={e => setMortgageForm(p => ({ ...p, rate_type: e.target.value }))}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        >
                                            {RATE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Term Length (years)</label>
                                        <input
                                            type="number"
                                            value={mortgageForm.term_years}
                                            onChange={e => setMortgageForm(p => ({ ...p, term_years: e.target.value }))}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Term Start Date *</label>
                                        <input
                                            type="date"
                                            value={mortgageForm.term_start_date}
                                            onChange={e => setMortgageForm(p => ({ ...p, term_start_date: e.target.value }))}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Term End Date (Maturity) *</label>
                                        <input
                                            type="date"
                                            value={mortgageForm.term_end_date}
                                            onChange={e => setMortgageForm(p => ({ ...p, term_end_date: e.target.value }))}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Payment Frequency</label>
                                        <select
                                            value={mortgageForm.payment_frequency}
                                            onChange={e => setMortgageForm(p => ({ ...p, payment_frequency: e.target.value }))}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        >
                                            {PAYMENT_FREQUENCIES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Payment Amount *</label>
                                        <input
                                            type="number"
                                            value={mortgageForm.regular_payment_amount}
                                            onChange={e => setMortgageForm(p => ({ ...p, regular_payment_amount: e.target.value }))}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                                <button type="button" onClick={() => setShowMortgageModal(false)} className="px-4 py-2 text-gray-400">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
                                    {saving ? 'Saving...' : 'Add Mortgage'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Term/Renewal Modal */}
            {showTermModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">Add Renewal / Refinance</h2>
                            <button onClick={() => setShowTermModal(false)} className="p-1 text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTerm} className="p-6 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Type *</label>
                                    <select
                                        value={termForm.renewal_type}
                                        onChange={e => setTermForm(p => ({ ...p, renewal_type: e.target.value }))}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    >
                                        {RENEWAL_TYPES.filter(t => t.value !== 'original').map(t => (
                                            <option key={t.value} value={t.value}>{t.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Lender *</label>
                                    <input
                                        type="text"
                                        value={termForm.lender}
                                        onChange={e => setTermForm(p => ({ ...p, lender: e.target.value }))}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Interest Rate (%) *</label>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={termForm.interest_rate}
                                        onChange={e => setTermForm(p => ({ ...p, interest_rate: e.target.value }))}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Rate Type</label>
                                    <select
                                        value={termForm.rate_type}
                                        onChange={e => setTermForm(p => ({ ...p, rate_type: e.target.value }))}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    >
                                        {RATE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Term Start Date *</label>
                                    <input
                                        type="date"
                                        value={termForm.term_start_date}
                                        onChange={e => setTermForm(p => ({ ...p, term_start_date: e.target.value }))}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Term End Date (Maturity) *</label>
                                    <input
                                        type="date"
                                        value={termForm.term_end_date}
                                        onChange={e => setTermForm(p => ({ ...p, term_end_date: e.target.value }))}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Term Length (years)</label>
                                    <input
                                        type="number"
                                        value={termForm.term_years}
                                        onChange={e => setTermForm(p => ({ ...p, term_years: e.target.value }))}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Payment Frequency</label>
                                    <select
                                        value={termForm.payment_frequency}
                                        onChange={e => setTermForm(p => ({ ...p, payment_frequency: e.target.value }))}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                    >
                                        {PAYMENT_FREQUENCIES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Payment Amount *</label>
                                    <input
                                        type="number"
                                        value={termForm.regular_payment_amount}
                                        onChange={e => setTermForm(p => ({ ...p, regular_payment_amount: e.target.value }))}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Balance at Start *</label>
                                    <input
                                        type="number"
                                        value={termForm.balance_at_term_start}
                                        onChange={e => setTermForm(p => ({ ...p, balance_at_term_start: e.target.value }))}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                                <button type="button" onClick={() => setShowTermModal(false)} className="px-4 py-2 text-gray-400">
                                    Cancel
                                </button>
                                <button type="submit" disabled={saving} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg">
                                    {saving ? 'Saving...' : 'Add Term'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Mortgage History Modal */}
            {showHistoryModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">
                                Mortgage History: {selectedMortgageForTerm?.mortgage_name}
                            </h2>
                            <button onClick={() => setShowHistoryModal(false)} className="p-1 text-gray-400 hover:text-white">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6">
                            {mortgageHistory.length === 0 ? (
                                <p className="text-gray-400 text-center py-4">No terms found</p>
                            ) : (
                                <div className="space-y-4">
                                    {mortgageHistory.map((term, index) => (
                                        <div key={term.id} className={`p-4 rounded-lg border ${term.is_current_term
                                            ? 'bg-indigo-500/10 border-indigo-500/30'
                                            : 'bg-gray-700/50 border-gray-700'
                                            }`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-white font-medium">Term {term.term_number}</span>
                                                    {term.is_current_term && (
                                                        <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                                                            Current
                                                        </span>
                                                    )}
                                                    <span className="text-xs px-2 py-0.5 rounded bg-gray-600 text-gray-300">
                                                        {RENEWAL_TYPES.find(t => t.value === term.renewal_type)?.label}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                                <div>
                                                    <p className="text-gray-500 text-xs">Lender</p>
                                                    <p className="text-white">{term.lender}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Rate</p>
                                                    <p className="text-white">{formatPercent(term.interest_rate)} ({term.rate_type})</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Term</p>
                                                    <p className="text-white">{term.term_years} years</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Payment</p>
                                                    <p className="text-white">{formatCurrency(term.regular_payment_amount)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Start</p>
                                                    <p className="text-white">{formatDate(term.term_start_date)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">End</p>
                                                    <p className="text-white">{formatDate(term.term_end_date)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Balance Start</p>
                                                    <p className="text-white">{formatCurrency(term.balance_at_term_start)}</p>
                                                </div>
                                                <div>
                                                    <p className="text-gray-500 text-xs">Balance End</p>
                                                    <p className="text-white">{formatCurrency(term.balance_at_term_end)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyDetails;
