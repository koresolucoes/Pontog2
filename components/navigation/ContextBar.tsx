import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { User } from '../../types';

interface ContextBarProps {
    activeView: string;
    user: User;
    onOpenAccount: () => void;
    onOpenFilters?: () => void;
}

const viewCopy: Record<string, { eyebrow?: string; title: string; subtitle?: string }> = {
    home: { eyebrow: 'PERTO DE VOCÊ', title: 'Explorar', subtitle: 'Pessoas e lugares que fazem sentido agora.' },
    map: { eyebrow: 'RADAR LOCAL', title: 'Mapa', subtitle: 'Veja quem e o que está acontecendo ao seu redor.' },
    agora: { eyebrow: 'PULSO AO VIVO', title: 'Agora', subtitle: 'Quem está disponível neste momento.' },
    inbox: { eyebrow: 'CONEXÕES', title: 'Conversas', subtitle: 'Continue de onde vocês pararam.' },
    profile: { eyebrow: 'SUA PRESENÇA', title: 'Você', subtitle: 'Controle como você aparece no Ponto G.' },
};

export const ContextBar: React.FC<ContextBarProps> = ({ activeView, user, onOpenAccount, onOpenFilters }) => {
    const copy = viewCopy[activeView] || null;
    if (!copy) return null;

    return (
        <header
            className="pointer-events-none fixed left-0 right-0 top-0 z-30 px-4"
            style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}
        >
            <div className="mx-auto flex w-full max-w-6xl items-start justify-between gap-3">
                <div className="pointer-events-auto min-w-0 rounded-[24px] border border-white/[0.07] bg-[#0a0a0c]/72 px-4 py-3 shadow-[0_16px_40px_rgba(0,0,0,0.28)] backdrop-blur-2xl">
                    {copy.eyebrow && (
                        <p className="mb-0.5 text-[9px] font-black uppercase tracking-[0.22em] text-primary-300/80">{copy.eyebrow}</p>
                    )}
                    <h1 className="truncate font-bricolage text-[22px] font-black leading-none tracking-[-0.025em] text-white">{copy.title}</h1>
                    {copy.subtitle && (
                        <p className="mt-1 hidden max-w-[360px] truncate text-[11px] font-medium text-slate-400 sm:block">{copy.subtitle}</p>
                    )}
                </div>

                <div className="pointer-events-auto flex items-center gap-2">
                    {activeView === 'home' && onOpenFilters && (
                        <button
                            type="button"
                            onClick={onOpenFilters}
                            aria-label="Abrir filtros"
                            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-[#0a0a0c]/78 text-slate-300 shadow-lg backdrop-blur-2xl transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/70"
                        >
                            <SlidersHorizontal size={19} aria-hidden="true" />
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={onOpenAccount}
                        aria-label="Abrir conta e configurações"
                        className="relative h-11 w-11 overflow-hidden rounded-full border border-white/[0.10] bg-[#0a0a0c]/80 shadow-lg backdrop-blur-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/70"
                    >
                        <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                        <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
                    </button>
                </div>
            </div>
        </header>
    );
};
