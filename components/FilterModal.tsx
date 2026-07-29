import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useMapStore } from '../stores/mapStore';
import { useDataStore } from '../stores/dataStore';
import { POSITIONS, LOOKING_FOR } from '../lib/constants';
import { useTranslation } from 'react-i18next';
import { useHardwareBack } from '../lib/useHardwareBack';

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
      className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
        isSelected
          ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-900/30 scale-105'
          : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
);

export const FilterModal: React.FC<FilterModalProps> = ({ onClose }) => {
    useHardwareBack(true, onClose);
    const { t } = useTranslation();
    const { filters, setFilters } = useMapStore();
    const { tribes, fetchTribes } = useDataStore();
    
    const [localFilters, setLocalFilters] = useState({
        minAge: filters.minAge || 18,
        maxAge: filters.maxAge || 99,
        positions: filters.positions || [],
        tribes: filters.tribes || [],
        lookingFor: filters.lookingFor || [],
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

    const handleLookingForToggle = (intent: string) => {
        const currentIntents = localFilters.lookingFor;
        const newIntents = currentIntents.includes(intent)
          ? currentIntents.filter(i => i !== intent)
          : [...currentIntents, intent];
        setLocalFilters(prev => ({ ...prev, lookingFor: newIntents }));
    };

    const handleApply = () => {
        setFilters({
            ...filters,
            minAge: localFilters.minAge,
            maxAge: localFilters.maxAge,
            positions: localFilters.positions,
            tribes: localFilters.tribes,
            lookingFor: localFilters.lookingFor
        });
        onClose();
    };

    const handleClear = () => {
        const defaultFilters = {
            minAge: 18,
            maxAge: 99,
            positions: [],
            tribes: [],
            lookingFor: [],
        };
        setLocalFilters(defaultFilters);
        setFilters({ ...filters, ...defaultFilters });
        onClose();
    };

    return typeof document !== 'undefined' ? (
        createPortal(
        <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 animate-fade-in" onClick={onClose}>
            <div className="bg-slate-900/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md mx-auto animate-slide-in-up flex flex-col h-[80vh] sm:h-auto sm:max-h-[85vh] border border-white/10" onClick={(e) => e.stopPropagation()}>
                <header className="p-5 border-b border-white/10 flex justify-between items-center flex-shrink-0 bg-slate-800/50 rounded-t-3xl">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <span className="material-symbols-rounded text-primary-500">tune</span>
                        {t('filters.title', { defaultValue: 'Filtros' })}
                    </h2>
                    <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-white/5 hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-6 space-y-8">
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1">{t('filters.age_range', { defaultValue: 'Faixa Etária' })}</h3>
                        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between gap-4">
                            <div className="flex-1 text-center">
                                <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">{t('filters.min_age', { defaultValue: 'Mínimo' })}</label>
                                <input
                                    type="number"
                                    value={localFilters.minAge}
                                    onChange={e => setLocalFilters(f => ({ ...f, minAge: parseInt(e.target.value) || 18 }))}
                                    className="w-full bg-slate-900 rounded-xl py-2 text-center text-white font-bold text-lg focus:ring-2 focus:ring-primary-500/50 outline-none"
                                    min="18"
                                    max="99"
                                />
                            </div>
                            <div className="text-slate-500 font-bold">-</div>
                            <div className="flex-1 text-center">
                                <label className="block text-[10px] text-slate-500 mb-1 uppercase font-bold">{t('filters.max_age', { defaultValue: 'Máximo' })}</label>
                                <input
                                    type="number"
                                    value={localFilters.maxAge}
                                    onChange={e => setLocalFilters(f => ({ ...f, maxAge: parseInt(e.target.value) || 99 }))}
                                    className="w-full bg-slate-900 rounded-xl py-2 text-center text-white font-bold text-lg focus:ring-2 focus:ring-primary-500/50 outline-none"
                                    min="18"
                                    max="99"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1">{t('profile_modal.position', { defaultValue: 'Posição' })}</h3>
                        <div className="flex flex-wrap gap-2">
                            {POSITIONS.map(p => (
                                <ChipButton key={p} label={t(`constants.positions.${p}`, { defaultValue: p })} isSelected={localFilters.positions.includes(p)} onClick={() => handlePositionToggle(p)} />
                            ))}
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1">{t('profile.looking_for', { defaultValue: 'Buscando' })}</h3>
                        <div className="flex flex-wrap gap-2">
                            {LOOKING_FOR.map(intent => (
                                <ChipButton key={intent} label={t(`constants.looking_for.${intent}`, { defaultValue: intent })} isSelected={localFilters.lookingFor.includes(intent)} onClick={() => handleLookingForToggle(intent)} />
                            ))}
                        </div>
                    </div>

                     <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase mb-3 ml-1">{t('profile_modal.tribes', { defaultValue: 'Tribos' })}</h3>
                        <div className="flex flex-wrap gap-2">
                             {tribes.map(tribe => (
                                <ChipButton key={tribe.id} label={t(`constants.tribes.${tribe.name}`, { defaultValue: tribe.name })} isSelected={localFilters.tribes.includes(tribe.name)} onClick={() => handleTribeToggle(tribe.name)} />
                            ))}
                        </div>
                    </div>
                </main>

                <footer className="p-5 border-t border-white/10 flex-shrink-0 flex gap-3 bg-slate-800/30 rounded-b-3xl">
                    <button 
                        onClick={handleClear} 
                        type="button" 
                        className="flex-1 bg-slate-800 text-slate-300 font-bold py-3.5 px-4 rounded-xl hover:bg-slate-700 hover:text-white transition-colors"
                    >
                        {t('filters.clear', { defaultValue: 'Limpar' })}
                    </button>
                    <button 
                        onClick={handleApply} 
                        type="button" 
                        className="flex-[2] bg-gradient-to-r from-primary-600 to-secondary-600 text-white font-bold py-3.5 px-4 rounded-xl hover:shadow-lg hover:shadow-primary-600/30 active:scale-95 transition-all"
                    >
                        {t('filters.apply', { defaultValue: 'Aplicar Filtros' })}
                    </button>
                </footer>
            </div>
        </div>, document.body)
    ) : null;
};