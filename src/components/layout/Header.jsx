import React from 'react';

export const Header = ({ title, subtitle }) => {
    return (
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
            <div className="flex items-center gap-4">
                <div className="bg-gradient-to-tr from-purple-500 to-blue-500 rounded-xl p-3">
                    <img src="/PersonalFinance.png" alt="Finance Logo" className="w-12 h-12" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-white leading-tight">{title}</h1>
                    <p className="text-gray-300 text-lg">{subtitle}</p>
                </div>
            </div>
        </header>
    );
};