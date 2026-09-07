import React, { useEffect, useMemo, useState } from 'react';
import type { PrivateAlbum } from '../types';
import { isVideoUrl } from '../lib/utils';
import { useAlbumStore } from '../stores/albumStore';
import { MediaViewer } from './media/MediaViewer';

interface AlbumGalleryModalProps {
  album: PrivateAlbum;
  onClose: () => void;
  initialIndex?: number;
}

export const AlbumGalleryModal: React.FC<AlbumGalleryModalProps> = ({ album, onClose, initialIndex = 0 }) => {
  const fetchAlbumById = useAlbumStore((state) => state.fetchAlbumById);
  const [resolvedAlbum, setResolvedAlbum] = useState<PrivateAlbum>(album);
  const [loading, setLoading] = useState((album.private_album_photos || []).length === 0);

  useEffect(() => {
    let cancelled = false;
    if ((album.private_album_photos || []).length > 0) {
      setResolvedAlbum(album);
      setLoading(false);
      return;
    }

    setLoading(true);
    void fetchAlbumById(album.id).then((opened) => {
      if (cancelled) return;
      if (opened) setResolvedAlbum(opened);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [album, fetchAlbumById]);

  const items = useMemo(() => (resolvedAlbum.private_album_photos || []).map((item) => ({
    id: item.id,
    src: item.photo_path,
    type: (isVideoUrl(item.photo_path, item.media_type) ? 'video' : 'photo') as 'video' | 'photo',
    alt: `Mídia do álbum ${resolvedAlbum.name}`,
  })), [resolvedAlbum]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/90 p-5 backdrop-blur-xl" role="dialog" aria-modal="true">
        <div className="pg-surface w-full max-w-sm p-6 text-center">
          <span className="mx-auto block h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[var(--pg-primary)]" />
          <p className="mt-4 text-sm font-bold text-white/55">Abrindo mídia privada com segurança…</p>
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="fixed inset-0 z-[320] flex items-center justify-center bg-black/90 p-5 backdrop-blur-xl" role="dialog" aria-modal="true">
        <div className="pg-surface w-full max-w-sm p-6 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/[0.05] text-white/35"><span className="material-symbols-rounded">photo_library</span></span>
          <h2 className="mt-4 font-bricolage text-xl font-black text-white">{resolvedAlbum.name}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/38">Não foi possível abrir nenhuma mídia deste álbum ou ele está vazio.</p>
          <button type="button" onClick={onClose} className="pg-btn pg-btn-light mt-5 w-full">Fechar</button>
        </div>
      </div>
    );
  }

  return <MediaViewer items={items} title={resolvedAlbum.name} initialIndex={initialIndex} onClose={onClose} />;
};
