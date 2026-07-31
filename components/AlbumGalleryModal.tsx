import React, { useState } from 'react';
import { PrivateAlbum } from '../types';
import { useTranslation } from 'react-i18next';
import { useHardwareBack } from '../lib/useHardwareBack';
import { isVideoUrl } from '../lib/utils';

interface AlbumGalleryModalProps {
  album: PrivateAlbum;
  onClose: () => void;
}

export const AlbumGalleryModal: React.FC<AlbumGalleryModalProps> = ({ album, onClose }) => {
  useHardwareBack(true, onClose);
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const photos = album.private_album_photos || [];

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe) {
      nextPhoto();
    }
    if (isRightSwipe) {
      prevPhoto();
    }
  };

  const nextPhoto = () => setCurrentIndex((prev) => (prev + 1) % photos.length);
  const prevPhoto = () => setCurrentIndex((prev) => (prev - 1 + photos.length) % photos.length);

  if (!photos || photos.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[180] animate-fade-in" onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}>
        <div className="bg-slate-800 p-8 rounded-2xl text-center border border-white/10" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-xl font-bold mb-4 text-white">{album.name}</h2>
          <p className="text-slate-400">{t('gallery.empty_album', { defaultValue: 'Este álbum está vazio.' })}</p>
           <button onClick={onClose} className="mt-6 bg-primary-600 text-white font-bold py-2 px-6 rounded-xl hover:bg-primary-700 transition-colors">{t('common.close', { defaultValue: 'Fechar' })}</button>
        </div>
      </div>
    );
  }

  const currentItem = photos[currentIndex];
  const isVideo = currentItem ? isVideoUrl(currentItem.photo_path, currentItem.media_type) : false;

  return (
    <div 
      className="fixed inset-0 bg-black/95 backdrop-blur-md flex flex-col items-center justify-center z-[180] animate-fade-in" 
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      
      <div className="w-full h-full flex items-center justify-center p-4 sm:p-10" onClick={(e) => e.stopPropagation()}>
        <div className="relative w-full max-w-5xl aspect-[4/5] sm:aspect-video flex items-center justify-center">
            {isVideo ? (
                <video 
                    key={currentItem.photo_path}
                    src={currentItem.photo_path} 
                    controls 
                    autoPlay 
                    playsInline 
                    className="max-w-full max-h-full rounded-lg shadow-2xl" 
                />
            ) : (
                <img 
                    key={currentItem.photo_path}
                    loading="lazy" 
                    src={currentItem.photo_path} 
                    alt={t('gallery.photo_alt', { defaultValue: 'Foto {{current}} do álbum {{name}}', current: currentIndex + 1, name: album.name })} 
                    className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" 
                />
            )}
        </div>
      </div>

       <button onClick={onClose} className="absolute top-4 right-4 text-white bg-black/40 p-3 rounded-full hover:bg-white/10 transition-colors z-20 backdrop-blur-sm">
            <span className="material-symbols-rounded text-xl">close</span>
        </button>

        {photos.length > 1 && (
        <>
            <button onClick={prevPhoto} className="absolute left-4 top-1/2 -translate-y-1/2 text-white bg-black/40 p-4 rounded-full hover:bg-white/10 transition-colors z-20 backdrop-blur-sm">
                <span className="material-symbols-rounded text-3xl">chevron_left</span>
            </button>
            <button onClick={nextPhoto} className="absolute right-4 top-1/2 -translate-y-1/2 text-white bg-black/40 p-4 rounded-full hover:bg-white/10 transition-colors z-20 backdrop-blur-sm">
                <span className="material-symbols-rounded text-3xl">chevron_right</span>
            </button>
        </>
        )}

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-white bg-black/60 backdrop-blur-md px-6 py-3 rounded-full border border-white/10 flex flex-col items-center">
          <p className="font-bold text-sm flex items-center justify-center gap-1.5">
            {isVideo && <span className="material-symbols-rounded text-primary-400 text-base">videocam</span>}
            {album.name}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">{currentIndex + 1} / {photos.length}</p>
      </div>
    </div>
  );
};