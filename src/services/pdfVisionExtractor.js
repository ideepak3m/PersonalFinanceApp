// Claude Vision PDF Extraction Service
// Converts PDF to images and uses Claude Vision API to extract structured data

let pdfLibLoaded = false;
let pdfLibLoading = false;

/**
 * Ensure PDF.js library is loaded
 */
export const ensurePdfJsLoaded = () => {
    return new Promise((resolve, reject) => {
        if (pdfLibLoaded) {
            resolve(true);
            return;
        }

        if (pdfLibLoading) {
            // Wait for existing load to complete
            const checkInterval = setInterval(() => {
                if (pdfLibLoaded) {
                    clearInterval(checkInterval);
                    resolve(true);
                }
            }, 100);
            return;
        }

        pdfLibLoading = true;
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
        script.async = true;
        script.onload = () => {
            if (window.pdfjsLib) {
                window.pdfjsLib.GlobalWorkerOptions.workerSrc =
                    'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
                pdfLibLoaded = true;
                pdfLibLoading = false;
                resolve(true);
            } else {
                reject(new Error('PDF.js failed to load'));
            }
        };
        script.onerror = () => {
            pdfLibLoading = false;
            reject(new Error('Failed to load PDF.js script'));
        };
        document.head.appendChild(script);
    });
};

/**
 * Convert PDF file to array of base64 images
 */
export const convertPDFToImages = async (pdfFile) => {
    if (!window.pdfjsLib) {
        throw new Error('PDF library not loaded');
    }

    const arrayBuffer = await pdfFile.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

    const imagePromises = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const pagePromise = (async () => {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2.0 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
                canvasContext: context,
                viewport: viewport
            }).promise;

            const imageData = canvas.toDataURL('image/png').split(',')[1];

            return {
                pageNum: pageNum,
                data: imageData,
                preview: canvas.toDataURL('image/png')
            };
        })();

        imagePromises.push(pagePromise);
    }

    return await Promise.all(imagePromises);
};

/**
 * Extract structured data from a single page image using Claude Vision via OpenRouter
 */
export const extractWithClaudeVision = async (imageData, pageNum, apiKey) => {
    const promptText = `You are a financial document parser. Extract ALL data from this financial statement page. Return ONLY valid JSON with this structure: {"metadata":{"institution":"","accountNumber":"","accountType":"","statementPeriod":"","pageNumber":${pageNum}},"holdings":[{"security":"","units":0,"price":0,"value":0,"bookCost":0}],"transactions":[{"date":"YYYY-MM-DD","description":"","type":"","shares":0,"price":0,"amount":0}],"summary":{"totalValue":0,"cashBalance":0},"fees":[{"date":"YYYY-MM-DD","description":"","amount":0}]}. Extract EVERY transaction. Be precise with numbers. No markdown, just JSON.`;

    // Use OpenRouter API which supports CORS
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': window.location.origin,
            'X-Title': 'Personal Finance PDF Extractor'
        },
        body: JSON.stringify({
            model: 'anthropic/claude-3.5-sonnet',
            messages: [{
                role: 'user',
                content: [
                    {
                        type: 'image_url',
                        image_url: {
                            url: `data:image/png;base64,${imageData}`
                        }
                    },
                    {
                        type: 'text',
                        text: promptText
                    }
                ]
            }]
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `API request failed: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.choices?.[0]?.message?.content || '';

    // Extract JSON from the response - handle various formats
    let jsonText = textContent.trim();

    // Remove markdown code blocks
    if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```.*$/s, '');
    } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n/, '').replace(/\n```.*$/s, '');
    }

    // Try to find JSON object if there's extra text
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        jsonText = jsonMatch[0];
    }

    console.log('Parsing JSON response (first 200 chars):', jsonText.substring(0, 200));

    try {
        return JSON.parse(jsonText);
    } catch (error) {
        console.error('Failed to parse JSON:', jsonText);
        throw new Error(`JSON parse error: ${error.message}. Response: ${jsonText.substring(0, 500)}`);
    }
};

/**
 * Consolidate data from multiple pages into a single structured result
 */
export const consolidatePages = (pageDataArray) => {
    const result = {
        metadata: pageDataArray[0]?.metadata || {},
        holdings: [],
        transactions: [],
        fees: [],
        summary: {}
    };

    for (const pageData of pageDataArray) {
        if (pageData.holdings) result.holdings.push(...pageData.holdings);
        if (pageData.transactions) result.transactions.push(...pageData.transactions);
        if (pageData.fees) result.fees.push(...pageData.fees);
        if (pageData.summary && Object.keys(pageData.summary).length > 0) {
            result.summary = pageData.summary;
        }
    }

    result.transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    return result;
};

/**
 * Main function to extract tables from PDF using Claude Vision
 * @param {File} pdfFile - The PDF file to extract
 * @param {string} apiKey - Claude API key
 * @param {function} onProgress - Optional callback for progress updates
 * @returns {Promise<Object>} Extracted and consolidated data
 */
export const extractTablesWithVision = async (pdfFile, apiKey, onProgress = null) => {
    try {
        // Ensure PDF.js is loaded
        await ensurePdfJsLoaded();
        onProgress?.({ step: 'pdf-loaded', message: 'PDF library loaded' });

        // Convert PDF to images
        onProgress?.({ step: 'converting', message: 'Converting PDF to images...' });
        const pdfImages = await convertPDFToImages(pdfFile);
        onProgress?.({ step: 'converted', message: `Converted ${pdfImages.length} pages`, images: pdfImages });

        // Extract data from each page
        const allPageData = [];
        for (let i = 0; i < pdfImages.length; i++) {
            const image = pdfImages[i];
            onProgress?.({
                step: 'extracting',
                message: `Analyzing page ${i + 1} of ${pdfImages.length}...`,
                currentPage: i + 1,
                totalPages: pdfImages.length
            });

            const pageData = await extractWithClaudeVision(image.data, image.pageNum, apiKey);
            allPageData.push(pageData);
        }

        // Consolidate all pages
        onProgress?.({ step: 'consolidating', message: 'Consolidating data...' });
        const consolidated = consolidatePages(allPageData);

        onProgress?.({ step: 'complete', message: 'Extraction complete', data: consolidated });

        return {
            success: true,
            data: consolidated,
            images: pdfImages,
            pageCount: pdfImages.length
        };
    } catch (error) {
        console.error('Vision extraction error:', error);
        return {
            success: false,
            error: error.message
        };
    }
};

/**
 * Get or set Claude API key from environment or localStorage
 */
export const getClaudeApiKey = () => {
    // First try to get from environment variable (try Claude key, then OpenRouter as fallback)
    const claudeKey = import.meta.env.VITE_CLAUDE_API_KEY;
    const openRouterKey = import.meta.env.VITE_OPENROUTER_API_KEY;

    console.log('🔑 Checking API keys:', {
        claudeKey: claudeKey ? `${claudeKey.substring(0, 10)}...` : 'not found',
        openRouterKey: openRouterKey ? `${openRouterKey.substring(0, 10)}...` : 'not found',
        isClaudePlaceholder: claudeKey === 'your-claude-api-key-here'
    });

    // Prefer Claude key if it's real
    if (claudeKey && claudeKey !== 'your-claude-api-key-here') {
        console.log('✅ Using Claude API key from environment');
        return claudeKey;
    }

    // Fall back to OpenRouter key
    if (openRouterKey) {
        console.log('✅ Using OpenRouter API key from environment');
        return openRouterKey;
    }

    // Final fallback to localStorage
    const storedKey = localStorage.getItem('claude_api_key') || '';
    if (storedKey) {
        console.log('✅ Using API key from localStorage');
    } else {
        console.log('⚠️ No API key found in environment or localStorage');
    }
    return storedKey;
};

export const setClaudeApiKey = (apiKey) => {
    localStorage.setItem('claude_api_key', apiKey);
};