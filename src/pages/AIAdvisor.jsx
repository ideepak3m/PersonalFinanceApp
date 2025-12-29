import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../components/ai/ChatMessage';
import { ChatInput } from '../components/ai/ChatInput';
import { getAIResponse, resetConversation, analyzeFinancialData, getRetirementProjection } from '../services/aiService';
import { fetchAIContext } from '../services/aiContextService';
import { Sparkles, RefreshCw, TrendingUp, PiggyBank, Home, Calculator, AlertCircle, CheckCircle } from 'lucide-react';

export const AIAdvisor = () => {
    const [aiContext, setAiContext] = useState(null);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);
    const [contextError, setContextError] = useState(null);
    const messagesEndRef = useRef(null);

    // Initial greeting based on context availability
    const getInitialGreeting = (context) => {
        if (!context) {
            return "Hello! I'm your AI Financial Advisor. I'm having trouble loading your financial data. You can still ask general financial questions, but I won't have access to your specific situation.";
        }

        const mc = context.masterContext;
        if (!mc) {
            return "Hello! I'm your AI Financial Advisor. I can help you with budgeting advice, investment strategies, and analyzing your financial data. How can I assist you today?";
        }

        const name = mc.marital_status ? `I see you're ${mc.age} years old` : `Based on your profile`;
        const incomeNote = mc.income_type === 'business_owner'
            ? "As a business owner, I understand your income is variable - I'll use your annual totals for accurate analysis."
            : "";

        const netWorthNote = context.netWorth?.length > 0
            ? ` with assets across ${context.netWorth.length} ${context.netWorth.length === 1 ? 'currency' : 'currencies'}`
            : "";

        return `Hello! I'm your AI Financial Advisor with full access to your financial data. ${name}${netWorthNote}. ${incomeNote}

I can help you with:
• **Affordability checks** - "Can I afford a $50,000 car?"
• **Retirement planning** - "When can I retire?"
• **Investment analysis** - "How is my portfolio doing?"
• **Cash flow optimization** - "Where can I cut expenses?"
• **Insurance review** - "Are my LIC policies on track?"

What would you like to explore?`;
    };

    useEffect(() => {
        loadContext();
        return () => {
            // Reset conversation when leaving the page
            resetConversation();
        };
    }, []);

    useEffect(() => {
        // Scroll to bottom when new messages arrive
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const loadContext = async () => {
        setDataLoading(true);
        setContextError(null);

        try {
            const result = await fetchAIContext();

            if (result.success && result.data) {
                setAiContext(result.data);
                setMessages([{
                    id: 1,
                    text: getInitialGreeting(result.data),
                    isUser: false
                }]);
            } else {
                setContextError(result.error || 'Failed to load financial data');
                setMessages([{
                    id: 1,
                    text: getInitialGreeting(null),
                    isUser: false
                }]);
            }
        } catch (error) {
            console.error('Error loading AI context:', error);
            setContextError(error.message);
            setMessages([{
                id: 1,
                text: getInitialGreeting(null),
                isUser: false
            }]);
        } finally {
            setDataLoading(false);
        }
    };

    const handleSend = async (message) => {
        const userMessage = {
            id: Date.now(),
            text: message,
            isUser: true
        };
        setMessages(prev => [...prev, userMessage]);
        setLoading(true);

        try {
            const response = await getAIResponse(message, { aiContext });
            const aiMessage = {
                id: Date.now() + 1,
                text: response.message,
                isUser: false,
                model: response.model
            };
            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Error getting AI response:', error);
            const errorMessage = {
                id: Date.now() + 1,
                text: "I'm sorry, I encountered an error. Please try again later.",
                isUser: false
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAction = async (action) => {
        setLoading(true);
        let response;

        try {
            switch (action) {
                case 'insights':
                    setMessages(prev => [...prev, { id: Date.now(), text: "Give me financial insights", isUser: true }]);
                    response = await analyzeFinancialData(aiContext);
                    break;
                case 'retirement':
                    setMessages(prev => [...prev, { id: Date.now(), text: "Show me my retirement projection", isUser: true }]);
                    response = await getRetirementProjection(aiContext);
                    break;
                default:
                    response = { success: false, message: 'Unknown action' };
            }

            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: response.message,
                isUser: false
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                id: Date.now() + 1,
                text: "Sorry, I couldn't complete that analysis. Please try again.",
                isUser: false
            }]);
        } finally {
            setLoading(false);
        }
    };

    const handleNewChat = () => {
        resetConversation();
        setMessages([{
            id: Date.now(),
            text: getInitialGreeting(aiContext),
            isUser: false
        }]);
    };

    const quickQuestions = [
        { text: "Can I afford to buy a house?", icon: Home },
        { text: "When can I retire?", icon: TrendingUp },
        { text: "How can I save more money?", icon: PiggyBank },
        { text: "Is my investment portfolio balanced?", icon: Calculator },
    ];

    // Context status indicator
    const ContextStatus = () => {
        if (dataLoading) return null;

        if (contextError) {
            return (
                <div className="flex items-center gap-2 text-amber-600 text-sm">
                    <AlertCircle size={16} />
                    <span>Limited context - some features may not work</span>
                </div>
            );
        }

        if (aiContext?.masterContext) {
            const currencies = aiContext.netWorth?.map(nw => nw.currency).join(', ') || 'N/A';
            return (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle size={16} />
                    <span>Full financial context loaded ({currencies})</span>
                </div>
            );
        }

        return null;
    };

    if (dataLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mb-4" />
                <p className="text-gray-500">Loading your financial data...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                        <Sparkles className="text-blue-600" size={32} />
                        AI Financial Advisor
                    </h1>
                    <p className="text-gray-600">
                        Get personalized financial advice powered by AI with access to your complete financial picture
                    </p>
                    <div className="mt-2">
                        <ContextStatus />
                    </div>
                </div>
                <button
                    onClick={handleNewChat}
                    className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <RefreshCw size={18} />
                    New Chat
                </button>
            </div>

            {/* Quick Actions */}
            {messages.length <= 1 && aiContext?.masterContext && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => handleQuickAction('insights')}
                        disabled={loading}
                        className="p-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md disabled:opacity-50"
                    >
                        <div className="flex items-center gap-3">
                            <TrendingUp size={24} />
                            <div className="text-left">
                                <div className="font-semibold">Get Financial Insights</div>
                                <div className="text-sm opacity-90">Analyze your strengths and areas to improve</div>
                            </div>
                        </div>
                    </button>
                    <button
                        onClick={() => handleQuickAction('retirement')}
                        disabled={loading}
                        className="p-4 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-md disabled:opacity-50"
                    >
                        <div className="flex items-center gap-3">
                            <PiggyBank size={24} />
                            <div className="text-left">
                                <div className="font-semibold">Retirement Projection</div>
                                <div className="text-sm opacity-90">See when you can retire and with how much</div>
                            </div>
                        </div>
                    </button>
                </div>
            )}

            {/* Quick Questions */}
            {messages.length <= 1 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Quick Questions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {quickQuestions.map((question, index) => {
                            const Icon = question.icon;
                            return (
                                <button
                                    key={index}
                                    onClick={() => handleSend(question.text)}
                                    disabled={loading}
                                    className="flex items-center gap-3 text-left px-4 py-3 bg-gray-50 hover:bg-blue-50 hover:border-blue-200 border border-gray-200 rounded-lg transition-all text-sm text-gray-700 disabled:opacity-50"
                                >
                                    <Icon size={20} className="text-blue-600" />
                                    {question.text}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Chat Messages */}
            <div className="bg-white rounded-lg shadow-md p-6 min-h-[500px] flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4 max-h-[600px]">
                    {messages.map(message => (
                        <ChatMessage
                            key={message.id}
                            message={message.text}
                            isUser={message.isUser}
                        />
                    ))}
                    {loading && (
                        <div className="flex gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                <Sparkles size={20} className="text-white animate-pulse" />
                            </div>
                            <div className="bg-gray-100 rounded-lg px-4 py-3">
                                <div className="flex gap-2">
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <ChatInput onSend={handleSend} disabled={loading} />
            </div>

            {/* Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                    <strong>Disclaimer:</strong> This AI advisor provides information based on your financial data.
                    It should not be considered as professional financial, tax, or legal advice. Always consult with
                    qualified professionals before making important financial decisions.
                </p>
            </div>
        </div>
    );
};
