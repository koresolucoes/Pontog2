import React, { useEffect, useMemo, useState } from 'react';
import { User, PrivateAlbum } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useMapStore } from '../stores/mapStore';
import { useAlbumStore } from '../stores/albumStore';
import { useAgoraStore } from '../stores/agoraStore';
import { useUiStore } from '../stores/uiStore';
import { useUserActionsStore } from '../stores/userActionsStore';
import { useVideoStore } from '../stores/videoStore';
import { socialActions, type ConnectionState } from '../modules/social/public';
import { formatLastSeen, cleanTag, parseTags } from '../lib/utils';
import { reverseGeocode } from '../lib/geocode';
import { useHardwareBack } from '../lib/useHardwareBack';
import { AlbumGalleryModal } from './AlbumGalleryModal';
import { ReportUserModal } from './ReportUserModal';
import { ConfirmationModal } from './ConfirmationModal';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  onStartChat: (user: User) => void;
}

type LocationLabel = { city: string; state: string } | null;

const sectionClass = 'rounded-[24px] border border-white/[0.07] bg-white/[0.035] p-4 sm:p-5';
const eyebrowClass = 'text-[11px] font-bold uppercase tracking-[0.18em] text-white/45';

export const ProfileModal: React.FC<ProfileModalProps> = ({ user, onClose, onStartChat }) => {
  useHardwareBack(true, onClose);
  const { t } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const onlineUsers = useMapStore((state) => state.onlineUsers);
  const { setSubscriptionModalOpen } = useUiStore();
  const { posts, fetchAgoraPosts } = useAgoraStore();
  const {
    viewedUserAlbums,
    viewedUserAccessStatus,
    isFetchingViewedUserAlbums,
    fetchAlbumsAndAccessStatusForUser,
    requestAccess,
    clearViewedUserData,
  } = useAlbumStore();
  const { blockUser, favoriteUser, unfavoriteUser, favoriteIds } = useUserActionsStore();
  const videos = useVideoStore((state) => state.videos);

  const [connection, setConnection] = useState<ConnectionState | null>(null);
  const [firstMessage, setFirstMessage] = useState('');
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(true);
  const [winkCount, setWinkCount] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<LocationLabel>(null);
  const [isOptionsOpen, setOptionsOpen] = useState(false);
  const [isReportOpen, setReportOpen] = useState(false);
  const [isBlockConfirmOpen, setBlockConfirmOpen] = useState(false);
  const [viewingAlbum, setViewingAlbum] = useState<PrivateAlbum | null>(null);

  useHardwareBack(isOptionsOpen, () => setOptionsOpen(false));
  useHardwareBack(isReportOpen, () => setReportOpen(false));
  useHardwareBack(isBlockConfirmOpen, () => setBlockConfirmOpen(false));
  useHardwareBack(!!viewingAlbum, () => setViewingAlbum(null));

  const isFavorite = favoriteIds.includes(user.id);
  const isOnline = onlineUsers.includes(user.id);
  const agoraPost = posts.find((post) => post.user_id === user.id);
  const userVideos = videos.filter((video) => video.user_id === user.id);
  const allPhotos = useMemo(
    () => Array.from(new Set([user.avatar_url, ...(user.public_photos || [])].filter(Boolean))) as string[],
    [user.avatar_url, user.public_photos],
  );

  const statusText = isOnline
    ? t('profile_modal.online_now', { defaultValue: 'Online agora' })
    : formatLastSeen(user.last_seen);

  const displayName = user.display_name || user.username || 'Perfil';

  const fetchConnection = async () => {
    if (!currentUser || currentUser.id === user.id) {
      setConnection(null);
      setIsCheckingConnection(false);
      return;
    }
    setIsCheckingConnection(true);
    try {
      setConnection(await socialActions.getConnectionState(user.id));
    } catch (error) {
      console.error('Error fetching connection state:', error);
      setConnection(null);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  useEffect(() => {
    fetchAgoraPosts();
    if (!currentUser || currentUser.id === user.id) return;

    fetchAlbumsAndAccessStatusForUser(user.id);
    fetchConnection();
    supabase.rpc('record_profile_view', { p_viewed_id: user.id }).then(({ error }) => {
      if (error) console.error('Error recording profile view:', error);
    });

    if (user.lat && user.lng) reverseGeocode(user.lat, user.lng).then(setLocationName).catch(() => setLocationName(null));

    if (currentUser.subscription_tier === 'free') {
      supabase.rpc('get_daily_wink_count', { p_sender_id: currentUser.id }).then(({ data, error }) => {
        if (!error) setWinkCount(Number(data));
      });
    }

    return () => clearViewedUserData();
  }, [user.id, currentUser?.id]);

  const handleFavorite = async () => {
    if (isFavorite) await unfavoriteUser(user.id);
    else await favoriteUser(user.id);
  };

  const handleWink = async () => {
    if (!currentUser) return;
    const { data: result, error } = await supabase.rpc('send_wink', { p_receiver_id: user.id });
    if (error) {
      toast.error('Não foi possível chamar agora.');
      return;
    }

    if (result === 'success_plus' || result === 'success_free') {
      toast.success('Chamado enviado!', { icon: '😉' });
      if (result === 'success_free') setWinkCount((count) => (count ?? 0) + 1);
      const { session } = (await supabase.auth.getSession()).data;
      if (session) {
        fetch('/api/send-wink-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ receiver_id: user.id }),
        }).catch((error) => console.error('Error sending wink push:', error));
      }
      return;
    }

    if (result === 'limit_reached') {
      toast.error('Você chegou ao limite de chamadas de hoje.');
      setSubscriptionModalOpen(true);
      return;
    }
    if (result === 'already_winked') toast('Você já chamou este perfil.', { icon: '😉' });
  };

  const handleRequestConnection = async () => {
    if (!currentUser || !firstMessage.trim()) {
      toast.error('Escreva uma primeira mensagem para se apresentar.');
      return;
    }

    setIsSendingRequest(true);
    try {
      const result = await socialActions.requestConnection(user.id, firstMessage.trim());
      setConnection({
        id: result.connection_id,
        follower_id: currentUser.id,
        following_id: user.id,
        status: result.status,
        created_at: new Date().toISOString(),
        has_conversation: true,
      });

      const { session } = (await supabase.auth.getSession()).data;
      if (session) {
        const preview = firstMessage.trim().length > 55 ? `${firstMessage.trim().slice(0, 55)}…` : firstMessage.trim();
        fetch('/api/send-generic-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            receiver_id: user.id,
            title: 'Nova conexão no Ponto G ✨',
            body: `${currentUser.display_name || currentUser.username || 'Alguém'}: “${preview}”`,
          }),
        }).catch((error) => console.error('Error sending connection push:', error));
      }

      setFirstMessage('');
      toast.success('Pedido enviado. A conversa fica liberada quando houver aceite.');
    } catch (error: any) {
      console.error('Error requesting connection:', error);
      toast.error(error?.message?.includes('interaction_not_allowed') ? 'Essa conexão não está disponível.' : 'Não foi possível enviar o pedido.');
    } finally {
      setIsSendingRequest(false);
    }
  };

  const handleAcceptConnection = async () => {
    if (!connection?.id) return;
    try {
      const followerId = await socialActions.acceptConnection(connection.id);
      setConnection({ ...connection, status: 'accepted', has_conversation: true });

      const { session } = (await supabase.auth.getSession()).data;
      if (session && currentUser) {
        fetch('/api/send-generic-push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({
            receiver_id: followerId,
            title: 'Conexão aceita 🎉',
            body: `${currentUser.display_name || currentUser.username || 'Alguém'} aceitou conversar com você.`,
          }),
        }).catch((error) => console.error('Error sending connection accept push:', error));
      }
      toast.success('Conexão aceita. Agora vocês podem conversar.');
    } catch (error) {
      console.error('Error accepting connection:', error);
      toast.error('Não foi possível aceitar a conexão.');
    }
  };

  const handleRejectConnection = async () => {
    if (!connection?.id) return;
    try {
      await socialActions.rejectConnection(connection.id);
      setConnection(null);
      toast.success('Pedido recusado.');
    } catch (error) {
      console.error('Error rejecting connection:', error);
      toast.error('Não foi possível recusar o pedido.');
    }
  };

  const handleChat = () => {
    onStartChat(user);
    onClose();
  };

  const handleBlock = async () => {
    setBlockConfirmOpen(false);
    await blockUser({ id: user.id, username: user.username || displayName });
    onClose();
  };

  const locationText = locationName
    ? `${locationName.city}, ${locationName.state}`
    : user.city
      ? `${user.city}${user.state ? `, ${user.state}` : ''}`
      : null;

  const distanceText = user.distance_km == null
    ? null
    : currentUser?.subscription_tier === 'plus'
      ? user.distance_km < 1 ? `${Math.round(user.distance_km * 1000)} m` : `${user.distance_km.toFixed(1)} km`
      : user.distance_km < 1 ? 'Perto de você' : `~${Math.max(1, Math.round(user.distance_km))} km`;

  const renderConnectionCard = () => {
    if (isCheckingConnection) {
      return <div className="h-28 animate-pulse rounded-[22px] border border-white/5 bg-white/[0.035]" />;
    }

    if (connection?.status === 'pending' && connection.follower_id !== currentUser?.id) {
      return (
        <div className="rounded-[22px] border border-primary-500/25 bg-primary-500/[0.07] p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500/15 text-primary-400">
              <span className="material-symbols-rounded">handshake</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-white">{displayName} quer conversar</p>
              <p className="mt-1 text-sm leading-relaxed text-white/50">Aceite para liberar a conversa direta.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={handleRejectConnection} className="h-12 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-bold text-white/65 transition hover:bg-white/[0.08]">Agora não</button>
            <button onClick={handleAcceptConnection} className="h-12 rounded-2xl bg-white text-sm font-black text-black transition active:scale-[0.98]">Aceitar</button>
          </div>
        </div>
      );
    }

    if (connection?.status === 'pending') {
      return (
        <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/[0.06] text-white/55"><span className="material-symbols-rounded">schedule</span></div>
            <div><p className="font-bold text-white">Pedido enviado</p><p className="text-sm text-white/45">Aguardando {displayName} aceitar.</p></div>
          </div>
        </div>
      );
    }

    if (connection?.status === 'accepted') return null;

    return (
      <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.035] p-4">
        <p className={eyebrowClass}>Primeiro contato</p>
        <p className="mt-2 text-sm leading-relaxed text-white/60">Diga algo antes de pedir para conversar. Isso reduz spam e deixa o primeiro contato mais humano.</p>
        <textarea
          value={firstMessage}
          onChange={(event) => setFirstMessage(event.target.value)}
          maxLength={1000}
          placeholder={`Oi, ${displayName}…`}
          className="mt-4 min-h-[92px] w-full resize-none rounded-[18px] border border-white/[0.08] bg-black/35 px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-primary-500/45 focus:ring-2 focus:ring-primary-500/10"
        />
        <button
          onClick={handleRequestConnection}
          disabled={isSendingRequest || !firstMessage.trim()}
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-white font-black text-black transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
        >
          {isSendingRequest ? <span className="h-5 w-5 animate-spin rounded-full border-2 border-black/20 border-t-black" /> : <span className="material-symbols-rounded">send</span>}
          Solicitar conversa
        </button>
      </div>
    );
  };

  return (
    <>
      <div className="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md" onClick={onClose} />
      <div className="pointer-events-none fixed inset-0 z-[151] flex items-end justify-center sm:items-center sm:p-5">
        <article className="pointer-events-auto relative flex max-h-[94dvh] w-full max-w-[560px] flex-col overflow-hidden rounded-t-[34px] border border-white/[0.08] bg-[#08080b]/95 shadow-[0_-24px_80px_rgba(0,0,0,.55)] backdrop-blur-2xl sm:max-h-[90dvh] sm:rounded-[34px]">
          <div className="absolute left-1/2 top-2 z-30 h-1 w-10 -translate-x-1/2 rounded-full bg-white/20 sm:hidden" />

          <header className="absolute inset-x-0 top-0 z-20 flex items-center justify-between p-4 pt-5">
            <button onClick={handleFavorite} aria-label={isFavorite ? 'Remover dos favoritos' : 'Favoritar'} className={`flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-xl transition active:scale-95 ${isFavorite ? 'border-primary-500/45 bg-primary-500/18 text-primary-400' : 'border-white/10 bg-black/35 text-white/75'}`}>
              <span className={`material-symbols-rounded ${isFavorite ? 'filled' : ''}`}>favorite</span>
            </button>
            <div className="flex gap-2">
              <button onClick={() => setOptionsOpen((value) => !value)} aria-label="Mais opções" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white/80 backdrop-blur-xl transition active:scale-95"><span className="material-symbols-rounded">more_horiz</span></button>
              <button onClick={onClose} aria-label="Fechar perfil" className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/35 text-white/80 backdrop-blur-xl transition active:scale-95"><span className="material-symbols-rounded">close</span></button>
            </div>
          </header>

          {isOptionsOpen && (
            <div className="absolute right-4 top-[70px] z-40 w-52 overflow-hidden rounded-[20px] border border-white/10 bg-[#15151b]/95 p-1.5 shadow-2xl backdrop-blur-2xl">
              <button onClick={() => { setOptionsOpen(false); setReportOpen(true); }} className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-white/75 hover:bg-white/[0.06]"><span className="material-symbols-rounded text-yellow-400">flag</span>Denunciar perfil</button>
              <button onClick={() => { setOptionsOpen(false); setBlockConfirmOpen(true); }} className="flex h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-red-300 hover:bg-red-500/10"><span className="material-symbols-rounded">block</span>Bloquear</button>
            </div>
          )}

          <div className="flex-1 overflow-y-auto pb-36 no-scrollbar">
            <section className="relative aspect-[4/4.4] min-h-[370px] overflow-hidden bg-[#111116]">
              {user.video_url ? (
                <video src={user.video_url} className="h-full w-full object-cover" autoPlay loop muted playsInline />
              ) : (
                <img src={user.avatar_url} alt={displayName} className="h-full w-full object-cover" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-[#08080b]" />
              <div className="absolute inset-x-0 bottom-0 px-5 pb-5 sm:px-6">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  {isOnline && <span className="inline-flex items-center gap-1.5 rounded-full border border-tertiary-500/25 bg-tertiary-500/15 px-2.5 py-1 text-[11px] font-bold text-tertiary-500"><span className="h-1.5 w-1.5 rounded-full bg-tertiary-500" />ONLINE</span>}
                  {agoraPost && <span className="inline-flex items-center gap-1 rounded-full border border-primary-500/30 bg-primary-500/16 px-2.5 py-1 text-[11px] font-bold text-primary-400"><span className="material-symbols-rounded !text-[14px] filled">local_fire_department</span>AGORA</span>}
                  {user.can_host && <span className="rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-[11px] font-bold text-white/70">TEM LOCAL</span>}
                </div>
                <div className="flex items-center gap-2">
                  <h1 className="font-bricolage text-[32px] font-black leading-none tracking-[-0.04em] text-white">{displayName}{user.age ? `, ${user.age}` : ''}</h1>
                  {user.is_verified && <span className="material-symbols-rounded filled text-primary-400" title="Perfil verificado">verified</span>}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm font-medium text-white/58">
                  <span>{statusText}</span>
                  {locationText && <><span className="text-white/25">•</span><span>{locationText}</span></>}
                  {distanceText && <><span className="text-white/25">•</span><span>{distanceText}</span></>}
                </div>
              </div>
            </section>

            <div className="space-y-4 px-4 pt-3 sm:px-5">
              {agoraPost && (
                <section className="overflow-hidden rounded-[24px] border border-primary-500/20 bg-gradient-to-br from-primary-500/10 to-secondary-500/10 p-4">
                  <div className="flex items-start gap-3">
                    {agoraPost.photo_url && <img src={agoraPost.photo_url} alt="Agora" className="h-16 w-16 shrink-0 rounded-2xl object-cover" />}
                    <div className="min-w-0"><p className="text-[11px] font-black uppercase tracking-[0.16em] text-primary-400">Disponível agora</p><p className="mt-1.5 text-sm leading-relaxed text-white/75">{agoraPost.status_text || 'Está por perto e disponível para conhecer alguém.'}</p></div>
                  </div>
                </section>
              )}

              <section className={sectionClass}>
                <p className={eyebrowClass}>Sobre</p>
                <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-6 text-white/72">{user.status_text || 'Ainda não escreveu uma apresentação.'}</p>
              </section>

              {!!user.looking_for?.length && (
                <section className={sectionClass}>
                  <p className={eyebrowClass}>O que busca</p>
                  <div className="mt-3 flex flex-wrap gap-2">{user.looking_for.map((item) => <span key={item} className="rounded-full border border-tertiary-500/18 bg-tertiary-500/10 px-3 py-1.5 text-xs font-bold text-tertiary-500">{t(`constants.looking_for.${item}`, { defaultValue: item })}</span>)}</div>
                </section>
              )}

              {(parseTags(user.kinks).length > 0 || parseTags(user.tribes).length > 0) && (
                <section className={sectionClass}>
                  <p className={eyebrowClass}>Interesses</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {parseTags(user.tribes).map((item) => <span key={`tribe-${item}`} className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/68">#{t(`constants.tribes.${cleanTag(item)}`, { defaultValue: cleanTag(item) })}</span>)}
                    {parseTags(user.kinks).map((item) => <span key={`kink-${item}`} className="rounded-full border border-secondary-500/20 bg-secondary-500/10 px-3 py-1.5 text-xs font-semibold text-purple-200">#{t(`constants.kinks.${cleanTag(item)}`, { defaultValue: cleanTag(item) })}</span>)}
                  </div>
                </section>
              )}

              {allPhotos.length > 1 && (
                <section>
                  <div className="mb-3 flex items-center justify-between px-1"><p className={eyebrowClass}>Fotos</p><span className="text-xs font-semibold text-white/35">{allPhotos.length}</span></div>
                  <div className="grid grid-cols-2 gap-2">{allPhotos.slice(1, 7).map((photo, index) => <img key={`${photo}-${index}`} src={photo} alt={`${displayName} ${index + 2}`} className={`w-full rounded-[20px] object-cover ${index === 0 && allPhotos.length % 2 === 0 ? 'aspect-square' : 'aspect-[4/5]'}`} />)}</div>
                </section>
              )}

              {userVideos.length > 0 && (
                <section>
                  <div className="mb-3 flex items-center justify-between px-1"><p className={eyebrowClass}>Vídeos</p><span className="text-xs font-semibold text-white/35">{userVideos.length}</span></div>
                  <div className="grid grid-cols-3 gap-2">{userVideos.slice(0, 6).map((video) => <button key={video.id} onClick={() => { useUiStore.getState().setActiveView('videos'); onClose(); }} className="relative aspect-[9/14] overflow-hidden rounded-[18px] bg-white/[0.04] text-left">{video.thumbnail_url ? <img src={video.thumbnail_url} alt={video.title} className="h-full w-full object-cover" /> : <video src={video.video_url} className="h-full w-full object-cover" />}<span className="absolute bottom-2 left-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur"><span className="material-symbols-rounded !text-[18px] filled">play_arrow</span></span></button>)}</div>
                </section>
              )}

              <section className={sectionClass}>
                <p className={eyebrowClass}>Detalhes</p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {user.pronouns && <Detail label="Pronomes" value={t(`constants.options.${user.pronouns}`, { defaultValue: user.pronouns })} />}
                  {user.position && <Detail label="Posição" value={t(`constants.positions.${user.position}`, { defaultValue: user.position })} />}
                  {user.relationship_status && <Detail label="Relacionamento" value={t(`constants.options.${user.relationship_status}`, { defaultValue: user.relationship_status })} />}
                  {user.gender_identity && <Detail label="Identidade" value={t(`constants.options.${user.gender_identity}`, { defaultValue: user.gender_identity })} />}
                  {user.height_cm && <Detail label="Altura" value={`${user.height_cm} cm`} />}
                  {user.body_type && <Detail label="Corpo" value={t(`constants.options.${user.body_type}`, { defaultValue: user.body_type })} />}
                </div>
              </section>

              {user.has_private_albums && (
                <section className={sectionClass}>
                  <div className="flex items-center justify-between"><div><p className={eyebrowClass}>Álbum privado</p><p className="mt-1 text-sm text-white/45">Conteúdo compartilhado somente com quem o perfil aprovar.</p></div><span className="material-symbols-rounded text-primary-400">lock</span></div>
                  {isFetchingViewedUserAlbums ? <div className="mt-4 h-16 animate-pulse rounded-2xl bg-white/[0.04]" /> : viewedUserAccessStatus === 'granted' ? (
                    <div className="mt-4 grid grid-cols-3 gap-2">{viewedUserAlbums.map((album) => <button key={album.id} onClick={() => setViewingAlbum(album)} className="relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04]">{album.private_album_photos?.[0]?.photo_path && <img src={album.private_album_photos[0].photo_path} className="h-full w-full object-cover" alt={album.name} />}<span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-2 pb-2 pt-6 text-left text-[11px] font-bold text-white">{album.name}</span></button>)}</div>
                  ) : viewedUserAccessStatus === 'pending' ? <div className="mt-4 rounded-2xl bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/45">Solicitação enviada</div> : (
                    <button onClick={() => toast.promise(requestAccess(user.id), { loading: 'Enviando…', success: 'Solicitação enviada', error: 'Não foi possível solicitar' })} className="mt-4 h-12 w-full rounded-2xl border border-primary-500/30 bg-primary-500/10 text-sm font-black text-primary-300 transition active:scale-[0.98]">Solicitar acesso</button>
                  )}
                </section>
              )}

              {user.id !== currentUser?.id && connection?.status !== 'accepted' && renderConnectionCard()}
            </div>
          </div>

          {user.id !== currentUser?.id && (
            <footer className="absolute inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-[#0b0b0f]/92 p-3 pb-[max(12px,env(safe-area-inset-bottom))] backdrop-blur-2xl">
              <div className="grid grid-cols-[1fr_1.35fr] gap-2">
                <button onClick={handleWink} disabled={currentUser?.subscription_tier === 'free' && winkCount !== null && winkCount >= 10} className="flex h-14 items-center justify-center gap-2 rounded-[20px] border border-white/[0.09] bg-white/[0.05] font-black text-white transition active:scale-[0.98] disabled:opacity-35"><span className="text-xl">😉</span>Chamar</button>
                {connection?.status === 'accepted' ? (
                  <button onClick={handleChat} className="flex h-14 items-center justify-center gap-2 rounded-[20px] bg-gradient-to-r from-primary-500 to-secondary-500 font-black text-white shadow-[0_12px_35px_rgba(245,12,105,.22)] transition active:scale-[0.98]"><span className="material-symbols-rounded filled">chat_bubble</span>Conversar</button>
                ) : (
                  <button onClick={() => document.querySelector<HTMLTextAreaElement>('textarea[placeholder^="Oi,"]')?.focus()} className="flex h-14 items-center justify-center gap-2 rounded-[20px] bg-white font-black text-black transition active:scale-[0.98]"><span className="material-symbols-rounded">handshake</span>Conectar</button>
                )}
              </div>
            </footer>
          )}
        </article>
      </div>

      {viewingAlbum && <AlbumGalleryModal album={viewingAlbum} onClose={() => setViewingAlbum(null)} />}
      {isReportOpen && <ReportUserModal user={user} onClose={() => setReportOpen(false)} />}
      {isBlockConfirmOpen && <ConfirmationModal isOpen title={`Bloquear ${displayName}?`} message="Vocês deixam de aparecer um para o outro e novas interações ficam bloqueadas." onConfirm={handleBlock} onCancel={() => setBlockConfirmOpen(false)} confirmText="Bloquear" />}
    </>
  );
};

const Detail = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-2xl border border-white/[0.06] bg-black/20 px-3.5 py-3">
    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/30">{label}</p>
    <p className="mt-1 truncate text-sm font-bold text-white/72">{value}</p>
  </div>
);
