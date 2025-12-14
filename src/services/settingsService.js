// Settings Service - Uses localStorage for app configuration
// This provides getConfiguration and setConfiguration methods

const STORAGE_KEY = 'app_configuration';

const DEFAULT_CONFIG = {
    appName: 'Personal Finance',
    currency: 'USD',
    dateFormat: 'MM/DD/YYYY',
    fiscalYearStart: 'january',
    baseCountry: '', // Will be set to first available country
    enableNotifications: true,
    enableAI: true,
    theme: 'light'
};

/**
 * Get app configuration from localStorage
 */
export const getConfiguration = () => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
        }
        return DEFAULT_CONFIG;
    } catch (error) {
        console.error('Error reading configuration:', error);
        return DEFAULT_CONFIG;
    }
};

/**
 * Save app configuration to localStorage
 */
export const setConfiguration = (config) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        return true;
    } catch (error) {
        console.error('Error saving configuration:', error);
        return false;
    }
};

/**
 * Get a specific configuration value
 */
export const getConfigValue = (key) => {
    const config = getConfiguration();
    return config[key];
};

/**
 * Set a specific configuration value
 */
export const setConfigValue = (key, value) => {
    const config = getConfiguration();
    config[key] = value;
    return setConfiguration(config);
};

/**
 * Get the base country setting
 */
export const getBaseCountry = () => {
    return getConfigValue('baseCountry') || '';
};

/**
 * Set the base country setting
 */
export const setBaseCountry = (country) => {
    return setConfigValue('baseCountry', country);
};

export default {
    getConfiguration,
    setConfiguration,
    getConfigValue,
    setConfigValue,
    getBaseCountry,
    setBaseCountry
};
