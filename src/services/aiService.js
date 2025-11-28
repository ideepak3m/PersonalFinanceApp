const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
import { backupAIExtraction } from './aiExtractionBackup';

// AI Model Router Configuration
export const AI_MODELS = {
    pdfExtraction: 'anthropic/claude-sonnet-4.5',  // Latest Claude 4 - best instruction following
    pdfExtractionFallback: 'anthropic/claude-3.5-sonnet', // Fallback if 4 not available
    simpleQueries: 'google/gemini-flash-1.5',       // Fast and cheap
    complexQueries: 'anthropic/claude-3.5-sonnet',  // Smart analysis
    financialAdvisor: 'openai/gpt-4o-mini'          // Good for conversations
};

export const getAIResponse = async (message, context = {}) => {
    if (!API_KEY) {
        return {
            success: false,
            message: 'Please set VITE_OPENAI_API_KEY in your .env file to use AI features.'
        };
    }

    try {
        const systemPrompt = `You are a personal finance advisor. Help users with financial questions, 
        budgeting advice, investment strategies, and understanding their financial data. 
        Be concise, practical, and supportive.`;

        const contextInfo = context.accounts || context.transactions ?
            `\n\nUser's Financial Context:\n${JSON.stringify({
                totalAccounts: context.accounts?.length || 0,
                totalTransactions: context.transactions?.length || 0,
                countries: context.countries || []
            }, null, 2)}` : '';

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini', // Good balance of cost and quality
                messages: [
                    { role: 'system', content: systemPrompt + contextInfo },
                    { role: 'user', content: message }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        return {
            success: true,
            message: data.choices[0]?.message?.content || 'No response received'
        };
    } catch (error) {
        console.error('AI Service error:', error);
        return {
            success: false,
            message: 'Unable to get AI response. Please check your API key and try again.'
        };
    }
};

export const analyzeFinancialData = async (accounts, transactions) => {
    const summary = {
        totalBalance: accounts.reduce((sum, acc) => sum + acc.balance, 0),
        transactionCount: transactions.length,
        accountCount: accounts.length
    };

    const prompt = `Analyze this financial data and provide 3 key insights:\n${JSON.stringify(summary, null, 2)}`;

    return await getAIResponse(prompt);
};

export const extractPDFTables = async (promptText, imageData = null) => {
    if (!OPENROUTER_KEY) {
        return {
            success: false,
            message: 'Please set VITE_OPENROUTER_API_KEY in your .env file to use Claude for PDF extraction.'
        };
    }

    try {
        const useVision = imageData && imageData.length > 0;
        console.log(`Using Claude Sonnet 3.5 ${useVision ? 'Vision' : 'Text'} for PDF extraction via OpenRouter...`);

        // Build message content
        const messageContent = [
            {
                type: 'text',
                text: promptText
            }
        ];

        // Add images only if provided (Vision mode)
        if (useVision) {
            imageData.forEach((base64Image, index) => {
                messageContent.push({
                    type: 'image_url',
                    image_url: {
                        url: base64Image
                    }
                });
            });
            console.log(`Sending ${imageData.length} PDF page(s) to Claude Vision`);
        } else {
            console.log('Sending text data to Claude for classification');
        }

        const requestBody = {
            model: AI_MODELS.pdfExtraction,
            messages: [
                {
                    role: 'system',
                    content: useVision
                        ? 'You are a meticulous financial document extraction expert. You can see and read investment PDF statements. Your task is to extract EVERY SINGLE ROW from every table - this is critical for accurate record keeping. Never summarize, truncate, or sample. Return complete data as valid JSON only.'
                        : 'You are a financial document classification expert. Analyze extracted PDF text data with X/Y coordinates and organize it into properly classified tables. Group rows by Y-position and columns by X-position. Extract EVERY row - never truncate. Return only valid JSON.'
                },
                {
                    role: 'user',
                    content: messageContent
                }
            ],
            max_tokens: 16000,
            temperature: 0.05  // Very low for consistency
        };

        // Add extended thinking for Claude 4 (better accuracy)
        if (AI_MODELS.pdfExtraction.includes('claude-sonnet-4')) {
            requestBody.thinking = {
                type: "enabled",
                budget_tokens: 5000  // Give Claude time to think through the extraction
            };
            console.log('🧠 Using Claude 4 with extended thinking (5000 token budget)');
        }

        const response = await fetch(OPENROUTER_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENROUTER_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'Personal Finance App'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const extractedContent = data.choices[0]?.message?.content || 'No response received';

        // Save raw AI response to localStorage for debugging/caching
        const responseData = {
            timestamp: new Date().toISOString(),
            model: AI_MODELS.pdfExtraction,
            prompt: promptText.substring(0, 200) + '...',
            response: extractedContent,
            tokensUsed: data.usage,
            filename: 'PDF_extraction',
            pageCount: imageData?.length || 0
        };

        saveAIResponse(responseData);

        // Also backup to Supabase (async, don't wait)
        backupAIExtraction(responseData).catch(err =>
            console.warn('Failed to backup to Supabase:', err)
        );

        return {
            success: true,
            message: extractedContent,
            model: AI_MODELS.pdfExtraction,
            tokensUsed: data.usage
        };
    } catch (error) {
        console.error('Claude Vision PDF extraction error:', error);
        return {
            success: false,
            message: `Claude Vision extraction failed: ${error.message}`
        };
    }
};

// Save AI responses to localStorage for caching and debugging
const saveAIResponse = (responseData) => {
    try {
        const storageKey = 'ai_pdf_extractions';
        const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');

        // Keep last 10 extractions
        const updated = [responseData, ...existing].slice(0, 10);
        localStorage.setItem(storageKey, JSON.stringify(updated));

        console.log('AI response saved to localStorage:', storageKey);
    } catch (error) {
        console.error('Failed to save AI response:', error);
    }
};

// Retrieve cached AI responses
export const getCachedExtractions = () => {
    try {
        return JSON.parse(localStorage.getItem('ai_pdf_extractions') || '[]');
    } catch (error) {
        console.error('Failed to get cached extractions:', error);
        return [];
    }
};

export default { getAIResponse, analyzeFinancialData, extractPDFTables, getCachedExtractions, AI_MODELS };
