import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseGovernmentBenefitsDB } from '../../services/pocketbaseDatabase';
import { CPPContributionCalculator } from './CPPContributionCalculator';
import {
    Landmark,
    Calendar,
    DollarSign,
    Save,
    Loader,
    AlertCircle,
    CheckCircle,
    Info,
    Calculator,
    Building,
    Users,
    FileSpreadsheet
} from 'lucide-react';

export const RetirementInfoSettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [showCPPCalculator, setShowCPPCalculator] = useState(false);
    const [benefits, setBenefits] = useState({
        // CPP Information
        cpp_estimated_at_65: '',
        cpp_statement_date: '',
        cpp_contributions_to_date: '',
        cpp_years_contributed: '',
        cpp_at_60: '',
        cpp_at_65: '',
        cpp_at_70: '',
        cpp_planned_start_age: 65,

        // OAS Information
        oas_estimated_monthly: '',
        oas_years_in_canada: '',
        oas_eligible_age: 65,
        oas_planned_start_age: 65,
        oas_clawback_threshold: 90997,

        // GIS
        gis_eligible: false,
        gis_estimated_monthly: '',

        // Employer Pension
        has_employer_pension: false,
        pension_type: '',
        pension_employer: '',
        pension_years_of_service: '',
        pension_multiplier: '',
        pension_best_average_salary: '',
        pension_estimated_monthly: '',
        pension_earliest_age: 55,
        pension_normal_age: 65,
        pension_current_value: '',

        // Spouse Benefits
        spouse_cpp_at_60: '',
        spouse_cpp_at_65: '',
        spouse_cpp_at_70: '',
        spouse_oas_years_in_canada: '',
        spouse_oas_estimated: '',
        spouse_has_pension: 'no',
        spouse_pension_type: '',
        spouse_pension_estimated: ''
    });

    useEffect(() => {
        loadBenefits();
    }, [user]);

    const loadBenefits = async () => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            const data = await supabaseGovernmentBenefitsDB.getBenefits();
            if (data) {
                // Convert nulls to empty strings for form fields
                const formData = {};
                Object.keys(benefits).forEach(key => {
                    formData[key] = data[key] ?? '';
                });
                setBenefits(formData);
            }
        } catch (err) {
            console.error('Error loading benefits:', err);
            setError('Failed to load retirement information');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setBenefits(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
        setSuccess(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            // Clean up the data before saving
            const benefitsData = {
                user_id: user.id,
                cpp_estimated_at_65: benefits.cpp_estimated_at_65 ? parseFloat(benefits.cpp_estimated_at_65) : null,
                cpp_statement_date: benefits.cpp_statement_date || null,
                cpp_contributions_to_date: benefits.cpp_contributions_to_date ? parseFloat(benefits.cpp_contributions_to_date) : null,
                cpp_years_contributed: benefits.cpp_years_contributed ? parseInt(benefits.cpp_years_contributed) : null,
                cpp_at_60: benefits.cpp_at_60 ? parseFloat(benefits.cpp_at_60) : null,
                cpp_at_65: benefits.cpp_at_65 ? parseFloat(benefits.cpp_at_65) : null,
                cpp_at_70: benefits.cpp_at_70 ? parseFloat(benefits.cpp_at_70) : null,
                cpp_planned_start_age: parseInt(benefits.cpp_planned_start_age) || 65,

                oas_estimated_monthly: benefits.oas_estimated_monthly ? parseFloat(benefits.oas_estimated_monthly) : null,
                oas_years_in_canada: benefits.oas_years_in_canada ? parseInt(benefits.oas_years_in_canada) : null,
                oas_eligible_age: parseInt(benefits.oas_eligible_age) || 65,
                oas_planned_start_age: parseInt(benefits.oas_planned_start_age) || 65,
                oas_clawback_threshold: benefits.oas_clawback_threshold ? parseFloat(benefits.oas_clawback_threshold) : 90997,

                gis_eligible: benefits.gis_eligible || false,
                gis_estimated_monthly: benefits.gis_estimated_monthly ? parseFloat(benefits.gis_estimated_monthly) : null,

                has_employer_pension: benefits.has_employer_pension || false,
                pension_type: benefits.pension_type || null,
                pension_employer: benefits.pension_employer || null,
                pension_years_of_service: benefits.pension_years_of_service ? parseFloat(benefits.pension_years_of_service) : null,
                pension_multiplier: benefits.pension_multiplier ? parseFloat(benefits.pension_multiplier) : null,
                pension_best_average_salary: benefits.pension_best_average_salary ? parseFloat(benefits.pension_best_average_salary) : null,
                pension_estimated_monthly: benefits.pension_estimated_monthly ? parseFloat(benefits.pension_estimated_monthly) : null,
                pension_earliest_age: parseInt(benefits.pension_earliest_age) || 55,
                pension_normal_age: parseInt(benefits.pension_normal_age) || 65,
                pension_current_value: benefits.pension_current_value ? parseFloat(benefits.pension_current_value) : null,

                spouse_cpp_at_65: benefits.spouse_cpp_at_65 ? parseFloat(benefits.spouse_cpp_at_65) : null,
                spouse_oas_estimated: benefits.spouse_oas_estimated ? parseFloat(benefits.spouse_oas_estimated) : null,
                spouse_pension_estimated: benefits.spouse_pension_estimated ? parseFloat(benefits.spouse_pension_estimated) : null,

                last_updated: new Date().toISOString().split('T')[0]
            };

            await supabaseGovernmentBenefitsDB.upsertBenefits(benefitsData);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving benefits:', err);
            setError('Failed to save retirement information. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Calculate estimated DB pension
    const calculateDBPension = () => {
        if (benefits.pension_years_of_service && benefits.pension_multiplier && benefits.pension_best_average_salary) {
            const years = parseFloat(benefits.pension_years_of_service);
            const multiplier = parseFloat(benefits.pension_multiplier);
            const salary = parseFloat(benefits.pension_best_average_salary);
            return ((years * multiplier * salary) / 12).toFixed(2);
        }
        return null;
    };

    const estimatedDBPension = calculateDBPension();

    // CPP Quick Estimator (2024 values)
    // Maximum CPP at 65 in 2024 is ~$1,364.60/month
    const estimateCPP = () => {
        const years = parseInt(benefits.cpp_years_contributed) || 0;
        const maxYears = 39; // Full CPP requires ~39 years of max contributions
        const maxCPPAt65 = 1365; // 2024 maximum

        if (years === 0) return null;

        // Simple estimate: proportional to years contributed
        const ratio = Math.min(years / maxYears, 1);
        const estimatedAt65 = Math.round(maxCPPAt65 * ratio);
        const estimatedAt60 = Math.round(estimatedAt65 * 0.64); // 36% reduction
        const estimatedAt70 = Math.round(estimatedAt65 * 1.42); // 42% increase

        return { at60: estimatedAt60, at65: estimatedAt65, at70: estimatedAt70 };
    };

    const cppEstimate = estimateCPP();

    // Calculate total monthly benefits at 65
    const totalMonthlyAt65 = () => {
        let total = 0;
        if (benefits.cpp_at_65) total += parseFloat(benefits.cpp_at_65);
        if (benefits.oas_estimated_monthly) total += parseFloat(benefits.oas_estimated_monthly);
        if (benefits.pension_estimated_monthly) total += parseFloat(benefits.pension_estimated_monthly);
        return total;
    };

    // Calculate spouse's total monthly benefits at 65
    const spouseTotalMonthlyAt65 = () => {
        let total = 0;
        if (benefits.spouse_cpp_at_65) total += parseFloat(benefits.spouse_cpp_at_65);
        if (benefits.spouse_oas_estimated) total += parseFloat(benefits.spouse_oas_estimated);
        if (benefits.spouse_pension_estimated) total += parseFloat(benefits.spouse_pension_estimated);
        return total;
    };

    // Calculate family total
    const familyTotalMonthlyAt65 = () => {
        return totalMonthlyAt65() + spouseTotalMonthlyAt65();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="ml-2 text-gray-600">Loading retirement information...</span>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <Landmark className="w-7 h-7" />
                    Retirement & Government Benefits
                </h1>
                <p className="text-gray-400 mt-1">
                    Enter your CPP, OAS, and pension information for retirement projections
                </p>
            </div>

            {error && (
                <div className="mb-4 p-4 bg-red-900/50 border border-red-700 rounded-lg flex items-center gap-2 text-red-200">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {success && (
                <div className="mb-4 p-4 bg-green-900/50 border border-green-700 rounded-lg flex items-center gap-2 text-green-200">
                    <CheckCircle className="w-5 h-5" />
                    Retirement information saved successfully!
                </div>
            )}

            {/* Summary Card - Family Benefits */}
            {(totalMonthlyAt65() > 0 || spouseTotalMonthlyAt65() > 0) && (
                <div className="mb-6 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg p-6 text-white">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5" />
                        Family Benefits at Age 65
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Your Benefits */}
                        <div className="bg-white/10 rounded-lg p-4">
                            <p className="text-indigo-200 text-sm">Your Benefits</p>
                            <p className="text-2xl font-bold">${totalMonthlyAt65().toLocaleString()}/mo</p>
                            <p className="text-indigo-200 text-sm">${(totalMonthlyAt65() * 12).toLocaleString()}/year</p>
                            <div className="mt-2 text-xs text-indigo-200 space-y-1">
                                {benefits.cpp_at_65 && <div>CPP: ${parseFloat(benefits.cpp_at_65).toLocaleString()}</div>}
                                {benefits.oas_estimated_monthly && <div>OAS: ${parseFloat(benefits.oas_estimated_monthly).toLocaleString()}</div>}
                                {benefits.pension_estimated_monthly && <div>Pension: ${parseFloat(benefits.pension_estimated_monthly).toLocaleString()}</div>}
                            </div>
                        </div>

                        {/* Spouse Benefits */}
                        <div className="bg-white/10 rounded-lg p-4">
                            <p className="text-indigo-200 text-sm">Spouse Benefits</p>
                            <p className="text-2xl font-bold">${spouseTotalMonthlyAt65().toLocaleString()}/mo</p>
                            <p className="text-indigo-200 text-sm">${(spouseTotalMonthlyAt65() * 12).toLocaleString()}/year</p>
                            <div className="mt-2 text-xs text-indigo-200 space-y-1">
                                {benefits.spouse_cpp_at_65 && <div>CPP: ${parseFloat(benefits.spouse_cpp_at_65).toLocaleString()}</div>}
                                {benefits.spouse_oas_estimated && <div>OAS: ${parseFloat(benefits.spouse_oas_estimated).toLocaleString()}</div>}
                                {benefits.spouse_pension_estimated && <div>Pension: ${parseFloat(benefits.spouse_pension_estimated).toLocaleString()}</div>}
                            </div>
                        </div>

                        {/* Family Total */}
                        <div className="bg-white/20 rounded-lg p-4 border-2 border-white/30">
                            <p className="text-white text-sm font-medium">Family Total</p>
                            <p className="text-3xl font-bold">${familyTotalMonthlyAt65().toLocaleString()}/mo</p>
                            <p className="text-indigo-200 text-sm">${(familyTotalMonthlyAt65() * 12).toLocaleString()}/year</p>
                        </div>
                    </div>
                </div>
            )}

            {/* CPP Calculator Modal */}
            {showCPPCalculator && (
                <CPPContributionCalculator
                    onClose={() => setShowCPPCalculator(false)}
                    onCalculated={(data) => {
                        setBenefits(prev => ({
                            ...prev,
                            cpp_years_contributed: data.cpp_years_contributed,
                            cpp_contributions_to_date: data.cpp_contributions_to_date,
                            cpp_at_60: data.cpp_at_60,
                            cpp_at_65: data.cpp_at_65,
                            cpp_at_70: data.cpp_at_70
                        }));
                        setShowCPPCalculator(false);
                    }}
                />
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* CPP Information */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-red-400" />
                            Canada Pension Plan (CPP)
                        </h2>
                        <button
                            type="button"
                            onClick={() => setShowCPPCalculator(true)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg flex items-center gap-2"
                        >
                            <FileSpreadsheet className="w-4 h-4" />
                            CPP Calculator
                        </button>
                    </div>

                    <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2">
                            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-blue-200">
                                <p className="font-medium">Where to find your CPP estimates:</p>
                                <ol className="mt-2 list-decimal list-inside space-y-1">
                                    <li>Log in to <a href="https://www.canada.ca/en/employment-social-development/services/my-account.html" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline hover:text-blue-300">My Service Canada Account</a></li>
                                    <li>Go to "CPP" → "Statement of Contributions"</li>
                                    <li>Look for "Estimated Monthly Benefits" section</li>
                                    <li>Enter the amounts shown for ages 60, 65, and 70 below</li>
                                </ol>
                                <p className="mt-2 text-xs text-blue-300">💡 Or use the <strong>CPP Calculator</strong> button above to estimate from your contribution history.</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                CPP Statement Date
                            </label>
                            <input
                                type="date"
                                name="cpp_statement_date"
                                value={benefits.cpp_statement_date}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Years Contributed
                            </label>
                            <input
                                type="number"
                                name="cpp_years_contributed"
                                value={benefits.cpp_years_contributed}
                                onChange={handleChange}
                                placeholder="25"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Contributions to Date ($)
                            </label>
                            <input
                                type="number"
                                name="cpp_contributions_to_date"
                                value={benefits.cpp_contributions_to_date}
                                onChange={handleChange}
                                placeholder="50000"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Planned Start Age
                            </label>
                            <select
                                name="cpp_planned_start_age"
                                value={benefits.cpp_planned_start_age}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                {[60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70].map(age => (
                                    <option key={age} value={age}>
                                        Age {age} {age === 65 ? '(Standard)' : age < 65 ? '(Reduced)' : '(Enhanced)'}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-400">Estimated Monthly Benefits</h3>
                            {cppEstimate && !benefits.cpp_at_65 && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setBenefits(prev => ({
                                            ...prev,
                                            cpp_at_60: cppEstimate.at60,
                                            cpp_at_65: cppEstimate.at65,
                                            cpp_at_70: cppEstimate.at70
                                        }));
                                    }}
                                    className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded flex items-center gap-1"
                                >
                                    <Calculator className="w-3 h-3" />
                                    Use Quick Estimate
                                </button>
                            )}
                        </div>

                        {cppEstimate && !benefits.cpp_at_65 && (
                            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 mb-4">
                                <p className="text-xs text-yellow-200">
                                    <strong>Quick estimate based on {benefits.cpp_years_contributed} years:</strong> ~${cppEstimate.at65}/mo at 65.
                                    This is a rough estimate. For accuracy, use your actual CPP Statement values.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    At Age 60 ($)
                                </label>
                                <input
                                    type="number"
                                    name="cpp_at_60"
                                    value={benefits.cpp_at_60}
                                    onChange={handleChange}
                                    placeholder="700"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">36% reduction</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    At Age 65 ($)
                                </label>
                                <input
                                    type="number"
                                    name="cpp_at_65"
                                    value={benefits.cpp_at_65}
                                    onChange={handleChange}
                                    placeholder="1100"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">Standard amount</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    At Age 70 ($)
                                </label>
                                <input
                                    type="number"
                                    name="cpp_at_70"
                                    value={benefits.cpp_at_70}
                                    onChange={handleChange}
                                    placeholder="1560"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                />
                                <p className="text-xs text-gray-500 mt-1">42% enhancement</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* OAS Information */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-400" />
                        Old Age Security (OAS)
                    </h2>

                    <div className="bg-green-900/30 border border-green-700 rounded-lg p-4 mb-4">
                        <div className="flex items-start gap-2">
                            <Info className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm text-green-200">
                                <p className="font-medium">OAS is simpler than CPP:</p>
                                <ul className="mt-1 list-disc list-inside space-y-1">
                                    <li>Full OAS requires 40 years of Canadian residency after age 18</li>
                                    <li>Maximum monthly OAS in 2024: ~$727 (indexed quarterly)</li>
                                    <li>Partial OAS: You get 1/40th for each year of residency</li>
                                    <li>OAS clawback starts at ~$91K income (2024)</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Years Living in Canada (after age 18)
                            </label>
                            <input
                                type="number"
                                name="oas_years_in_canada"
                                value={benefits.oas_years_in_canada}
                                onChange={handleChange}
                                placeholder="40"
                                max="40"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">40 years for full OAS</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Estimated Monthly OAS ($)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    name="oas_estimated_monthly"
                                    value={benefits.oas_estimated_monthly}
                                    onChange={handleChange}
                                    placeholder="727"
                                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                />
                                {benefits.oas_years_in_canada && !benefits.oas_estimated_monthly && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            const years = Math.min(parseInt(benefits.oas_years_in_canada) || 0, 40);
                                            const maxOAS = 727;
                                            const estimated = Math.round((years / 40) * maxOAS);
                                            setBenefits(prev => ({ ...prev, oas_estimated_monthly: estimated }));
                                        }}
                                        className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white text-xs rounded-lg whitespace-nowrap"
                                    >
                                        Calculate
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {benefits.oas_years_in_canada
                                    ? `${Math.min(parseInt(benefits.oas_years_in_canada), 40)}/40 years = ${Math.round((Math.min(parseInt(benefits.oas_years_in_canada), 40) / 40) * 100)}% of max`
                                    : 'Max ~$727/mo in 2024'}
                            </p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Planned Start Age
                            </label>
                            <select
                                name="oas_planned_start_age"
                                value={benefits.oas_planned_start_age}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                {[65, 66, 67, 68, 69, 70].map(age => (
                                    <option key={age} value={age}>
                                        Age {age} {age === 65 ? '(Standard)' : '(+0.6%/mo delayed)'}
                                    </option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                OAS Clawback Threshold ($)
                            </label>
                            <input
                                type="number"
                                name="oas_clawback_threshold"
                                value={benefits.oas_clawback_threshold}
                                onChange={handleChange}
                                placeholder="90997"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                            <p className="text-xs text-gray-500 mt-1">Income above this reduces OAS</p>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-700">
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                name="gis_eligible"
                                id="gis_eligible"
                                checked={benefits.gis_eligible}
                                onChange={handleChange}
                                className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                            />
                            <label htmlFor="gis_eligible" className="text-sm font-medium text-gray-300">
                                Eligible for Guaranteed Income Supplement (GIS)
                            </label>
                        </div>
                        {benefits.gis_eligible && (
                            <div className="mt-3">
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Estimated Monthly GIS ($)
                                </label>
                                <input
                                    type="number"
                                    name="gis_estimated_monthly"
                                    value={benefits.gis_estimated_monthly}
                                    onChange={handleChange}
                                    placeholder="600"
                                    className="w-full md:w-1/2 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Employer Pension */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Building className="w-5 h-5 text-purple-400" />
                        Employer Pension
                    </h2>

                    <div className="flex items-center gap-2 mb-4">
                        <input
                            type="checkbox"
                            name="has_employer_pension"
                            id="has_employer_pension"
                            checked={benefits.has_employer_pension}
                            onChange={handleChange}
                            className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="has_employer_pension" className="text-sm font-medium text-gray-300">
                            I have an employer pension plan
                        </label>
                    </div>

                    {benefits.has_employer_pension && (
                        <>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Pension Type
                                    </label>
                                    <select
                                        name="pension_type"
                                        value={benefits.pension_type}
                                        onChange={handleChange}
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="">Select type...</option>
                                        <option value="db">Defined Benefit (DB)</option>
                                        <option value="dc">Defined Contribution (DC)</option>
                                        <option value="hybrid">Hybrid</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Employer Name
                                    </label>
                                    <input
                                        type="text"
                                        name="pension_employer"
                                        value={benefits.pension_employer}
                                        onChange={handleChange}
                                        placeholder="Company name"
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Years of Service
                                    </label>
                                    <input
                                        type="number"
                                        name="pension_years_of_service"
                                        value={benefits.pension_years_of_service}
                                        onChange={handleChange}
                                        step="0.5"
                                        placeholder="15"
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">
                                        Current Pension Value ($)
                                    </label>
                                    <input
                                        type="number"
                                        name="pension_current_value"
                                        value={benefits.pension_current_value}
                                        onChange={handleChange}
                                        placeholder="250000"
                                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                            </div>

                            {benefits.pension_type === 'db' && (
                                <div className="mt-4 pt-4 border-t border-gray-700">
                                    <h3 className="text-sm font-medium text-gray-400 mb-3 flex items-center gap-2">
                                        <Calculator className="w-4 h-4" />
                                        Defined Benefit Formula
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                                Pension Multiplier (%)
                                            </label>
                                            <input
                                                type="number"
                                                name="pension_multiplier"
                                                value={benefits.pension_multiplier}
                                                onChange={handleChange}
                                                step="0.0001"
                                                placeholder="0.02 (2%)"
                                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                                Best Average Salary ($)
                                            </label>
                                            <input
                                                type="number"
                                                name="pension_best_average_salary"
                                                value={benefits.pension_best_average_salary}
                                                onChange={handleChange}
                                                placeholder="95000"
                                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    </div>
                                    {estimatedDBPension && (
                                        <div className="mt-3 p-3 bg-purple-900/30 border border-purple-700 rounded-lg">
                                            <p className="text-sm text-purple-200">
                                                <span className="font-medium">Calculated Monthly Pension: </span>
                                                ${parseFloat(estimatedDBPension).toLocaleString()}/month
                                            </p>
                                            <p className="text-xs text-purple-300 mt-1">
                                                Formula: Years × Multiplier × Best Avg Salary
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Earliest Retirement Age
                                        </label>
                                        <input
                                            type="number"
                                            name="pension_earliest_age"
                                            value={benefits.pension_earliest_age}
                                            onChange={handleChange}
                                            placeholder="55"
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Normal Retirement Age
                                        </label>
                                        <input
                                            type="number"
                                            name="pension_normal_age"
                                            value={benefits.pension_normal_age}
                                            onChange={handleChange}
                                            placeholder="65"
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Estimated Monthly Pension ($)
                                        </label>
                                        <input
                                            type="number"
                                            name="pension_estimated_monthly"
                                            value={benefits.pension_estimated_monthly}
                                            onChange={handleChange}
                                            placeholder="2500"
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Spouse Benefits */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Users className="w-5 h-5 text-pink-400" />
                        Spouse / Partner Benefits
                    </h2>

                    <div className="bg-pink-900/20 border border-pink-700/50 rounded-lg p-4 mb-4">
                        <p className="text-sm text-pink-200">
                            <strong>Family Planning:</strong> Enter your spouse/partner's expected retirement benefits
                            to see your combined family income in retirement. Both partners' income is important
                            for retirement planning.
                        </p>
                    </div>

                    {/* Spouse CPP */}
                    <div className="mb-4">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Spouse's CPP</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Spouse CPP at 60 ($)
                                </label>
                                <input
                                    type="number"
                                    name="spouse_cpp_at_60"
                                    value={benefits.spouse_cpp_at_60 || ''}
                                    onChange={handleChange}
                                    placeholder="650"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Spouse CPP at 65 ($)
                                </label>
                                <input
                                    type="number"
                                    name="spouse_cpp_at_65"
                                    value={benefits.spouse_cpp_at_65}
                                    onChange={handleChange}
                                    placeholder="900"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Spouse CPP at 70 ($)
                                </label>
                                <input
                                    type="number"
                                    name="spouse_cpp_at_70"
                                    value={benefits.spouse_cpp_at_70 || ''}
                                    onChange={handleChange}
                                    placeholder="1280"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Spouse OAS */}
                    <div className="mb-4 pt-4 border-t border-gray-700">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Spouse's OAS</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Spouse Years in Canada (after age 18)
                                </label>
                                <input
                                    type="number"
                                    name="spouse_oas_years_in_canada"
                                    value={benefits.spouse_oas_years_in_canada || ''}
                                    onChange={handleChange}
                                    placeholder="40"
                                    max="40"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Spouse Monthly OAS ($)
                                </label>
                                <input
                                    type="number"
                                    name="spouse_oas_estimated"
                                    value={benefits.spouse_oas_estimated}
                                    onChange={handleChange}
                                    placeholder="700"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Spouse Pension */}
                    <div className="pt-4 border-t border-gray-700">
                        <h3 className="text-sm font-medium text-gray-400 mb-3">Spouse's Employer Pension</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Spouse Has Pension?
                                </label>
                                <select
                                    name="spouse_has_pension"
                                    value={benefits.spouse_has_pension || 'no'}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="no">No</option>
                                    <option value="yes">Yes</option>
                                </select>
                            </div>
                            {(benefits.spouse_has_pension === 'yes' || benefits.spouse_pension_estimated) && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Spouse Pension Type
                                        </label>
                                        <select
                                            name="spouse_pension_type"
                                            value={benefits.spouse_pension_type || ''}
                                            onChange={handleChange}
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                        >
                                            <option value="">Select...</option>
                                            <option value="db">Defined Benefit</option>
                                            <option value="dc">Defined Contribution</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-1">
                                            Spouse Monthly Pension ($)
                                        </label>
                                        <input
                                            type="number"
                                            name="spouse_pension_estimated"
                                            value={benefits.spouse_pension_estimated}
                                            onChange={handleChange}
                                            placeholder="1500"
                                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Spouse Summary */}
                    {spouseTotalMonthlyAt65() > 0 && (
                        <div className="mt-4 pt-4 border-t border-gray-700">
                            <div className="bg-pink-900/30 border border-pink-700 rounded-lg p-4">
                                <p className="text-sm text-pink-200">
                                    <span className="font-medium">Spouse's Total at 65: </span>
                                    ${spouseTotalMonthlyAt65().toLocaleString()}/month
                                    (${(spouseTotalMonthlyAt65() * 12).toLocaleString()}/year)
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-medium"
                    >
                        {saving ? (
                            <>
                                <Loader className="w-5 h-5 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="w-5 h-5" />
                                Save Retirement Info
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default RetirementInfoSettings;
