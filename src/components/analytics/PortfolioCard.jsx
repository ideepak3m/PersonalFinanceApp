import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const PortfolioCard = ({ title, amount, change, country, icon: Icon }) => {
    const isPositive = change >= 0;

    return (
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <p className="text-sm text-gray-600 mb-1">{title}</p>
                    {country && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            {country}
                        </span>
                    )}
                </div>
                {Icon && (
                    <div className="p-2 bg-blue-100 rounded-lg">
                        <Icon size={24} className="text-blue-600" />
                    </div>
                )}
            </div>

            <div className="mb-2">
                <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(amount)}
                </p>
            </div>

            {change !== undefined && (
                <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'
                    }`}>
                    {isPositive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span className="font-medium">
                        {isPositive ? '+' : ''}{change.toFixed(2)}%
                    </span>
                    <span className="text-gray-500 ml-1">vs last month</span>
                </div>
            )}
        </div>
    );
};
