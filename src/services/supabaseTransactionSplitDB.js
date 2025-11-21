import { supabase } from './supabaseClient';

export const supabaseTransactionSplitDB = {
    add: async (split) => {
        const { data, error } = await supabase
            .from('transaction_split')
            .insert([split])
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    bulkAdd: async (splits) => {
        const { error } = await supabase
            .from('transaction_split')
            .insert(splits);
        if (error) throw error;
    },
    getByTransactionId: async (transactionId) => {
        const { data, error } = await supabase
            .from('transaction_split')
            .select('*')
            .eq('transaction_id', transactionId);
        if (error) throw error;
        return data;
    }
};
