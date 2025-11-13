import React from 'react';
import { useFinance } from '../../context/FinanceContext';

export const Header = ({ title, subtitle }) => {
    const { getTotalByCountry } = useFinance();

    const totalPortfolio = getTotalByCountry('canada') + getTotalByCountry('india');

    return (
        <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white">{title}</h1>
                    <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
                </div>
                <div className="text-right">
                    <p className="text-sm text-gray-400">Total Portfolio</p>
                    <p className="text-xl font-bold text-white">
                        ${totalPortfolio.toFixed(2)}
                    </p>
                </div>
            </div>
        </header>
    );
};