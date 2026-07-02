// components/FilterBar.tsx
import React from 'react';
import { useMapStore } from '../stores/mapStore';
import { FlameIcon } from './icons';

export const FilterBar: React.FC = () => {
    const { filters, setFilters } = useMapStore();

    const toggleOnlineOnly = () => {
        setFilters({ onlineOnly: !filters.onlineOnly });
    };

    const toggleFavoritesOnly = () => {
        setFilters({ favoritesOnly: !filters.favoritesOnly });
    };

    return (
        <div className="p-4 bg-gray-800 border-b border-gray-700 flex items-center justify-end gap-2">
            <button
                onClick={toggleFavoritesOnly}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    filters.favoritesOnly 
                        ? 'bg-primary-600 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
                <span className={`material-symbols-rounded text-sm ${filters.favoritesOnly ? 'filled' : ''}`}>favorite</span>
                <span>Favoritos</span>
            </button>
            <button
                onClick={toggleOnlineOnly}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                    filters.onlineOnly 
                        ? 'bg-green-500 text-white' 
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
                <FlameIcon className="w-4 h-4" />
                <span>Online Agora</span>
            </button>
        </div>
    );
};
