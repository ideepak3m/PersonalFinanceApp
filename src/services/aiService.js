import { fetchAIContext, buildSystemPrompt } from './aiContextService';

// OpenRouter Configuration
const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// AI Model Configuration - Using Claude via OpenRouter
export const AI_MODELS = {
    financialAdvisor: 'anthropic/claude-3-haiku',        // Fast & cost-effective
    financialAdvisorPro: 'anthropic/claude-3.5-sonnet',  // Better reasoning for complex questions
    // Alternatives available via OpenRouter:
    // 'anthropic/claude-3-opus' - Most powerful, higher cost
    // 'anthropic/claude-3.5-sonnet' - Excellent balance
    // 'openai/gpt-4o' - GPT-4 Omni
    // 'openai/gpt-4o-mini' - Cheaper GPT-4
    // 'google/gemini-pro-1.5' - Google's model
};

// Conversation history for multi-turn chat
let conversationHistory = [];

/**
 * Reset conversation history (call when starting a new chat session)
 */
export const resetConversation = () => {
    conversationHistory = [];
};

/**
 * Get AI response with full financial context
 */
export const getAIResponse = async (message, context = {}, useHistory = true) => {
    if (!API_KEY) {
        return {
            success: false,
            message: 'Please set VITE_OPENROUTER_API_KEY in your .env.local file to use AI features.'
        };
    }

    try {
        // Build system prompt with user's financial context
        const systemPrompt = context.aiContext
            ? buildSystemPrompt(context.aiContext)
            : `You are a personal finance advisor. Help users with financial questions, 
               budgeting advice, investment strategies, and understanding their financial data. 
               Be concise, practical, and supportive.`;

        // Add user message to history
        if (useHistory) {
            conversationHistory.push({ role: 'user', content: message });
        }

        // Build messages array
        const messages = [
            { role: 'system', content: systemPrompt },
            ...(useHistory ? conversationHistory : [{ role: 'user', content: message }])
        ];

        // Determine model based on question complexity
        const model = isComplexQuestion(message) ? AI_MODELS.financialAdvisorPro : AI_MODELS.financialAdvisor;

        const response = await fetch(API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': window.location.origin,  // Required by OpenRouter
                'X-Title': 'Personal Finance App'         // Optional: App name for OpenRouter dashboard
            },
            body: JSON.stringify({
                model,
                messages,
                max_tokens: 1500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const aiMessage = data.choices[0]?.message?.content || 'No response received';

        // Add AI response to history
        if (useHistory) {
            conversationHistory.push({ role: 'assistant', content: aiMessage });

            // Keep conversation history manageable (last 20 messages)
            if (conversationHistory.length > 20) {
                conversationHistory = conversationHistory.slice(-20);
            }
        }

        return {
            success: true,
            message: aiMessage,
            model
        };
    } catch (error) {
        console.error('AI Service error:', error);
        return {
            success: false,
            message: `Unable to get AI response: ${error.message}`
        };
    }
};

/**
 * Determine if question requires more powerful model
 */
const isComplexQuestion = (question) => {
    const complexKeywords = [
        'retirement', 'retire', 'project', 'projection', 'calculate',
        'afford', 'can i', 'should i', 'compare', 'analysis',
        'tax', 'estate', 'inheritance', 'optimize', 'strategy'
    ];
    const lowerQuestion = question.toLowerCase();
    return complexKeywords.some(keyword => lowerQuestion.includes(keyword));
};

/**
 * Analyze financial data and provide insights
 */
export const analyzeFinancialData = async (aiContext) => {
    const prompt = `Based on my complete financial data, please provide:
1. Top 3 financial strengths
2. Top 3 areas for improvement
3. One specific actionable recommendation

Keep the response concise and actionable.`;

    return await getAIResponse(prompt, { aiContext }, false);
};

/**
 * Get retirement projection
 */
export const getRetirementProjection = async (aiContext) => {
    const prompt = `Based on my financial data:
1. Project when I can retire with my current savings rate
2. Estimate my retirement income from all sources (investments, property, insurance, government benefits)
3. Identify any gaps between projected income and typical expenses
4. Suggest specific actions to improve my retirement outlook

Please use actual numbers from my data.`;

    return await getAIResponse(prompt, { aiContext }, false);
};

/**
 * Affordability check
 */
export const checkAffordability = async (aiContext, item, amount) => {
    const prompt = `Can I afford to ${item} for ${amount}?

Please analyze:
1. My current monthly surplus
2. Impact on my emergency fund
3. Impact on my savings rate
4. Whether this aligns with my financial goals
5. Your recommendation (yes/no/conditional)

Use my actual financial data to answer.`;

    return await getAIResponse(prompt, { aiContext }, false);
};

export default {
    getAIResponse,
    analyzeFinancialData,
    getRetirementProjection,
    checkAffordability,
    resetConversation,
    fetchAIContext,
    AI_MODELS
};
