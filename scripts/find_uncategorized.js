import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function findUncategorized() {
    try {
        // Find transactions with status = uncategorized
        const uncategorized = await pb.collection('transactions').getFullList({
            filter: 'status = "uncategorized"'
        });

        console.log(`\n=== Uncategorized Transactions (status="uncategorized"): ${uncategorized.length} ===`);
        uncategorized.forEach(t => {
            console.log(`  ${t.date} | $${t.amount} | ${t.description?.substring(0, 60)}`);
        });

        // Also check for transactions with suspense COA
        // First get the suspense account
        const suspenseAccounts = await pb.collection('chart_of_accounts').getFullList({
            filter: 'name ~ "Suspense" || name ~ "Uncategorized"'
        });

        console.log(`\n=== Suspense/Uncategorized COA Accounts: ${suspenseAccounts.length} ===`);
        suspenseAccounts.forEach(coa => {
            console.log(`  ID: ${coa.id} | supabase_id: ${coa.supabase_id} | Name: ${coa.name}`);
        });

        // Check transactions with suspense COA
        for (const coa of suspenseAccounts) {
            const suspenseTxns = await pb.collection('transactions').getFullList({
                filter: `chart_of_account_id = "${coa.id}" || chart_of_account_id = "${coa.supabase_id}"`
            });
            console.log(`\n=== Transactions with COA "${coa.name}": ${suspenseTxns.length} ===`);
            suspenseTxns.slice(0, 10).forEach(t => {
                console.log(`  ${t.date} | $${t.amount} | ${t.description?.substring(0, 50)} | status: ${t.status}`);
            });
            if (suspenseTxns.length > 10) {
                console.log(`  ... and ${suspenseTxns.length - 10} more`);
            }
        }

        // Check all unique status values
        const allTxns = await pb.collection('transactions').getFullList();
        const statusCounts = {};
        allTxns.forEach(t => {
            statusCounts[t.status || 'null'] = (statusCounts[t.status || 'null'] || 0) + 1;
        });
        console.log('\n=== Transaction Status Summary ===');
        Object.entries(statusCounts).forEach(([status, count]) => {
            console.log(`  ${status}: ${count}`);
        });

    } catch (error) {
        console.error('Error:', error.message);
    }
}

findUncategorized();
