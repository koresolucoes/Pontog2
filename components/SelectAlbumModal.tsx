import React, { useEffect, useState } from 'react';
import { useAlbumStore } from '../stores/albumStore';
import type { PrivateAlbum } from '../types';
import { isVideoUrl } from '../lib/utils';
import { ModalShell } from './ui/ModalShell';

interface SelectAlbumModalProps {
  onClose: () => void;
  onSelect: (album: PrivateAlbum & { is_view_once?: boolean; expires_in_hours?: number }) => void;
}

export const SelectAlbumModal: React.FC<SelectAlbumModalProps> = ({ onClose, onSelect }) => {
  const { myAlbums, isLoading, fetchMyAlbums } = useAlbumStore();
  const [selectedAlbum, setSelectedAlbum] = useState<PrivateAlbum | null>(null);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState(0);

  useEffect(() => {
    if (!myAlbums.length) fetchMyAlbums();
  }, [myAlbums.length, fetchMyAlbums]);

  const confirm = () => {
    if (!selectedAlbum) return;
    onSelect({
      ...selectedAlbum,
      is_view_once: isViewOnce,
      expires_in_hours: !isViewOnce && expiresInHours > 0 ? expiresInHours : undefined,
    });
  };

  return (
    <ModalShell
      onClose={onClose}
      size="lg"
      eyebrow="Conversa privada"
      title="Compartilhar álbum"
      description={selectedAlbum ? 'Defina como essa pessoa poderá acessar o conteúdo.' : 'Escolha um álbum privado para compartilhar nesta conversa.'}
      icon="photo_library"
      footer={selectedAlbum ? (
        <div className="flex gap-2">
          <button type="button" className="pg-btn pg-btn-secondary flex-1" onClick={() => setSelectedAlbum(null)}>Voltar</button>
          <button type="button" className="pg-btn pg-btn-primary flex-[1.4]" onClick={confirm}><span className="material-symbols-rounded text-lg">send</span>Compartilhar</button>
        </div>
      ) : undefined}
    >
      {isLoading ? (
        <div className="space-y-3 py-2">
          {Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-24 animate-pulse rounded-[22px] border border-white/5 bg-white/[0.035]" />)}
        </div>
      ) : !myAlbums.length ? (
        <div className="py-10 text-center">
          <span className="material-symbols-rounded mb-3 text-4xl text-white/20">folder_off</span>
          <h3 className="pg-title text-xl text-white">Nenhum álbum ainda</h3>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/45">Crie um álbum privado no seu perfil antes de compartilhá-lo em uma conversa.</p>
        </div>
      ) : !selectedAlbum ? (
        <div className="space-y-2">
          {myAlbums.map((album) => {
            const cover = album.private_album_photos?.[0];
            const isVideo = cover ? isVideoUrl(cover.photo_path, cover.media_type) : false;
            return (
              <button
                type="button"
                key={album.id}
                onClick={() => setSelectedAlbum(album)}
                className="flex w-full items-center gap-3 rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-3 text-left transition hover:bg-white/[0.06] active:scale-[.99]"
              >
                <span className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[18px] bg-white/[0.04]">
                  {cover ? (
                    isVideo ? <video src={cover.photo_path} muted className="h-full w-full object-cover" /> : <img src={cover.photo_path} alt="" className="h-full w-full object-cover" />
                  ) : <span className="flex h-full w-full items-center justify-center"><span className="material-symbols-rounded text-3xl text-white/18">photo_library</span></span>}
                  {isVideo && <span className="absolute inset-0 flex items-center justify-center bg-black/20"><span className="material-symbols-rounded text-2xl text-white">play_circle</span></span>}
                </span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-[15px] text-white">{album.name}</strong>
                  <span className="mt-1 block text-xs text-white/42">{album.private_album_photos?.length || 0} mídias</span>
                </span>
                <span className="material-symbols-rounded text-white/25">chevron_right</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-3 rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-secondary-500/10 text-secondary-300"><span className="material-symbols-rounded">photo_library</span></span>
            <div className="min-w-0"><p className="pg-eyebrow">Álbum selecionado</p><p className="mt-1 truncate text-sm font-extrabold text-white">{selectedAlbum.name}</p></div>
          </div>

          <section>
            <p className="pg-eyebrow mb-3">Modo de acesso</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setIsViewOnce(false)} className={`rounded-[20px] border p-3 text-left transition ${!isViewOnce ? 'border-primary-500/35 bg-primary-500/10' : 'border-white/[0.07] bg-white/[0.035]'}`}>
                <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${!isViewOnce ? 'bg-primary-500/14 text-primary-300' : 'bg-white/[0.045] text-white/45'}`}><span className="material-symbols-rounded">lock_open</span></span>
                <strong className="block text-sm text-white">Acesso privado</strong>
                <span className="mt-1 block text-xs leading-relaxed text-white/40">Pode abrir enquanto o acesso estiver válido.</span>
              </button>
              <button type="button" onClick={() => { setIsViewOnce(true); setExpiresInHours(0); }} className={`rounded-[20px] border p-3 text-left transition ${isViewOnce ? 'border-primary-500/35 bg-primary-500/10' : 'border-white/[0.07] bg-white/[0.035]'}`}>
                <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-2xl ${isViewOnce ? 'bg-primary-500/14 text-primary-300' : 'bg-white/[0.045] text-white/45'}`}><span className="material-symbols-rounded">visibility_off</span></span>
                <strong className="block text-sm text-white">Visualização única</strong>
                <span className="mt-1 block text-xs leading-relaxed text-white/40">A mensagem fica marcada como aberta após o primeiro acesso.</span>
              </button>
            </div>
          </section>

          {!isViewOnce && (
            <section>
              <p className="pg-eyebrow mb-3">Validade</p>
              <div className="flex flex-wrap gap-2">
                {[{ value: 0, label: 'Sem vencimento' }, { value: 24, label: '24 horas' }, { value: 168, label: '7 dias' }].map((option) => (
                  <button type="button" key={option.value} onClick={() => setExpiresInHours(option.value)} className={`pg-chip ${expiresInHours === option.value ? 'pg-chip-active' : ''}`}>{option.label}</button>
                ))}
              </div>
            </section>
          )}

          <div className="rounded-[20px] border border-white/[0.06] bg-black/15 p-3 text-xs leading-relaxed text-white/40">
            <span className="material-symbols-rounded mr-1.5 align-middle text-sm text-white/35">shield_lock</span>
            O álbum continua privado e somente esta conversa recebe o acesso configurado acima.
          </div>
        </div>
      )}
    </ModalShell>
  );
};
