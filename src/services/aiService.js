const API_KEY = import.meta.env.VITE_OPENAI_API_KEY || '';
const API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';

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
                model: 'gpt-3.5-turbo',
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

export default { getAIResponse, analyzeFinancialData };
