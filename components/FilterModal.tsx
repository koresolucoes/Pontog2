import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useMapStore } from '../stores/mapStore';
import { useDataStore } from '../stores/dataStore';
import { POSITIONS, LOOKING_FOR } from '../lib/constants';
import { useTranslation } from 'react-i18next';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';

interface FilterModalProps { onClose: () => void; }

const ChoiceChip: React.FC<{ label: string; selected: boolean; onClick: () => void }> = ({ label, selected, onClick }) => (
  <button type="button" onClick={onClick} className={`pg-chip ${selected ? 'pg-chip-active' : ''}`}>{selected && <span className="material-symbols-rounded !text-[14px]">check</span>}{label}</button>
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
    lookingFor: filters.lookingFor || [],
  });

  useEffect(() => { if (tribes.length === 0) fetchTribes(); }, [tribes.length, fetchTribes]);

  const toggle = (key: 'positions' | 'tribes' | 'lookingFor', value: string) => {
    setLocalFilters((current) => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
    }));
  };

  const clear = () => setLocalFilters({ minAge: 18, maxAge: 99, positions: [], tribes: [], lookingFor: [] });
  const apply = () => {
    setFilters({ ...filters, ...localFilters });
    onClose();
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <ModalShell
      onClose={onClose}
      size="md"
      icon="tune"
      eyebrow="Descobrir"
      title={t('filters.title', { defaultValue: 'Afinar resultados' })}
      description="Use filtros quando quiser ser mais específico. O padrão continua mostrando variedade por perto."
      footer={
        <div className="grid grid-cols-[.7fr_1.3fr] gap-2">
          <Button variant="secondary" onClick={clear}>{t('filters.clear', { defaultValue: 'Limpar' })}</Button>
          <Button variant="light" onClick={apply}>{t('filters.apply', { defaultValue: 'Ver resultados' })}</Button>
        </div>
      }
    >
      <div className="space-y-6">
        <section>
          <p className="pg-eyebrow mb-3">Faixa etária</p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3 rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-4">
            <label><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.12em] text-white/30">Mínimo</span><input type="number" min={18} max={99} value={localFilters.minAge} onChange={(event) => setLocalFilters((current) => ({ ...current, minAge: Math.max(18, Number(event.target.value) || 18) }))} className="pg-field !text-center !text-lg !font-black" /></label>
            <span className="pb-3 text-white/20">—</span>
            <label><span className="mb-2 block text-[10px] font-bold uppercase tracking-[.12em] text-white/30">Máximo</span><input type="number" min={18} max={99} value={localFilters.maxAge} onChange={(event) => setLocalFilters((current) => ({ ...current, maxAge: Math.min(99, Number(event.target.value) || 99) }))} className="pg-field !text-center !text-lg !font-black" /></label>
          </div>
        </section>

        <section><p className="pg-eyebrow mb-3">Posição</p><div className="flex flex-wrap gap-2">{POSITIONS.map((position) => <ChoiceChip key={position} label={t(`constants.positions.${position}`, { defaultValue: position })} selected={localFilters.positions.includes(position)} onClick={() => toggle('positions', position)} />)}</div></section>
        <section><p className="pg-eyebrow mb-3">O que busca</p><div className="flex flex-wrap gap-2">{LOOKING_FOR.map((intent) => <ChoiceChip key={intent} label={t(`constants.looking_for.${intent}`, { defaultValue: intent })} selected={localFilters.lookingFor.includes(intent)} onClick={() => toggle('lookingFor', intent)} />)}</div></section>
        <section><p className="pg-eyebrow mb-3">Tribos</p><div className="flex flex-wrap gap-2">{tribes.map((tribe) => <ChoiceChip key={tribe.id} label={t(`constants.tribes.${tribe.name}`, { defaultValue: tribe.name })} selected={localFilters.tribes.includes(tribe.name)} onClick={() => toggle('tribes', tribe.name)} />)}</div></section>
      </div>
    </ModalShell>,
    document.body,
  );
};
