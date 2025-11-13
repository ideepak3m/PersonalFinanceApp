import { useState, useEffect } from 'react';
import storageService from '../services/storageService';

export const useAccounts = () => {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAccounts();
    }, []);

    const loadAccounts = async () => {
        const data = await storageService.get('accounts');
        if (data) setAccounts(data);
        setLoading(false);
    };

    const addAccount = async (account) => {
        const newAccount = {
            id: Date.now(),
            ...account,
            balance: parseFloat(account.balance) || 0
        };
        const updated = [...accounts, newAccount];
        setAccounts(updated);
        await storageService.set('accounts', updated);
        return newAccount;
    };

    const deleteAccount = async (id) => {
        const updated = accounts.filter(a => a.id !== id);
        setAccounts(updated);
        await storageService.set('accounts', updated);
    };

    const updateAccount = async (id, updates) => {
        const updated = accounts.map(a =>
            a.id === id ? { ...a, ...updates } : a
        );
        setAccounts(updated);
        await storageService.set('accounts', updated);
    };

    return {
        accounts,
        loading,
        addAccount,
        deleteAccount,
        updateAccount
    };
};