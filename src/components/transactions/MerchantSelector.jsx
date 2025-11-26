import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, Check, X } from 'lucide-react';
import { supabaseMerchantDB } from '../../services/supabaseDatabase';
import './MerchantSelector.css';

export const MerchantSelector = ({ transaction, merchants, onMerchantSelected, onCreateNew }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredMerchants, setFilteredMerchants] = useState([]);
    const [showCreateNew, setShowCreateNew] = useState(false);
    const [newMerchantName, setNewMerchantName] = useState('');
    const dropdownRef = useRef(null);

    useEffect(() => {
        // Filter merchants based on search term
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            const filtered = merchants.filter(m =>
                m.normalized_name?.toLowerCase().includes(lower) ||
                m.aliases?.some(a => a.toLowerCase().includes(lower))
            );
            setFilteredMerchants(filtered);
        } else {
            // Show top 10 merchants by default, or suggest based on raw name
            const suggestions = getSuggestedMerchants();
            setFilteredMerchants(suggestions.slice(0, 10));
        }
    }, [searchTerm, merchants]);

    useEffect(() => {
        // Close dropdown when clicking outside
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
                setShowCreateNew(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const getSuggestedMerchants = () => {
        // Try to find merchants that might match the raw name
        const rawName = (transaction.raw_merchant_name || '').toLowerCase();

        // First, try to find exact or partial matches
        const matches = merchants.filter(m => {
            const normalizedLower = (m.normalized_name || '').toLowerCase();
            const aliasMatch = m.aliases?.some(a =>
                rawName.includes(a.toLowerCase()) || a.toLowerCase().includes(rawName)
            );
            return rawName.includes(normalizedLower) ||
                normalizedLower.includes(rawName) ||
                aliasMatch;
        });

        if (matches.length > 0) {
            return matches;
        }

        // Otherwise return recently used merchants (sorted by normalized_name)
        return [...merchants].sort((a, b) =>
            (a.normalized_name || '').localeCompare(b.normalized_name || '')
        );
    };

    const handleSelectMerchant = async (merchant) => {
        await onMerchantSelected(transaction.id, merchant.id);
        setIsOpen(false);
    };

    const handleCreateNew = async () => {
        if (!newMerchantName.trim()) return;

        const newMerchant = await onCreateNew(newMerchantName.trim(), transaction.raw_merchant_name);
        if (newMerchant) {
            await onMerchantSelected(transaction.id, newMerchant.id);
            setIsOpen(false);
            setShowCreateNew(false);
            setNewMerchantName('');
        }
    };

    const handleUnlink = async () => {
        await onMerchantSelected(transaction.id, null);
        setIsOpen(false);
    };

    // If merchant is already linked, show the name with an edit button
    if (transaction.merchant?.normalized_name && !isOpen) {
        return (
            <div className="merchant-selector-linked">
                <div className="merchant-name-display">
                    <span className="merchant-name-text">{transaction.merchant.normalized_name}</span>
                    <button
                        onClick={() => setIsOpen(true)}
                        className="merchant-edit-btn"
                        title="Change merchant"
                    >
                        <Search className="w-3 h-3" />
                    </button>
                </div>
            </div>
        );
    }

    // If no merchant linked, show search button
    if (!isOpen) {
        return (
            <div className="merchant-selector-empty">
                <button
                    onClick={() => setIsOpen(true)}
                    className="merchant-search-btn"
                >
                    <Search className="w-3 h-3" />
                    <span>Link Merchant</span>
                </button>
            </div>
        );
    }

    // Dropdown is open
    return (
        <div className="merchant-selector-dropdown" ref={dropdownRef}>
            <div className="merchant-search-input-wrapper">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search merchants..."
                    className="merchant-search-input"
                    autoFocus
                />
                <button
                    onClick={() => {
                        setIsOpen(false);
                        setShowCreateNew(false);
                    }}
                    className="merchant-close-btn"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {!showCreateNew ? (
                <>
                    <div className="merchant-list">
                        {filteredMerchants.length > 0 ? (
                            filteredMerchants.map(merchant => (
                                <button
                                    key={merchant.id}
                                    onClick={() => handleSelectMerchant(merchant)}
                                    className="merchant-list-item"
                                >
                                    <div>
                                        <div className="merchant-list-name">
                                            {merchant.normalized_name}
                                        </div>
                                        {merchant.aliases && merchant.aliases.length > 0 && (
                                            <div className="merchant-list-aliases">
                                                {merchant.aliases.slice(0, 2).join(', ')}
                                            </div>
                                        )}
                                    </div>
                                    <Check className="w-4 h-4 text-green-600" />
                                </button>
                            ))
                        ) : (
                            <div className="merchant-list-empty">
                                No merchants found
                            </div>
                        )}
                    </div>

                    <div className="merchant-actions">
                        <button
                            onClick={() => setShowCreateNew(true)}
                            className="merchant-create-btn"
                        >
                            <Plus className="w-4 h-4" />
                            Create New Merchant
                        </button>
                        {transaction.merchant && (
                            <button
                                onClick={handleUnlink}
                                className="merchant-unlink-btn"
                            >
                                Unlink
                            </button>
                        )}
                    </div>
                </>
            ) : (
                <div className="merchant-create-form">
                    <input
                        type="text"
                        value={newMerchantName}
                        onChange={(e) => setNewMerchantName(e.target.value)}
                        placeholder="Enter friendly merchant name..."
                        className="merchant-create-input"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleCreateNew()}
                    />
                    <div className="merchant-create-actions">
                        <button
                            onClick={handleCreateNew}
                            className="merchant-create-save"
                            disabled={!newMerchantName.trim()}
                        >
                            Create
                        </button>
                        <button
                            onClick={() => {
                                setShowCreateNew(false);
                                setNewMerchantName('');
                            }}
                            className="merchant-create-cancel"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
