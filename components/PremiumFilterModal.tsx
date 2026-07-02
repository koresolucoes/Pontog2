import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMapStore } from '../stores/mapStore';
import { useDataStore } from '../stores/dataStore';
import { POSITIONS } from '../lib/constants';
import { useTranslation } from 'react-i18next';

interface FilterModalProps {
  onClose: () => void;
}

const ChipButton: React.FC<{
    label: string;
    isSelected: boolean;
    onClick: () => void;
}> = ({ label, isSelected, onClick }) => (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-sm font-semibold transition-colors ${
        isSelected
          ? 'bg-primary-600 text-white'
          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
      }`}
    >
      {label}
    </button>
);

export const FilterModal: React.FC<FilterModalProps> = ({ onClose }) => {
    const { t } = useTranslation();
    const { filters, setFilters } = useMapStore();
    const { tribes, fetchTribes } = useDataStore();
    
    const [localFilters, setLocalFilters] = useState({
        minAge: filters.minAge || 18,
        maxAge: filters.maxAge || 99,
        positions: filters.positions || [],
        tribes: filters.tribes || [],
    });

    useEffect(() => {
        if (tribes.length === 0) {
            fetchTribes();
        }
    }, [tribes, fetchTribes]);

    const handlePositionToggle = (position: string) => {
        const currentPositions = localFilters.positions;
        const newPositions = currentPositions.includes(position)
          ? currentPositions.filter(p => p !== position)
          : [...currentPositions, position];
        setLocalFilters(prev => ({ ...prev, positions: newPositions }));
    };

    const handleTribeToggle = (tribeName: string) => {
        const currentTribes = localFilters.tribes;
        const newTribes = currentTribes.includes(tribeName)
          ? currentTribes.filter(t => t !== tribeName)
          : [...currentTribes, tribeName];
        setLocalFilters(prev => ({ ...prev, tribes: newTribes }));
    };

    const handleApply = () => {
        setFilters({
            ...filters,
            minAge: localFilters.minAge,
            maxAge: localFilters.maxAge,
            positions: localFilters.positions,
            tribes: localFilters.tribes
        });
        onClose();
    };

    const handleClear = () => {
        const defaultFilters = {
            minAge: 18,
            maxAge: 99,
            positions: [],
            tribes: [],
        };
        setLocalFilters(defaultFilters);
        setFilters({ ...filters, ...defaultFilters });
        onClose();
    };

    return typeof document !== 'undefined' ? createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-end sm:items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-xl w-full max-w-md mx-auto animate-slide-in-up sm:animate-fade-in-up flex flex-col h-full sm:h-auto sm:max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                <header className="p-6 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {t('filter_modal.title', { defaultValue: 'Filtrar Perfis' })}
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
                </header>

                <main className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-2">{t('filter_modal.age_range', { defaultValue: 'Faixa Etária' })}</h3>
                        <div className="flex items-center gap-4">
                            <input
                                type="number"
                                value={localFilters.minAge}
                                onChange={e => setLocalFilters(f => ({ ...f, minAge: parseInt(e.target.value) || 18 }))}
                                className="w-full bg-slate-700 rounded-lg p-2 text-center text-white"
                                min="18"
                                max="99"
                            />
                            <span className="text-slate-400">{t('filter_modal.up_to', { defaultValue: 'até' })}</span>
                             <input
                                type="number"
                                value={localFilters.maxAge}
                                onChange={e => setLocalFilters(f => ({ ...f, maxAge: parseInt(e.target.value) || 99 }))}
                                className="w-full bg-slate-700 rounded-lg p-2 text-center text-white"
                                min="18"
                                max="99"
                            />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-2">{t('filter_modal.position', { defaultValue: 'Posição' })}</h3>
                        <div className="flex flex-wrap gap-2">
                            {POSITIONS.map(p => (
                                <ChipButton key={p} label={p} isSelected={localFilters.positions.includes(p)} onClick={() => handlePositionToggle(p)} />
                            ))}
                        </div>
                    </div>
                     <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-2">{t('filter_modal.tribes', { defaultValue: 'Tribos' })}</h3>
                        <div className="flex flex-wrap gap-2">
                             {tribes.map(t => (
                                <ChipButton key={t.id} label={t.name} isSelected={localFilters.tribes.includes(t.name)} onClick={() => handleTribeToggle(t.name)} />
                            ))}
                        </div>
                    </div>
                </main>

                <footer className="p-4 border-t border-slate-700 flex-shrink-0 flex justify-between">
                    <button onClick={handleClear} type="button" className="bg-slate-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-slate-600 transition-colors">
                        {t('filter_modal.clear', { defaultValue: 'Limpar Filtros' })}
                    </button>
                    <button onClick={handleApply} type="button" className="bg-primary-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors">
                        {t('common.apply', { defaultValue: 'Aplicar' })}
                    </button>
                </footer>
            </div>
        </div>,
        document.body
    ) : null;
};
