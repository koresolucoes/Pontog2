import React, { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { enUS, es, ptBR } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';
import { useInboxStore } from '../stores/inboxStore';
import { useUiStore } from '../stores/uiStore';
import { useMapStore } from '../stores/mapStore';
import { useAuthStore } from '../stores/authStore';
import { useAdStore } from '../stores/adStore';
import { socialActions } from '../modules/social/public';
import { Ad, ConversationPreview, User } from '../types';
import { ConfirmationModal } from './ConfirmationModal';
import { UnlockFeatureModal } from './UnlockFeatureModal';
import { RewardAdModal } from './RewardAdModal';

type LegacyTab = 'messages' | 'winks' | 'views' | 'requests' | 'favorites';
type InboxSection = 'conversations' | 'requests' | 'activity';
type ActivityMode = 'winks' | 'views';

interface InboxProps {
  initialTab?: LegacyTab;
}

const sectionFromLegacyTab = (tab: LegacyTab): InboxSection => {
  if (tab === 'requests') return 'requests';
  if (tab === 'winks' || tab === 'views') return 'activity';
  return 'conversations';
};

const formatLastMessageContent = (content: string | null | undefined, t: any): string => {
  if (content === null) return `📷 ${t('inbox.photo', { defaultValue: 'Foto' })}`;
  if (!content) return '';
  const raw = content.trim();
  const normalized = raw.replace(/\\"/g, '"');
  const source = normalized.toLowerCase();
  if (source.includes('"type":"audio"') || source.includes('audio_record')) return `🎙️ ${t('inbox.audio', { defaultValue: 'Mensagem de voz' })}`;
  if (source.includes('"type":"location"')) return `📍 ${t('inbox.location', { defaultValue: 'Localização' })}`;
  if (source.includes('"type":"album"')) return `📷 ${t('inbox.album', { defaultValue: 'Álbum' })}`;
  return raw;
};

const conversationToUser = (conversation: ConversationPreview): User => ({
  id: conversation.other_participant_id,
  username: conversation.other_participant_username,
  avatar_url: conversation.other_participant_avatar_url,
  last_seen: conversation.other_participant_last_seen,
  subscription_tier: conversation.other_participant_subscription_tier,
} as User);

const EmptyState: React.FC<{ icon: string; title: string; message: string; action?: string; onAction?: () => void }> = ({ icon, title, message, action, onAction }) => (
  <div className="flex min-h-[48vh] flex-col items-center justify-center px-8 text-center">
    <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[26px] border border-white/[0.07] bg-white/[0.03]">
      <span className="material-symbols-rounded text-[34px] text-white/25">{icon}</span>
    </div>
    <h3 className="pg-title text-2xl text-white">{title}</h3>
    <p className="mt-2 max-w-xs text-sm leading-relaxed text-white/45">{message}</p>
    {action && onAction && <button type="button" onClick={onAction} className="pg-btn pg-btn-secondary mt-6">{action}</button>}
  </div>
);

const SectionTab: React.FC<{ active: boolean; icon: string; label: string; count?: number; onClick: () => void }> = ({ active, icon, label, count, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className={`relative flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-[16px] px-3 text-xs font-extrabold transition-all ${active ? 'bg-white text-black shadow-lg' : 'text-white/45 hover:bg-white/[0.04] hover:text-white/75'}`}
  >
    <span className={`material-symbols-rounded !text-[18px] ${active ? 'filled' : ''}`}>{icon}</span>
    <span>{label}</span>
    {Boolean(count) && <span className={`min-w-5 rounded-full px-1.5 py-0.5 text-[9px] font-black ${active ? 'bg-black/10 text-black/70' : 'bg-[var(--pg-primary)] text-white'}`}>{count! > 99 ? '99+' : count}</span>}
  </button>
);

const SponsoredCard: React.FC<{ ad: Ad }> = ({ ad }) => {
  const trackView = useAdStore((state) => state.trackView);
  const trackClick = useAdStore((state) => state.trackClick);

  useEffect(() => {
    void trackView(ad.id);
  }, [ad.id, trackView]);

  const openAd = () => {
    void trackClick(ad.id);
    if (ad.cta_url && ad.cta_url !== '#') window.open(ad.cta_url, '_blank', 'noopener,noreferrer');
  };

  return (
    <button type="button" onClick={openAd} className="w-full overflow-hidden rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-3 text-left">
      <div className="flex items-center gap-3">
        <img src={ad.image_url} alt="" className="h-14 w-14 shrink-0 rounded-[16px] object-cover" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="pg-eyebrow !text-[9px]">Patrocinado</span>
          </div>
          <p className="mt-1 truncate text-sm font-extrabold text-white">{ad.title}</p>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-white/40">{ad.description}</p>
        </div>
        <span className="material-symbols-rounded text-white/28">arrow_outward</span>
      </div>
    </button>
  );
};

export const Inbox: React.FC<InboxProps> = ({ initialTab = 'messages' }) => {
  const { t, i18n } = useTranslation();
  const currentUser = useAuthStore((state) => state.user);
  const onlineUsers = useMapStore((state) => state.onlineUsers);
  const setSelectedUser = useMapStore((state) => state.setSelectedUser);
  const { setChatUser, setSubscriptionModalOpen, setActiveView } = useUiStore();
  const {
    conversations,
    winks,
    accessRequests,
    profileViews,
    messageRequests,
    loadingConversations,
    loadingWinks,
    loadingRequests,
    loadingProfileViews,
    loadingMessageRequests,
    fetchConversations,
    fetchWinks,
    fetchProfileViews,
    fetchAccessRequests,
    fetchMessageRequests,
    respondToRequest,
    deleteConversation,
    clearWinks,
    clearAccessRequests,
  } = useInboxStore();
  const { inboxAd, grantTemporaryPerk, hasPerk } = useAdStore();

  const [activeSection, setActiveSection] = useState<InboxSection>(() => sectionFromLegacyTab(initialTab));
  const [activityMode, setActivityMode] = useState<ActivityMode>(initialTab === 'views' ? 'views' : 'winks');
  const [confirmDelete, setConfirmDelete] = useState<ConversationPreview | null>(null);
  const [unlockModal, setUnlockModal] = useState<ActivityMode | null>(null);
  const [rewardModal, setRewardModal] = useState<ActivityMode | null>(null);
  const [busyRequestId, setBusyRequestId] = useState<string | number | null>(null);

  const locale = i18n.language.startsWith('en') ? enUS : i18n.language.startsWith('es') ? es : ptBR;
  const isPlus = currentUser?.subscription_tier === 'plus';
  const canSeeWinks = Boolean(isPlus || hasPerk('view_winks'));
  const canSeeViews = Boolean(isPlus || hasPerk('view_profile_views'));
  const pendingCount = messageRequests.length + accessRequests.length;
  const unreadConversations = conversations.reduce((sum, conversation) => sum + Number(conversation.unread_count || 0), 0);

  useEffect(() => {
    if (activeSection === 'conversations') void fetchConversations();
    if (activeSection === 'requests') {
      void fetchMessageRequests();
      void fetchAccessRequests();
    }
    if (activeSection === 'activity') {
      void fetchWinks();
      void fetchProfileViews();
    }
  }, [activeSection, fetchAccessRequests, fetchConversations, fetchMessageRequests, fetchProfileViews, fetchWinks]);

  useEffect(() => {
    if (activeSection === 'activity' && activityMode === 'winks' && canSeeWinks && winks.length) clearWinks();
  }, [activeSection, activityMode, canSeeWinks, clearWinks, winks.length]);

  useEffect(() => {
    if (activeSection === 'requests' && accessRequests.length) clearAccessRequests();
  }, [activeSection, accessRequests.length, clearAccessRequests]);

  const openConversation = (conversation: ConversationPreview) => setChatUser(conversationToUser(conversation));
  const openConversationProfile = (conversation: ConversationPreview) => setSelectedUser(conversationToUser(conversation));

  const handleAcceptConnection = async (request: any) => {
    setBusyRequestId(request.id);
    try {
      await socialActions.acceptConnection(String(request.id));
      toast.success('Conexão aceita. Agora vocês podem conversar.');
      await Promise.all([fetchMessageRequests(true), fetchConversations(true)]);
    } catch (error) {
      console.error('Error accepting connection request:', error);
      toast.error('Não foi possível aceitar a conexão.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleRejectConnection = async (request: any) => {
    setBusyRequestId(request.id);
    try {
      await socialActions.rejectConnection(String(request.id));
      toast.success('Pedido recusado.');
      await fetchMessageRequests(true);
    } catch (error) {
      console.error('Error rejecting connection request:', error);
      toast.error('Não foi possível recusar o pedido.');
    } finally {
      setBusyRequestId(null);
    }
  };

  const handleAlbumRequest = async (requestId: number, status: 'granted' | 'denied') => {
    setBusyRequestId(requestId);
    await respondToRequest(requestId, status);
    setBusyRequestId(null);
  };

  const activityItems = activityMode === 'winks' ? winks : profileViews;
  const activityLoading = activityMode === 'winks' ? loadingWinks : loadingProfileViews;
  const canSeeActivity = activityMode === 'winks' ? canSeeWinks : canSeeViews;

  return (
    <>
      <div className="pg-page flex h-full flex-col">
        <header className="shrink-0 border-b border-white/[0.06] bg-[rgba(5,5,7,.78)] px-4 pb-3 pt-4 backdrop-blur-2xl sm:px-6">
          <div className="mx-auto max-w-2xl">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="pg-eyebrow">Conexões</p>
                <h1 className="pg-title mt-1 text-[28px] text-white">Conversas</h1>
                <p className="mt-1 text-xs text-white/38">Mensagens, pedidos e sinais de interesse em um só lugar.</p>
              </div>
              {unreadConversations > 0 && (
                <span className="pg-chip pg-chip-active">
                  <span className="material-symbols-rounded filled !text-[14px]">mark_chat_unread</span>
                  {unreadConversations} nova{unreadConversations === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <nav className="flex gap-1 rounded-[20px] border border-white/[0.06] bg-white/[0.025] p-1" aria-label="Seções das conversas">
              <SectionTab active={activeSection === 'conversations'} icon="chat_bubble" label="Conversas" count={unreadConversations} onClick={() => setActiveSection('conversations')} />
              <SectionTab active={activeSection === 'requests'} icon="person_add" label="Pedidos" count={pendingCount} onClick={() => setActiveSection('requests')} />
              <SectionTab active={activeSection === 'activity'} icon="bolt" label="Atividade" count={winks.length} onClick={() => setActiveSection('activity')} />
            </nav>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-3 pb-28 pt-4 sm:px-5">
          <div className="mx-auto max-w-2xl">
            {activeSection === 'conversations' && (
              <div className="space-y-3">
                {inboxAd && <SponsoredCard ad={inboxAd} />}

                {loadingConversations && conversations.length === 0 ? (
                  <div className="space-y-2">
                    {[0, 1, 2, 3].map((item) => <div key={item} className="h-[74px] animate-pulse rounded-[20px] bg-white/[0.03]" />)}
                  </div>
                ) : conversations.length === 0 ? (
                  <EmptyState
                    icon="chat_bubble_outline"
                    title="Ainda sem conversas"
                    message="Encontre alguém em Descobrir ou no Agora e dê o primeiro passo."
                    action="Descobrir pessoas"
                    onAction={() => setActiveView('home')}
                  />
                ) : (
                  <section className="overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.025]">
                    {conversations.map((conversation, index) => {
                      const unread = Number(conversation.unread_count || 0);
                      const online = onlineUsers.includes(conversation.other_participant_id);
                      return (
                        <div key={conversation.conversation_id} className={`${index ? 'border-t border-white/[0.055]' : ''} group relative flex min-h-[76px] items-center gap-3 px-3 py-3 transition-colors hover:bg-white/[0.025]`}>
                          <button type="button" onClick={() => openConversationProfile(conversation)} className="relative shrink-0" aria-label={`Ver perfil de ${conversation.other_participant_username}`}>
                            <img src={conversation.other_participant_avatar_url} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10" />
                            {online && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--pg-surface-1)] bg-[var(--pg-online)]" />}
                          </button>

                          <button type="button" onClick={() => openConversation(conversation)} className="min-w-0 flex-1 text-left">
                            <div className="flex items-center justify-between gap-3">
                              <p className={`truncate text-sm ${unread ? 'font-black text-white' : 'font-bold text-white/76'}`}>{conversation.other_participant_username}</p>
                              <span className="shrink-0 text-[10px] font-medium text-white/28">{formatDistanceToNow(new Date(conversation.last_message_created_at), { addSuffix: false, locale })}</span>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <p className={`min-w-0 flex-1 truncate text-xs ${unread ? 'font-semibold text-white/68' : 'text-white/36'}`}>
                                {conversation.last_message_sender_id === currentUser?.id ? 'Você: ' : ''}{formatLastMessageContent(conversation.last_message_content, t)}
                              </p>
                              {unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--pg-primary)] px-1.5 text-[9px] font-black text-white">{unread > 99 ? '99+' : unread}</span>}
                            </div>
                          </button>

                          <button type="button" onClick={() => setConfirmDelete(conversation)} className="pg-icon-btn !h-9 !w-9 shrink-0 opacity-60 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Apagar conversa">
                            <span className="material-symbols-rounded !text-[17px]">delete</span>
                          </button>
                        </div>
                      );
                    })}
                  </section>
                )}
              </div>
            )}

            {activeSection === 'requests' && (
              <div className="space-y-5">
                <div>
                  <div className="mb-3 flex items-center justify-between px-1">
                    <div>
                      <p className="pg-eyebrow">Conversa</p>
                      <h2 className="pg-title mt-1 text-xl text-white">Pedidos de conexão</h2>
                    </div>
                    {messageRequests.length > 0 && <span className="pg-chip">{messageRequests.length}</span>}
                  </div>

                  {loadingMessageRequests && messageRequests.length === 0 ? (
                    <div className="h-24 animate-pulse rounded-[22px] bg-white/[0.03]" />
                  ) : messageRequests.length === 0 ? (
                    <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-5 text-sm text-white/42">Nenhum pedido de conversa pendente.</div>
                  ) : (
                    <div className="space-y-2">
                      {messageRequests.map((request: any) => (
                        <div key={request.id} className="rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-4">
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setSelectedUser({ id: request.follower_id, username: request.username, avatar_url: request.avatar_url, age: request.age, status: 'active' } as User)} className="relative shrink-0">
                              <img src={request.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10" />
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-extrabold text-white">{request.username}{request.age ? `, ${request.age}` : ''}</p>
                              <p className="mt-1 text-xs text-white/38">Quer iniciar uma conversa com você.</p>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button type="button" disabled={busyRequestId === request.id} onClick={() => handleRejectConnection(request)} className="pg-btn pg-btn-secondary !min-h-[44px] !text-xs">Recusar</button>
                            <button type="button" disabled={busyRequestId === request.id} onClick={() => handleAcceptConnection(request)} className="pg-btn pg-btn-primary !min-h-[44px] !text-xs">Aceitar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="mb-3 flex items-center justify-between px-1">
                    <div>
                      <p className="pg-eyebrow">Privacidade</p>
                      <h2 className="pg-title mt-1 text-xl text-white">Álbuns privados</h2>
                    </div>
                    {accessRequests.length > 0 && <span className="pg-chip">{accessRequests.length}</span>}
                  </div>

                  {loadingRequests && accessRequests.length === 0 ? (
                    <div className="h-24 animate-pulse rounded-[22px] bg-white/[0.03]" />
                  ) : accessRequests.length === 0 ? (
                    <div className="rounded-[22px] border border-white/[0.07] bg-white/[0.025] p-5 text-sm text-white/42">Nenhuma solicitação de álbum pendente.</div>
                  ) : (
                    <div className="space-y-2">
                      {accessRequests.map((request) => (
                        <div key={request.id} className="rounded-[22px] border border-white/[0.07] bg-white/[0.03] p-4">
                          <div className="flex items-center gap-3">
                            <button type="button" onClick={() => setSelectedUser({ id: request.requester_id, username: request.username, avatar_url: request.avatar_url, status: 'active' } as User)} className="shrink-0">
                              <img src={request.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10" />
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-extrabold text-white">{request.username}</p>
                              <p className="mt-1 text-xs text-white/38">Pediu acesso ao seu álbum privado.</p>
                            </div>
                          </div>
                          <div className="mt-4 grid grid-cols-2 gap-2">
                            <button type="button" disabled={busyRequestId === request.id} onClick={() => handleAlbumRequest(request.id, 'denied')} className="pg-btn pg-btn-secondary !min-h-[44px] !text-xs">Recusar</button>
                            <button type="button" disabled={busyRequestId === request.id} onClick={() => handleAlbumRequest(request.id, 'granted')} className="pg-btn pg-btn-primary !min-h-[44px] !text-xs">Liberar acesso</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeSection === 'activity' && (
              <div>
                <div className="mb-4 flex rounded-[18px] border border-white/[0.06] bg-white/[0.025] p-1">
                  <button type="button" onClick={() => setActivityMode('winks')} className={`flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-[14px] text-xs font-extrabold ${activityMode === 'winks' ? 'bg-[var(--pg-primary-soft)] text-white' : 'text-white/40'}`}>
                    <span className="material-symbols-rounded filled !text-[17px]">waving_hand</span>
                    Chamados {winks.length > 0 ? `· ${winks.length}` : ''}
                  </button>
                  <button type="button" onClick={() => setActivityMode('views')} className={`flex min-h-[42px] flex-1 items-center justify-center gap-2 rounded-[14px] text-xs font-extrabold ${activityMode === 'views' ? 'bg-[var(--pg-secondary-soft)] text-white' : 'text-white/40'}`}>
                    <span className="material-symbols-rounded !text-[17px]">visibility</span>
                    Visitas {profileViews.length > 0 ? `· ${profileViews.length}` : ''}
                  </button>
                </div>

                {!canSeeActivity ? (
                  <div className="relative overflow-hidden rounded-[26px] border border-white/[0.07] bg-white/[0.025] p-6 text-center">
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[rgba(245,12,105,.08)] to-[rgba(129,13,247,.08)]" />
                    <div className="relative">
                      <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-white/[0.05] text-white/55">
                        <span className="material-symbols-rounded text-[28px]">lock</span>
                      </span>
                      <p className="pg-eyebrow mt-5">Ponto G Plus</p>
                      <h2 className="pg-title mt-2 text-2xl text-white">{activityMode === 'winks' ? `${winks.length} pessoa${winks.length === 1 ? '' : 's'} te chamou` : `${profileViews.length} visita${profileViews.length === 1 ? '' : 's'} ao seu perfil`}</h2>
                      <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-white/42">Veja quem demonstrou interesse com Plus ou libere por uma hora assistindo a um anúncio.</p>
                      <button type="button" onClick={() => setUnlockModal(activityMode)} className="pg-btn pg-btn-primary mt-6 px-6">Ver quem foi</button>
                    </div>
                  </div>
                ) : activityLoading && activityItems.length === 0 ? (
                  <div className="space-y-2">{[0, 1, 2].map((item) => <div key={item} className="h-[76px] animate-pulse rounded-[20px] bg-white/[0.03]" />)}</div>
                ) : activityItems.length === 0 ? (
                  <EmptyState
                    icon={activityMode === 'winks' ? 'waving_hand' : 'visibility'}
                    title={activityMode === 'winks' ? 'Nenhum chamado ainda' : 'Nenhuma visita recente'}
                    message={activityMode === 'winks' ? 'Quando alguém te chamar, aparecerá aqui.' : 'As visitas recentes ao seu perfil aparecerão aqui.'}
                  />
                ) : (
                  <div className="overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.025]">
                    {activityItems.map((item: any, index) => {
                      const timestamp = activityMode === 'winks' ? item.wink_created_at : item.viewed_at;
                      const online = onlineUsers.includes(item.id);
                      return (
                        <button
                          type="button"
                          key={`${activityMode}-${item.id}-${timestamp}`}
                          onClick={() => setSelectedUser(item)}
                          className={`${index ? 'border-t border-white/[0.055]' : ''} flex min-h-[76px] w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-white/[0.025]`}
                        >
                          <div className="relative shrink-0">
                            <img src={item.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover ring-1 ring-white/10" />
                            {online && <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-[var(--pg-surface-1)] bg-[var(--pg-online)]" />}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-sm font-extrabold text-white">{item.display_name || item.username}{item.age ? `, ${item.age}` : ''}</p>
                              {item.is_verified && <span className="material-symbols-rounded filled !text-[15px] text-[var(--pg-primary)]">verified</span>}
                            </div>
                            <p className="mt-1 text-xs text-white/36">{activityMode === 'winks' ? 'Te chamou' : 'Visitou seu perfil'} · {formatDistanceToNow(new Date(timestamp), { addSuffix: true, locale })}</p>
                          </div>
                          <span className="material-symbols-rounded text-white/24">chevron_right</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>

      {confirmDelete && (
        <ConfirmationModal
          isOpen
          title="Apagar conversa?"
          message={`A conversa com ${confirmDelete.other_participant_username} será removida da sua caixa.`}
          onConfirm={() => {
            void deleteConversation(confirmDelete.conversation_id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
          confirmText="Apagar"
        />
      )}

      {unlockModal && (
        <UnlockFeatureModal
          title={unlockModal === 'winks' ? 'Veja quem te chamou' : 'Veja quem visitou você'}
          description="Assine o Plus para acesso ilimitado ou veja um anúncio para liberar por 1 hora."
          onClose={() => setUnlockModal(null)}
          onUpgrade={() => { setSubscriptionModalOpen(true); setUnlockModal(null); }}
          onWatchAd={() => { setRewardModal(unlockModal); setUnlockModal(null); }}
        />
      )}

      {rewardModal && (
        <RewardAdModal
          onClose={() => setRewardModal(null)}
          onReward={() => {
            grantTemporaryPerk(rewardModal === 'winks' ? 'view_winks' : 'view_profile_views', 1);
            setActivityMode(rewardModal);
            setRewardModal(null);
          }}
        />
      )}
    </>
  );
};
