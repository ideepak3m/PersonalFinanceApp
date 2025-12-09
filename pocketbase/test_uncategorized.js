import PocketBase from 'pocketbase';
const pb = new PocketBase('http://127.0.0.1:8090');

async function check() {
    // Get suspense COA
    const coa = await pb.collection('chart_of_accounts').getFullList();
    const suspense = coa.find(c => c.name.toLowerCase() === 'suspense');
    console.log('Suspense COA ID:', suspense ? suspense.id : 'NOT FOUND');

    // Test OR filter
    const filter = `status = "uncategorized" || chart_of_account_id = "${suspense.id}"`;
    console.log('Filter:', filter);

    const txns = await pb.collection('transactions').getFullList({ filter });
    console.log('Total matching:', txns.length);

    // Group by account_id
    const byAccount = {};
    txns.forEach(t => {
        byAccount[t.account_id] = (byAccount[t.account_id] || 0) + 1;
    });
    console.log('By account_id:', byAccount);

    // Get accounts for reference
    const accounts = await pb.collection('accounts').getFullList();
    console.log('\nAccount ID mapping:');
    accounts.forEach(a => console.log(`  ${a.id} = ${a.name}`));
}

check().catch(console.error);
