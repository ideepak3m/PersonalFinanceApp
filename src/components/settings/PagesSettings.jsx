import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Save } from 'lucide-react';

const DEFAULT_PAGES = [
    { id: 'accounts', name: 'Accounts', enabled: true, order: 1 },
    { id: 'transactions', name: 'Transactions', enabled: true, order: 2 },
    { id: 'analytics', name: 'Analytics', enabled: true, order: 3 },
    { id: 'knowledge', name: 'Knowledge', enabled: true, order: 4 },
    { id: 'ai-advisor', name: 'AI Advisor', enabled: true, order: 5 },
    { id: 'settings', name: 'Settings', enabled: true, order: 6 }
];

export const PagesSettings = () => {
    const [pages, setPages] = useState([]);

    useEffect(() => {
        const saved = localStorage.getItem('pagesConfiguration');
        if (saved) {
            setPages(JSON.parse(saved));
        } else {
            setPages(DEFAULT_PAGES);
        }
    }, []);

    const handleToggle = (id) => {
        const updated = pages.map(page =>
            page.id === id ? { ...page, enabled: !page.enabled } : page
        );
        setPages(updated);
    };

    const handleOrderChange = (id, direction) => {
        const currentIndex = pages.findIndex(p => p.id === id);
        if (
            (direction === 'up' && currentIndex === 0) ||
            (direction === 'down' && currentIndex === pages.length - 1)
        ) {
            return;
        }

        const newPages = [...pages];
        const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

        [newPages[currentIndex], newPages[targetIndex]] =
            [newPages[targetIndex], newPages[currentIndex]];

        // Update order numbers
        newPages.forEach((page, index) => {
            page.order = index + 1;
        });

        setPages(newPages);
    };

    const handleSave = () => {
        localStorage.setItem('pagesConfiguration', JSON.stringify(pages));
        alert('Pages configuration saved successfully!');
    };

    const handleReset = () => {
        if (window.confirm('Reset to default pages configuration?')) {
            setPages(DEFAULT_PAGES);
            localStorage.setItem('pagesConfiguration', JSON.stringify(DEFAULT_PAGES));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                        Pages Configuration
                    </h2>
                    <p className="text-gray-600">
                        Enable/disable pages and configure their display order
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleReset}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors"
                    >
                        Reset to Default
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                        <Save size={20} />
                        Save Changes
                    </button>
                </div>
            </div>

            {/* Pages List */}
            <div className="space-y-3">
                {pages.map((page, index) => (
                    <div
                        key={page.id}
                        className={`flex items-center justify-between p-4 border rounded-lg transition-colors ${page.enabled
                                ? 'bg-white border-gray-200'
                                : 'bg-gray-50 border-gray-300 opacity-60'
                            }`}
                    >
                        <div className="flex items-center gap-4">
                            <span className="text-sm font-medium text-gray-500 w-8">
                                #{page.order}
                            </span>
                            <div>
                                <h3 className="font-semibold text-gray-800">
                                    {page.name}
                                </h3>
                                <p className="text-sm text-gray-500">
                                    {page.enabled ? 'Visible in navigation' : 'Hidden from navigation'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* Order Controls */}
                            <div className="flex flex-col gap-1">
                                <button
                                    onClick={() => handleOrderChange(page.id, 'up')}
                                    disabled={index === 0}
                                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ↑
                                </button>
                                <button
                                    onClick={() => handleOrderChange(page.id, 'down')}
                                    disabled={index === pages.length - 1}
                                    className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    ↓
                                </button>
                            </div>

                            {/* Toggle */}
                            <button
                                onClick={() => handleToggle(page.id)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${page.enabled
                                        ? 'bg-green-600 text-white hover:bg-green-700'
                                        : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
                                    }`}
                            >
                                {page.enabled ? (
                                    <>
                                        <Eye size={16} />
                                        Enabled
                                    </>
                                ) : (
                                    <>
                                        <EyeOff size={16} />
                                        Disabled
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Note:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Disabled pages will be hidden from the navigation menu</li>
                    <li>• Use the arrow buttons to reorder pages in the navigation</li>
                    <li>• Changes take effect after saving</li>
                    <li>• The Settings page cannot be disabled</li>
                </ul>
            </div>
        </div>
    );
};
