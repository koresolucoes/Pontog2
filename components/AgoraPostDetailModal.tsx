import React, { useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale/pt-BR';
import { AgoraComment, AgoraPost } from '../types';
import { useAgoraStore } from '../stores/agoraStore';
import { useAuthStore } from '../stores/authStore';
import { handleUserClick } from './postUtils';
import { ModalShell } from './ui/ModalShell';

interface AgoraPostDetailModalProps {
  post: AgoraPost;
  onClose: () => void;
}

export const AgoraPostDetailModal: React.FC<AgoraPostDetailModalProps> = ({ post, onClose }) => {
  const { addComment, fetchCommentsForPost, toggleLikePost, toggleLikeComment } = useAgoraStore();
  const currentPost = useAgoraStore((state) => state.posts.find((item) => item.id === post.id)) || post;
  const currentUser = useAuthStore((state) => state.user);
  const [comments, setComments] = useState<AgoraComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isLoadingComments, setIsLoadingComments] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    const loadComments = async () => {
      setIsLoadingComments(true);
      const fetchedComments = await fetchCommentsForPost(post.id);
      if (active) {
        setComments(fetchedComments);
        setIsLoadingComments(false);
      }
    };
    void loadComments();
    return () => { active = false; };
  }, [post.id, fetchCommentsForPost]);

  useEffect(() => {
    if (!isLoadingComments) commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments.length, isLoadingComments]);

  const handleAddComment = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = newComment.trim();
    if (!content || !currentUser || isSending) return;

    setIsSending(true);
    setNewComment('');
    const tempComment: AgoraComment = {
      id: Date.now(),
      post_id: post.id,
      user_id: currentUser.id,
      content,
      created_at: new Date().toISOString(),
      profiles: { username: currentUser.username, avatar_url: currentUser.avatar_url },
      likes_count: 0,
      user_has_liked: false,
    };
    setComments((previous) => [...previous, tempComment]);

    try {
      await addComment(post.id, content);
      setComments(await fetchCommentsForPost(post.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleToggleCommentLike = async (commentId: number) => {
    const comment = comments.find((item) => item.id === commentId);
    if (!comment) return;
    const hasLiked = comment.user_has_liked;
    setComments((previous) => previous.map((item) => item.id === commentId ? {
      ...item,
      user_has_liked: !hasLiked,
      likes_count: hasLiked ? Math.max(0, Number(item.likes_count || 0) - 1) : Number(item.likes_count || 0) + 1,
    } : item));
    await toggleLikeComment(commentId, hasLiked);
  };

  const isCheckin = Boolean(currentPost.status_text?.includes('📍'));
  const displayStatus = currentPost.status_text?.replace(/📍/g, '').trim();

  return (
    <ModalShell
      onClose={onClose}
      size="md"
      eyebrow="Agora"
      title={currentPost.username}
      description={isCheckin ? 'Esta pessoa está em um local agora.' : 'Disponível neste momento.'}
      icon={isCheckin ? 'location_on' : 'local_fire_department'}
      footer={
        <form onSubmit={handleAddComment} className="flex items-end gap-2">
          <textarea
            value={newComment}
            onChange={(event) => setNewComment(event.target.value)}
            rows={1}
            maxLength={280}
            placeholder="Escreva um comentário…"
            className="pg-field max-h-28 min-h-[48px] flex-1 resize-none !rounded-[18px]"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || isSending}
            className="pg-icon-btn !h-12 !w-12 shrink-0 !border-0 !bg-[var(--pg-primary)] !text-white"
            aria-label="Enviar comentário"
          >
            {isSending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/25 border-t-white" /> : <span className="material-symbols-rounded">arrow_upward</span>}
          </button>
        </form>
      }
    >
      <div className="space-y-5">
        <button
          type="button"
          onClick={() => handleUserClick({ id: currentPost.user_id, username: currentPost.username, avatar_url: currentPost.avatar_url, age: currentPost.age })}
          className="flex w-full items-center gap-3 rounded-[20px] border border-white/[0.07] bg-white/[0.03] p-3 text-left"
        >
          <div className="relative">
            <img src={currentPost.avatar_url} alt="" className="h-11 w-11 rounded-full object-cover ring-1 ring-white/20" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-[var(--pg-surface-1)] bg-[var(--pg-online)]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-white">{currentPost.username}{currentPost.age ? `, ${currentPost.age}` : ''}</p>
            <p className="mt-0.5 text-[11px] font-bold text-white/42">Ver perfil</p>
          </div>
          <span className="material-symbols-rounded text-white/35">chevron_right</span>
        </button>

        <div className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-black">
          <img src={currentPost.photo_url} alt={`Agora de ${currentPost.username}`} className="max-h-[58vh] w-full object-contain" />
          {displayStatus && (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-4 pt-16">
              <p className="text-base font-bold leading-snug text-white">{displayStatus}</p>
              {isCheckin && (
                <span className="pg-chip mt-2 !min-h-[30px] !border-white/15 !bg-black/25 !px-2.5 !text-[10px] !text-white/80">
                  <span className="material-symbols-rounded filled !text-[13px]">location_on</span>
                  Check-in agora
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-[20px] border border-white/[0.07] bg-white/[0.025] p-2">
          <button
            type="button"
            onClick={() => toggleLikePost(currentPost.id)}
            className={`pg-btn !min-h-[42px] flex-1 !rounded-[15px] !px-3 !text-xs ${currentPost.user_has_liked ? 'pg-btn-primary' : 'pg-btn-secondary'}`}
          >
            <span className={`material-symbols-rounded !text-[18px] ${currentPost.user_has_liked ? 'filled' : ''}`}>favorite</span>
            {currentPost.likes_count} curtidas
          </button>
          <div className="pg-btn pg-btn-secondary !min-h-[42px] flex-1 !rounded-[15px] !px-3 !text-xs">
            <span className="material-symbols-rounded !text-[18px]">chat_bubble</span>
            {comments.length} comentários
          </div>
        </div>

        <section>
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="pg-eyebrow">Conversa</p>
              <h3 className="pg-title mt-1 text-xl text-white">Comentários</h3>
            </div>
          </div>

          {isLoadingComments ? (
            <div className="space-y-3">
              {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-[18px] bg-white/[0.035]" />)}
            </div>
          ) : comments.length === 0 ? (
            <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.025] px-5 py-8 text-center">
              <span className="material-symbols-rounded text-[30px] text-white/25">forum</span>
              <p className="mt-2 text-sm font-bold text-white/58">Ainda sem comentários.</p>
              <p className="mt-1 text-xs text-white/35">Você pode começar a conversa.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start gap-3">
                  <button type="button" onClick={() => handleUserClick({ id: comment.user_id, username: comment.profiles.username, avatar_url: comment.profiles.avatar_url })} className="shrink-0">
                    <img src={comment.profiles.avatar_url} alt="" className="mt-0.5 h-9 w-9 rounded-full object-cover ring-1 ring-white/10" />
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="rounded-[18px] rounded-tl-md border border-white/[0.06] bg-white/[0.035] px-3.5 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <button type="button" onClick={() => handleUserClick({ id: comment.user_id, username: comment.profiles.username, avatar_url: comment.profiles.avatar_url })} className="truncate text-left text-xs font-extrabold text-white">
                          {comment.profiles.username}
                        </button>
                        <span className="shrink-0 text-[10px] text-white/28">{formatDistanceToNow(new Date(comment.created_at), { locale: ptBR, addSuffix: true })}</span>
                      </div>
                      <p className="mt-1.5 break-words text-sm leading-relaxed text-white/68">{comment.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleToggleCommentLike(comment.id)}
                      className={`ml-2 mt-1.5 flex items-center gap-1 text-[11px] font-bold ${comment.user_has_liked ? 'text-[var(--pg-primary)]' : 'text-white/35'}`}
                    >
                      <span className={`material-symbols-rounded !text-[14px] ${comment.user_has_liked ? 'filled' : ''}`}>favorite</span>
                      {comment.user_has_liked ? 'Curtido' : 'Curtir'}{Number(comment.likes_count) > 0 ? ` · ${comment.likes_count}` : ''}
                    </button>
                  </div>
                </div>
              ))}
              <div ref={commentsEndRef} />
            </div>
          )}
        </section>
      </div>
    </ModalShell>
  );
};
