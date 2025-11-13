import React from 'react';
import { User, Bot } from 'lucide-react';

export const ChatMessage = ({ message, isUser }) => {
    return (
        <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <Bot size={20} className="text-white" />
                </div>
            )}

            <div className={`max-w-[70%] rounded-lg px-4 py-3 ${isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}>
                <p className="text-sm whitespace-pre-wrap">{message}</p>
            </div>

            {isUser && (
                <div className="flex-shrink-0 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center">
                    <User size={20} className="text-white" />
                </div>
            )}
        </div>
    );
};
