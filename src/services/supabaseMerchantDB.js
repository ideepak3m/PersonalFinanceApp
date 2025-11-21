import { supabase } from './supabaseClient';

export const supabaseMerchantDB = {
    getByRawNameOrAlias: async (rawName) => {
        // Try normalized_name first
        let { data, error } = await supabase
            .from('merchant')
            .select('*')
            .ilike('normalized_name', rawName);
        if (error) throw error;
        if (data && data.length > 0) return data[0];
        // Try aliases
        ({ data, error } = await supabase
            .from('merchant')
            .select('*')
            .contains('aliases', [rawName]));
        if (error) throw error;
        return data && data.length > 0 ? data[0] : null;
    },
    getById: async (id) => {
        const { data, error } = await supabase
            .from('merchant')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },
    add: async (merchant) => {
        const { data, error } = await supabase
            .from('merchant')
            .insert([merchant])
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    getAll: async () => {
        const { data, error } = await supabase
            .from('merchant')
            .select('*');
        if (error) throw error;
        return data;
    }
};
