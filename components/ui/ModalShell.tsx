import React from 'react';
import { useHardwareBack } from '../../lib/useHardwareBack';

interface ModalShellProps {
  open?: boolean;
  onClose: () => void;
  title?: string;
  eyebrow?: string;
  description?: string;
  icon?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'danger' | 'warning';
}

const maxWidth = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-xl' };

export const ModalShell: React.FC<ModalShellProps> = ({
  open = true,
  onClose,
  title,
  eyebrow,
  description,
  icon,
  children,
  footer,
  size = 'md',
  tone = 'default',
}) => {
  useHardwareBack(open, onClose);
  if (!open) return null;

  const toneClass = tone === 'danger'
    ? 'bg-red-500/10 text-red-300 border-red-500/20'
    : tone === 'warning'
      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
      : 'bg-primary-500/10 text-primary-300 border-primary-500/20';

  return (
    <div className="fixed inset-0 z-[210] flex items-end justify-center sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={title}>
      <button className="pg-modal-backdrop absolute inset-0 cursor-default" onClick={onClose} aria-label="Fechar" />
      <section className={`pg-sheet relative z-10 flex max-h-[92dvh] w-full ${maxWidth[size]} flex-col overflow-hidden animate-slide-in-up sm:rounded-[30px] sm:border-b sm:animate-fade-in-up`}>
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-white/18 sm:hidden" />
        {(title || description || icon) && (
          <header className="flex items-start gap-3 p-5 pb-4 sm:p-6 sm:pb-4">
            {icon && <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${toneClass}`}><span className="material-symbols-rounded">{icon}</span></div>}
            <div className="min-w-0 flex-1">
              {eyebrow && <p className="pg-eyebrow mb-1.5">{eyebrow}</p>}
              {title && <h2 className="pg-title text-[24px] text-white">{title}</h2>}
              {description && <p className="mt-2 text-sm leading-relaxed text-white/50">{description}</p>}
            </div>
            <button onClick={onClose} className="pg-icon-btn -mr-1 -mt-1 shrink-0" aria-label="Fechar"><span className="material-symbols-rounded">close</span></button>
          </header>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6 no-scrollbar">{children}</div>
        {footer && <footer className="border-t border-white/[0.07] bg-black/15 p-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:p-4">{footer}</footer>}
      </section>
    </div>
  );
};
