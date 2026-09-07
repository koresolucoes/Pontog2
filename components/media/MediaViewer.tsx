import React, { useEffect, useMemo, useState } from 'react';
import { useHardwareBack } from '../../lib/useHardwareBack';
import { PontoMediaPlayer } from './PontoMediaPlayer';

export interface MediaViewerItem {
  id: string | number;
  src: string;
  type: 'photo' | 'video';
  alt?: string;
}

interface MediaViewerProps {
  items: MediaViewerItem[];
  title?: string;
  initialIndex?: number;
  onClose: () => void;
}

export const MediaViewer: React.FC<MediaViewerProps> = ({ items, title = 'Mídia privada', initialIndex = 0, onClose }) => {
  useHardwareBack(true, onClose);
  const safeInitial = Math.min(Math.max(initialIndex, 0), Math.max(items.length - 1, 0));
  const [index, setIndex] = useState(safeInitial);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const current = items[index];

  const canNavigate = items.length > 1;
  const previous = () => setIndex((value) => (value - 1 + items.length) % items.length);
  const next = () => setIndex((value) => (value + 1) % items.length);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && canNavigate) previous();
      if (event.key === 'ArrowRight' && canNavigate) next();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canNavigate, onClose]);

  const progress = useMemo(() => items.map((item, itemIndex) => (
    <span key={item.id} className={`h-1 flex-1 rounded-full transition ${itemIndex === index ? 'bg-white' : itemIndex < index ? 'bg-white/42' : 'bg-white/16'}`} />
  )), [items, index]);

  if (!current) return null;

  return (
    <div
      className="fixed inset-0 z-[320] flex flex-col bg-[#030304] text-white"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onTouchStart={(event) => setTouchStart(event.touches[0]?.clientX ?? null)}
      onTouchEnd={(event) => {
        if (touchStart === null || !canNavigate) return;
        const end = event.changedTouches[0]?.clientX ?? touchStart;
        const distance = touchStart - end;
        if (Math.abs(distance) > 52) distance > 0 ? next() : previous();
        setTouchStart(null);
      }}
    >
      <header className="relative z-20 px-4 pt-[max(14px,env(safe-area-inset-top))] sm:px-6">
        {items.length > 1 && <div className="mb-3 flex gap-1.5">{progress}</div>}
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="pg-eyebrow">Privado</p>
            <h2 className="mt-1 truncate font-bricolage text-lg font-black">{title}</h2>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-[11px] font-black tabular-nums text-white/52">{index + 1} / {items.length}</span>
          <button onClick={onClose} className="pg-icon-btn !bg-white/[0.07]" aria-label="Fechar visualizador"><span className="material-symbols-rounded">close</span></button>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 pb-[max(16px,env(safe-area-inset-bottom))] pt-4 sm:px-16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,12,105,.06),transparent_48%)] pointer-events-none" />
        <div className="relative flex h-full w-full max-w-5xl items-center justify-center">
          {current.type === 'video' ? (
            <PontoMediaPlayer key={current.src} src={current.src} autoPlay className="max-h-full w-full rounded-[22px] sm:rounded-[28px]" />
          ) : (
            <img key={current.src} src={current.src} alt={current.alt || title} className="max-h-full max-w-full select-none rounded-[18px] object-contain shadow-2xl sm:rounded-[24px]" draggable={false} />
          )}
        </div>

        {canNavigate && <>
          <button onClick={previous} className="absolute left-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-xl transition hover:bg-white/10 sm:flex" aria-label="Mídia anterior"><span className="material-symbols-rounded">chevron_left</span></button>
          <button onClick={next} className="absolute right-3 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white backdrop-blur-xl transition hover:bg-white/10 sm:flex" aria-label="Próxima mídia"><span className="material-symbols-rounded">chevron_right</span></button>
        </>}
      </main>
    </div>
  );
};
