import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
    Home,
    Receipt,
    TrendingUp,
    BarChart3,
    MessageSquare,
    Settings,
    LogOut,
    DollarSign,
    ChevronDown,
    ChevronRight,
    Plus,
    Minus,
    Upload,
    Wallet,
    PieChart,
    LineChart,
    Users,
    Building2,
    FolderOpen,
    Target
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const Sidebar = () => {
    const { profile, signOut } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Track which menu sections are expanded
    const [expanded, setExpanded] = useState({
        transactions: false,
        investments: false,
        reports: false,
        settings: false
    });

    const toggleExpand = (section) => {
        setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
    };

    // Check if a path or any of its children are active
    const isActiveSection = (paths) => {
        return paths.some(path => location.pathname.startsWith(path));
    };

    // Navigation structure
    const navStructure = [
        {
            type: 'link',
            path: '/',
            label: 'Dashboard',
            icon: Home,
        },
        {
            type: 'group',
            key: 'transactions',
            label: 'Transactions',
            icon: Receipt,
            basePaths: ['/transactions', '/accounts'],
            children: [
                { path: '/accounts', label: 'Bank & Credit Cards', icon: Building2 },
                { path: '/transactions', label: 'All Transactions', icon: FolderOpen },
            ]
        },
        {
            type: 'group',
            key: 'investments',
            label: 'Investments',
            icon: TrendingUp,
            basePaths: ['/investments', '/pdf-reader'],
            children: [
                { path: '/investments', label: 'Investment Accounts', icon: Wallet },
                { path: '/pdf-reader', label: 'Import Statement', icon: Upload },
            ]
        },
        {
            type: 'group',
            key: 'reports',
            label: 'Reports',
            icon: BarChart3,
            basePaths: ['/reports', '/analytics'],
            children: [
                { path: '/reports/expenses', label: 'Expense Analysis', icon: Receipt },
                { path: '/reports/income', label: 'Income Analysis', icon: Wallet },
                { path: '/reports/investments', label: 'Investment Growth', icon: LineChart },
                { path: '/analytics', label: 'Analytics', icon: BarChart3 },
            ]
        },
        {
            type: 'link',
            path: '/ai-advisor',
            label: 'AI Chat',
            icon: MessageSquare,
        },
        {
            type: 'group',
            key: 'settings',
            label: 'Settings',
            icon: Settings,
            basePaths: ['/settings', '/subscriptions', '/split-rules'],
            children: [
                { path: '/settings/profile', label: 'Profile', icon: Users },
                { path: '/settings/retirement', label: 'Retirement Info', icon: Target },
                { path: '/subscriptions', label: 'Subscriptions', icon: Receipt },
                { path: '/split-rules', label: 'Split Rules', icon: FolderOpen },
            ]
        },
    ];

    const renderNavItem = (item) => {
        if (item.type === 'link') {
            const Icon = item.icon;
            return (
                <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                        `w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                        }`
                    }
                >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                </NavLink>
            );
        }

        if (item.type === 'group') {
            const Icon = item.icon;
            const isExpanded = expanded[item.key];
            const isActive = isActiveSection(item.basePaths);

            return (
                <div key={item.key}>
                    {/* Group header */}
                    <button
                        onClick={() => toggleExpand(item.key)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${isActive
                            ? 'bg-gray-700 text-white'
                            : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5" />
                            <span className="font-medium">{item.label}</span>
                        </div>
                        {isExpanded ? (
                            <ChevronDown className="w-4 h-4" />
                        ) : (
                            <ChevronRight className="w-4 h-4" />
                        )}
                    </button>

                    {/* Children */}
                    {isExpanded && (
                        <div className="ml-4 mt-1 space-y-1 border-l border-gray-700 pl-4">
                            {item.children.map(child => {
                                const ChildIcon = child.icon;
                                return (
                                    <NavLink
                                        key={child.path}
                                        to={child.path}
                                        className={({ isActive }) =>
                                            `w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${isActive
                                                ? 'bg-indigo-500/20 text-indigo-300'
                                                : `${child.color || 'text-gray-400'} hover:bg-gray-700 hover:text-white`
                                            }`
                                        }
                                    >
                                        <ChildIcon className="w-4 h-4" />
                                        <span>{child.label}</span>
                                    </NavLink>
                                );
                            })}
                        </div>
                    )}
                </div>
            );
        }

        return null;
    };

    return (
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg">
                        <DollarSign className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h2 className="font-bold text-white">Finance</h2>
                        <p className="text-xs text-gray-400">Manager</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navStructure.map(item => renderNavItem(item))}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-gray-700">
                <div className="flex items-center justify-between px-2">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                            {(() => {
                                const name = profile?.full_name || '';
                                if (!name) return 'U';
                                const parts = name.trim().split(' ');
                                if (parts.length === 1) return parts[0][0]?.toUpperCase();
                                return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                            })()}
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white">
                                {profile?.full_name || 'User'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={async () => {
                            await signOut();
                            navigate('/login');
                        }}
                        className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded-lg transition-all"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
};