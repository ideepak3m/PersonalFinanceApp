// PocketBase Client for Personal Finance App
import PocketBase from 'pocketbase';

const pocketbaseUrl = import.meta.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

export const pb = new PocketBase(pocketbaseUrl);

// Auto-refresh auth
pb.autoCancellation(false);

// Helper to check if authenticated
export const isAuthenticated = () => pb.authStore.isValid;

// Get current user
export const getCurrentUser = () => pb.authStore.model;

// Login
export const login = async (email, password) => {
    return await pb.collection('users').authWithPassword(email, password);
};

// Logout
export const logout = () => {
    pb.authStore.clear();
};

// Register
export const register = async (email, password, passwordConfirm) => {
    return await pb.collection('users').create({
        email,
        password,
        passwordConfirm,
    });
};
