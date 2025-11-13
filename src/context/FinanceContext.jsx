import React, { createContext, useContext } from 'react';
import { useAccounts } from '../hooks/useAccounts';
import { useTransactions } from '../hooks/useTransactions';

const FinanceContext = createContext();

export const FinanceProvider = ({ children }) => {
    const accounts = useAccounts();
    const transactions = useTransactions();

    const getTotalByCountry = (country) => {
        return accounts.accounts
            .filter(a => a.country === country)
            .reduce((sum, a) => sum + getAccountBalance(a.id.toString()), 0);
    };

    const getAccountBalance = (accountId) => {
        const account = accounts.accounts.find(a => a.id.toString() === accountId);
        const txns = transactions.transactions.filter(t => t.accountId === accountId);
        const txnSum = txns.reduce((sum, t) => sum + t.amount, 0);
        return (account?.balance || 0) + txnSum;
    };

    return (
        <FinanceContext.Provider value={{
            ...accounts,
            ...transactions,
            getTotalByCountry,
            getAccountBalance
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => {
    const context = useContext(FinanceContext);
    if (!context) {
        throw new Error('useFinance must be used within FinanceProvider');
    }
    return context;
};