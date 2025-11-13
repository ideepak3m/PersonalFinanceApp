import React, { useState } from 'react';
import { useFinance } from '../context/FinanceContext';
import { ChatMessage } from '../components/ai/ChatMessage';
import { ChatInput } from '../components/ai/ChatInput';
import { getAIResponse } from '../services/aiService';
import { Sparkles } from 'lucide-react';

export const AIAdvisor = () => {
    const { accounts, transactions } = useFinance();
    const [messages, setMessages] = useState([
        {
            id: 1,
            text: "Hello! I'm your AI Financial Advisor. I can help you with budgeting advice, investment strategies, and analyzing your financial data. How can I assist you today?",
            isUser: false
        }
    ]);
    const [loading, setLoading] = useState(false);

    const handleSend = async (message) => {
        // Add user message
        const userMessage = {
            id: Date.now(),
            text: message,
            isUser: true
        };
        setMessages(prev => [...prev, userMessage]);
        setLoading(true);

        try {
            // Get AI response
            const context = {
                accounts,
                transactions,
                countries: ['canada', 'india']
            };

            const response = await getAIResponse(message, context);

            // Add AI response
            const aiMessage = {
                id: Date.now() + 1,
                text: response.message,
                isUser: false
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

    const quickQuestions = [
        "How can I save more money?",
        "What's a good investment strategy?",
        "How do I create a budget?",
        "Should I pay off debt or invest?"
    ];

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
                    <Sparkles className="text-blue-600" size={32} />
                    AI Financial Advisor
                </h1>
                <p className="text-gray-600">
                    Get personalized financial advice powered by AI
                </p>
            </div>

            {/* Quick Questions */}
            {messages.length === 1 && (
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                        Quick Questions
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {quickQuestions.map((question, index) => (
                            <button
                                key={index}
                                onClick={() => handleSend(question)}
                                className="text-left px-4 py-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-sm text-gray-700"
                            >
                                {question}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Chat Messages */}
            <div className="bg-white rounded-lg shadow-md p-6 min-h-[500px] flex flex-col">
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
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
                                <Sparkles size={20} className="text-white" />
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
                </div>

                <ChatInput onSend={handleSend} disabled={loading} />
            </div>

            {/* Disclaimer */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                    <strong>Disclaimer:</strong> This AI advisor provides general financial information and suggestions.
                    It should not be considered as professional financial advice. Always consult with a qualified
                    financial advisor before making important financial decisions.
                </p>
            </div>
        </div>
    );
};
