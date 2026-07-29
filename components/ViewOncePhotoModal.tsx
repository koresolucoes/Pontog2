import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useHardwareBack } from '../lib/useHardwareBack';

interface ViewOncePhotoModalProps {
  imageUrl: string;
  onClose: () => void;
}

export const ViewOncePhotoModal: React.FC<ViewOncePhotoModalProps> = ({ imageUrl, onClose }) => {
    useHardwareBack(true, onClose);
    const { t } = useTranslation();
    const [isFocused, setIsFocused] = useState(true);
    const [isHolding, setIsHolding] = useState(false);
    const [timeLeft, setTimeLeft] = useState(5.0); // 5 segundos de visualização cumulativa
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Monitoramento do foco da janela para proteção extra
    useEffect(() => {
        const handleBlur = () => {
            setIsFocused(false);
            setIsHolding(false);
        };
        const handleFocus = () => {
            setIsFocused(true);
        };

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
                setIsFocused(false);
                setIsHolding(false);
                alert(t('chat.screenshot_protection', { defaultValue: 'Proteção de captura de tela ativa!' }));
            }
        };

        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            window.removeEventListener('keydown', handleKeyDown);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [t]);

    // Timer decrescente que funciona apenas enquanto o usuário estiver mantendo o clique/toque
    useEffect(() => {
        if (isHolding && isFocused && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => {
                    const nextValue = Math.max(0, prev - 0.1);
                    if (nextValue <= 0) {
                        if (timerRef.current) clearInterval(timerRef.current);
                        onClose(); // Fecha o modal permanentemente quando o tempo expira
                    }
                    return nextValue;
                });
            }, 100);
        } else {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [isHolding, isFocused, timeLeft, onClose]);

    const handleStartReveal = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        if (isFocused && timeLeft > 0) {
            setIsHolding(true);
        }
    };

    const handleEndReveal = () => {
        setIsHolding(false);
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-98 flex items-center justify-center z-[70] animate-fade-in select-none touch-none" 
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
                {/* Indicador de Status / Tempo Restante */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center z-10 w-full max-w-xs px-4">
                    <div className="bg-slate-900/90 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md inline-flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${isHolding ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                        <span className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                            {isHolding 
                                ? t('chat.view_once_time', { defaultValue: `Visualizando: ${timeLeft.toFixed(1)}s` })
                                : t('chat.view_once_ready', { defaultValue: 'Pronto para visualizar' })
                            }
                        </span>
                    </div>
                </div>

                {isFocused ? (
                    <div 
                        className="relative w-full max-w-md h-[60vh] flex flex-col items-center justify-center bg-slate-950/60 rounded-3xl border border-white/5 overflow-hidden transition-all duration-300"
                        onMouseDown={handleStartReveal}
                        onMouseUp={handleEndReveal}
                        onMouseLeave={handleEndReveal}
                        onTouchStart={handleStartReveal}
                        onTouchEnd={handleEndReveal}
                        onTouchCancel={handleEndReveal}
                    >
                        {/* Imagem Revelada */}
                        <div className={`absolute inset-0 flex items-center justify-center p-4 transition-all duration-300 ${isHolding ? 'opacity-100 scale-100 filter-none' : 'opacity-0 scale-95 blur-2xl pointer-events-none'}`}>
                            <img 
                                loading="lazy" 
                                src={imageUrl} 
                                alt={t('chat.view_once_photo_alt', { defaultValue: 'Foto de visualização única' })} 
                                className="max-h-full max-w-full object-contain rounded-2xl shadow-2xl select-none no-drag" 
                                onDragStart={(e) => e.preventDefault()}
                            />
                            {/* Marca d'água dinâmica flutuante */}
                            <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-12 pointer-events-none opacity-[0.08] overflow-hidden select-none">
                                {Array.from({ length: 12 }).map((_, i) => (
                                    <span key={i} className="text-white font-black font-outfit text-sm rotate-12 uppercase tracking-widest whitespace-nowrap">
                                        SAFE SPACE • VIEW ONCE
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Tela de Espera: Pressione e Segure */}
                        <div className={`absolute inset-0 flex flex-col items-center justify-center text-center p-6 transition-all duration-300 ${!isHolding ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'}`}>
                            <div className="w-20 h-20 bg-primary-500/10 border border-primary-500/20 rounded-full flex items-center justify-center mb-6 animate-pulse shadow-lg shadow-primary-500/5">
                                <span className="material-symbols-rounded text-4xl text-primary-400">fingerprint</span>
                            </div>
                            <h3 className="text-white font-black font-outfit text-lg mb-2">
                                {t('chat.hold_to_reveal_title', { defaultValue: 'Pressione e Segure' })}
                            </h3>
                            <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
                                {t('chat.hold_to_reveal_desc', { defaultValue: 'Toque e mantenha o dedo pressionado na tela para revelar a foto. Solte para ocultar instantaneamente.' })}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 max-w-xs animate-fade-in">
                        <span className="material-symbols-rounded text-5xl text-rose-500 animate-pulse mb-3">security</span>
                        <h4 className="text-white font-bold mb-1">{t('chat.hidden_content_title', { defaultValue: 'Conteúdo Oculto' })}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{t('chat.hidden_content_desc', { defaultValue: 'Para sua privacidade, a imagem foi ocultada porque a janela perdeu o foco.' })}</p>
                    </div>
                )}

                <div className="mt-6 text-center pointer-events-none max-w-xs">
                    <p className="text-xs text-slate-500 font-medium tracking-wide flex items-center justify-center gap-1.5 leading-relaxed">
                        <span className="material-symbols-rounded text-sm text-red-500 animate-pulse">local_fire_department</span>
                        {t('chat.view_once_warning', { defaultValue: 'Esta imagem possui apenas 5 segundos de visualização cumulativa e é destruída após o fechamento.' })}
                    </p>
                </div>
            </div>

            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 text-white bg-slate-900/80 p-3 rounded-full hover:bg-slate-800 transition-colors border border-white/10 z-20"
            >
                <span className="material-symbols-rounded">close</span>
            </button>
        </div>
    )
};