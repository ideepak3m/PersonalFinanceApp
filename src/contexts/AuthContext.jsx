// AuthContext.jsx - Database-agnostic authentication context
// Supports both PocketBase (local) and Supabase (cloud) authentication

import { createContext, useContext, useEffect, useState } from 'react';
import { DB_MODE_CURRENT, profilesDB } from '../services/database';

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

// ============ PocketBase Auth Provider ============
const PocketBaseAuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [pb, setPb] = useState(null);

    useEffect(() => {
        // Dynamic import of PocketBase client
        const initPocketBase = async () => {
            const { pb: pocketbase } = await import('../services/pocketbaseClient');
            setPb(pocketbase);

            // Check if already authenticated
            if (pocketbase.authStore.isValid) {
                setUser(pocketbase.authStore.model);
            }
            setLoading(false);

            // Listen for auth changes
            pocketbase.authStore.onChange((token, model) => {
                setUser(model);
            });
        };

        initPocketBase();
    }, []);

    // For PocketBase, the user record IS the profile (users collection contains name, email, avatar)
    // No need to fetch from a separate profiles collection
    useEffect(() => {
        if (user) {
            // Use user record directly as profile in PocketBase
            setProfile({
                id: user.id,
                name: user.name || '',
                email: user.email,
                avatar: user.avatar || null,
                created: user.created,
                updated: user.updated
            });
        } else {
            setProfile(null);
        }
    }, [user]);

    const signUp = async (email, password, metadata = {}) => {
        try {
            setError(null);
            const data = await pb.collection('users').create({
                email,
                password,
                passwordConfirm: password,
                ...metadata
            });
            // Auto sign in after signup
            await pb.collection('users').authWithPassword(email, password);
            return { data, error: null };
        } catch (error) {
            setError(error.message);
            return { data: null, error };
        }
    };

    const signIn = async (email, password) => {
        try {
            setError(null);
            const data = await pb.collection('users').authWithPassword(email, password);
            return { data, error: null };
        } catch (error) {
            setError(error.message);
            return { data: null, error };
        }
    };

    const signOut = async () => {
        try {
            setError(null);
            pb.authStore.clear();
            setUser(null);
            return { error: null };
        } catch (error) {
            setError(error.message);
            return { error };
        }
    };

    const resetPassword = async (email) => {
        try {
            setError(null);
            await pb.collection('users').requestPasswordReset(email);
            return { data: true, error: null };
        } catch (error) {
            setError(error.message);
            return { data: null, error };
        }
    };

    const updatePassword = async (newPassword) => {
        try {
            setError(null);
            // PocketBase requires token from email for password reset
            // This is a simplified version - in production you'd handle the token
            return { data: null, error: { message: 'Use password reset email link' } };
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
        updatePassword,
        dbMode: 'pocketbase'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// ============ Supabase Auth Provider ============
const SupabaseAuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [supabase, setSupabase] = useState(null);

    useEffect(() => {
        // Dynamic import of Supabase client
        const initSupabase = async () => {
            const { supabase: supabaseClient } = await import('../services/supabaseClient');
            setSupabase(supabaseClient);

            // Check active session
            supabaseClient.auth.getSession().then(({ data: { session } }) => {
                setUser(session?.user ?? null);
                setLoading(false);
            });

            // Listen for auth changes
            const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
                setUser(session?.user ?? null);
                setLoading(false);
            });

            return () => subscription.unsubscribe();
        };

        initSupabase();
    }, []);

    // Fetch user profile from profiles table
    useEffect(() => {
        const fetchProfile = async () => {
            if (user?.id && supabase) {
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
    }, [user, supabase]);

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
        updatePassword,
        dbMode: 'supabase'
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// ============ No Auth Provider (for offline/personal use) ============
const NoAuthProvider = ({ children }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Load default user profile for offline mode
        const loadDefaultProfile = async () => {
            try {
                // Try to get first profile or create a default one
                const profiles = await profilesDB?.getAll?.();
                if (profiles && profiles.length > 0) {
                    setProfile(profiles[0]);
                } else {
                    // Default offline user
                    setProfile({
                        id: 'offline-user',
                        email: 'user@local',
                        name: 'Local User'
                    });
                }
            } catch (err) {
                console.log('Using default offline profile');
                setProfile({
                    id: 'offline-user',
                    email: 'user@local',
                    name: 'Local User'
                });
            }
            setLoading(false);
        };
        loadDefaultProfile();
    }, []);

    // Default offline user - always "logged in"
    const defaultUser = {
        id: 'offline-user',
        email: 'user@local'
    };

    const value = {
        user: defaultUser,
        profile,
        loading,
        error: null,
        // These are no-ops for offline mode
        signUp: async () => ({ data: defaultUser, error: null }),
        signIn: async () => ({ data: defaultUser, error: null }),
        signOut: async () => ({ error: null }),
        resetPassword: async () => ({ data: true, error: null }),
        updatePassword: async () => ({ data: true, error: null }),
        dbMode: 'offline',
        isOffline: true
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// ============ Main Auth Provider (auto-selects based on DB_MODE) ============
export const AuthProvider = ({ children, forceMode = null }) => {
    const mode = forceMode || DB_MODE_CURRENT;

    // For personal/offline use, you can set VITE_AUTH_MODE=none in .env.local
    const authMode = import.meta.env.VITE_AUTH_MODE || 'auto';

    console.log(`[Auth] Mode: ${mode}, Auth: ${authMode}`);

    // If auth is explicitly disabled, use NoAuthProvider
    if (authMode === 'none' || authMode === 'offline') {
        return <NoAuthProvider>{children}</NoAuthProvider>;
    }

    // Auto-select based on database mode
    if (mode === 'supabase') {
        return <SupabaseAuthProvider>{children}</SupabaseAuthProvider>;
    } else {
        // For PocketBase, check if we want auth or offline mode
        // Default to NoAuth for local personal use (simpler)
        if (authMode === 'required') {
            return <PocketBaseAuthProvider>{children}</PocketBaseAuthProvider>;
        }
        return <NoAuthProvider>{children}</NoAuthProvider>;
    }
};
