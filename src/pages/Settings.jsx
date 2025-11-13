import React, { useState } from 'react';
import { Settings as SettingsIcon } from 'lucide-react';
import { ConfigurationSettings } from '../components/settings/ConfigurationSettings';
import { ChartOfAccounts } from '../components/settings/ChartOfAccounts';
import { PagesSettings } from '../components/settings/PagesSettings';

export const Settings = () => {
    const [activeTab, setActiveTab] = useState('configuration');

    const tabs = [
        { id: 'configuration', label: 'Configuration' },
        { id: 'chart-of-accounts', label: 'Chart of Accounts' },
        { id: 'pages', label: 'Pages' }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'configuration':
                return <ConfigurationSettings />;
            case 'chart-of-accounts':
                return <ChartOfAccounts />;
            case 'pages':
                return <PagesSettings />;
            default:
                return <ConfigurationSettings />;
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <SettingsIcon size={32} />
                    Settings
                </h1>
                <p className="text-gray-600">
                    Manage your application settings, chart of accounts, and pages
                </p>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-md">
                <div className="border-b border-gray-200">
                    <nav className="flex -mb-px">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                                        ? 'border-blue-600 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
