import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Check active session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    // Fetch user profile from profiles table
    useEffect(() => {
        const fetchProfile = async () => {
            if (user?.id) {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();
                setProfile(data || null);
            } else {
                setProfile(null);
            }
        };
        fetchProfile();
    }, [user]);

    const signUp = async (email, password, metadata = {}) => {
        try {
            setError(null);
            const { data, error } = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: metadata
                }
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            setError(error.message);
            return { data: null, error };
        }
    };

    const signIn = async (email, password) => {
        try {
            setError(null);
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            setError(error.message);
            return { data: null, error };
        }
    };

    const signOut = async () => {
        try {
            setError(null);
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
            return { error: null };
        } catch (error) {
            setError(error.message);
            return { error };
        }
    };

    const resetPassword = async (email) => {
        try {
            setError(null);
            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            setError(error.message);
            return { data: null, error };
        }
    };

    const updatePassword = async (newPassword) => {
        try {
            setError(null);
            const { data, error } = await supabase.auth.updateUser({
                password: newPassword
            });
            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            setError(error.message);
            return { data: null, error };
        }
    };

    const value = {
        user,
        profile,
        loading,
        error,
        signUp,
        signIn,
        signOut,
        resetPassword,
        updatePassword
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};
