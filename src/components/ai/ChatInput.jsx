import React, { useState } from 'react';
import { Send } from 'lucide-react';

export const ChatInput = ({ onSend, disabled }) => {
    const [message, setMessage] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (message.trim() && !disabled) {
            onSend(message.trim());
            setMessage('');
        }
    };

    const handleKeyDown = (e) => {
        // Submit on Enter without Shift, allow Shift+Enter for new lines
        if (e.key === 'Enter' && !e.shiftKey && !disabled) {
            e.preventDefault();
            if (message.trim()) {
                onSend(message.trim());
                setMessage('');
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
            <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask me anything about your finances... (Shift+Enter for new line)"
                disabled={disabled}
                rows={4}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 resize-none"
            />
            <button
                type="submit"
                disabled={!message.trim() || disabled}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 h-fit"
            >
                <Send size={20} />
                Send
            </button>
        </form>
    );
};
