import React from 'react';
import { Trash2, Edit } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const AccountCard = ({ account, onDelete, onEdit }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex justify-between items-start mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800">{account.name}</h3>
                    <p className="text-sm text-gray-500 capitalize">{account.type?.replace('-', ' ')}</p>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                    {account.country}
                </span>
            </div>

            <div className="mb-4">
                <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(account.balance)}
                </p>
            </div>

            {account.institution && (
                <p className="text-sm text-gray-600 mb-4">{account.institution}</p>
            )}

            <div className="flex gap-2">
                <button
                    onClick={() => onEdit(account)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                    <Edit size={16} />
                    Edit
                </button>
                <button
                    onClick={() => onDelete(account.id)}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                    <Trash2 size={16} />
                </button>
            </div>
        </div>
    );
};
