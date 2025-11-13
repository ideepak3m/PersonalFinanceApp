import React, { useState } from 'react';
import { Upload } from 'lucide-react';

export const TransactionUpload = ({ accounts, onUpload }) => {
    const [selectedAccount, setSelectedAccount] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.type === 'text/csv') {
            setFile(selectedFile);
        } else {
            alert('Please select a valid CSV file');
        }
    };

    const handleUpload = async () => {
        if (!file || !selectedAccount) {
            alert('Please select an account and a CSV file');
            return;
        }

        setUploading(true);
        try {
            await onUpload(file, selectedAccount);
            setFile(null);
            setSelectedAccount('');
            // Reset file input
            document.getElementById('file-upload').value = '';
        } catch (error) {
            console.error('Upload error:', error);
            alert('Failed to upload transactions. Please check the file format.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
                <Upload size={24} />
                Upload Transactions
            </h2>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Select Account *
                    </label>
                    <select
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Choose an account...</option>
                        {accounts?.map(account => (
                            <option key={account.id} value={account.id}>
                                {account.name} ({account.country})
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload CSV File *
                    </label>
                    <input
                        id="file-upload"
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {file && (
                        <p className="mt-2 text-sm text-gray-600">
                            Selected: {file.name}
                        </p>
                    )}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="font-medium text-blue-900 mb-2">CSV Format Requirements:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Required columns: <code className="bg-blue-100 px-1 rounded">date</code>, <code className="bg-blue-100 px-1 rounded">description</code>, <code className="bg-blue-100 px-1 rounded">amount</code></li>
                        <li>• Optional columns: <code className="bg-blue-100 px-1 rounded">category</code></li>
                        <li>• Date format: YYYY-MM-DD or MM/DD/YYYY</li>
                        <li>• Amount: positive for income, negative for expenses</li>
                    </ul>
                </div>

                <button
                    onClick={handleUpload}
                    disabled={!file || !selectedAccount || uploading}
                    className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {uploading ? (
                        <>
                            <span className="animate-spin">⏳</span>
                            Uploading...
                        </>
                    ) : (
                        <>
                            <Upload size={20} />
                            Upload Transactions
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};
