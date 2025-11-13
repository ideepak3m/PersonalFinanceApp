import React from 'react';
import { KnowledgeCard } from '../components/knowledge/KnowledgeCard';

const knowledgeResources = [
    {
        id: 1,
        title: 'RRSP vs TFSA: Which is Right for You?',
        description: 'Learn about the key differences between RRSP and TFSA accounts in Canada, including tax implications, contribution limits, and withdrawal rules.',
        category: 'Canadian Investments',
        tags: ['RRSP', 'TFSA', 'Tax Planning', 'Canada'],
        link: 'https://www.canada.ca/en/revenue-agency/services/tax/individuals/topics/rrsps-related-plans.html'
    },
    {
        id: 2,
        title: 'Understanding PPF and EPF in India',
        description: 'A comprehensive guide to Public Provident Fund (PPF) and Employee Provident Fund (EPF) - two of the most popular long-term savings schemes in India.',
        category: 'Indian Investments',
        tags: ['PPF', 'EPF', 'Retirement', 'India'],
        link: 'https://www.epfindia.gov.in/'
    },
    {
        id: 3,
        title: 'Emergency Fund Basics',
        description: 'Why you need an emergency fund, how much to save, and where to keep it. Essential financial planning advice for everyone.',
        category: 'Personal Finance',
        tags: ['Emergency Fund', 'Savings', 'Financial Planning'],
        link: '#'
    },
    {
        id: 4,
        title: 'Investing in Index Funds',
        description: 'Learn about low-cost index fund investing, diversification strategies, and building a long-term investment portfolio.',
        category: 'Investments',
        tags: ['Index Funds', 'ETFs', 'Passive Investing'],
        link: '#'
    },
    {
        id: 5,
        title: 'Tax-Saving Investment Options',
        description: 'Explore tax-efficient investment strategies for both Canada and India, including ELSS, 80C deductions, and RRSP contributions.',
        category: 'Tax Planning',
        tags: ['Taxes', 'Deductions', 'ELSS', 'RRSP'],
        link: '#'
    },
    {
        id: 6,
        title: 'Real Estate Investment Strategies',
        description: 'Understanding real estate as an investment vehicle, including REITs, rental properties, and market analysis basics.',
        category: 'Real Estate',
        tags: ['Real Estate', 'REITs', 'Property Investment'],
        link: '#'
    },
    {
        id: 7,
        title: 'Budgeting 101: The 50/30/20 Rule',
        description: 'A simple budgeting framework: allocate 50% to needs, 30% to wants, and 20% to savings and debt repayment.',
        category: 'Budgeting',
        tags: ['Budgeting', 'Money Management', 'Savings'],
        link: '#'
    },
    {
        id: 8,
        title: 'Credit Score Management',
        description: 'Learn how to build and maintain a good credit score, understand credit reports, and improve your creditworthiness.',
        category: 'Credit & Debt',
        tags: ['Credit Score', 'Credit Report', 'Financial Health'],
        link: '#'
    }
];

export const Knowledge = () => {
    const categories = [...new Set(knowledgeResources.map(r => r.category))];

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
                {knowledgeResources.map(resource => (
                    <KnowledgeCard key={resource.id} {...resource} />
                ))}
            </div>
        </div>
    );
};
