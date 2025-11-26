import React, { useEffect, useState, useRef } from 'react';
import { Upload } from 'lucide-react';

export const TransactionUpload = ({ accounts, onUpload, account }) => {
    const [selectedAccount, setSelectedAccount] = useState('');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    // Automatically set the account passed from the parent
    useEffect(() => {
        if (account?.id) {
            setSelectedAccount(account.id);
        }
    }, [account]);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        const validTypes = [
            "text/csv",
            "application/vnd.intu.qbo",
            "application/x-qfx",
            "application/xml",
            "text/xml",
        ];
        const validExtensions = [".csv", ".qbo", ".qfx"];
        const fileName = selectedFile.name.toLowerCase();
        const hasValidExtension = validExtensions.some(ext => fileName.endsWith(ext));

        if (validTypes.includes(selectedFile.type) || hasValidExtension) {
            setFile(selectedFile);
        } else {
            alert("Please select a valid CSV, QBO, or QFX file");
        }
    };

    const handleUpload = async () => {
        if (!file || !selectedAccount) {
            alert("Please select an account and a file");
            return;
        }

        setUploading(true);
        try {
            await onUpload(file, selectedAccount);

            // Reset state
            setFile(null);
            setSelectedAccount("");

            // Clear file input using ref
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        } catch (error) {
            console.error("Upload error:", error);
            alert("Failed to upload file. Please check the file format.");
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
                {/* ACCOUNT SELECT */}
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

                        {accounts?.map(acc => (
                            <option key={acc.id} value={acc.id}>
                                {acc.name} ({acc.country})
                            </option>
                        ))}
                    </select>
                </div>

                {/* FILE SELECT */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Upload CSV or QuickBooks File *
                    </label>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.qbo,.qfx"
                        onChange={handleFileChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    {file && (
                        <p className="mt-2 text-sm text-gray-600">
                            Selected: {file.name}
                        </p>
                    )}
                </div>

                {/* HELP TEXT */}
                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Supported Formats:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>
                            • <b>CSV</b>: Upload the file, then map columns on the next screen.
                        </li>
                        <li>
                            • <b>QBO/QFX</b>: Standard format - imports directly.
                        </li>
                    </ul>
                </div>

                {/* UPLOAD BUTTON */}
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
                            Upload File
                        </>
                    )}
                </button>
            </div>
        </div>
    );
};