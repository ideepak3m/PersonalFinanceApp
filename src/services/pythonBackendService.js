/**
 * Python Backend Service
 * Calls local Python service (Camelot/Tabula) for reliable PDF table extraction
 */

const PYTHON_SERVICE_URL = 'http://localhost:5001';

export const extractTablesWithPython = async (file, method = 'auto') => {
    try {
        console.log(`📤 Sending PDF to Python service (method: ${method})...`);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('method', method);

        const response = await fetch(`${PYTHON_SERVICE_URL}/extract-with-classification`, {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Extraction failed');
        }

        console.log(`✅ Python service extracted ${result.total_tables} tables`);
        console.log('Extraction info:', result.extraction_info);

        return {
            success: true,
            tables: result.tables,
            extractionInfo: result.extraction_info,
            totalTables: result.total_tables
        };

    } catch (error) {
        console.error('❌ Python service error:', error);

        // Check if service is running
        if (error.message.includes('Failed to fetch')) {
            return {
                success: false,
                error: 'Python service not running. Start it with: cd python-backend && python pdf_service.py',
                hint: 'Make sure Python backend is running on http://localhost:5001'
            };
        }

        return {
            success: false,
            error: error.message
        };
    }
};

export const checkPythonServiceHealth = async () => {
    try {
        const response = await fetch(`${PYTHON_SERVICE_URL}/health`);
        const data = await response.json();
        return {
            available: true,
            ...data
        };
    } catch (error) {
        return {
            available: false,
            error: 'Python service not reachable'
        };
    }
};

export default { extractTablesWithPython, checkPythonServiceHealth };
