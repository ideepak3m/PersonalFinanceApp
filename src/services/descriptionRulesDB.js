import { supabase } from './supabaseClient';

const getUserId = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id;
};

export const descriptionRulesDB = {
    getAll: async () => {
        const { data, error } = await supabase
            .from('description_rules')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    },
    add: async (description_pattern, chart_of_account) => {
        const userId = await getUserId();
        const { data, error } = await supabase
            .from('description_rules')
            .insert([{ user_id: userId, description_pattern, chart_of_account }])
            .select()
            .single();
        if (error) throw error;
        return data;
    },
    delete: async (id) => {
        const { error } = await supabase
            .from('description_rules')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },
    findMatch: async (description) => {
        // Fetch all rules and find the first pattern that matches (case-insensitive substring)
        const rules = await descriptionRulesDB.getAll();
        return rules.find(rule =>
            description.toLowerCase().includes(rule.description_pattern.toLowerCase())
        );
    }
};
