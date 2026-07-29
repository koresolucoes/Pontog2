import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAlbumStore } from '../stores/albumStore';
import { PrivateAlbum } from '../types';
import { useTranslation } from 'react-i18next';
import { useHardwareBack } from '../lib/useHardwareBack';

interface SelectAlbumModalProps {
  onClose: () => void;
  onSelect: (album: PrivateAlbum) => void;
}

export const SelectAlbumModal: React.FC<SelectAlbumModalProps> = ({ onClose, onSelect }) => {
  useHardwareBack(true, onClose);
  const { t } = useTranslation();
  const { myAlbums, isLoading, fetchMyAlbums } = useAlbumStore();

  useEffect(() => {
    // Fetch albums if they are not already loaded
    if (myAlbums.length === 0) {
      fetchMyAlbums();
    }
  }, [myAlbums, fetchMyAlbums]);

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] animate-fade-in p-0 sm:p-4" onClick={onClose}>
      <div 
        className="bg-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg mx-auto animate-slide-in-up sm:animate-fade-in-up flex flex-col h-[80vh] sm:h-auto sm:max-h-[80vh] border-t border-x border-white/10 sm:border-b overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-6 border-b border-slate-700 flex justify-between items-center flex-shrink-0">
            <h2 className="text-xl font-bold text-white">{t('select_album.title', { defaultValue: 'Compartilhar Álbum' })}</h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><span className="material-symbols-outlined">close</span></button>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
                <p className="text-slate-400 text-center">{t('select_album.loading', { defaultValue: 'Carregando seus álbuns...' })}</p>
            ) : myAlbums.length === 0 ? (
                <p className="text-slate-400 text-center">{t('select_album.empty', { defaultValue: 'Você não tem álbuns privados para compartilhar.' })}</p>
            ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {myAlbums.map(album => (
                        <div key={album.id} className="relative aspect-square group cursor-pointer" onClick={() => onSelect(album)}>
                            <div className="absolute inset-0 bg-slate-700 rounded-lg flex items-center justify-center text-center p-2">
                                <span className="font-bold text-white">{album.name}</span>
                            </div>
                            {album.private_album_photos && album.private_album_photos.length > 0 && (
                                <img loading="lazy" src={album.private_album_photos[0].photo_path} className="w-full h-full object-cover rounded-lg" alt={`Capa do álbum ${album.name}`} />
                            )}
                            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <span className="text-white font-bold">{t('common.send', { defaultValue: 'Enviar' })}</span>
                            </div>
                            <div className="absolute bottom-2 left-2 text-white text-xs font-semibold bg-black/50 px-1.5 py-0.5 rounded">
                                {t('select_album.photo_count', { defaultValue: '{{count}} fotos', count: album.private_album_photos?.length || 0 })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </main>
      </div>
    </div>,
    document.body
  ) : null;
};