import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';

interface ViewOnceAudioModalProps {
  audioUrl: string;
  onClose: () => void;
}

export const ViewOnceAudioModal: React.FC<ViewOnceAudioModalProps> = ({ audioUrl, onClose }) => {
    const { t } = useTranslation();
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFocused, setIsFocused] = useState(true);
    const [hasStarted, setHasStarted] = useState(false);
    
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Protection and Focus logic
    useEffect(() => {
        const handleBlur = () => {
            setIsFocused(false);
            if (audioRef.current && isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        };
        const handleFocus = () => {
            setIsFocused(true);
        };

        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);

        return () => {
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            if (audioRef.current) {
                audioRef.current.pause();
            }
        };
    }, [isPlaying]);

    // Initialize Audio
    useEffect(() => {
        const audio = new Audio(audioUrl);
        audioRef.current = audio;
        audio.preload = 'auto';

        const handleLoadedMetadata = () => {
            setDuration(audio.duration || 0);
        };

        const handleTimeUpdate = () => {
            setCurrentTime(audio.currentTime);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            onClose(); // Automatically close and destroy when audio finishes playing
        };

        audio.addEventListener('loadedmetadata', handleLoadedMetadata);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('ended', handleEnded);

        return () => {
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleEnded);
            audio.pause();
            audioRef.current = null;
        };
    }, [audioUrl, onClose]);

    const togglePlay = () => {
        if (!isFocused || !audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
            setIsPlaying(false);
        } else {
            audioRef.current.play().catch(err => console.error("Error playing audio:", err));
            setIsPlaying(true);
            setHasStarted(true);
        }
    };

    const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

    const formatTime = (time: number) => {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-98 flex items-center justify-center z-[70] animate-fade-in select-none touch-none" 
            onContextMenu={(e) => e.preventDefault()}
        >
            {/* Custom Animation CSS for the Waveform */}
            <style>{`
                @keyframes audio-wave-pulse {
                    0%, 100% {
                        transform: scaleY(0.25);
                    }
                    50% {
                        transform: scaleY(1.3);
                    }
                }
                .animate-audio-wave {
                    animation: audio-wave-pulse 1.2s ease-in-out infinite;
                    transform-origin: center;
                }
            `}</style>

            <div 
                className="relative w-full h-full flex flex-col items-center justify-center p-4" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header Status Indicator */}
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center z-10 w-full max-w-xs px-4">
                    <div className="bg-slate-900/90 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md inline-flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${isPlaying ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`} />
                        <span className="text-xs font-bold text-white tracking-wide uppercase font-mono">
                            {isPlaying 
                                ? t('chat.listening_once', { defaultValue: 'Ouvindo...' })
                                : hasStarted 
                                ? t('chat.audio_paused', { defaultValue: 'Pausado' })
                                : t('chat.audio_ready', { defaultValue: 'Áudio Pronto (1x)' })
                            }
                        </span>
                    </div>
                </div>

                {isFocused ? (
                    <div className="relative w-full max-w-md h-[50vh] flex flex-col items-center justify-center bg-slate-950/60 rounded-3xl border border-white/5 p-6 transition-all duration-300">
                        {/* Audio Wave Visualizer representation */}
                        <div className="h-24 flex items-center justify-center gap-1.5 mb-8 w-full max-w-xs px-4">
                            {Array.from({ length: 15 }).map((_, i) => {
                                const baseHeight = 15 + (i % 4) * 15;
                                return (
                                    <div
                                        key={i}
                                        style={{ 
                                            height: isPlaying ? undefined : `${baseHeight}px`,
                                            animationDelay: `${i * 0.08}s`
                                        }}
                                        className={`w-1.5 bg-gradient-to-t from-primary-500 to-secondary-500 rounded-full transition-all duration-300 ${isPlaying ? 'animate-audio-wave' : 'opacity-60'}`}
                                    />
                                );
                            })}
                        </div>

                        {/* Progress Bar and Times */}
                        <div className="w-full max-w-xs mb-8 space-y-2">
                            <div className="relative w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                                <div 
                                    className="absolute left-0 top-0 h-full bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full transition-all duration-100 ease-out"
                                    style={{ width: `${progressPercentage}%` }}
                                />
                            </div>
                            <div className="flex justify-between text-[11px] font-bold font-mono text-slate-400">
                                <span>{formatTime(currentTime)}</span>
                                <span>{formatTime(duration)}</span>
                            </div>
                        </div>

                        {/* Custom Play/Pause Button */}
                        <button
                            onClick={togglePlay}
                            className="w-20 h-20 bg-gradient-to-tr from-primary-500 to-secondary-500 text-white rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-xl shadow-primary-500/20"
                        >
                            <span className="material-symbols-rounded filled text-4xl select-none">
                                {isPlaying ? 'pause' : 'play_arrow'}
                            </span>
                        </button>

                        <p className="text-white font-bold font-outfit text-sm mt-6 mb-2">
                            {hasStarted 
                                ? t('chat.audio_playing_title', { defaultValue: 'Reproduzindo Mensagem de Voz' })
                                : t('chat.audio_start_title', { defaultValue: 'Mensagem de Voz de Visualização Única' })
                            }
                        </p>
                        <p className="text-xs text-slate-400 text-center max-w-xs">
                            {t('chat.audio_start_desc', { defaultValue: 'Pressione play para ouvir o áudio. Ele será destruído assim que terminar ou quando você sair.' })}
                        </p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center p-8 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-white/10 max-w-xs animate-fade-in">
                        <span className="material-symbols-rounded text-5xl text-rose-500 animate-pulse mb-3">security</span>
                        <h4 className="text-white font-bold mb-1">{t('chat.hidden_content_title', { defaultValue: 'Conteúdo Oculto' })}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{t('chat.audio_hidden_desc', { defaultValue: 'Para sua privacidade, o áudio foi pausado porque a janela perdeu o foco.' })}</p>
                    </div>
                )}

                <div className="mt-6 text-center pointer-events-none max-w-xs">
                    <p className="text-xs text-slate-500 font-medium tracking-wide flex items-center justify-center gap-1.5 leading-relaxed">
                        <span className="material-symbols-rounded text-sm text-red-500 animate-pulse">local_fire_department</span>
                        {t('chat.audio_once_warning', { defaultValue: 'Este áudio possui visualização única e é destruído após o fechamento.' })}
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
    );
};
