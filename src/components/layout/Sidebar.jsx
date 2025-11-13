import React from 'react';
import { NavLink } from 'react-router-dom';
import { DollarSign, Upload, TrendingUp, BookOpen, MessageSquare } from 'lucide-react';

const iconMap = {
    DollarSign, Upload, TrendingUp, BookOpen, MessageSquare
};

export const Sidebar = () => {
    const navItems = [
        { path: '/', label: 'Accounts', icon: 'DollarSign' },
        { path: '/transactions', label: 'Transactions', icon: 'Upload' },
        { path: '/analytics', label: 'Analytics', icon: 'TrendingUp' },
        { path: '/knowledge', label: 'Knowledge', icon: 'BookOpen' },
        { path: '/ai-advisor', label: 'AI Advisor', icon: 'MessageSquare' }
    ];

    return (
        <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
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

            <nav className="flex-1 p-4 space-y-2">
                {navItems.map(item => {
                    const Icon = iconMap[item.icon];
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
                })}
            </nav>

            <div className="p-4 border-t border-gray-700">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold">
                        D
                    </div>
                    <div>
                        <p className="text-sm font-semibold text-white">Demo User</p>
                        <p className="text-xs text-gray-400">demo@finance.app</p>
                    </div>
                </div>
            </div>
        </div>
    );
};