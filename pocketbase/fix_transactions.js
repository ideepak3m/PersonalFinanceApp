/**
 * Fix transactions collection - make amount not required
 * This allows $0 transactions to be imported
 */

import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

const ADMIN_EMAIL = 'ivdeepak@gmail.com';
const ADMIN_PASSWORD = '0702Toths001!@#';

async function fixTransactionsCollection() {
    console.log('\n🔧 Fixing transactions collection...\n');

    try {
        await pb.collection('_superusers').authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✅ Authenticated\n');
    } catch (error) {
        console.error('❌ Auth failed:', error.message);
        return;
    }

    // Get the current transactions collection
    try {
        const collection = await pb.collections.getOne('transactions');
        console.log('Current fields:', collection.fields.map(f => `${f.name}(required:${f.required})`).join(', '));

        // Update the amount field to not be required
        const updatedFields = collection.fields.map(field => {
            if (field.name === 'amount') {
                return { ...field, required: false };
            }
            return field;
        });

        await pb.collections.update('transactions', {
            fields: updatedFields
        });

        console.log('\n✅ Updated transactions collection - amount is now optional');

        // Verify
        const updated = await pb.collections.getOne('transactions');
        const amountField = updated.fields.find(f => f.name === 'amount');
        console.log(`   amount field required: ${amountField?.required}`);

    } catch (error) {
        console.error('❌ Error:', error.message, error.response?.data || '');
    }
}

fixTransactionsCollection().catch(console.error);
