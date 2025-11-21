import { supabase } from './supabaseClient';

export const supabaseCategoryDB = {
    getById: async (id) => {
        const { data, error } = await supabase
            .from('category')
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;
        return data;
    },
    getByName: async (name) => {
        const { data, error } = await supabase
            .from('category')
            .select('*')
            .ilike('name', name)
            .single();
        if (error) throw error;
        return data;
    },
    getAll: async () => {
        const { data, error } = await supabase
            .from('category')
            .select('*');
        if (error) throw error;
        return data;
    }
};
