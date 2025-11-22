// src/pages/AccountsDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Upload } from 'lucide-react';
import { TransactionUpload } from '../components/transactions/TransactionUpload';
import { supabaseAccountsDB, supabaseTransactionsDB, supabaseChartOfAccountsDB } from '../services/supabaseDatabase';
import transactionService from '../services/transactionService';

export const AccountsDashboard = () => {
    const [accounts, setAccounts] = useState([]);
    const [uncategorizedCounts, setUncategorizedCounts] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [chartOfAccounts, setChartOfAccounts] = useState([]);
    const [suspenseAccount, setSuspenseAccount] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedAccountForUpload, setSelectedAccountForUpload] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            const [accs, coa] = await Promise.all([
                supabaseAccountsDB.getAll(),
                supabaseChartOfAccountsDB.getAll()
            ]);

            setAccounts(accs || []);
            setChartOfAccounts(coa || []);

            const suspense = (coa || []).find(c =>
                c.name?.toLowerCase() === 'suspense'
            );
            setSuspenseAccount(suspense);

            const counts = await getUncategorizedCounts();
            setUncategorizedCounts(counts);

        } catch (error) {
            console.error('Error loading accounts:', error);
            alert('Failed to load accounts');
        } finally {
            setLoading(false);
        }
    };

    const getUncategorizedCounts = async () => {
        try {
            const { data, error } = await supabaseTransactionsDB.table()
                .select('account_id')
                .eq('status', 'uncategorized');

            if (error) throw error;

            const counts = {};
            (data || []).forEach(txn => {
                counts[txn.account_id] = (counts[txn.account_id] || 0) + 1;
            });

            return counts;
        } catch (error) {
            console.error('Error getting counts:', error);
            return {};
        }
    };

    const handleAccountClick = (accountId) => {
        navigate(`/uncategorized-receipts/${accountId}`);
    };

    const handleUploadClick = (account) => {
        setSelectedAccountForUpload(account);
        setShowUploadModal(true);
    };

    const handleUpload = async (file, accountId) => {
        try {
            setLoading(true);

            let mapped = [];
            const fileName = file.name.toLowerCase();

            if (fileName.endsWith('.csv')) {
                const csv = await transactionService.parseCSV(file);
                mapped = transactionService.mapCSVToTransactions(csv, accountId);
            } else if (fileName.endsWith('.qbo') || fileName.endsWith('.qfx')) {
                const data = await transactionService.parseQBOQFX(file);
                mapped = transactionService.mapQBOQFXToTransactions(data, accountId);
            } else {
                alert('Unsupported format');
                return;
            }

            const toSave = mapped.map(txn => {
                // Remove id and any other fields that shouldn't be saved
                const { id, ...rest } = txn;

                return {
                    ...rest,
                    account_id: accountId,
                    raw_merchant_name: txn.description || txn.raw_merchant_name || 'Unknown',
                    description: txn.description || txn.raw_merchant_name || 'Unknown',
                    chart_of_account_id: suspenseAccount?.id,
                    status: 'uncategorized',
                    currency: txn.currency || 'USD',
                    is_split: false
                };
            });

            await supabaseTransactionsDB.bulkAdd(toSave);

            setShowUploadModal(false);
            setSelectedAccountForUpload(null);
            await loadData();

            alert(`Uploaded ${toSave.length} transactions to ${selectedAccountForUpload?.name}`);
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const filteredAccounts = accounts.filter(acc =>
        acc.name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-900">
                    Bank and Cash Accounts
                </h1>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search accounts..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border rounded-lg"
                        />
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                        New Bank or Cash Account
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow border overflow-hidden">
                <table className="w-full">
                    <thead className="bg-gray-50 border-b">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-20"></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Uncategorized Receipts</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-32">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredAccounts.map((account) => {
                            const count = uncategorizedCounts[account.id] || 0;

                            return (
                                <tr key={account.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm">
                                        <button className="text-blue-600 hover:text-blue-800">Edit</button>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{account.name}</td>
                                    <td className="px-6 py-4 text-sm text-center">
                                        {count > 0 ? (
                                            <button
                                                onClick={() => handleAccountClick(account.id)}
                                                className="text-blue-600 hover:text-blue-800 font-medium"
                                            >
                                                {count}
                                            </button>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center">
                                        <button
                                            onClick={() => handleUploadClick(account)}
                                            className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                                        >
                                            <Upload className="w-4 h-4" />
                                            Upload
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {filteredAccounts.length === 0 && (
                    <div className="px-6 py-12 text-center text-gray-500">
                        {searchTerm ? 'No accounts found' : 'No accounts yet'}
                    </div>
                )}

                {loading && (
                    <div className="px-6 py-12 text-center text-gray-500">Loading accounts...</div>
                )}
            </div>

            {showUploadModal && selectedAccountForUpload && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold mb-4">
                            Upload Transactions to {selectedAccountForUpload.name}
                        </h3>
                        <TransactionUpload
                            accounts={[selectedAccountForUpload]}
                            account={selectedAccountForUpload}
                            onUpload={(file) => handleUpload(file, selectedAccountForUpload.id)}
                            loading={loading}
                        />
                        <button
                            onClick={() => {
                                setShowUploadModal(false);
                                setSelectedAccountForUpload(null);
                            }}
                            className="mt-4 w-full px-4 py-2 border rounded-lg hover:bg-gray-100"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};