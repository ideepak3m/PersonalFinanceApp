import { useState, useEffect } from 'react';

export const useTransactions = () => {
    const [transactions, setTransactions] = useState([]);

    useEffect(() => {
        // Load transactions from localStorage
        const stored = localStorage.getItem('transactions');
        if (stored) {
            setTransactions(JSON.parse(stored));
        }
    }, []);

    const addTransaction = (transaction) => {
        const newTransaction = {
            ...transaction,
            id: Date.now().toString(),
            date: transaction.date || new Date().toISOString()
        };
        const updated = [...transactions, newTransaction];
        setTransactions(updated);
        localStorage.setItem('transactions', JSON.stringify(updated));
    };

    const updateTransaction = (id, updates) => {
        const updated = transactions.map(t =>
            t.id === id ? { ...t, ...updates } : t
        );
        setTransactions(updated);
        localStorage.setItem('transactions', JSON.stringify(updated));
    };

    const deleteTransaction = (id) => {
        const updated = transactions.filter(t => t.id !== id);
        setTransactions(updated);
        localStorage.setItem('transactions', JSON.stringify(updated));
    };

    return {
        transactions,
        addTransaction,
        updateTransaction,
        deleteTransaction
    };
};
