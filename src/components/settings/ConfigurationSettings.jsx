
import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import { supabaseSettingsDB } from '../../services/supabaseDatabase';

const DEFAULT_CONFIG = {
    appName: 'Personal Finance',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    fiscalYearStart: 'january',
    defaultCountry: 'canada',
    enableNotifications: true,
    enableAI: true,
    theme: 'light'
};

export const ConfigurationSettings = () => {
    const [config, setConfig] = useState(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchConfig = async () => {
            setLoading(true);
            try {
                const data = await supabaseSettingsDB.getConfiguration();
                if (data) {
                    setConfig(data);
                }
            } catch (e) {
                // fallback to default
            }
            setLoading(false);
        };
        fetchConfig();
    }, []);

    const handleChange = (field, value) => {
        setConfig(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await supabaseSettingsDB.setConfiguration(config);
            alert('Configuration saved successfully!');
        } catch (e) {
            alert('Failed to save configuration.');
        }
        setSaving(false);
    };

    if (loading) {
        return <div className="text-center py-12 text-gray-500">Loading configuration...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    General Configuration
                </h2>
                <p className="text-gray-600 mb-6">
                    Configure general application settings and preferences
                </p>
            </div>

            <div className="space-y-4">
                {/* App Name */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Application Name
                    </label>
                    <input
                        type="text"
                        value={config.appName}
                        onChange={(e) => handleChange('appName', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Currency */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Currency
                    </label>
                    <select
                        value={config.currency}
                        onChange={(e) => handleChange('currency', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="USD">USD - US Dollar</option>
                        <option value="CAD">CAD - Canadian Dollar</option>
                        <option value="INR">INR - Indian Rupee</option>
                        <option value="EUR">EUR - Euro</option>
                        <option value="GBP">GBP - British Pound</option>
                    </select>
                </div>

                {/* Date Format */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date Format
                    </label>
                    <select
                        value={config.dateFormat}
                        onChange={(e) => handleChange('dateFormat', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                </div>

                {/* Fiscal Year Start */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fiscal Year Start Month
                    </label>
                    <select
                        value={config.fiscalYearStart}
                        onChange={(e) => handleChange('fiscalYearStart', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="january">January</option>
                        <option value="april">April</option>
                        <option value="july">July</option>
                        <option value="october">October</option>
                    </select>
                </div>

                {/* Default Country */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Default Country
                    </label>
                    <select
                        value={config.defaultCountry}
                        onChange={(e) => handleChange('defaultCountry', e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="canada">Canada</option>
                        <option value="india">India</option>
                    </select>
                </div>

                {/* Toggles */}
                <div className="space-y-3 pt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Enable Notifications
                            </label>
                            <p className="text-xs text-gray-500">
                                Receive alerts for important financial events
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.enableNotifications}
                                onChange={(e) => handleChange('enableNotifications', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>

                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-700">
                                Enable AI Features
                            </label>
                            <p className="text-xs text-gray-500">
                                Use AI-powered financial advisor and insights
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={config.enableAI}
                                onChange={(e) => handleChange('enableAI', e.target.checked)}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                    </div>
                </div>
            </div>

            {/* Save Button */}
            <div className="pt-6 border-t border-gray-200">
                <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
                    disabled={saving}
                >
                    <Save size={20} />
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div>
    );
};
