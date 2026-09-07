import React from 'react';
import { SlidersHorizontal } from 'lucide-react';
import type { User } from '../../types';

interface ContextBarProps {
    activeView: string;
    user: User;
    onOpenAccount: () => void;
    onOpenFilters?: () => void;
}

/**
 * Global utility strip for authenticated surfaces.
 *
 * Page identity belongs to each view (one screen = one H1). The strip no
 * longer owns vertical layout space: screens start naturally at the top and
 * only desktop gets the floating account affordance.
 */
export const ContextBar: React.FC<ContextBarProps> = ({ activeView, user, onOpenAccount, onOpenFilters }) => {
    const showDesktopActions = activeView !== 'profile';

    return (
        <>
            <style>{'[class~="pt-[88px]"] { padding-top: max(8px, env(safe-area-inset-top)) !important; }'}</style>
            {showDesktopActions && (
                <div
                    className="pointer-events-none fixed left-0 right-0 top-0 z-30 hidden px-4 sm:block"
                    style={{ paddingTop: 'max(10px, env(safe-area-inset-top))' }}
                    aria-label="Ações globais"
                >
                    <div className="mx-auto flex w-full max-w-6xl items-center justify-end gap-2">
                        {activeView === 'home' && onOpenFilters && (
                            <button
                                type="button"
                                onClick={onOpenFilters}
                                aria-label="Abrir filtros"
                                className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/[0.08] bg-[#0a0a0c]/78 text-slate-300 shadow-lg backdrop-blur-2xl transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/70"
                            >
                                <SlidersHorizontal size={19} aria-hidden="true" />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={onOpenAccount}
                            aria-label="Abrir conta e configurações"
                            className="pointer-events-auto relative h-11 w-11 overflow-hidden rounded-full border border-white/[0.10] bg-[#0a0a0c]/80 shadow-[0_10px_30px_rgba(0,0,0,.35)] backdrop-blur-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/70"
                        >
                            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
                            <span className="absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};
