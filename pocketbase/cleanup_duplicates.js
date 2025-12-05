/**
 * Clean up duplicate records in transactions and transaction_split
 * Keeps only one copy of each unique record based on key fields
 */

import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

const ADMIN_EMAIL = 'ivdeepak@gmail.com';
const ADMIN_PASSWORD = '0702Toths001!@#';

async function cleanDuplicates() {
    console.log('\n🧹 Cleaning Duplicate Records\n');
    console.log('='.repeat(60));

    try {
        await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated\n');
    } catch (error) {
        console.error('❌ Auth failed:', error.message);
        return;
    }

    // Clean transactions
    await cleanCollection('transactions', (record) => {
        // Unique key: date + raw_merchant_name + amount + account_id
        return `${record.date}|${record.raw_merchant_name}|${record.amount}|${record.account_id}|${record.type}`;
    });

    // Clean transaction_split
    await cleanCollection('transaction_split', (record) => {
        // Unique key: transaction_id + amount + chart_of_account_id
        return `${record.transaction_id}|${record.amount}|${record.chart_of_account_id}|${record.description}`;
    });

    console.log('\n✅ Cleanup complete!');
}

async function cleanCollection(collectionName, getKey) {
    console.log(`\n📋 Cleaning ${collectionName}...`);

    const allRecords = await pb.collection(collectionName).getFullList();
    console.log(`   Total records: ${allRecords.length}`);

    // Group by unique key
    const seen = new Map();
    const duplicates = [];

    for (const record of allRecords) {
        const key = getKey(record);

        if (seen.has(key)) {
            // This is a duplicate - mark for deletion
            duplicates.push(record.id);
        } else {
            // First occurrence - keep it
            seen.set(key, record.id);
        }
    }

    console.log(`   Unique records: ${seen.size}`);
    console.log(`   Duplicates to remove: ${duplicates.length}`);

    // Delete duplicates
    let deleted = 0;
    for (const id of duplicates) {
        try {
            await pb.collection(collectionName).delete(id);
            deleted++;
            if (deleted % 100 === 0) {
                process.stdout.write(`\r   Deleted: ${deleted}/${duplicates.length}`);
            }
        } catch (error) {
            console.error(`\n   ❌ Failed to delete ${id}: ${error.message}`);
        }
    }

    console.log(`\n   ✅ Deleted ${deleted} duplicates. Remaining: ${seen.size}`);
}

cleanDuplicates().catch(console.error);
