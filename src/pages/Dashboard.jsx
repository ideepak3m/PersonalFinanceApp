import React from 'react';

export default function Dashboard() {
    return (
        <div className="max-w-3xl mx-auto py-12">
            <h1 className="text-3xl font-bold mb-4">Welcome to Your Personal Finance Dashboard</h1>
            <p className="text-gray-600 mb-8">
                Track your accounts, transactions, and analytics all in one place.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-2">Accounts</h2>
                    <p className="text-2xl font-bold text-indigo-600">--</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-2">Transactions</h2>
                    <p className="text-2xl font-bold text-indigo-600">--</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-2">Analytics</h2>
                    <p className="text-2xl font-bold text-indigo-600">--</p>
                </div>
            </div>
        </div>
    );
}
