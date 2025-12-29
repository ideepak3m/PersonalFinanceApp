import React from 'react';
import { User, Bot } from 'lucide-react';

// Simple markdown parser for AI responses
const parseMarkdown = (text) => {
    if (!text) return '';

    // Split into lines for processing
    const lines = text.split('\n');
    const elements = [];
    let currentList = [];
    let listType = null;

    const flushList = () => {
        if (currentList.length > 0) {
            elements.push(
                <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2">
                    {currentList.map((item, i) => (
                        <li key={i} className="text-sm">{parseInline(item)}</li>
                    ))}
                </ul>
            );
            currentList = [];
            listType = null;
        }
    };

    const parseInline = (line) => {
        // Bold **text**
        let parsed = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        // Italic *text*
        parsed = parsed.replace(/\*([^*]+)\*/g, '<em>$1</em>');
        // Code `text`
        parsed = parsed.replace(/`([^`]+)`/g, '<code class="bg-gray-200 px-1 rounded text-sm">$1</code>');

        return <span dangerouslySetInnerHTML={{ __html: parsed }} />;
    };

    lines.forEach((line, index) => {
        // Headers
        if (line.startsWith('### ')) {
            flushList();
            elements.push(
                <h4 key={index} className="font-semibold text-gray-900 mt-3 mb-1">
                    {parseInline(line.substring(4))}
                </h4>
            );
        } else if (line.startsWith('## ')) {
            flushList();
            elements.push(
                <h3 key={index} className="font-bold text-gray-900 mt-4 mb-2">
                    {parseInline(line.substring(3))}
                </h3>
            );
        } else if (line.startsWith('# ')) {
            flushList();
            elements.push(
                <h2 key={index} className="font-bold text-lg text-gray-900 mt-4 mb-2">
                    {parseInline(line.substring(2))}
                </h2>
            );
        }
        // Bullet points
        else if (line.match(/^[-•*]\s/)) {
            currentList.push(line.substring(2));
        }
        // Numbered lists
        else if (line.match(/^\d+\.\s/)) {
            const content = line.replace(/^\d+\.\s/, '');
            currentList.push(content);
        }
        // Empty lines
        else if (line.trim() === '') {
            flushList();
            elements.push(<div key={index} className="h-2" />);
        }
        // Regular paragraphs
        else {
            flushList();
            elements.push(
                <p key={index} className="text-sm my-1">
                    {parseInline(line)}
                </p>
            );
        }
    });

    flushList();
    return elements;
};

export const ChatMessage = ({ message, isUser }) => {
    return (
        <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-md">
                    <Bot size={18} className="text-white" />
                </div>
            )}

            <div className={`max-w-[75%] rounded-lg px-4 py-3 ${isUser
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                : 'bg-gray-100 text-gray-900 shadow-sm'
                }`}>
                {isUser ? (
                    <p className="text-sm whitespace-pre-wrap">{message}</p>
                ) : (
                    <div className="prose prose-sm max-w-none">
                        {parseMarkdown(message)}
                    </div>
                )}
            </div>

            {isUser && (
                <div className="flex-shrink-0 w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center shadow-md">
                    <User size={18} className="text-white" />
                </div>
            )}
        </div>
    );
};
