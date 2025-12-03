import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabaseUserProfileDB } from '../../services/supabaseDatabase';
import {
    User,
    Calendar,
    MapPin,
    Briefcase,
    DollarSign,
    Heart,
    Shield,
    Save,
    Loader,
    AlertCircle,
    CheckCircle
} from 'lucide-react';

const PROVINCES = [
    { value: 'AB', label: 'Alberta' },
    { value: 'BC', label: 'British Columbia' },
    { value: 'MB', label: 'Manitoba' },
    { value: 'NB', label: 'New Brunswick' },
    { value: 'NL', label: 'Newfoundland and Labrador' },
    { value: 'NS', label: 'Nova Scotia' },
    { value: 'NT', label: 'Northwest Territories' },
    { value: 'NU', label: 'Nunavut' },
    { value: 'ON', label: 'Ontario' },
    { value: 'PE', label: 'Prince Edward Island' },
    { value: 'QC', label: 'Quebec' },
    { value: 'SK', label: 'Saskatchewan' },
    { value: 'YT', label: 'Yukon' }
];

const EMPLOYMENT_STATUS = [
    { value: 'employed', label: 'Employed (Full-time)' },
    { value: 'part_time', label: 'Employed (Part-time)' },
    { value: 'self_employed', label: 'Self-Employed' },
    { value: 'unemployed', label: 'Unemployed' },
    { value: 'retired', label: 'Retired' },
    { value: 'student', label: 'Student' }
];

const MARITAL_STATUS = [
    { value: 'single', label: 'Single' },
    { value: 'married', label: 'Married' },
    { value: 'common_law', label: 'Common-Law' },
    { value: 'divorced', label: 'Divorced' },
    { value: 'widowed', label: 'Widowed' }
];

const RISK_TOLERANCE = [
    { value: 'conservative', label: 'Conservative - Preserve capital, low risk' },
    { value: 'moderate', label: 'Moderate - Balanced growth and security' },
    { value: 'aggressive', label: 'Aggressive - Maximum growth, high risk tolerance' }
];

export const UserProfileSettings = () => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [profile, setProfile] = useState({
        date_of_birth: '',
        province: 'ON',
        country: 'CA',
        marital_status: 'single',
        spouse_date_of_birth: '',
        employment_status: 'employed',
        current_annual_income: '',
        spouse_annual_income: '',
        expected_retirement_age: 65,
        desired_retirement_income: '',
        life_expectancy: 90,
        marginal_tax_rate: '',
        average_tax_rate: '',
        rrsp_contribution_room: '',
        rrsp_unused_room: '',
        tfsa_contribution_room: '',
        risk_tolerance: 'moderate',
        preferred_currency: 'CAD'
    });

    useEffect(() => {
        loadProfile();
    }, [user]);

    const loadProfile = async () => {
        if (!user) return;

        setLoading(true);
        setError(null);

        try {
            const data = await supabaseUserProfileDB.getByUserId(user.id);
            if (data) {
                setProfile({
                    ...profile,
                    ...data,
                    date_of_birth: data.date_of_birth || '',
                    spouse_date_of_birth: data.spouse_date_of_birth || '',
                    current_annual_income: data.current_annual_income || '',
                    spouse_annual_income: data.spouse_annual_income || '',
                    desired_retirement_income: data.desired_retirement_income || '',
                    marginal_tax_rate: data.marginal_tax_rate || '',
                    average_tax_rate: data.average_tax_rate || '',
                    rrsp_contribution_room: data.rrsp_contribution_room || '',
                    rrsp_unused_room: data.rrsp_unused_room || '',
                    tfsa_contribution_room: data.tfsa_contribution_room || ''
                });
            }
        } catch (err) {
            console.error('Error loading profile:', err);
            setError('Failed to load profile');
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setProfile(prev => ({ ...prev, [name]: value }));
        setSuccess(false);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError(null);
        setSuccess(false);

        try {
            // Clean up the data before saving
            const profileData = {
                ...profile,
                user_id: user.id,
                current_annual_income: profile.current_annual_income ? parseFloat(profile.current_annual_income) : null,
                spouse_annual_income: profile.spouse_annual_income ? parseFloat(profile.spouse_annual_income) : null,
                desired_retirement_income: profile.desired_retirement_income ? parseFloat(profile.desired_retirement_income) : null,
                marginal_tax_rate: profile.marginal_tax_rate ? parseFloat(profile.marginal_tax_rate) : null,
                average_tax_rate: profile.average_tax_rate ? parseFloat(profile.average_tax_rate) : null,
                rrsp_contribution_room: profile.rrsp_contribution_room ? parseFloat(profile.rrsp_contribution_room) : null,
                rrsp_unused_room: profile.rrsp_unused_room ? parseFloat(profile.rrsp_unused_room) : null,
                tfsa_contribution_room: profile.tfsa_contribution_room ? parseFloat(profile.tfsa_contribution_room) : null,
                expected_retirement_age: parseInt(profile.expected_retirement_age) || 65,
                life_expectancy: parseInt(profile.life_expectancy) || 90,
                date_of_birth: profile.date_of_birth || null,
                spouse_date_of_birth: profile.spouse_date_of_birth || null
            };

            await supabaseUserProfileDB.upsert(profileData);
            setSuccess(true);
            setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
            console.error('Error saving profile:', err);
            setError('Failed to save profile. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const calculateAge = (dob) => {
        if (!dob) return null;
        const today = new Date();
        const birthDate = new Date(dob);
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const age = calculateAge(profile.date_of_birth);
    const yearsToRetirement = age ? profile.expected_retirement_age - age : null;

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader className="w-8 h-8 animate-spin text-indigo-600" />
                <span className="ml-2 text-gray-600">Loading profile...</span>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <User className="w-7 h-7" />
                    User Profile
                </h1>
                <p className="text-gray-400 mt-1">
                    Your personal information for retirement planning and AI insights
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
                    Profile saved successfully!
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-indigo-400" />
                        Personal Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Date of Birth
                            </label>
                            <input
                                type="date"
                                name="date_of_birth"
                                value={profile.date_of_birth}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                            {age && (
                                <p className="text-sm text-gray-400 mt-1">Age: {age} years</p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Province
                            </label>
                            <select
                                name="province"
                                value={profile.province}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                {PROVINCES.map(p => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Marital Status
                            </label>
                            <select
                                name="marital_status"
                                value={profile.marital_status}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                {MARITAL_STATUS.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                        {(profile.marital_status === 'married' || profile.marital_status === 'common_law') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Spouse Date of Birth
                                </label>
                                <input
                                    type="date"
                                    name="spouse_date_of_birth"
                                    value={profile.spouse_date_of_birth}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Employment & Income */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-green-400" />
                        Employment & Income
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Employment Status
                            </label>
                            <select
                                name="employment_status"
                                value={profile.employment_status}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                {EMPLOYMENT_STATUS.map(s => (
                                    <option key={s.value} value={s.value}>{s.label}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Annual Income ($)
                            </label>
                            <input
                                type="number"
                                name="current_annual_income"
                                value={profile.current_annual_income}
                                onChange={handleChange}
                                placeholder="85000"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        {(profile.marital_status === 'married' || profile.marital_status === 'common_law') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">
                                    Spouse Annual Income ($)
                                </label>
                                <input
                                    type="number"
                                    name="spouse_annual_income"
                                    value={profile.spouse_annual_income}
                                    onChange={handleChange}
                                    placeholder="75000"
                                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Retirement Planning */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-red-400" />
                        Retirement Planning
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Expected Retirement Age
                            </label>
                            <input
                                type="number"
                                name="expected_retirement_age"
                                value={profile.expected_retirement_age}
                                onChange={handleChange}
                                min="50"
                                max="75"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                            {yearsToRetirement !== null && yearsToRetirement > 0 && (
                                <p className="text-sm text-indigo-400 mt-1">
                                    {yearsToRetirement} years until retirement
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Desired Annual Retirement Income ($)
                            </label>
                            <input
                                type="number"
                                name="desired_retirement_income"
                                value={profile.desired_retirement_income}
                                onChange={handleChange}
                                placeholder="60000"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Life Expectancy
                            </label>
                            <input
                                type="number"
                                name="life_expectancy"
                                value={profile.life_expectancy}
                                onChange={handleChange}
                                min="70"
                                max="105"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Risk Tolerance
                            </label>
                            <select
                                name="risk_tolerance"
                                value={profile.risk_tolerance}
                                onChange={handleChange}
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            >
                                {RISK_TOLERANCE.map(r => (
                                    <option key={r.value} value={r.value}>{r.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Tax Information */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-yellow-400" />
                        Tax Information
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Marginal Tax Rate (%)
                            </label>
                            <input
                                type="number"
                                name="marginal_tax_rate"
                                value={profile.marginal_tax_rate}
                                onChange={handleChange}
                                step="0.1"
                                placeholder="43.5"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                Average Tax Rate (%)
                            </label>
                            <input
                                type="number"
                                name="average_tax_rate"
                                value={profile.average_tax_rate}
                                onChange={handleChange}
                                step="0.1"
                                placeholder="28.0"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Contribution Room */}
                <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5 text-purple-400" />
                        Contribution Room
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                RRSP Contribution Room ($)
                            </label>
                            <input
                                type="number"
                                name="rrsp_contribution_room"
                                value={profile.rrsp_contribution_room}
                                onChange={handleChange}
                                placeholder="30000"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                RRSP Unused Room ($)
                            </label>
                            <input
                                type="number"
                                name="rrsp_unused_room"
                                value={profile.rrsp_unused_room}
                                onChange={handleChange}
                                placeholder="50000"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">
                                TFSA Contribution Room ($)
                            </label>
                            <input
                                type="number"
                                name="tfsa_contribution_room"
                                value={profile.tfsa_contribution_room}
                                onChange={handleChange}
                                placeholder="88000"
                                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                    </div>
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
                                Save Profile
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default UserProfileSettings;
