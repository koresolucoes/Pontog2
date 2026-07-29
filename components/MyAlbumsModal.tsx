import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAlbumStore } from '../stores/albumStore';
import { PrivateAlbum } from '../types';
import { useTranslation } from 'react-i18next';
import { useHardwareBack } from '../lib/useHardwareBack';

interface MyAlbumsModalProps {
  onClose: () => void;
}

export const MyAlbumsModal: React.FC<MyAlbumsModalProps> = ({ onClose }) => {
  useHardwareBack(true, onClose);
  const { t } = useTranslation();
  const { myAlbums, isLoading, fetchMyAlbums, createAlbum, deleteAlbum, uploadPhoto, addPhotoToAlbum, deletePhotoFromAlbum, isUploading } = useAlbumStore();
  const [newAlbumName, setNewAlbumName] = useState('');
  const [selectedAlbum, setSelectedAlbum] = useState<PrivateAlbum | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchMyAlbums();
  }, [fetchMyAlbums]);

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newAlbumName.trim()) {
      await createAlbum(newAlbumName.trim());
      setNewAlbumName('');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedAlbum) return;
    const file = event.target.files?.[0];
    if (!file) return;

    const newPath = await uploadPhoto(file);
    if (newPath) {
        await addPhotoToAlbum(selectedAlbum.id, newPath);
    } else {
        alert(t('my_albums.upload_failed', { defaultValue: 'Falha no upload da foto.' }));
    }
  };
  
  const MainView = () => (
    <>
      <header className="p-5 border-b border-white/10 flex justify-between items-center flex-shrink-0 bg-slate-800/50 rounded-t-3xl">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span className="material-symbols-rounded text-primary-500 filled">photo_library</span>
            {t('my_albums.title', { defaultValue: 'Meus Álbuns Privados' })}
        </h2>
        <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
            <span className="material-symbols-rounded">close</span>
        </button>
      </header>
      <main className="flex-1 overflow-y-auto p-5 space-y-6 bg-slate-900/50">
        <div className="bg-slate-800/50 p-4 rounded-2xl border border-white/5">
            <form onSubmit={handleCreateAlbum} className="flex gap-2">
            <input
                type="text"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value)}
                placeholder={t('my_albums.new_album_placeholder', { defaultValue: 'Nome do novo álbum...' })}
                className="flex-1 bg-slate-900 rounded-xl py-3 px-4 text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-primary-500/50 transition-all border border-white/5"
            />
            <button type="submit" className="bg-primary-600 text-white font-bold p-3 rounded-xl hover:bg-primary-700 transition-colors hover:scale-105 active:scale-95 shadow-lg shadow-primary-900/20">
                <span className="material-symbols-rounded">add</span>
            </button>
            </form>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>
        ) : myAlbums.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center animate-fade-in">
                <div className="w-20 h-20 bg-slate-800/80 rounded-full flex items-center justify-center mb-4 border border-white/10 shadow-inner">
                    <span className="material-symbols-rounded text-4xl text-slate-600 opacity-80">lock</span>
                </div>
                <h3 className="text-lg font-bold text-white font-outfit">{t('my_albums.empty_title', { defaultValue: 'Seu espaço secreto' })}</h3>
                <p className="text-sm text-slate-400 mt-2 max-w-xs">{t('my_albums.empty_desc', { defaultValue: 'Crie álbuns para compartilhar fotos apenas com quem você permitir.' })}</p>
            </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {myAlbums.map(album => (
              <div key={album.id} className="relative aspect-square group cursor-pointer rounded-2xl overflow-hidden bg-slate-800 shadow-md hover:shadow-xl transition-all border border-white/5" onClick={() => setSelectedAlbum(album)}>
                {album.private_album_photos && album.private_album_photos.length > 0 ? (
                   <img loading="lazy" src={album.private_album_photos[0].photo_path} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80 group-hover:opacity-100"/>
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
                        <span className="material-symbols-rounded text-4xl opacity-50">image_not_supported</span>
                    </div>
                )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent"></div>
                 <div className="absolute bottom-3 left-3 right-3">
                    <span className="font-bold text-white block truncate text-lg leading-tight drop-shadow-lg">{album.name}</span>
                    <div className="flex items-center gap-1 text-xs text-slate-300 font-medium mt-0.5">
                        <span className="material-symbols-rounded text-[14px]">photo_library</span>
                        <span>{album.private_album_photos?.length || 0} {t('my_albums.photos_count', { defaultValue: 'fotos' })}</span>
                    </div>
                 </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );

  const AlbumDetailView = () => {
    if (!selectedAlbum) return null;
    return (
     <>
      <header className="p-5 border-b border-white/10 flex justify-between items-center flex-shrink-0 bg-slate-800/50 rounded-t-3xl">
        <div className="flex items-center gap-3">
            <button onClick={() => setSelectedAlbum(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
                <span className="material-symbols-rounded">arrow_back</span>
            </button>
            <h2 className="text-lg font-bold text-white truncate max-w-[200px]">{selectedAlbum.name}</h2>
        </div>
        <button type="button" onClick={() => deleteAlbum(selectedAlbum.id).then(() => setSelectedAlbum(null))} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors">
            <span className="material-symbols-rounded">delete</span>
        </button>
      </header>
       <main className="flex-1 overflow-y-auto p-5 bg-slate-900/50">
           <input type="file" accept="image/*" onChange={handleFileSelect} ref={fileInputRef} className="hidden" disabled={isUploading} />
            <div className="grid grid-cols-3 gap-2">
                <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="flex flex-col items-center justify-center w-full aspect-square bg-slate-800/50 rounded-xl border-2 border-dashed border-slate-600 text-slate-400 hover:bg-slate-800 hover:border-primary-500 hover:text-primary-500 transition-all group"
                >
                    {isUploading ? (
                        <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                        <span className="material-symbols-rounded text-3xl group-hover:scale-110 transition-transform">add</span>
                    )}
                </button>
                {selectedAlbum.private_album_photos?.map(photo => (
                    <div key={photo.id} className="relative group aspect-square rounded-xl overflow-hidden shadow-sm border border-white/5">
                        <img loading="lazy" src={photo.photo_path} alt={t('my_albums.photo_alt', { defaultValue: 'foto do álbum' })} className="w-full h-full object-cover" />
                        <button 
                            type="button" 
                            onClick={() => deletePhotoFromAlbum(photo.id)} 
                            className="absolute top-2 right-2 bg-black/60 text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-600 transition-colors backdrop-blur-sm z-10 shadow-lg"
                        >
                            <span className="material-symbols-rounded text-[18px]">delete</span>
                        </button>
                    </div>
                ))}
            </div>
       </main>
      </>
    )
  }

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 bg-dark-900/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div 
        className="bg-slate-900/95 backdrop-blur-xl rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-2xl mx-auto animate-slide-in-up sm:animate-fade-in-up flex flex-col h-[85vh] sm:h-auto sm:max-h-[80vh] border border-white/10" 
        onClick={(e) => e.stopPropagation()}
      >
        {selectedAlbum ? AlbumDetailView() : MainView()}
      </div>
    </div>,
    document.body
  ) : null;
};