import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import { useAgoraStore } from '../stores/agoraStore';
import { useAuthStore } from '../stores/authStore';
import { useMapStore } from '../stores/mapStore';
import { useUiStore } from '../stores/uiStore';
import { supabase } from '../lib/supabase';
import { socialActions } from '../modules/social/public';
import { AgoraPost } from '../types';
import { ActivateAgoraModal } from './ActivateAgoraModal';
import { AgoraPostDetailModal } from './AgoraPostDetailModal';
import { ConfirmationModal } from './ConfirmationModal';
import { handleUserClick } from './postUtils';

const cardMotion = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const formatRemaining = (expiresAt?: string | null) => {
  if (!expiresAt) return 'Indisponível';
  const remaining = new Date(expiresAt).getTime() - Date.now();
  if (remaining <= 0) return 'Expirado';

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) return `${hours}h ${minutes}min`;
  if (minutes > 0) return `${minutes}min ${seconds}s`;
  return `${seconds}s`;
};

interface AgoraCardProps {
  post: AgoraPost;
  isOwnPost: boolean;
  winkPending: boolean;
  isLast: boolean;
  lastPostElementRef: (node: HTMLDivElement | null) => void;
  onOpenPost: (post: AgoraPost) => void;
  onOpenVenue: (post: AgoraPost) => void;
  onLike: (postId: number) => void;
  onWink: (post: AgoraPost) => void;
}

const AgoraCard: React.FC<AgoraCardProps> = React.memo(({
  post,
  isOwnPost,
  winkPending,
  isLast,
  lastPostElementRef,
  onOpenPost,
  onOpenVenue,
  onLike,
  onWink,
}) => {
  const isCheckin = Boolean(post.status_text?.includes('📍'));
  const displayStatus = post.status_text?.replace(/📍/g, '').trim();

  return (
    <motion.article
      variants={cardMotion}
      initial="hidden"
      animate="show"
      ref={isLast ? lastPostElementRef : undefined}
      className="overflow-hidden rounded-[28px] border border-white/[0.08] bg-white/[0.035] shadow-[0_24px_60px_rgba(0,0,0,.26)]"
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-black">
        <img
          src={post.photo_url}
          alt={post.is_venue ? post.username : `Agora de ${post.username}`}
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover"
          onClick={() => post.is_venue ? onOpenVenue(post) : onOpenPost(post)}
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/70 via-transparent to-black/80" />

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            if (post.is_venue) onOpenVenue(post);
            else handleUserClick({ id: post.user_id, username: post.username, avatar_url: post.avatar_url, age: post.age });
          }}
          className="absolute left-4 right-4 top-4 z-10 flex min-h-[48px] items-center gap-3 rounded-2xl bg-black/25 px-3 py-2 text-left backdrop-blur-md transition-colors hover:bg-black/35"
        >
          <div className="relative shrink-0">
            <img src={post.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover ring-1 ring-white/30" />
            {!post.is_venue && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-black bg-[var(--pg-online)]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-extrabold text-white">
                {post.username}{!post.is_venue && post.age ? `, ${post.age}` : ''}
              </span>
              {post.is_venue && <span className="material-symbols-rounded filled text-[16px] text-amber-300">verified</span>}
            </div>
            <p className="mt-0.5 text-[11px] font-bold text-white/62">
              {post.is_venue ? 'Local no Ponto G' : 'Disponível agora'}
            </p>
          </div>
          {isCheckin && (
            <span className="pg-chip !min-h-[28px] !border-white/15 !bg-black/25 !px-2.5 !text-[10px] !text-white/85">
              <span className="material-symbols-rounded filled !text-[13px]">location_on</span>
              Check-in
            </span>
          )}
        </button>

        {displayStatus && (
          <div className="absolute bottom-4 left-4 right-4 z-10">
            <p className="max-w-[92%] text-lg font-bold leading-snug text-white drop-shadow-lg">{displayStatus}</p>
          </div>
        )}
      </div>

      <div className="flex min-h-[68px] items-center justify-between gap-3 px-4 py-3">
        {post.is_venue ? (
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-white/75">Publicação oficial</p>
            <p className="mt-0.5 text-[11px] text-white/40">Veja detalhes, rota e quem está por lá.</p>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => onLike(post.id)}
              className={`pg-icon-btn !border-0 !bg-transparent ${post.user_has_liked ? '!text-[var(--pg-primary)]' : ''}`}
              aria-label="Curtir"
            >
              <span className={`material-symbols-rounded text-[23px] ${post.user_has_liked ? 'filled' : ''}`}>favorite</span>
            </button>
            <span className="mr-1 min-w-5 text-xs font-bold text-white/55">{post.likes_count}</span>
            <button type="button" onClick={() => onOpenPost(post)} className="pg-icon-btn !border-0 !bg-transparent" aria-label="Comentários">
              <span className="material-symbols-rounded text-[22px]">chat_bubble</span>
            </button>
            <span className="min-w-5 text-xs font-bold text-white/55">{post.comments_count}</span>
          </div>
        )}

        {post.is_venue ? (
          <button type="button" onClick={() => onOpenVenue(post)} className="pg-btn pg-btn-secondary !min-h-[42px] !rounded-full !px-4 !text-xs">
            Ver local
          </button>
        ) : isOwnPost ? (
          <span className="pg-chip pg-chip-active">
            <span className="material-symbols-rounded filled !text-[15px]">local_fire_department</span>
            Seu Agora
          </span>
        ) : (
          <button
            type="button"
            disabled={winkPending}
            onClick={() => onWink(post)}
            className="pg-btn pg-btn-light !min-h-[42px] !rounded-full !px-5 !text-xs"
          >
            <span className="material-symbols-rounded filled !text-[17px] text-[var(--pg-primary)]">waving_hand</span>
            {winkPending ? 'Chamando…' : 'Chamar'}
          </button>
        )}
      </div>
    </motion.article>
  );
});

export const AgoraView: React.FC = () => {
  const { t } = useTranslation();
  const {
    posts,
    isLoading,
    agoraUserIds,
    deactivateAgoraMode,
    toggleLikePost,
    loadMorePosts,
    hasMore,
    fetchAgoraPosts,
  } = useAgoraStore();
  const user = useAuthStore((state) => state.user);
  const setSelectedVenue = useMapStore((state) => state.setSelectedVenue);
  const setSubscriptionModalOpen = useUiStore((state) => state.setSubscriptionModalOpen);

  const [isActivateModalOpen, setIsActivateModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<AgoraPost | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [winkPendingFor, setWinkPendingFor] = useState<string | null>(null);
  const [, setClockTick] = useState(0);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    fetchAgoraPosts(true);
  }, [fetchAgoraPosts]);

  const userIsAgora = Boolean(user && agoraUserIds.includes(user.id));
  const myAgoraPost = useMemo(() => user ? posts.find((post) => post.user_id === user.id) : undefined, [posts, user?.id]);

  useEffect(() => {
    if (!myAgoraPost?.expires_at) return;
    const timer = window.setInterval(() => setClockTick((tick) => tick + 1), 1000);
    return () => window.clearInterval(timer);
  }, [myAgoraPost?.expires_at]);

  const lastPostElementRef = useCallback((node: HTMLDivElement | null) => {
    if (isLoading) return;
    observer.current?.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMore) loadMorePosts();
    });
    if (node) observer.current.observe(node);
  }, [hasMore, isLoading, loadMorePosts]);

  const handleConfirmDeactivate = async () => {
    await deactivateAgoraMode();
    setIsConfirmModalOpen(false);
  };

  const sendWinkPush = async (receiverId: string) => {
    const { session } = (await supabase.auth.getSession()).data;
    if (!session) return;
    fetch('/api/send-wink-push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ receiver_id: receiverId }),
    }).catch((error) => console.error('Error sending wink push:', error));
  };

  const handleWink = async (post: AgoraPost) => {
    if (!user || post.user_id === user.id || winkPendingFor) return;
    setWinkPendingFor(post.user_id);
    try {
      const result = await socialActions.sendWink(post.user_id);
      if (result === 'success_plus' || result === 'success_free') {
        toast.success(`Chamado enviado para ${post.username}!`, { icon: '😉' });
        void sendWinkPush(post.user_id);
      } else if (result === 'already_winked') {
        toast('Você já chamou este perfil hoje.', { icon: '😉' });
      } else if (result === 'limit_reached') {
        toast.error('Você chegou ao limite de chamadas de hoje.');
        setSubscriptionModalOpen(true);
      } else {
        toast.error('Não foi possível chamar agora.');
      }
    } catch (error) {
      console.error('Error sending Agora wink:', error);
      toast.error('Não foi possível chamar agora.');
    } finally {
      setWinkPendingFor(null);
    }
  };

  const openVenue = (post: AgoraPost) => {
    if (post.venue) setSelectedVenue(post.venue);
  };

  const header = (
    <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[rgba(5,5,7,.78)] px-4 pb-3 pt-4 backdrop-blur-2xl sm:px-6">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--pg-primary-soft)] text-[var(--pg-primary)]">
              <span className="material-symbols-rounded filled text-[21px]">local_fire_department</span>
            </span>
            <div>
              <p className="pg-eyebrow">Ponto G ao vivo</p>
              <h1 className="pg-title text-[25px] text-white">Agora</h1>
            </div>
          </div>
        </div>

        {userIsAgora ? (
          <button type="button" onClick={() => setIsConfirmModalOpen(true)} className="pg-btn pg-btn-secondary !min-h-[42px] !rounded-full !px-4 !text-xs">
            Desativar
          </button>
        ) : (
          <button type="button" onClick={() => setIsActivateModalOpen(true)} className="pg-btn pg-btn-primary !min-h-[42px] !rounded-full !px-4 !text-xs">
            <span className="material-symbols-rounded filled !text-[17px]">local_fire_department</span>
            Ficar disponível
          </button>
        )}
      </div>

      {userIsAgora && (
        <div className="mx-auto mt-3 flex max-w-2xl items-center gap-3 rounded-[18px] border border-[rgba(245,12,105,.2)] bg-[rgba(245,12,105,.09)] px-4 py-3">
          <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--pg-primary)] shadow-[0_0_16px_rgba(245,12,105,.65)]" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-extrabold text-white">Você está visível no Agora</p>
            <p className="mt-0.5 text-[11px] text-white/48">Pessoas próximas podem te chamar enquanto o tempo estiver ativo.</p>
          </div>
          <span className="font-space text-sm font-black tabular-nums text-white">{formatRemaining(myAgoraPost?.expires_at)}</span>
        </div>
      )}
    </header>
  );

  if (isLoading && posts.length === 0) {
    return (
      <div className="pg-page flex h-full flex-col">
        {header}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[var(--pg-primary)]" />
          <p className="text-sm font-bold text-white/55">Vendo quem está disponível agora…</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="pg-page flex h-full flex-col">
        {header}

        <main className="flex-1 overflow-y-auto px-3 pb-28 pt-4 sm:px-5">
          <div className="mx-auto max-w-2xl space-y-4">
            {posts.length === 0 ? (
              <div className="flex min-h-[58vh] flex-col items-center justify-center px-6 text-center">
                <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/[0.08] bg-white/[0.035]">
                  <span className="material-symbols-rounded filled text-[38px] text-[var(--pg-primary)]">local_fire_department</span>
                </div>
                <p className="pg-eyebrow">A cena começa com alguém</p>
                <h2 className="pg-title mt-2 max-w-sm text-3xl text-white">Seja a primeira pessoa disponível agora.</h2>
                <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/52">Publique uma foto, diga o que procura e fique em destaque por até 60 minutos.</p>
                <button type="button" onClick={() => setIsActivateModalOpen(true)} className="pg-btn pg-btn-primary mt-7 px-6">
                  <span className="material-symbols-rounded filled">local_fire_department</span>
                  Ativar meu Agora
                </button>
              </div>
            ) : (
              posts.map((post, index) => (
                <AgoraCard
                  key={post.id}
                  post={post}
                  isOwnPost={Boolean(user && post.user_id === user.id)}
                  winkPending={winkPendingFor === post.user_id}
                  isLast={index === posts.length - 1}
                  lastPostElementRef={lastPostElementRef}
                  onOpenPost={setSelectedPost}
                  onOpenVenue={openVenue}
                  onLike={toggleLikePost}
                  onWink={handleWink}
                />
              ))
            )}

            {isLoading && posts.length > 0 && (
              <div className="flex justify-center py-5">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-[var(--pg-primary)]" />
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <p className="py-6 text-center text-xs font-bold text-white/30">Você chegou ao fim do Agora por enquanto.</p>
            )}
          </div>
        </main>
      </div>

      {isActivateModalOpen && <ActivateAgoraModal onClose={() => setIsActivateModalOpen(false)} />}
      {selectedPost && <AgoraPostDetailModal post={selectedPost} onClose={() => setSelectedPost(null)} />}
      {isConfirmModalOpen && (
        <ConfirmationModal
          isOpen
          title={t('agora.extinguish_fire', { defaultValue: 'Sair do Agora?' })}
          message={t('agora.extinguish_msg', { defaultValue: 'Seu post deixará de aparecer para pessoas próximas.' })}
          onConfirm={handleConfirmDeactivate}
          onCancel={() => setIsConfirmModalOpen(false)}
          confirmText={t('agora.deactivate', { defaultValue: 'Desativar' })}
        />
      )}
    </>
  );
};
