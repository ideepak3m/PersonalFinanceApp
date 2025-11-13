import React from 'react';
import { AccountCard } from './AccountCard';

export const AccountList = ({ accounts, onDelete, onEdit }) => {
    if (!accounts || accounts.length === 0) {
        return (
            <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <p className="text-gray-500 text-lg">No accounts yet. Add your first account to get started!</p>
            </div>
        );
    }

    // Group accounts by country
    const groupedAccounts = accounts.reduce((acc, account) => {
        const country = account.country || 'other';
        if (!acc[country]) {
            acc[country] = [];
        }
        acc[country].push(account);
        return acc;
    }, {});

    return (
        <div className="space-y-8">
            {Object.entries(groupedAccounts).map(([country, countryAccounts]) => (
                <div key={country}>
                    <h3 className="text-xl font-semibold text-gray-800 mb-4 capitalize">
                        {country} Accounts
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {countryAccounts.map(account => (
                            <AccountCard
                                key={account.id}
                                account={account}
                                onDelete={onDelete}
                                onEdit={onEdit}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};
