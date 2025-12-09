// src/pages/Properties.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Home,
    Building2,
    Plus,
    Edit2,
    Trash2,
    DollarSign,
    MapPin,
    Calendar,
    TrendingUp,
    X,
    ChevronRight,
    Banknote,
    Eye
} from 'lucide-react';
import {
    getPropertiesWithSummary,
    addProperty,
    updateProperty,
    deleteProperty
} from '../services/propertyService';

const PROPERTY_TYPES = [
    { value: 'primary_residence', label: 'Primary Residence', icon: Home },
    { value: 'rental', label: 'Rental Property', icon: Building2 },
    { value: 'vacation', label: 'Vacation Home', icon: Home },
    { value: 'investment', label: 'Investment Property', icon: TrendingUp },
    { value: 'commercial', label: 'Commercial Property', icon: Building2 }
];

export const Properties = () => {
    const navigate = useNavigate();
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingProperty, setEditingProperty] = useState(null);
    const [saving, setSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        property_name: '',
        property_type: 'primary_residence',
        address: '',
        purchase_date: '',
        purchase_price: '',
        down_payment: '',
        land_transfer_tax: '',
        legal_fees: '',
        home_inspection: '',
        appraisal_fee: '',
        other_closing_costs: '',
        current_market_value: '',
        property_tax_annual: '',
        hoa_monthly: '',
        expected_monthly_rent: '',
        is_primary_residence: true,
        notes: ''
    });

    useEffect(() => {
        loadProperties();
    }, []);

    const loadProperties = async () => {
        setLoading(true);
        const result = await getPropertiesWithSummary();
        if (result.success) {
            setProperties(result.properties);
        }
        setLoading(false);
    };

    const resetForm = () => {
        setFormData({
            property_name: '',
            property_type: 'primary_residence',
            address: '',
            purchase_date: '',
            purchase_price: '',
            down_payment: '',
            land_transfer_tax: '',
            legal_fees: '',
            home_inspection: '',
            appraisal_fee: '',
            other_closing_costs: '',
            current_market_value: '',
            property_tax_annual: '',
            hoa_monthly: '',
            expected_monthly_rent: '',
            is_primary_residence: true,
            notes: ''
        });
        setEditingProperty(null);
    };

    const handleAddNew = () => {
        resetForm();
        setShowModal(true);
    };

    const handleEdit = (property) => {
        setEditingProperty(property);
        setFormData({
            property_name: property.property_name || '',
            property_type: property.property_type || 'primary_residence',
            address: property.address || '',
            purchase_date: property.purchase_date ? property.purchase_date.split('T')[0] : '',
            purchase_price: property.purchase_price || '',
            down_payment: property.down_payment || '',
            land_transfer_tax: property.land_transfer_tax || '',
            legal_fees: property.legal_fees || '',
            home_inspection: property.home_inspection || '',
            appraisal_fee: property.appraisal_fee || '',
            other_closing_costs: property.other_closing_costs || '',
            current_market_value: property.current_market_value || '',
            property_tax_annual: property.property_tax_annual || '',
            hoa_monthly: property.hoa_monthly || '',
            expected_monthly_rent: property.expected_monthly_rent || '',
            is_primary_residence: property.is_primary_residence ?? true,
            notes: property.notes || ''
        });
        setShowModal(true);
    };

    const handleDelete = async (propertyId) => {
        if (!window.confirm('Are you sure you want to delete this property? This will also delete all associated mortgages.')) {
            return;
        }

        const result = await deleteProperty(propertyId);
        if (result.success) {
            await loadProperties();
        } else {
            alert(`Failed to delete: ${result.error}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            // Prepare data - convert string numbers to actual numbers
            const dataToSave = {
                ...formData,
                purchase_price: parseFloat(formData.purchase_price) || 0,
                down_payment: parseFloat(formData.down_payment) || 0,
                land_transfer_tax: parseFloat(formData.land_transfer_tax) || 0,
                legal_fees: parseFloat(formData.legal_fees) || 0,
                home_inspection: parseFloat(formData.home_inspection) || 0,
                appraisal_fee: parseFloat(formData.appraisal_fee) || 0,
                other_closing_costs: parseFloat(formData.other_closing_costs) || 0,
                current_market_value: formData.current_market_value ? parseFloat(formData.current_market_value) : null,
                property_tax_annual: formData.property_tax_annual ? parseFloat(formData.property_tax_annual) : null,
                hoa_monthly: formData.hoa_monthly ? parseFloat(formData.hoa_monthly) : 0,
                expected_monthly_rent: formData.expected_monthly_rent ? parseFloat(formData.expected_monthly_rent) : 0,
                is_primary_residence: formData.property_type === 'primary_residence' || formData.is_primary_residence
            };

            let result;
            if (editingProperty) {
                result = await updateProperty(editingProperty.id, dataToSave);
            } else {
                result = await addProperty(dataToSave);
            }

            if (result.success) {
                setShowModal(false);
                resetForm();
                await loadProperties();
            } else {
                alert(`Failed to save: ${result.error}`);
            }
        } catch (error) {
            alert(`Error: ${error.message}`);
        } finally {
            setSaving(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => {
            const updated = { ...prev, [field]: value };
            // Auto-set is_primary_residence based on property_type
            if (field === 'property_type') {
                updated.is_primary_residence = value === 'primary_residence';
            }
            return updated;
        });
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

    const getPropertyTypeInfo = (type) => {
        return PROPERTY_TYPES.find(t => t.value === type) || PROPERTY_TYPES[0];
    };

    // Calculate totals
    const totalMarketValue = properties.reduce((sum, p) => sum + (p.marketValue || 0), 0);
    const totalEquity = properties.reduce((sum, p) => sum + (p.estimatedEquity || 0), 0);
    const totalMortgages = properties.reduce((sum, p) => sum + (p.totalMortgageBalance || 0), 0);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white">Properties</h1>
                    <p className="text-gray-400 mt-1">Manage your real estate investments</p>
                </div>
                <button
                    onClick={handleAddNew}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                >
                    <Plus className="w-5 h-5" />
                    Add Property
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Building2 className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Market Value</p>
                            <p className="text-xl font-semibold text-white">{formatCurrency(totalMarketValue)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-500/20 rounded-lg">
                            <TrendingUp className="w-5 h-5 text-green-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Equity</p>
                            <p className="text-xl font-semibold text-green-400">{formatCurrency(totalEquity)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-500/20 rounded-lg">
                            <Banknote className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <p className="text-gray-400 text-sm">Total Mortgages</p>
                            <p className="text-xl font-semibold text-red-400">{formatCurrency(totalMortgages)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Properties List */}
            {properties.length === 0 ? (
                <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
                    <Home className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-white mb-2">No Properties Yet</h3>
                    <p className="text-gray-400 mb-4">Add your first property to start tracking your real estate investments.</p>
                    <button
                        onClick={handleAddNew}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                    >
                        <Plus className="w-5 h-5" />
                        Add Property
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {properties.map(property => {
                        const typeInfo = getPropertyTypeInfo(property.property_type);
                        const TypeIcon = typeInfo.icon;

                        return (
                            <div
                                key={property.id}
                                className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-colors"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2 rounded-lg ${property.is_primary_residence
                                            ? 'bg-blue-500/20'
                                            : 'bg-green-500/20'
                                            }`}>
                                            <TypeIcon className={`w-5 h-5 ${property.is_primary_residence
                                                ? 'text-blue-400'
                                                : 'text-green-400'
                                                }`} />
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-white">{property.property_name}</h3>
                                            <span className={`text-xs px-2 py-0.5 rounded ${property.is_primary_residence
                                                ? 'bg-blue-500/20 text-blue-300'
                                                : 'bg-green-500/20 text-green-300'
                                                }`}>
                                                {typeInfo.label}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => navigate(`/properties/${property.id}`)}
                                            className="p-1.5 text-gray-400 hover:text-indigo-400 hover:bg-gray-700 rounded transition-colors"
                                            title="View Details"
                                        >
                                            <Eye className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(property)}
                                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
                                            title="Edit"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(property.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {property.address && (
                                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-3">
                                        <MapPin className="w-4 h-4" />
                                        <span>{property.address}</span>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4 mb-4">
                                    <div>
                                        <p className="text-gray-500 text-xs">Market Value</p>
                                        <p className="text-white font-medium">{formatCurrency(property.marketValue)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">Equity</p>
                                        <p className="text-green-400 font-medium">{formatCurrency(property.estimatedEquity)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">Purchase Date</p>
                                        <p className="text-gray-300 text-sm">{formatDate(property.purchase_date)}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-500 text-xs">Purchase Price</p>
                                        <p className="text-gray-300 text-sm">{formatCurrency(property.purchase_price)}</p>
                                    </div>
                                </div>

                                {property.activeMortgagesCount > 0 ? (
                                    <div className="pt-3 border-t border-gray-700 flex items-center justify-between">
                                        <div className="text-sm">
                                            <span className="text-gray-400">{property.activeMortgagesCount} Active Mortgage{property.activeMortgagesCount > 1 ? 's' : ''}</span>
                                            <span className="text-red-400 ml-2">{formatCurrency(property.totalMortgageBalance)}</span>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/properties/${property.id}`)}
                                            className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                                        >
                                            View Details <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="pt-3 border-t border-gray-700 flex items-center justify-end">
                                        <button
                                            onClick={() => navigate(`/properties/${property.id}`)}
                                            className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1"
                                        >
                                            View Details <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="sticky top-0 bg-gray-800 px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                            <h2 className="text-xl font-semibold text-white">
                                {editingProperty ? 'Edit Property' : 'Add New Property'}
                            </h2>
                            <button
                                onClick={() => setShowModal(false)}
                                className="p-1 text-gray-400 hover:text-white hover:bg-gray-700 rounded"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-6">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Basic Information</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Property Name *</label>
                                        <input
                                            type="text"
                                            value={formData.property_name}
                                            onChange={(e) => handleInputChange('property_name', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            placeholder="e.g., Main House, Rental Unit 1"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Property Type *</label>
                                        <select
                                            value={formData.property_type}
                                            onChange={(e) => handleInputChange('property_type', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            required
                                        >
                                            {PROPERTY_TYPES.map(type => (
                                                <option key={type.value} value={type.value}>{type.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Address</label>
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                        placeholder="123 Main St, City, Province"
                                    />
                                </div>

                                {formData.property_type !== 'primary_residence' && (
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="checkbox"
                                            id="is_primary"
                                            checked={formData.is_primary_residence}
                                            onChange={(e) => handleInputChange('is_primary_residence', e.target.checked)}
                                            className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500"
                                        />
                                        <label htmlFor="is_primary" className="text-sm text-gray-300">
                                            This is my primary residence (affects tax calculations)
                                        </label>
                                    </div>
                                )}
                            </div>

                            {/* Purchase Info */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Purchase Information</h3>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Purchase Date *</label>
                                        <input
                                            type="date"
                                            value={formData.purchase_date}
                                            onChange={(e) => handleInputChange('purchase_date', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Purchase Price *</label>
                                        <input
                                            type="number"
                                            value={formData.purchase_price}
                                            onChange={(e) => handleInputChange('purchase_price', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            placeholder="500000"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Down Payment *</label>
                                        <input
                                            type="number"
                                            value={formData.down_payment}
                                            onChange={(e) => handleInputChange('down_payment', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            placeholder="100000"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Closing Costs */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Closing Costs</h3>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Land Transfer Tax</label>
                                        <input
                                            type="number"
                                            value={formData.land_transfer_tax}
                                            onChange={(e) => handleInputChange('land_transfer_tax', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            placeholder="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Legal Fees</label>
                                        <input
                                            type="number"
                                            value={formData.legal_fees}
                                            onChange={(e) => handleInputChange('legal_fees', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            placeholder="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Home Inspection</label>
                                        <input
                                            type="number"
                                            value={formData.home_inspection}
                                            onChange={(e) => handleInputChange('home_inspection', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            placeholder="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Appraisal Fee</label>
                                        <input
                                            type="number"
                                            value={formData.appraisal_fee}
                                            onChange={(e) => handleInputChange('appraisal_fee', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            placeholder="0"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Other Closing Costs</label>
                                        <input
                                            type="number"
                                            value={formData.other_closing_costs}
                                            onChange={(e) => handleInputChange('other_closing_costs', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Current Values */}
                            <div className="space-y-4">
                                <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wide">Current Values</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Current Market Value</label>
                                        <input
                                            type="number"
                                            value={formData.current_market_value}
                                            onChange={(e) => handleInputChange('current_market_value', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            placeholder="Leave blank to use purchase price"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Annual Property Tax</label>
                                        <input
                                            type="number"
                                            value={formData.property_tax_annual}
                                            onChange={(e) => handleInputChange('property_tax_annual', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Monthly HOA Fees</label>
                                        <input
                                            type="number"
                                            value={formData.hoa_monthly}
                                            onChange={(e) => handleInputChange('hoa_monthly', e.target.value)}
                                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                            placeholder="0"
                                        />
                                    </div>
                                    {!formData.is_primary_residence && formData.property_type !== 'primary_residence' && (
                                        <div>
                                            <label className="block text-sm text-gray-400 mb-1">Expected Monthly Rent</label>
                                            <input
                                                type="number"
                                                value={formData.expected_monthly_rent}
                                                onChange={(e) => handleInputChange('expected_monthly_rent', e.target.value)}
                                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                                placeholder="0"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Notes */}
                            <div>
                                <label className="block text-sm text-gray-400 mb-1">Notes</label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => handleInputChange('notes', e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                                    rows={3}
                                    placeholder="Any additional notes about this property..."
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                                >
                                    {saving ? 'Saving...' : (editingProperty ? 'Update Property' : 'Add Property')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Properties;
