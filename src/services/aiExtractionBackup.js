import { supabase } from './supabaseClient';

/**
 * Backup AI extractions from localStorage to Supabase
 */

// Save AI extraction log to Supabase
export const backupAIExtraction = async (extractionData) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const logData = {
            user_id: user.id,
            filename: extractionData.filename || 'unknown.pdf',
            file_size: extractionData.fileSize || null,
            extraction_timestamp: new Date(extractionData.timestamp).toISOString(),
            model_used: extractionData.model || 'unknown',
            prompt_tokens: extractionData.tokensUsed?.prompt || 0,
            completion_tokens: extractionData.tokensUsed?.completion || 0,
            total_tokens: extractionData.tokensUsed?.total || 0,
            extraction_data: extractionData // Store full extraction as JSONB
        };

        const { data, error } = await supabase
            .from('ai_extraction_logs')
            .insert(logData)
            .select()
            .single();

        if (error) throw error;

        console.log('✅ AI extraction backed up to Supabase:', data.id);
        return { success: true, log: data };
    } catch (error) {
        console.error('❌ Error backing up AI extraction:', error);
        return { success: false, error: error.message };
    }
};

// Backup all localStorage extractions to Supabase
export const backupAllLocalStorageExtractions = async () => {
    try {
        const cached = JSON.parse(localStorage.getItem('ai_pdf_extractions') || '[]');

        if (cached.length === 0) {
            return { success: true, message: 'No extractions to backup', count: 0 };
        }

        const results = {
            success: [],
            failed: []
        };

        for (const extraction of cached) {
            const result = await backupAIExtraction(extraction);
            if (result.success) {
                results.success.push(extraction.filename || 'unknown');
            } else {
                results.failed.push({ filename: extraction.filename, error: result.error });
            }
        }

        console.log(`✅ Backed up ${results.success.length}/${cached.length} extractions`);

        return {
            success: true,
            message: `Backed up ${results.success.length}/${cached.length} extractions`,
            count: results.success.length,
            details: results
        };
    } catch (error) {
        console.error('❌ Error backing up localStorage extractions:', error);
        return { success: false, error: error.message };
    }
};

// Get all backed up extractions from Supabase
export const getBackedUpExtractions = async (limit = 50) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { data, error } = await supabase
            .from('ai_extraction_logs')
            .select('*')
            .eq('user_id', user.id)
            .order('extraction_timestamp', { ascending: false })
            .limit(limit);

        if (error) throw error;

        console.log(`✅ Retrieved ${data.length} backed up extractions`);
        return { success: true, extractions: data };
    } catch (error) {
        console.error('❌ Error retrieving backed up extractions:', error);
        return { success: false, error: error.message };
    }
};

// Restore an extraction from Supabase to localStorage
export const restoreExtractionToLocalStorage = async (logId) => {
    try {
        const { data, error } = await supabase
            .from('ai_extraction_logs')
            .select('extraction_data')
            .eq('id', logId)
            .single();

        if (error) throw error;

        // Add to localStorage cache
        const storageKey = 'ai_pdf_extractions';
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updated = [data.extraction_data, ...existing].slice(0, 10);
        localStorage.setItem(storageKey, JSON.stringify(updated));

        console.log('✅ Extraction restored to localStorage');
        return { success: true, extraction: data.extraction_data };
    } catch (error) {
        console.error('❌ Error restoring extraction:', error);
        return { success: false, error: error.message };
    }
};

// Export localStorage data as JSON for manual backup
export const exportLocalStorageAsJSON = () => {
    try {
        const cached = JSON.parse(localStorage.getItem('ai_pdf_extractions') || '[]');

        if (cached.length === 0) {
            alert('No AI extractions found in localStorage');
            return null;
        }

        // Create downloadable JSON file
        const dataStr = JSON.stringify(cached, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `ai-extractions-backup-${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        URL.revokeObjectURL(url);

        console.log(`✅ Exported ${cached.length} extractions to JSON file`);
        return { success: true, count: cached.length };
    } catch (error) {
        console.error('❌ Error exporting localStorage:', error);
        return { success: false, error: error.message };
    }
};

// Import JSON file back to localStorage
export const importJSONToLocalStorage = (jsonFile) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const imported = JSON.parse(e.target.result);

                if (!Array.isArray(imported)) {
                    throw new Error('Invalid format: Expected array of extractions');
                }

                const storageKey = 'ai_pdf_extractions';
                const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');

                // Merge imported with existing (keep unique by timestamp)
                const merged = [...imported, ...existing];
                const unique = Array.from(
                    new Map(merged.map(item => [item.timestamp, item])).values()
                ).slice(0, 10);

                localStorage.setItem(storageKey, JSON.stringify(unique));

                console.log(`✅ Imported ${imported.length} extractions from JSON`);
                resolve({ success: true, count: imported.length });
            } catch (error) {
                console.error('❌ Error importing JSON:', error);
                reject({ success: false, error: error.message });
            }
        };

        reader.onerror = () => {
            reject({ success: false, error: 'Failed to read file' });
        };

        reader.readAsText(jsonFile);
    });
};

// Delete old backups (older than X days)
export const cleanOldBackups = async (daysToKeep = 30) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        const { data, error } = await supabase
            .from('ai_extraction_logs')
            .delete()
            .eq('user_id', user.id)
            .lt('extraction_timestamp', cutoffDate.toISOString())
            .select();

        if (error) throw error;

        console.log(`✅ Deleted ${data.length} old backups (older than ${daysToKeep} days)`);
        return { success: true, deleted: data.length };
    } catch (error) {
        console.error('❌ Error cleaning old backups:', error);
        return { success: false, error: error.message };
    }
};

export default {
    backupAIExtraction,
    backupAllLocalStorageExtractions,
    getBackedUpExtractions,
    restoreExtractionToLocalStorage,
    exportLocalStorageAsJSON,
    importJSONToLocalStorage,
    cleanOldBackups
};
