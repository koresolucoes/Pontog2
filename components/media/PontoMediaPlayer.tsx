import React, { useEffect, useRef, useState } from 'react';

interface PontoMediaPlayerProps {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  className?: string;
}

const formatTime = (seconds: number) => {
  if (!Number.isFinite(seconds)) return '0:00';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
};

export const PontoMediaPlayer: React.FC<PontoMediaPlayerProps> = ({ src, poster, autoPlay = false, loop = false, className = '' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);

  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [src]);

  const togglePlayback = async () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      try { await video.play(); setPlaying(true); } catch { setPlaying(false); }
    } else {
      video.pause();
      setPlaying(false);
    }
  };

  const seek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    if (videoRef.current) videoRef.current.currentTime = next;
    setCurrentTime(next);
  };

  return (
    <div
      className={`group relative overflow-hidden bg-black ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => playing && setShowControls(false)}
      onTouchStart={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        preload="metadata"
        className="h-full w-full object-contain"
        onClick={togglePlayback}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        onEnded={() => setPlaying(false)}
      />

      {!playing && (
        <button type="button" onClick={togglePlayback} className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur-xl transition hover:scale-105" aria-label="Reproduzir vídeo">
          <span className="material-symbols-rounded filled !text-[34px] translate-x-0.5">play_arrow</span>
        </button>
      )}

      <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/45 to-transparent px-3 pb-3 pt-10 transition-opacity ${showControls || !playing ? 'opacity-100' : 'opacity-0'}`}>
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.05}
          value={Math.min(currentTime, duration || 0)}
          onChange={seek}
          className="h-1 w-full cursor-pointer accent-primary-500"
          aria-label="Progresso do vídeo"
        />
        <div className="mt-2 flex items-center gap-2">
          <button type="button" onClick={togglePlayback} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white transition hover:bg-white/14" aria-label={playing ? 'Pausar' : 'Reproduzir'}>
            <span className="material-symbols-rounded filled !text-[21px]">{playing ? 'pause' : 'play_arrow'}</span>
          </button>
          <span className="text-[11px] font-bold tabular-nums text-white/55">{formatTime(currentTime)} / {formatTime(duration)}</span>
          <div className="flex-1" />
          <button type="button" onClick={() => setMuted((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/8 text-white transition hover:bg-white/14" aria-label={muted ? 'Ativar som' : 'Silenciar'}>
            <span className="material-symbols-rounded !text-[20px]">{muted ? 'volume_off' : 'volume_up'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
