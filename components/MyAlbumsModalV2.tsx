import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useAlbumStore } from '../stores/albumStore';
import type { PrivateAlbum } from '../types';
import { isVideoUrl } from '../lib/utils';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';
import { AlbumGalleryModal } from './AlbumGalleryModal';
import { ConfirmationModal } from './ConfirmationModal';

interface MyAlbumsModalProps { onClose: () => void; }

export const MyAlbumsModal: React.FC<MyAlbumsModalProps> = ({ onClose }) => {
  const { myAlbums, isLoading, fetchMyAlbums, createAlbum, deleteAlbum, uploadMedia, addPhotoToAlbum, deletePhotoFromAlbum, isUploading } = useAlbumStore();
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [newAlbumName, setNewAlbumName] = useState('');
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [albumToDelete, setAlbumToDelete] = useState<PrivateAlbum | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchMyAlbums(); }, [fetchMyAlbums]);
  const selectedAlbum = useMemo(() => myAlbums.find((album) => album.id === selectedAlbumId) || null, [myAlbums, selectedAlbumId]);

  const createNewAlbum = async (event: React.FormEvent) => {
    event.preventDefault();
    const name = newAlbumName.trim();
    if (!name) return;
    const created = await createAlbum(name);
    if (created) {
      setNewAlbumName('');
      setSelectedAlbumId(created.id);
      toast.success('Álbum criado.');
    } else toast.error('Não foi possível criar o álbum.');
  };

  const upload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !selectedAlbum) return;
    if (file.size > 50 * 1024 * 1024) return toast.error('A mídia deve ter no máximo 50 MB.');

    const toastId = toast.loading('Adicionando mídia...');
    const uploaded = await uploadMedia(file);
    if (!uploaded) return toast.error('Falha no upload.', { id: toastId });
    const saved = await addPhotoToAlbum(selectedAlbum.id, uploaded.path, uploaded.mediaType);
    if (!saved) return toast.error('Não foi possível adicionar a mídia ao álbum.', { id: toastId });
    toast.success(uploaded.mediaType === 'video' ? 'Vídeo adicionado.' : 'Foto adicionada.', { id: toastId });
  };

  const confirmDeleteAlbum = async () => {
    if (!albumToDelete) return;
    const target = albumToDelete;
    setAlbumToDelete(null);
    const ok = await deleteAlbum(target.id);
    if (ok) {
      if (selectedAlbumId === target.id) setSelectedAlbumId(null);
      toast.success('Álbum apagado.');
    } else toast.error('Não foi possível apagar o álbum.');
  };

  const confirmDeleteMedia = async () => {
    if (mediaToDelete === null) return;
    const id = mediaToDelete;
    setMediaToDelete(null);
    const ok = await deletePhotoFromAlbum(id);
    if (ok) toast.success('Mídia removida.');
    else toast.error('Não foi possível remover a mídia.');
  };

  const collectionView = (
    <div className="space-y-5">
      <section className="rounded-[24px] border border-primary-500/15 bg-primary-500/[0.055] p-4">
        <div className="flex gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-primary-500/10 text-primary-300"><span className="material-symbols-rounded">shield_lock</span></span>
          <div><h3 className="text-sm font-black text-white">Seu espaço privado</h3><p className="mt-1 text-xs leading-relaxed text-white/42">Álbuns não aparecem publicamente. Compartilhe uma coleção ou um álbum específico somente quando quiser.</p></div>
        </div>
      </section>

      <form onSubmit={createNewAlbum} className="flex gap-2">
        <input value={newAlbumName} onChange={(event) => setNewAlbumName(event.target.value)} maxLength={50} placeholder="Nome do novo álbum" className="pg-field flex-1" />
        <Button type="submit" variant="light" icon="add" disabled={!newAlbumName.trim()}>Criar</Button>
      </form>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">{[0,1,2,3].map((item) => <div key={item} className="aspect-[4/5] animate-pulse rounded-[24px] bg-white/[0.035]" />)}</div>
      ) : !myAlbums.length ? (
        <div className="py-10 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/[0.04] text-white/25"><span className="material-symbols-rounded !text-[30px]">lock</span></span><h3 className="mt-4 font-bricolage text-xl font-black text-white">Crie seu primeiro álbum</h3><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/36">Separe fotos e vídeos que você prefere compartilhar só em conversas e conexões escolhidas.</p></div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {myAlbums.map((album) => {
            const cover = album.private_album_photos?.[0];
            const coverIsVideo = !!cover && isVideoUrl(cover.photo_path, cover.media_type);
            return (
              <button key={album.id} type="button" onClick={() => setSelectedAlbumId(album.id)} className="group relative aspect-[4/5] overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.035] text-left shadow-[0_16px_40px_rgba(0,0,0,.22)]">
                {cover ? coverIsVideo ? <video src={cover.photo_path} muted preload="metadata" className="h-full w-full object-cover opacity-80" /> : <img src={cover.photo_path} alt={album.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]" /> : <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_25%,rgba(129,13,247,.12),transparent_45%)] text-white/16"><span className="material-symbols-rounded !text-[42px]">photo_library</span></div>}
                <div className="absolute inset-0 bg-gradient-to-t from-black/92 via-black/12 to-black/10" />
                <span className="absolute left-3 top-3 rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[9px] font-black uppercase tracking-[.12em] text-white/65 backdrop-blur-xl">Privado</span>
                {coverIsVideo && <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/48 text-white backdrop-blur"><span className="material-symbols-rounded filled !text-[18px]">play_arrow</span></span>}
                <div className="absolute inset-x-0 bottom-0 p-3.5"><h3 className="truncate font-bricolage text-lg font-black text-white">{album.name}</h3><p className="mt-1 text-[11px] font-bold text-white/44">{album.private_album_photos?.length || 0} {(album.private_album_photos?.length || 0) === 1 ? 'mídia' : 'mídias'}</p></div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  const detailView = selectedAlbum ? (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setSelectedAlbumId(null)} className="pg-icon-btn"><span className="material-symbols-rounded">arrow_back</span></button>
        <div className="min-w-0 flex-1"><p className="pg-eyebrow">Álbum privado</p><h3 className="mt-1 truncate font-bricolage text-xl font-black text-white">{selectedAlbum.name}</h3></div>
        <button type="button" onClick={() => setAlbumToDelete(selectedAlbum)} className="pg-icon-btn !text-red-300" aria-label="Apagar álbum"><span className="material-symbols-rounded">delete</span></button>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-3.5"><div><p className="text-sm font-black text-white">{selectedAlbum.private_album_photos?.length || 0} mídias</p><p className="mt-1 text-[11px] text-white/34">Toque numa mídia para abrir o visualizador.</p></div><Button type="button" variant="secondary" icon="add_photo_alternate" onClick={() => fileInputRef.current?.click()} loading={isUploading}>Adicionar</Button></div>
      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={upload} />

      {!selectedAlbum.private_album_photos?.length ? (
        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex min-h-[220px] w-full flex-col items-center justify-center rounded-[26px] border border-dashed border-white/12 bg-white/[0.02] text-white/28"><span className="material-symbols-rounded !text-[34px]">add_photo_alternate</span><span className="mt-3 text-sm font-black text-white/55">Adicionar foto ou vídeo</span><span className="mt-1 text-xs">até 50 MB por arquivo</span></button>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {selectedAlbum.private_album_photos.map((media, index) => {
            const video = isVideoUrl(media.photo_path, media.media_type);
            return <div key={media.id} className="group relative aspect-[3/4] overflow-hidden rounded-[18px] bg-black/25"><button type="button" onClick={() => setViewerIndex(index)} className="h-full w-full">{video ? <><video src={media.photo_path} muted preload="metadata" className="h-full w-full object-cover opacity-85" /><span className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/48 text-white"><span className="material-symbols-rounded filled">play_arrow</span></span></> : <img src={media.photo_path} alt={`Mídia ${index + 1}`} className="h-full w-full object-cover" />}</button><button type="button" onClick={() => setMediaToDelete(media.id)} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/62 text-white opacity-100 backdrop-blur sm:opacity-0 sm:group-hover:opacity-100" aria-label="Remover mídia"><span className="material-symbols-rounded !text-[17px]">delete</span></button></div>;
          })}
        </div>
      )}
    </div>
  ) : null;

  return <>
    <ModalShell onClose={onClose} size="lg" eyebrow="Privacidade" title="Álbuns privados" description={selectedAlbum ? undefined : 'Organize o que é íntimo sem misturar com sua galeria pública.'} icon="lock">{selectedAlbum ? detailView : collectionView}</ModalShell>
    {selectedAlbum && viewerIndex !== null && <AlbumGalleryModal album={selectedAlbum} initialIndex={viewerIndex} onClose={() => setViewerIndex(null)} />}
    <ConfirmationModal isOpen={!!albumToDelete} title="Apagar este álbum?" message="As mídias deixam de aparecer neste álbum e compartilhamentos relacionados podem perder o acesso." confirmText="Apagar álbum" onConfirm={confirmDeleteAlbum} onCancel={() => setAlbumToDelete(null)} />
    <ConfirmationModal isOpen={mediaToDelete !== null} title="Remover esta mídia?" message="Ela será removida do álbum privado." confirmText="Remover" onConfirm={confirmDeleteMedia} onCancel={() => setMediaToDelete(null)} />
  </>;
};
