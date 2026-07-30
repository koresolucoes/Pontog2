import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useAlbumStore } from '../stores/albumStore';
import { PrivateAlbum } from '../types';
import { useTranslation } from 'react-i18next';
import { useHardwareBack } from '../lib/useHardwareBack';
import { isVideoUrl } from '../lib/utils';

interface SelectAlbumModalProps {
  onClose: () => void;
  onSelect: (album: PrivateAlbum & { is_view_once?: boolean; expires_in_hours?: number }) => void;
}

export const SelectAlbumModal: React.FC<SelectAlbumModalProps> = ({ onClose, onSelect }) => {
  useHardwareBack(true, onClose);
  const { t } = useTranslation();
  const { myAlbums, isLoading, fetchMyAlbums } = useAlbumStore();
  const [selectedAlbum, setSelectedAlbum] = useState<PrivateAlbum | null>(null);
  const [isViewOnce, setIsViewOnce] = useState(false);
  const [expiresInHours, setExpiresInHours] = useState<number>(0); // 0 = sem expiração, 24 = 24h, 168 = 7 dias

  useEffect(() => {
    if (myAlbums.length === 0) {
      fetchMyAlbums();
    }
  }, [myAlbums, fetchMyAlbums]);

  const handleConfirmSend = () => {
    if (!selectedAlbum) return;
    onSelect({
      ...selectedAlbum,
      is_view_once: isViewOnce,
      expires_in_hours: expiresInHours > 0 ? expiresInHours : undefined
    });
  };

  return typeof document !== 'undefined' ? createPortal(
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center z-[200] animate-fade-in p-0 sm:p-4" onClick={onClose}>
      <div 
        className="bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl w-full max-w-lg mx-auto animate-slide-in-up sm:animate-fade-in-up flex flex-col h-[85vh] sm:h-auto sm:max-h-[85vh] border-t border-x border-white/10 sm:border-b overflow-hidden" 
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-5 border-b border-white/10 flex justify-between items-center flex-shrink-0 bg-slate-800/50">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <span className="material-symbols-rounded text-primary-400">send</span>
              {t('select_album.title', { defaultValue: 'Compartilhar Álbum Privado' })}
            </h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-full"><span className="material-symbols-outlined">close</span></button>
        </header>
        <main className="flex-1 overflow-y-auto p-5 space-y-6">
            {isLoading ? (
                <div className="flex justify-center py-10"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>
            ) : myAlbums.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <span className="material-symbols-rounded text-4xl mb-2 block">folder_off</span>
                  <p>{t('select_album.empty', { defaultValue: 'Você não tem álbuns privados para compartilhar.' })}</p>
                </div>
            ) : !selectedAlbum ? (
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    {t('select_album.choose', { defaultValue: 'Selecione um álbum:' })}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {myAlbums.map(album => {
                          const coverItem = album.private_album_photos && album.private_album_photos.length > 0 ? album.private_album_photos[0] : null;
                          const isVid = coverItem ? isVideoUrl(coverItem.photo_path, coverItem.media_type) : false;

                          return (
                              <div 
                                key={album.id} 
                                className="relative aspect-square group cursor-pointer rounded-xl overflow-hidden bg-slate-800 border border-white/5 hover:border-primary-500 transition-all shadow-md"
                                onClick={() => setSelectedAlbum(album)}
                              >
                                  {coverItem ? (
                                      isVid ? (
                                          <div className="w-full h-full relative flex items-center justify-center bg-slate-950">
                                              <video src={coverItem.photo_path} className="w-full h-full object-cover opacity-80" muted />
                                              <span className="material-symbols-rounded absolute text-3xl text-white drop-shadow">play_circle</span>
                                          </div>
                                      ) : (
                                          <img loading="lazy" src={coverItem.photo_path} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={album.name} />
                                      )
                                  ) : (
                                      <div className="w-full h-full flex items-center justify-center text-slate-500">
                                          <span className="material-symbols-rounded text-3xl">photo_library</span>
                                      </div>
                                  )}
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                                  <div className="absolute bottom-2 left-2 right-2">
                                      <span className="text-white font-bold text-sm block truncate">{album.name}</span>
                                      <span className="text-[11px] text-slate-300">
                                          {album.private_album_photos?.length || 0} {t('my_albums.items_count', { defaultValue: 'mídias' })}
                                      </span>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
                </div>
            ) : (
                /* Sub-menu para configurar opções do álbum selecionado */
                <div className="space-y-5 animate-fade-in">
                    <div className="flex items-center gap-3 bg-slate-800 p-3 rounded-xl border border-white/10">
                        <button type="button" onClick={() => setSelectedAlbum(null)} className="p-1 text-slate-400 hover:text-white">
                          <span className="material-symbols-rounded">arrow_back</span>
                        </button>
                        <div>
                          <p className="text-xs text-slate-400 font-medium">Álbum Selecionado</p>
                          <p className="text-base font-bold text-white">{selectedAlbum.name}</p>
                        </div>
                    </div>

                    {/* Modo de Visualização */}
                    <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                          Modo de Acesso
                        </label>
                        
                        <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => { setIsViewOnce(false); }}
                              className={`p-3 rounded-xl border text-left transition-all ${!isViewOnce ? 'bg-primary-600/20 border-primary-500 text-white' : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-white'}`}
                            >
                              <div className="flex items-center gap-2 font-bold text-sm">
                                <span className="material-symbols-rounded text-lg">lock_open</span>
                                Acesso Normal
                              </div>
                              <p className="text-[11px] opacity-80 mt-1">Livre para ver na galeria</p>
                            </button>

                            <button
                              type="button"
                              onClick={() => { setIsViewOnce(true); setExpiresInHours(0); }}
                              className={`p-3 rounded-xl border text-left transition-all ${isViewOnce ? 'bg-amber-600/20 border-amber-500 text-amber-200' : 'bg-slate-800/60 border-white/5 text-slate-400 hover:text-white'}`}
                            >
                              <div className="flex items-center gap-2 font-bold text-sm">
                                <span className="material-symbols-rounded text-lg">visibility_off</span>
                                Visualização Única
                              </div>
                              <p className="text-[11px] opacity-80 mt-1">Desaparece após abrir</p>
                            </button>
                        </div>
                    </div>

                    {/* Expiração por tempo (caso não seja visualização única) */}
                    {!isViewOnce && (
                      <div className="space-y-3">
                          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                            Validade do Acesso
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                              <button
                                type="button"
                                onClick={() => setExpiresInHours(0)}
                                className={`py-2 px-3 rounded-xl border text-center text-xs font-bold transition-all ${expiresInHours === 0 ? 'bg-primary-600/20 border-primary-500 text-white' : 'bg-slate-800/60 border-white/5 text-slate-400'}`}
                              >
                                Sem Vencimento
                              </button>

                              <button
                                type="button"
                                onClick={() => setExpiresInHours(24)}
                                className={`py-2 px-3 rounded-xl border text-center text-xs font-bold transition-all ${expiresInHours === 24 ? 'bg-primary-600/20 border-primary-500 text-white' : 'bg-slate-800/60 border-white/5 text-slate-400'}`}
                              >
                                Expira em 24h
                              </button>

                              <button
                                type="button"
                                onClick={() => setExpiresInHours(168)}
                                className={`py-2 px-3 rounded-xl border text-center text-xs font-bold transition-all ${expiresInHours === 168 ? 'bg-primary-600/20 border-primary-500 text-white' : 'bg-slate-800/60 border-white/5 text-slate-400'}`}
                              >
                                Expira em 7 dias
                              </button>
                          </div>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleConfirmSend}
                      className="w-full bg-primary-600 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 shadow-lg shadow-primary-900/30"
                    >
                      <span className="material-symbols-rounded">send</span>
                      Confirmar e Enviar Álbum
                    </button>
                </div>
            )}
        </main>
      </div>
    </div>,
    document.body
  ) : null;
};