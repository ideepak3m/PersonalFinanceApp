import React, { useState, useEffect } from 'react';
import { AccountForm } from '../components/accounts/AccountForm';
import { AccountList } from '../components/accounts/AccountList';
import { supabaseAccountsDB } from '../services/supabaseDatabase';

export const Accounts = () => {
    const [accounts, setAccounts] = useState([]);
    const [refresh, setRefresh] = useState(0);
    const [showForm, setShowForm] = useState(false);


    useEffect(() => {
        const fetchAccounts = async () => {
            const data = await supabaseAccountsDB.getAll();
            setAccounts(data);
        };
        fetchAccounts();
    }, [refresh]);

    const handleAddAccount = async (account) => {
        await supabaseAccountsDB.add(account);
        setRefresh(r => r + 1);
        setShowForm(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Accounts</h1>
                <button
                    onClick={() => setShowForm(true)}
                    className="bg-blue-600 text-white px-5 py-2 rounded-md font-medium hover:bg-blue-700 transition-colors shadow"
                >
                    Add New Account
                </button>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
                        <button
                            onClick={() => setShowForm(false)}
                            className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
                            title="Close"
                        >
                            &times;
                        </button>
                        <AccountForm onSubmit={handleAddAccount} onCancel={() => setShowForm(false)} />
                    </div>
                </div>
            )}

            <AccountList accounts={accounts} />
        </div>
    );
};