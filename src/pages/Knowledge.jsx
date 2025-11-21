import React, { useEffect, useState } from 'react';
import { KnowledgeCard } from '../components/knowledge/KnowledgeCard';
import { supabaseKnowledgeDB } from '../services/supabaseDatabase';

export const Knowledge = () => {
    const [resources, setResources] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchResources = async () => {
            setLoading(true);
            const data = await supabaseKnowledgeDB.getAll();
            setResources(data || []);
            setLoading(false);
        };
        fetchResources();
    }, []);

    const categories = [...new Set(resources.map(r => r.category))];

    if (loading) {
        return <div className="text-center py-12 text-gray-500">Loading knowledge resources...</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge Center</h1>
                <p className="text-gray-600">
                    Learn about personal finance, investments, and money management
                </p>
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
                {categories.map(category => (
                    <button
                        key={category}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                        {category}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {resources.map(resource => (
                    <KnowledgeCard key={resource.id} {...resource} />
                ))}
            </div>
        </div>
    );
};
