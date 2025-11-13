import React from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';

export const KnowledgeCard = ({ title, description, category, link, tags }) => {
    return (
        <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <BookOpen size={24} className="text-blue-600" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800 mb-1">{title}</h3>
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                        {category}
                    </span>
                </div>
            </div>

            <p className="text-gray-600 mb-4 line-clamp-3">{description}</p>

            {tags && tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                    {tags.map((tag, index) => (
                        <span
                            key={index}
                            className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}

            {link && (
                <a
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium text-sm"
                >
                    Learn More
                    <ExternalLink size={16} />
                </a>
            )}
        </div>
    );
};
