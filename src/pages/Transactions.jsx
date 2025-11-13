import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { TransactionUpload } from '../components/transactions/TransactionUpload';
import { TransactionTable } from '../components/transactions/TransactionTable';
import transactionService from '../services/transactionService';

export const Transactions = () => {
    const { accounts, transactions, addTransaction, deleteTransaction, updateTransaction } = useFinance();
    const [editingTransaction, setEditingTransaction] = useState(null);

    const handleUpload = async (file, accountId) => {
        try {
            const csvData = await transactionService.parseCSV(file);
            const mappedTransactions = transactionService.mapCSVToTransactions(csvData, accountId);

            mappedTransactions.forEach(txn => {
                const validation = transactionService.validateTransaction(txn);
                if (validation.isValid) {
                    addTransaction(txn);
                } else {
                    console.error('Invalid transaction:', validation.errors);
                }
            });

            alert(`Successfully uploaded ${mappedTransactions.length} transactions!`);
        } catch (error) {
            console.error('Upload error:', error);
            throw error;
        }
    };

    const handleDelete = (id) => {
        if (window.confirm('Are you sure you want to delete this transaction?')) {
            deleteTransaction(id);
        }
    };

    const handleEdit = (transaction) => {
        setEditingTransaction(transaction);
        // You could implement an edit modal here
        alert('Edit functionality coming soon!');
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Transactions</h1>
                <p className="text-gray-600">Upload and manage your financial transactions</p>
            </div>

            <TransactionUpload accounts={accounts} onUpload={handleUpload} />

            <TransactionTable
                transactions={transactions}
                accounts={accounts}
                onDelete={handleDelete}
                onEdit={handleEdit}
            />
        </div>
    );
};
