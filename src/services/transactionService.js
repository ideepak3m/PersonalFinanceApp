import Papa from 'papaparse';

export const parseCSV = (file) => {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                resolve(results.data);
            },
            error: (error) => {
                reject(error);
            }
        });
    });
};

export const mapCSVToTransactions = (csvData, accountId) => {
    return csvData.map((row, index) => ({
        id: `${Date.now()}_${index}`,
        accountId: accountId,
        date: row.date || row.Date || row.DATE || new Date().toISOString(),
        description: row.description || row.Description || row.DESCRIPTION || '',
        amount: parseFloat(row.amount || row.Amount || row.AMOUNT || 0),
        category: row.category || row.Category || row.CATEGORY || 'Other',
        type: parseFloat(row.amount || row.Amount || row.AMOUNT || 0) >= 0 ? 'credit' : 'debit'
    }));
};

export const validateTransaction = (transaction) => {
    const errors = [];

    if (!transaction.accountId) {
        errors.push('Account ID is required');
    }

    if (!transaction.date) {
        errors.push('Date is required');
    }

    if (transaction.amount === undefined || transaction.amount === null) {
        errors.push('Amount is required');
    }

    if (isNaN(transaction.amount)) {
        errors.push('Amount must be a valid number');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

export const exportTransactionsToCSV = (transactions) => {
    const csv = Papa.unparse(transactions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `transactions_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

export default {
    parseCSV,
    mapCSVToTransactions,
    validateTransaction,
    exportTransactionsToCSV
};
