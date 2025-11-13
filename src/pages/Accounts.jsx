import React from 'react';
import { AccountForm } from '../components/accounts/AccountForm';
import { AccountList } from '../components/accounts/AccountList';

export const Accounts = () => {
    return (
        <div className="space-y-6">
            <AccountForm />
            <AccountList />
        </div>
    );
};