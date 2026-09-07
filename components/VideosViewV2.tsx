import React, { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useVideoStore, type VideoPost, type VideoComment } from '../stores/videoStore';
import { useAuthStore } from '../stores/authStore';
import { useMapStore } from '../stores/mapStore';
import { profileQueries } from '../modules/profiles/public';
import { transformProfileToUser } from '../lib/utils';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';
import { ConfirmationModal } from './ConfirmationModal';

const CATEGORIES = [
  { id: 'all', label: 'Para você' },
  { id: 'recent', label: 'Recentes' },
  { id: 'sensual', label: 'Sensual' },
  { id: 'amador', label: 'Amador' },
  { id: 'solo', label: 'Solo' },
  { id: 'casais', label: 'Casais' },
  { id: 'bdsm', label: 'BDSM' },
  { id: 'explicito', label: 'Explícito' },
  { id: 'favorites', label: 'Curtidos' },
];

const stripMetadataTags = (value = '') => value.replace(/\s*#(?:explicito|amador|solo|casais|bdsm|sensual|outros|nsfw|sfw)\b/gi, '').trim();

type VideoV2 = VideoPost & { category?: string; is_nsfw?: boolean; comments_count?: number; user_profile?: VideoPost['user_profile'] & { is_verified?: boolean } };

export const VideosView: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  const videos = useVideoStore((state) => state.videos) as VideoV2[];
  const comments = useVideoStore((state) => state.comments);
  const likedVideos = useVideoStore((state) => state.likedVideos);
  const userRatings = useVideoStore((state) => state.userRatings);
  const loading = useVideoStore((state) => state.loadingVideos);
  const fetchVideos = useVideoStore((state) => state.fetchVideos);
  const fetchComments = useVideoStore((state) => state.fetchComments);
  const addVideo = useVideoStore((state) => state.addVideo);
  const addComment = useVideoStore((state) => state.addComment);
  const addRating = useVideoStore((state) => state.addRating);
  const incrementViews = useVideoStore((state) => state.incrementViews);
  const toggleLike = useVideoStore((state) => state.toggleLike);
  const toggleCommentLike = useVideoStore((state) => state.toggleCommentLike);
  const deleteVideo = useVideoStore((state) => state.deleteVideo);
  const editVideo = useVideoStore((state) => state.editVideo);

  const [category, setCategory] = useState('all');
  const [blurSensitive, setBlurSensitive] = useState(() => localStorage.getItem('ponto_g_video_sensitive') !== 'show');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [commentsVideo, setCommentsVideo] = useState<VideoV2 | null>(null);
  const [editingVideo, setEditingVideo] = useState<VideoV2 | null>(null);
  const [deletingVideo, setDeletingVideo] = useState<VideoV2 | null>(null);

  useEffect(() => { fetchVideos(); }, [fetchVideos]);

  const filtered = useMemo(() => {
    if (category === 'favorites') return videos.filter((video) => !!likedVideos[video.id]);
    if (category === 'recent') return [...videos].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (category === 'all') return videos;
    return videos.filter((video) => video.category === category);
  }, [videos, category, likedVideos]);

  const openProfile = async (userId: string) => {
    try {
      const profile = await profileQueries.getPublicProfile(userId);
      useMapStore.getState().setSelectedUser(transformProfileToUser(profile as any));
    } catch (error) {
      console.error('Could not open video author profile:', error);
      toast.error('Não foi possível abrir este perfil.');
    }
  };

  const setSensitivePreference = (blur: boolean) => {
    setBlurSensitive(blur);
    localStorage.setItem('ponto_g_video_sensitive', blur ? 'blur' : 'show');
  };

  return (
    <div className="relative h-full overflow-hidden bg-[#050506] text-white">
      <header className="absolute inset-x-0 top-0 z-40 bg-gradient-to-b from-black/92 via-black/60 to-transparent px-4 pb-7 pt-4 sm:px-6">
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1"><p className="pg-eyebrow">Ponto G</p><h1 className="mt-0.5 font-bricolage text-[27px] font-black tracking-[-.04em]">Vídeos</h1><p className="mt-0.5 text-xs font-semibold text-white/38">Conteúdo da comunidade, sem sair do seu contexto.</p></div>
            <button type="button" onClick={() => setSensitivePreference(!blurSensitive)} className={`pg-icon-btn ${blurSensitive ? '' : '!border-primary-500/25 !bg-primary-500/10 !text-primary-300'}`} title={blurSensitive ? 'Conteúdo sensível oculto' : 'Conteúdo sensível visível'} aria-label="Alternar conteúdo sensível"><span className="material-symbols-rounded">{blurSensitive ? 'visibility_off' : 'visibility'}</span></button>
            <button type="button" onClick={() => setUploadOpen(true)} className="flex h-11 items-center gap-2 rounded-full bg-white px-4 text-xs font-black text-black transition active:scale-[.97]"><span className="material-symbols-rounded !text-[19px]">add</span>Publicar</button>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {CATEGORIES.map((item) => <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={`pg-chip shrink-0 ${category === item.id ? 'pg-chip-active' : ''}`}>{item.label}</button>)}
          </div>
        </div>
      </header>

      <main className="h-full snap-y snap-mandatory overflow-y-auto no-scrollbar">
        {loading && !videos.length ? <VideoSkeleton /> : !filtered.length ? <EmptyVideos onPublish={() => setUploadOpen(true)} /> : filtered.map((video) => (
          <VideoFeedCard
            key={video.id}
            video={video}
            currentUserId={user?.id}
            liked={!!likedVideos[video.id]}
            blurSensitive={blurSensitive}
            onLike={() => toggleLike(video.id)}
            onComments={() => { setCommentsVideo(video); fetchComments(video.id); }}
            onView={() => incrementViews(video.id)}
            onProfile={() => openProfile(video.user_id)}
            onEdit={() => setEditingVideo(video)}
            onDelete={() => setDeletingVideo(video)}
          />
        ))}
      </main>

      {uploadOpen && <UploadVideoModal onClose={() => setUploadOpen(false)} onPublish={async (title, description, file, categoryId, nsfw) => { const tagged = `${description.trim()} ${categoryId !== 'outros' ? `#${categoryId}` : '#outros'} ${nsfw ? '#nsfw' : '#sfw'}`.trim(); await addVideo(title, tagged, file); setUploadOpen(false); }} />}
      {commentsVideo && <VideoCommentsSheet video={commentsVideo} comments={comments[commentsVideo.id] || []} userRating={userRatings[commentsVideo.id] || 0} onClose={() => setCommentsVideo(null)} onAddComment={(text) => addComment(commentsVideo.id, text)} onRate={(rating) => addRating(commentsVideo.id, rating)} onToggleLike={(commentId) => toggleCommentLike(commentsVideo.id, commentId)} onProfile={openProfile} />}
      {editingVideo && <EditVideoModal video={editingVideo} onClose={() => setEditingVideo(null)} onSave={async (title, description) => { await editVideo(editingVideo.id, title, description); setEditingVideo(null); }} />}
      <ConfirmationModal isOpen={!!deletingVideo} title="Apagar este vídeo?" message="Ele deixará de aparecer no seu perfil e na comunidade." confirmText="Apagar vídeo" onConfirm={async () => { if (deletingVideo) await deleteVideo(deletingVideo.id); setDeletingVideo(null); }} onCancel={() => setDeletingVideo(null)} />
    </div>
  );
};

const VideoFeedCard: React.FC<{
  video: VideoV2; currentUserId?: string; liked: boolean; blurSensitive: boolean;
  onLike: () => void; onComments: () => void; onView: () => void; onProfile: () => void; onEdit: () => void; onDelete: () => void;
}> = ({ video, currentUserId, liked, blurSensitive, onLike, onComments, onView, onProfile, onEdit, onDelete }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [revealed, setRevealed] = useState(false);
  const [progress, setProgress] = useState(0);
  const counted = useRef(false);
  const sensitiveHidden = !!video.is_nsfw && blurSensitive && !revealed;
  const owner = currentUserId === video.user_id;

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(([entry]) => {
      const player = videoRef.current;
      if (!player) return;
      if (entry.isIntersecting && entry.intersectionRatio >= .65 && !sensitiveHidden) {
        player.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
      } else { player.pause(); setPlaying(false); }
    }, { threshold: [.25, .65, .9] });
    observer.observe(node);
    return () => observer.disconnect();
  }, [sensitiveHidden, video.id]);

  useEffect(() => { setRevealed(false); counted.current = false; setProgress(0); }, [video.id, blurSensitive]);

  const togglePlay = async () => {
    const player = videoRef.current;
    if (!player || sensitiveHidden) return;
    if (player.paused) { try { await player.play(); setPlaying(true); } catch {} }
    else { player.pause(); setPlaying(false); }
  };

  return (
    <section ref={containerRef} className="relative h-full min-h-full snap-start overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={video.video_url}
        poster={video.thumbnail_url || undefined}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        className={`h-full w-full object-cover transition duration-300 ${sensitiveHidden ? 'scale-[1.02] blur-3xl brightness-[.35]' : ''}`}
        onClick={togglePlay}
        onTimeUpdate={(event) => {
          const player = event.currentTarget;
          if (player.duration) setProgress(player.currentTime / player.duration);
          if (!counted.current && (player.currentTime >= 2 || (player.duration > 0 && player.currentTime / player.duration >= .3))) { counted.current = true; onView(); }
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/35 via-transparent to-black/90" />
      <div className="absolute inset-x-0 top-0 h-1 bg-white/8"><div className="h-full bg-primary-500 transition-[width] duration-100" style={{ width: `${progress * 100}%` }} /></div>

      {sensitiveHidden && <button type="button" onClick={() => setRevealed(true)} className="absolute inset-0 z-20 m-auto flex h-fit max-w-[280px] flex-col items-center rounded-[26px] border border-white/12 bg-black/62 p-6 text-center backdrop-blur-2xl"><span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary-500/12 text-primary-300"><span className="material-symbols-rounded">visibility_off</span></span><strong className="mt-4 font-bricolage text-lg font-black">Conteúdo sensível</strong><span className="mt-2 text-xs leading-relaxed text-white/48">Toque para revelar este vídeo. Você controla essa preferência no topo da tela.</span><span className="mt-4 rounded-full bg-white px-4 py-2 text-[11px] font-black text-black">Revelar</span></button>}

      {!playing && !sensitiveHidden && <button type="button" onClick={togglePlay} className="absolute inset-0 z-10 m-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/14 bg-black/38 text-white backdrop-blur-xl"><span className="material-symbols-rounded filled !text-[34px] translate-x-0.5">play_arrow</span></button>}

      <div className="absolute bottom-[92px] left-4 right-[76px] z-20 sm:left-6 sm:right-28">
        <button type="button" onClick={onProfile} className="mb-3 flex items-center gap-2 text-left"><img src={video.user_profile?.avatar_url} alt="" className="h-9 w-9 rounded-full border border-white/18 object-cover" /><span className="min-w-0"><span className="flex items-center gap-1.5 text-sm font-black text-white">{video.user_profile?.display_name || video.user_profile?.username || 'Usuário'}{(video.user_profile as any)?.is_verified && <span className="material-symbols-rounded filled !text-[14px] text-primary-300">verified</span>}</span><span className="block text-[10px] font-bold uppercase tracking-[.12em] text-white/42">@{video.user_profile?.username || 'usuario'}</span></span></button>
        <h2 className="font-bricolage text-xl font-black leading-tight text-white">{video.title}</h2>
        {stripMetadataTags(video.description || '') && <p className="mt-2 line-clamp-3 max-w-xl text-[13px] font-medium leading-5 text-white/68">{stripMetadataTags(video.description || '')}</p>}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.1em] text-white/42"><span>{video.views_count || 0} visualizações</span><span>•</span><span>{video.category === 'outros' ? 'Comunidade' : video.category}</span>{video.ratings_count > 0 && <><span>•</span><span className="text-amber-300">★ {Number(video.rating).toFixed(1)}</span></>}</div>
      </div>

      <aside className="absolute bottom-[92px] right-3 z-20 flex flex-col items-center gap-3 sm:right-5">
        <ActionButton icon="favorite" active={liked} label={String(video.likes_count || 0)} onClick={onLike} />
        <ActionButton icon="chat_bubble" label={String(video.comments_count || 0)} onClick={onComments} />
        <button type="button" onClick={() => setMuted((value) => !value)} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/42 text-white backdrop-blur-xl" aria-label={muted ? 'Ativar som' : 'Silenciar'}><span className="material-symbols-rounded !text-[21px]">{muted ? 'volume_off' : 'volume_up'}</span></button>
        {owner && <div className="mt-1 flex flex-col gap-2"><button type="button" onClick={onEdit} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/42 text-white/70 backdrop-blur-xl" aria-label="Editar vídeo"><span className="material-symbols-rounded !text-[19px]">edit</span></button><button type="button" onClick={onDelete} className="flex h-10 w-10 items-center justify-center rounded-full bg-black/42 text-red-300 backdrop-blur-xl" aria-label="Apagar vídeo"><span className="material-symbols-rounded !text-[19px]">delete</span></button></div>}
      </aside>
    </section>
  );
};

const ActionButton: React.FC<{ icon: string; label: string; active?: boolean; onClick: () => void }> = ({ icon, label, active, onClick }) => <button type="button" onClick={onClick} className="flex flex-col items-center gap-1"><span className={`flex h-12 w-12 items-center justify-center rounded-full border backdrop-blur-xl transition active:scale-90 ${active ? 'border-primary-500/25 bg-primary-500/16 text-primary-300' : 'border-white/10 bg-black/42 text-white'}`}><span className={`material-symbols-rounded !text-[25px] ${active ? 'filled' : ''}`}>{icon}</span></span><span className="text-[10px] font-black tabular-nums text-white/65">{label}</span></button>;

const UploadVideoModal: React.FC<{ onClose: () => void; onPublish: (title: string, description: string, file: File, category: string, nsfw: boolean) => Promise<void> }> = ({ onClose, onPublish }) => {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('sensual');
  const [nsfw, setNsfw] = useState(false);
  const [consent, setConsent] = useState(false);
  const [adult, setAdult] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const chooseFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;
    if (!selected.type.startsWith('video/')) return toast.error('Escolha um arquivo de vídeo.');
    if (selected.size > 100 * 1024 * 1024) return toast.error('O vídeo deve ter no máximo 100 MB.');
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected); setPreview(URL.createObjectURL(selected)); event.target.value = '';
  };
  const publish = async () => {
    if (!file || !title.trim() || !consent || !adult) return;
    setPublishing(true);
    try { await onPublish(title.trim(), description.trim(), file, category, nsfw); }
    finally { setPublishing(false); }
  };

  return <ModalShell onClose={onClose} size="lg" eyebrow="Vídeos" title="Publicar na comunidade" description="Conteúdo claro, consentido e classificado corretamente ajuda a manter o Ponto G seguro." icon="video_call" footer={<div className="grid grid-cols-[.75fr_1.25fr] gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="light" loading={publishing} disabled={!file || !title.trim() || !consent || !adult} onClick={publish}>Publicar</Button></div>}>
    <div className="space-y-5">
      <label className="block cursor-pointer"><input type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={chooseFile} />{preview ? <video src={preview} controls playsInline className="aspect-[9/13] max-h-[420px] w-full rounded-[24px] bg-black object-contain" /> : <div className="flex min-h-[230px] flex-col items-center justify-center rounded-[24px] border border-dashed border-white/14 bg-white/[0.025] text-center"><span className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary-500/10 text-primary-300"><span className="material-symbols-rounded !text-[28px]">upload</span></span><strong className="mt-4 text-sm text-white">Escolher vídeo</strong><span className="mt-1 text-xs text-white/32">MP4, WebM ou QuickTime · até 100 MB</span></div>}</label>
      <label><span className="mb-2 block pg-eyebrow">Título</span><input className="pg-field" maxLength={90} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Dê contexto ao vídeo" /></label>
      <label><span className="mb-2 block pg-eyebrow">Descrição</span><textarea className="pg-field min-h-[90px] resize-none" maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Opcional. Conte algo sobre esse momento." /></label>
      <section><p className="pg-eyebrow mb-3">Categoria</p><div className="flex flex-wrap gap-2">{CATEGORIES.filter((item) => !['all','recent','favorites'].includes(item.id)).map((item) => <button key={item.id} type="button" onClick={() => setCategory(item.id)} className={`pg-chip ${category === item.id ? 'pg-chip-active' : ''}`}>{item.label}</button>)}</div></section>
      <label className="pg-surface flex min-h-[70px] cursor-pointer items-center justify-between gap-4 p-4"><span><strong className="block text-sm text-white">Conteúdo sensível / explícito</strong><span className="mt-1 block text-xs text-white/35">Quem prefere ocultar conteúdo sensível verá uma proteção antes de abrir.</span></span><input type="checkbox" checked={nsfw} onChange={(e) => setNsfw(e.target.checked)} className="h-5 w-5 accent-primary-500" /></label>
      <section className="rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-4"><p className="text-sm font-black text-white">Antes de publicar</p><p className="mt-1 text-xs leading-relaxed text-white/38">Não publique conteúdo envolvendo menores, pessoas sem consentimento, exploração, coerção ou material ilegal.</p><label className="mt-4 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-white/58"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary-500" />Confirmo que todas as pessoas retratadas são maiores de 18 anos.</label><label className="mt-3 flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-white/58"><input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-primary-500" />Confirmo que tenho consentimento para publicar este conteúdo.</label></section>
    </div>
  </ModalShell>;
};

const VideoCommentsSheet: React.FC<{ video: VideoV2; comments: VideoComment[]; userRating: number; onClose: () => void; onAddComment: (text: string) => Promise<void>; onRate: (rating: number) => Promise<void>; onToggleLike: (id: number) => void; onProfile: (id: string) => void }> = ({ video, comments, userRating, onClose, onAddComment, onRate, onToggleLike, onProfile }) => {
  const [text, setText] = useState('');
  const [rating, setRating] = useState(userRating);
  return <ModalShell onClose={onClose} size="lg" eyebrow="Vídeo" title="Conversa" description={`${comments.length} ${comments.length === 1 ? 'comentário' : 'comentários'}`} icon="chat_bubble" footer={<form onSubmit={async (event) => { event.preventDefault(); const value=text.trim(); if (!value) return; await onAddComment(value); setText(''); }} className="flex gap-2"><input className="pg-field flex-1" value={text} onChange={(e) => setText(e.target.value)} placeholder="Adicionar comentário…" /><button type="submit" disabled={!text.trim()} className="pg-icon-btn !bg-white !text-black disabled:opacity-35"><span className="material-symbols-rounded">arrow_upward</span></button></form>}>
    <div className="space-y-5"><section className="flex items-center justify-between gap-4 rounded-[20px] border border-white/[0.06] bg-white/[0.025] p-3.5"><div><p className="text-xs font-black text-white">Sua avaliação</p><p className="mt-1 text-[10px] text-white/32">Opcional e separada da curtida.</p></div><div className="flex">{[1,2,3,4,5].map((star) => <button key={star} type="button" onClick={async () => { setRating(star); await onRate(star); }} className="p-1"><span className={`material-symbols-rounded !text-[22px] ${rating >= star ? 'filled text-amber-300' : 'text-white/18'}`}>star</span></button>)}</div></section>{!comments.length ? <div className="py-10 text-center text-sm text-white/35">Ainda não há comentários. Comece a conversa.</div> : <div className="space-y-5">{comments.map((comment) => <article key={comment.id} className="flex gap-3"><button type="button" onClick={() => onProfile(comment.user_id)} className="shrink-0"><img src={comment.user_profile?.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" /></button><div className="min-w-0 flex-1"><button type="button" onClick={() => onProfile(comment.user_id)} className="text-xs font-black text-white/68">{comment.user_profile?.username || 'Usuário'}</button><p className="mt-1 text-sm leading-relaxed text-white/78">{comment.comment_text}</p><button type="button" onClick={() => onToggleLike(comment.id)} className={`mt-2 flex items-center gap-1 text-[10px] font-black ${comment.liked_by_me ? 'text-primary-300' : 'text-white/30'}`}><span className={`material-symbols-rounded !text-[14px] ${comment.liked_by_me ? 'filled' : ''}`}>favorite</span>{comment.likes_count || 0}</button></div></article>)}</div>}</div>
  </ModalShell>;
};

const EditVideoModal: React.FC<{ video: VideoV2; onClose: () => void; onSave: (title: string, description: string) => Promise<void> }> = ({ video, onClose, onSave }) => {
  const [title, setTitle] = useState(video.title);
  const [description, setDescription] = useState(stripMetadataTags(video.description || ''));
  const [saving, setSaving] = useState(false);
  return <ModalShell onClose={onClose} size="md" eyebrow="Seu vídeo" title="Editar publicação" icon="edit" footer={<div className="grid grid-cols-2 gap-2"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button variant="light" loading={saving} disabled={!title.trim()} onClick={async () => { setSaving(true); try { await onSave(title.trim(), description.trim()); } finally { setSaving(false); } }}>Salvar</Button></div>}><div className="space-y-4"><label><span className="mb-2 block pg-eyebrow">Título</span><input className="pg-field" value={title} onChange={(e) => setTitle(e.target.value)} /></label><label><span className="mb-2 block pg-eyebrow">Descrição</span><textarea className="pg-field min-h-[110px] resize-none" value={description} onChange={(e) => setDescription(e.target.value)} /></label></div></ModalShell>;
};

const VideoSkeleton = () => <div className="flex h-full min-h-full snap-start items-center justify-center bg-black"><div className="text-center"><div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-white/10 border-t-primary-500" /><p className="mt-4 text-xs font-bold text-white/32">Carregando vídeos…</p></div></div>;
const EmptyVideos: React.FC<{ onPublish: () => void }> = ({ onPublish }) => <div className="flex h-full min-h-full snap-start items-center justify-center bg-[#070708] px-5"><div className="max-w-sm text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-primary-500/10 text-primary-300"><span className="material-symbols-rounded !text-[30px]">movie</span></span><h2 className="mt-5 font-bricolage text-2xl font-black">Nada por aqui ainda</h2><p className="mt-2 text-sm leading-relaxed text-white/38">Mude o filtro ou publique um vídeo para movimentar a comunidade.</p><Button variant="light" className="mt-5" onClick={onPublish}>Publicar vídeo</Button></div></div>;
