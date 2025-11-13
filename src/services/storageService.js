class StorageService {
    async get(key) {
        try {
            const result = await window.storage.get(key);
            return result ? JSON.parse(result.value) : null;
        } catch (error) {
            console.log(`No data found for ${key}`);
            return null;
        }
    }

    async set(key, data) {
        try {
            await window.storage.set(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    async delete(key) {
        try {
            await window.storage.delete(key);
            return true;
        } catch (error) {
            console.error('Error deleting data:', error);
            return false;
        }
    }
}

export default new StorageService();