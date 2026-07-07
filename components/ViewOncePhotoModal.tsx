import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

interface ViewOncePhotoModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ViewOncePhotoModal: React.FC<ViewOncePhotoModalProps> = ({ imageUrl, onClose }) => {
    const { t } = useTranslation();
    const [isFocused, setIsFocused] = useState(true);

    useEffect(() => {
        const handleBlur = () => setIsFocused(false);
        const handleFocus = () => setIsFocused(true);

        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        // Previne teclas comuns de captura/impressão (PrintScreen, Ctrl+S, Ctrl+P)
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === 'PrintScreen' || 
                (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'c')) ||
                (e.metaKey && (e.key === 'p' || e.key === 's' || e.key === 'c'))
            ) {
                e.preventDefault();
                setIsFocused(false); // Esconde conteúdo como segurança extra
                alert(t('chat.screenshot_protection', { defaultValue: 'Proteção de captura de tela ativa!' }));
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [t]);

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-[70] animate-fade-in select-none" 
            onClick={onClose}
            onContextMenu={(e) => e.preventDefault()} // Previne salvar imagem com clique direito
        >
            {/* Bloco de estilo CSS para impedir impressão de mídia */}
            <style>{`
                @media print {
                    body { display: none !important; }
                }
                .no-drag {
                    -webkit-user-drag: none;
                    user-drag: none;
                }
            `}</style>

            <div 
                className="relative w-full h-full flex flex-col items-center justify-center p-4" 
                onClick={(e) => e.stopPropagation()}
            >
                {isFocused ? (
                    <div className="relative max-h-[80vh] max-w-full flex items-center justify-center">
                        <img 
                            loading="lazy" 
                            src={imageUrl} 
                            alt={t('chat.view_once_photo_alt', { defaultValue: 'Foto de visualização única' })} 
                            className="max-h-[80vh] max-w-full object-contain rounded-lg shadow-2xl select-none no-drag" 
                            onDragStart={(e) => e.preventDefault()} // Previne arrastar a imagem
                        />
                        {/* Marca d'água dinâmica flutuante para inibir foto de celular externa */}
                        <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-12 pointer-events-none opacity-[0.07] overflow-hidden select-none">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <span key={i} className="text-white font-black font-outfit text-sm rotate-12 uppercase tracking-widest whitespace-nowrap">
                                    SAFE SPACE • VIEW ONCE
                                </span>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 max-w-xs">
                        <span className="material-symbols-rounded text-5xl text-rose-500 animate-pulse mb-3">security</span>
                        <h4 className="text-white font-bold mb-1">{t('chat.hidden_content_title', { defaultValue: 'Conteúdo Oculto' })}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{t('chat.hidden_content_desc', { defaultValue: 'Para sua privacidade, a imagem foi ocultada porque a janela perdeu o foco.' })}</p>
                    </div>
                )}

                <div className="mt-4 text-center pointer-events-none">
                    <p className="text-xs text-slate-500 font-medium tracking-wide flex items-center justify-center gap-1">
                        <span className="material-symbols-rounded text-sm text-red-500 animate-pulse">local_fire_department</span>
                        {t('chat.view_once_warning', { defaultValue: 'Esta imagem desaparecerá assim que você fechar.' })}
                    </p>
                </div>
            </div>

            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 text-white bg-black/40 p-3 rounded-full hover:bg-black/60 transition-colors border border-white/10"
            >
                <span className="material-symbols-rounded">close</span>
            </button>
        </div>
    )
};