// src/pages/AccountsDashboard.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Upload } from 'lucide-react';
import { TransactionUpload } from '../components/transactions/TransactionUpload';
import BankAccountDetailsModal from '../components/accounts/BankAccountDetailsModal';
import { supabaseAccountsDB, supabaseTransactionsDB, supabaseChartOfAccountsDB, supabaseImportStagingDB, supabaseImportRawDataDB } from '../services/supabaseDatabase';
import transactionService from '../services/transactionService';
import Papa from 'papaparse';

export const AccountsDashboard = () => {
    const [accounts, setAccounts] = useState([]);
    const [uncategorizedCounts, setUncategorizedCounts] = useState({});
    const [pendingImportCounts, setPendingImportCounts] = useState({});
    const [lastTransactionDates, setLastTransactionDates] = useState({});
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [chartOfAccounts, setChartOfAccounts] = useState([]);
    const [suspenseAccount, setSuspenseAccount] = useState(null);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [selectedAccountForUpload, setSelectedAccountForUpload] = useState(null);
    const [showNewAccountModal, setShowNewAccountModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [newAccountData, setNewAccountData] = useState({
        name: '',
        type: '',
        country: '',
        currency: 'CAD'
    });
    const [accountTypes] = useState([
        'Savings',
        'Chequing',
        'Investment'
    ]);
    const [investmentTypes, setInvestmentTypes] = useState([
        'RRSP',
        'TFSA',
        'RESP',
        'Non-Registered',
        'Margin Account'
    ]);
    const [selectedInvestmentType, setSelectedInvestmentType] = useState('');
    const [showAddInvestmentType, setShowAddInvestmentType] = useState(false);
    const [newInvestmentType, setNewInvestmentType] = useState('');
    const [showBankDetailsModal, setShowBankDetailsModal] = useState(false);
    const [selectedBankAccount, setSelectedBankAccount] = useState(null);
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

            const [counts, pending, lastDates] = await Promise.all([
                getUncategorizedCounts(),
                getPendingImportCounts(),
                getLastTransactionDates()
            ]);
            setUncategorizedCounts(counts);
            setPendingImportCounts(pending);
            setLastTransactionDates(lastDates);

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

    const getPendingImportCounts = async () => {
        try {
            const { data, error } = await supabaseImportStagingDB.table()
                .select('account_id, row_count')
                .in('status', ['pending_mapping', 'mapped']);

            if (error) throw error;

            console.log('Pending import staging records:', data);

            const counts = {};
            (data || []).forEach(staging => {
                counts[staging.account_id] = (counts[staging.account_id] || 0) + staging.row_count;
            });

            console.log('Pending import counts by account:', counts);
            return counts;
        } catch (error) {
            console.error('Error getting pending import counts:', error);
            return {};
        }
    };

    const getLastTransactionDates = async () => {
        try {
            // Get last transaction date for each account from transactions table
            const { data, error } = await supabaseTransactionsDB.table()
                .select('account_id, date')
                .order('date', { ascending: false });

            if (error) throw error;

            // Group by account_id and get the most recent date
            const dates = {};
            (data || []).forEach(txn => {
                if (!dates[txn.account_id]) {
                    dates[txn.account_id] = txn.date;
                }
            });

            return dates;
        } catch (error) {
            console.error('Error getting last transaction dates:', error);
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

    const handleEditClick = (account) => {
        setEditingAccount(account);
        setShowEditModal(true);
    };

    const handleNewAccount = () => {
        setNewAccountData({
            name: '',
            type: '',
            country: '',
            currency: 'CAD'
        });
        setSelectedInvestmentType('');
        setShowNewAccountModal(true);
    };

    const handleCreateAccount = async () => {
        try {
            if (!newAccountData.name || !newAccountData.type) {
                alert('Please fill in account name and type');
                return;
            }

            if (newAccountData.type === 'Investment' && !selectedInvestmentType) {
                alert('Please select an investment account type');
                return;
            }

            const accountToSave = {
                name: newAccountData.name,
                type: newAccountData.type === 'Investment'
                    ? `Investment - ${selectedInvestmentType}`
                    : newAccountData.type,
                country: newAccountData.country || 'Canada',
                currency: newAccountData.currency || 'CAD',
                account_category: 'Bank'
            };

            await supabaseAccountsDB.add(accountToSave);

            setShowNewAccountModal(false);
            await loadData();
            alert('Account created successfully!');
        } catch (error) {
            console.error('Error creating account:', error);
            alert('Failed to create account: ' + error.message);
        }
    };

    const handleAddInvestmentType = () => {
        if (newInvestmentType.trim()) {
            setInvestmentTypes([...investmentTypes, newInvestmentType.trim()]);
            setSelectedInvestmentType(newInvestmentType.trim());
            setNewInvestmentType('');
            setShowAddInvestmentType(false);
        }
    };

    const handleUpload = async (file, accountId, isPreMapped = false) => {
        try {
            setLoading(true);

            const fileName = file.name.toLowerCase();
            const fileType = fileName.endsWith('.csv') ? 'csv' :
                fileName.endsWith('.qbo') ? 'qbo' :
                    fileName.endsWith('.qfx') ? 'qfx' : 'unknown';

            if (fileType === 'unknown') {
                alert('Unsupported file format');
                return;
            }

            // Parse the file to get raw data
            let rawData = [];
            let columnNames = [];

            console.log('Parsing file:', file.name, 'type:', fileType);

            if (fileType === 'csv') {
                const result = await new Promise((resolve, reject) => {
                    Papa.parse(file, {
                        header: true,
                        skipEmptyLines: true,
                        complete: (results) => {
                            console.log('CSV parsed:', results.data.length, 'rows');
                            resolve({
                                data: results.data,
                                columns: results.meta.fields || []
                            });
                        },
                        error: (error) => reject(error)
                    });
                });
                rawData = result.data;
                columnNames = result.columns;
            } else if (fileType === 'qbo' || fileType === 'qfx') {
                const data = await transactionService.parseQBOQFX(file);
                rawData = data;
                // QBO/QFX have standard fields
                columnNames = ['TRNTYPE', 'DTPOSTED', 'TRNAMT', 'FITID', 'NAME', 'MEMO'];
            }

            console.log('Creating staging record...', {
                account_id: accountId,
                file_name: file.name,
                file_type: fileType,
                row_count: rawData.length
            });

            // Create staging record
            const staging = await supabaseImportStagingDB.add({
                account_id: accountId,
                file_name: file.name,
                file_type: fileType,
                column_names: columnNames,
                row_count: rawData.length,
                status: 'pending_mapping'
            });

            console.log('Staging record created:', staging);

            if (!staging || !staging.id) {
                throw new Error('Failed to create staging record');
            }

            // Save raw data
            console.log('Saving raw data to import_raw_data...');
            await supabaseImportRawDataDB.add({
                staging_id: staging.id,
                raw_data: rawData
            });

            console.log('Raw data saved successfully');

            setShowUploadModal(false);
            setSelectedAccountForUpload(null);
            await loadData();

            alert(`File uploaded successfully! ${rawData.length} rows staged for mapping.`);
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
                    <button
                        onClick={() => navigate('/subscriptions')}
                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                    >
                        Manage Subscriptions
                    </button>
                    <button
                        onClick={handleNewAccount}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
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
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Last Update</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Pending Mapping</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Uncategorized Receipts</th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase w-32">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {filteredAccounts.map((account) => {
                            const count = uncategorizedCounts[account.id] || 0;
                            const pendingCount = pendingImportCounts[account.id] || 0;
                            const lastDate = lastTransactionDates[account.id];

                            return (
                                <tr key={account.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 text-sm">
                                        <button
                                            onClick={() => handleEditClick(account)}
                                            className="text-blue-600 hover:text-blue-800"
                                        >
                                            Edit
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                        <button
                                            onClick={() => {
                                                setSelectedBankAccount(account);
                                                setShowBankDetailsModal(true);
                                            }}
                                            className="text-blue-600 hover:text-blue-800 hover:underline text-left"
                                        >
                                            {account.name}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center text-gray-600">
                                        {lastDate ? new Date(lastDate).toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric'
                                        }) : '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-center">
                                        {pendingCount > 0 ? (
                                            <button
                                                onClick={() => navigate(`/import-mapper/${account.id}`)}
                                                className="text-orange-600 hover:text-orange-800 font-medium"
                                            >
                                                {pendingCount} ⚠️
                                            </button>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
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

            {showNewAccountModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
                        <h3 className="text-lg font-bold mb-4 px-6 pt-6">New Bank or Cash Account</h3>

                        <div className="space-y-4 px-6 overflow-y-auto flex-1">
                            {/* Account Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Account Name *
                                </label>
                                <input
                                    type="text"
                                    value={newAccountData.name}
                                    onChange={(e) => setNewAccountData({ ...newAccountData, name: e.target.value })}
                                    placeholder="e.g., TD Savings Account"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Account Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Account Type *
                                </label>
                                <select
                                    value={newAccountData.type}
                                    onChange={(e) => {
                                        setNewAccountData({ ...newAccountData, type: e.target.value });
                                        if (e.target.value !== 'Investment') {
                                            setSelectedInvestmentType('');
                                        }
                                    }}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select type...</option>
                                    {accountTypes.map(type => (
                                        <option key={type} value={type}>{type}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Investment Type (shown only if Investment is selected) */}
                            {newAccountData.type === 'Investment' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Investment Account Type *
                                    </label>
                                    {!showAddInvestmentType ? (
                                        <div className="space-y-2">
                                            <select
                                                value={selectedInvestmentType}
                                                onChange={(e) => setSelectedInvestmentType(e.target.value)}
                                                size="6"
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                            >
                                                <option value="">Select investment type...</option>
                                                {investmentTypes.map(type => (
                                                    <option key={type} value={type}>{type}</option>
                                                ))}
                                            </select>
                                            <button
                                                onClick={() => setShowAddInvestmentType(true)}
                                                className="text-sm text-blue-600 hover:text-blue-800"
                                            >
                                                + Add new investment type
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            <input
                                                type="text"
                                                value={newInvestmentType}
                                                onChange={(e) => setNewInvestmentType(e.target.value)}
                                                placeholder="Enter new investment type"
                                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                                onKeyPress={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleAddInvestmentType();
                                                    }
                                                }}
                                            />
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={handleAddInvestmentType}
                                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                                                >
                                                    Add
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        setShowAddInvestmentType(false);
                                                        setNewInvestmentType('');
                                                    }}
                                                    className="px-3 py-1 border text-sm rounded hover:bg-gray-100"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Country */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Country
                                </label>
                                <input
                                    type="text"
                                    value={newAccountData.country}
                                    onChange={(e) => setNewAccountData({ ...newAccountData, country: e.target.value })}
                                    placeholder="Canada"
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {/* Currency */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Currency
                                </label>
                                <select
                                    value={newAccountData.currency}
                                    onChange={(e) => setNewAccountData({ ...newAccountData, currency: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="CAD">CAD - Canadian Dollar</option>
                                    <option value="USD">USD - US Dollar</option>
                                    <option value="EUR">EUR - Euro</option>
                                    <option value="GBP">GBP - British Pound</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-2 mt-6 px-6 pb-6 border-t pt-4">
                            <button
                                onClick={() => {
                                    setShowNewAccountModal(false);
                                    setShowAddInvestmentType(false);
                                    setNewInvestmentType('');
                                }}
                                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCreateAccount}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Create Account
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditModal && editingAccount && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
                        <h3 className="text-lg font-bold mb-4">Edit Account: {editingAccount.name}</h3>
                        <p className="text-gray-600 mb-4">Account editing form will go here</p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    setShowEditModal(false);
                                    setEditingAccount(null);
                                }}
                                className="flex-1 px-4 py-2 border rounded-lg hover:bg-gray-100"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    alert('Account editing functionality to be implemented');
                                    setShowEditModal(false);
                                    setEditingAccount(null);
                                }}
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                            >
                                Save
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Bank Account Details Modal */}
            {showBankDetailsModal && selectedBankAccount && (
                <BankAccountDetailsModal
                    account={selectedBankAccount}
                    onClose={() => {
                        setShowBankDetailsModal(false);
                        setSelectedBankAccount(null);
                    }}
                />
            )}
        </div>
    );
};