import React from 'react';
import { Trash2, Edit } from 'lucide-react';
import { formatCurrency } from '../../utils/formatters';

export const AccountCard = ({ account, onDelete, onEdit }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-3 hover:shadow-lg transition-shadow max-w-xs mx-auto">
            <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-base font-semibold text-gray-800">{account.name}</h3>
                    <p className="text-xs text-gray-500 capitalize">{account.type?.replace('-', ' ')}</p>
                </div>
                <span className="px-1.5 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-medium rounded-full">
                    {account.country}
                </span>
            </div>

            <div className="mb-2">
                <p className="text-xl font-bold text-gray-900">
                    {formatCurrency(account.balance)}
                </p>
            </div>

            {account.institution && (
                <p className="text-xs text-gray-600 mb-2">{account.institution}</p>
            )}

            <div className="flex gap-1">
                <button
                    onClick={() => onEdit(account)}
                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs"
                >
                    <Edit size={12} />
                    Edit
                </button>
                <button
                    onClick={() => onDelete(account.id)}
                    className="flex items-center justify-center gap-1 px-2 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-xs"
                >
                    <Trash2 size={12} />
                </button>
            </div>
        </div>
    );
};
