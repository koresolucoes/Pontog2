
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useInboxStore } from '../stores/inboxStore';
import { useUiStore } from '../stores/uiStore';
import { useMapStore } from '../stores/mapStore';
import { useAuthStore } from '../stores/authStore';
import { useAdStore } from '../stores/adStore';
import { useUserActionsStore } from '../stores/userActionsStore';
import { ConversationPreview, User, WinkWithProfile, AlbumAccessRequest, ProfileViewWithProfile } from '../types';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { ConfirmationModal } from './ConfirmationModal';
import { AdSenseUnit } from './AdSenseUnit';
import { UnlockFeatureModal } from './UnlockFeatureModal';
import { RewardAdModal } from './RewardAdModal';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useTranslation } from 'react-i18next';


type ActiveTab = 'messages' | 'winks' | 'views' | 'requests' | 'favorites';

interface InboxProps {
    initialTab?: ActiveTab;
}

const formatLastMessageContent = (content: string | null | undefined, t: any): string => {
    if (content === null) return `📷 ${t('inbox.photo', { defaultValue: 'Foto' })}`;
    if (!content) return '';

    const str = content.trim();
    
    // Clean outer escaped quotes if it was double-stringified (e.g. "\"{\\\"type\\\":\\\"audio\\\"}\"")
    let cleanStr = str;
    if (cleanStr.startsWith('"') && cleanStr.endsWith('"')) {
        try {
            const temp = JSON.parse(cleanStr);
            if (typeof temp === 'string') {
                cleanStr = temp;
            }
        } catch (e) {}
    }

    // Try to normalize escaped quotes
    const normalizedStr = cleanStr.replace(/\\"/g, '"');

    // Failsafe regex search for any audio/location/album pattern
    if (/["']type["']\s*:\s*["']audio["']/i.test(normalizedStr) || normalizedStr.includes('"type":"audio"') || normalizedStr.includes('type: "audio"') || normalizedStr.includes('"audio"')) {
        return `🎙️ ${t('inbox.audio', { defaultValue: 'Mensagem de voz' })}`;
    }
    if (/["']type["']\s*:\s*["']location["']/i.test(normalizedStr) || normalizedStr.includes('"type":"location"') || normalizedStr.includes('type: "location"') || normalizedStr.includes('"location"')) {
        return `📍 ${t('inbox.location', { defaultValue: 'Localização' })}`;
    }
    if (/["']type["']\s*:\s*["']album["']/i.test(normalizedStr) || normalizedStr.includes('"type":"album"') || normalizedStr.includes('type: "album"') || normalizedStr.includes('"album"')) {
        return `📷 ${t('inbox.album', { defaultValue: 'Álbum' })}`;
    }

    try {
        let parsed = JSON.parse(cleanStr);
        if (typeof parsed === 'string') {
            parsed = JSON.parse(parsed); // Handle potential double encoding
        }
        if (parsed && typeof parsed === 'object' && parsed.type) {
            switch (parsed.type) {
                case 'location':
                    return `📍 ${t('inbox.location', { defaultValue: 'Localização' })}`;
                case 'album':
                    return `📷 ${t('inbox.album', { defaultValue: 'Álbum' })}`;
                case 'audio':
                    return `🎙️ ${t('inbox.audio', { defaultValue: 'Mensagem de voz' })}`;
                default:
                    break;
            }
        }
    } catch (e) {
        // Double parsing fallback
        try {
            let parsed = JSON.parse(normalizedStr);
            if (parsed && typeof parsed === 'object' && parsed.type) {
                switch (parsed.type) {
                    case 'location':
                        return `📍 ${t('inbox.location', { defaultValue: 'Localização' })}`;
                    case 'album':
                        return `📷 ${t('inbox.album', { defaultValue: 'Álbum' })}`;
                    case 'audio':
                        return `🎙️ ${t('inbox.audio', { defaultValue: 'Mensagem de voz' })}`;
                }
            }
        } catch (e2) {}
    }
    
    // If it still contains "type" and "audio" but couldn't be parsed, fallback to audio label anyway
    if (normalizedStr.includes('"audio"') || normalizedStr.includes('audio_record')) {
        return `🎙️ ${t('inbox.audio', { defaultValue: 'Mensagem de voz' })}`;
    }

    return cleanStr;
};

// Componente Reutilizável de Empty State
const EmptyState = ({ icon, title, message, actionLabel, onAction }: { icon: string, title: string, message: string, actionLabel?: string, onAction?: () => void }) => (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8 animate-fade-in">
        <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5 shadow-xl">
            <span className="material-symbols-rounded text-5xl text-slate-600 opacity-80">{icon}</span>
        </div>
        <h3 className="text-xl font-bold text-white font-outfit mb-2">{title}</h3>
        <p className="text-slate-400 text-sm max-w-xs mx-auto leading-relaxed mb-8">{message}</p>
        {actionLabel && onAction && (
            <button 
                onClick={onAction}
                className="bg-slate-800 text-white font-bold py-3 px-6 rounded-xl hover:bg-slate-700 transition-all border border-white/10 shadow-lg active:scale-95"
            >
                {actionLabel}
            </button>
        )}
    </div>
);


export const Inbox: React.FC<InboxProps> = ({ initialTab = 'messages' }) => {
    const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
    const { 
        conversations, winks, accessRequests, profileViews, messageRequests,
        loadingConversations, loadingWinks, loadingRequests, loadingProfileViews,
        fetchWinks, fetchProfileViews, fetchAccessRequests, fetchMessageRequests,
        acceptMessageRequest, rejectMessageRequest,
        respondToRequest, deleteConversation, clearWinks, clearAccessRequests
    } = useInboxStore();
    const { setChatUser, setSubscriptionModalOpen, setActiveView } = useUiStore();
    const { setSelectedUser } = useMapStore();
    const currentUser = useAuthStore(state => state.user);
    const { grantTemporaryPerk } = useAdStore();
    const { favoriteUsers, isFetchingFavorites, fetchFavorites, unfavoriteUser } = useUserActionsStore();
    
    const [confirmDelete, setConfirmDelete] = useState<ConversationPreview | null>(null);
    const [unlockModal, setUnlockModal] = useState<'winks' | 'views' | null>(null);
    const [rewardModal, setRewardModal] = useState<'winks' | 'views' | null>(null);
    const [viewingRequestsList, setViewingRequestsList] = useState(false);
    const { t, i18n } = useTranslation();

    const getLocale = () => {
        if (i18n.language.startsWith('en')) return enUS;
        if (i18n.language.startsWith('es')) return es;
        return ptBR;
    };

    useEffect(() => {
        if (activeTab === 'messages') fetchMessageRequests();
        if (activeTab === 'winks') fetchWinks();
        if (activeTab === 'requests') fetchAccessRequests();
        if (activeTab === 'views') fetchProfileViews();
        if (activeTab === 'favorites') fetchFavorites();
    }, [activeTab, fetchMessageRequests, fetchWinks, fetchAccessRequests, fetchProfileViews, fetchFavorites]);

    useEffect(() => {
        setViewingRequestsList(false);
    }, [activeTab]);
    
    useEffect(() => {
        if (activeTab === 'winks' && winks.length > 0) clearWinks();
    }, [activeTab, winks, clearWinks]);

    useEffect(() => {
        if (activeTab === 'requests' && accessRequests.length > 0) clearAccessRequests();
    }, [activeTab, accessRequests, clearAccessRequests]);

    const handleConversationClick = React.useCallback((convo: ConversationPreview) => {
        const chatPartner: User = {
            id: convo.other_participant_id, username: convo.other_participant_username,
            avatar_url: convo.other_participant_avatar_url, last_seen: convo.other_participant_last_seen,
            display_name: null, public_photos: [], status_text: null, date_of_birth: null,
            height_cm: null, weight_kg: null, tribes: [], position: null, hiv_status: null,
            updated_at: '', lat: 0, lng: 0, age: 0, distance_km: null, 
            subscription_tier: convo.other_participant_subscription_tier,
            subscription_expires_at: null, is_incognito: false,
            has_completed_onboarding: true,
            has_private_albums: false,
            email: '',
            created_at: '',
            status: 'active',
            suspended_until: null,
            kinks: [],
            can_host: false,
            video_url: null,
            is_traveling: false,
            is_verified: false,
            has_seen_tour: false
        };
        setChatUser(chatPartner);
    }, [setChatUser]);
    
    const handleDeleteConfirm = () => {
        if (confirmDelete) {
            deleteConversation(confirmDelete.conversation_id);
            setConfirmDelete(null);
        }
    };
    
    const handlePremiumFeatureClick = (feature: 'winks' | 'views') => {
        // Permite que usuários free cliquem na aba, mas a visualização será "filtrada"
        setActiveTab(feature);
    };

    const handlePremiumUserClick = React.useCallback((user: WinkWithProfile | ProfileViewWithProfile) => {
        setSelectedUser(user);
    }, [setSelectedUser]);

    const TabButton = ({ label, tabName, isPremium = false, icon }: { label: string, tabName: ActiveTab, isPremium?: boolean, icon: string }) => {
        const isActive = activeTab === tabName;
        return (
            <button 
                onClick={() => setActiveTab(tabName)}
                className={`relative flex items-center justify-center p-3 rounded-full transition-all duration-300 ${
                    isActive 
                        ? 'bg-primary-500/10 text-primary-500' 
                        : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'
                }`}
                title={label}
            >
                <div className="relative flex items-center justify-center">
                    <span className={`material-symbols-rounded text-[22px] ${isActive ? 'filled' : ''}`}>{icon}</span>
                    {isPremium && <span className="absolute -top-1.5 -right-2 material-symbols-rounded filled text-[10px] text-yellow-400 drop-shadow-sm">auto_awesome</span>}
                </div>
            </button>
        );
    }

    const goToGrid = () => setActiveView('grid');

    return (
        <>
        <div className="flex flex-col h-full bg-dark-900">
            {/* Header fixed with safe area for hamburger menu */}
            <header className="pt-8 pb-4 px-4 flex-shrink-0 z-10 bg-dark-900/90 backdrop-blur-2xl border-b border-white/5 flex flex-col items-center">
                <h1 className="text-xl font-bold tracking-tight font-outfit text-white">{t('inbox.title', { defaultValue: 'Mensagens' })}</h1>
                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-medium mt-1 mb-6">{t('inbox.active_connections', { defaultValue: 'Conexões Ativas' })}</p>
                <div className="flex justify-center items-center gap-1 overflow-x-auto w-full max-w-sm no-scrollbar px-1 py-1 bg-slate-800/50 rounded-full border border-white/5 shadow-inner">
                    <TabButton label={t('inbox.chats', { defaultValue: 'Chats' })} tabName="messages" icon="chat_bubble" />
                    <TabButton label={t('inbox.favorites', { defaultValue: 'Favoritos' })} tabName="favorites" icon="star" />
                    <TabButton label="Winks" tabName="winks" isPremium icon="favorite" />
                    <TabButton label={t('inbox.views', { defaultValue: 'Visitas' })} tabName="views" isPremium icon="visibility" />
                    <TabButton label={t('inbox.requests', { defaultValue: 'Pedidos' })} tabName="requests" icon="lock_open" />
                </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 pb-24 pt-2 space-y-4">
                {activeTab === 'messages' && (
                    <>
                        {messageRequests.length > 0 && !viewingRequestsList && (
                            <div 
                                onClick={() => setViewingRequestsList(true)}
                                className="bg-gradient-to-r from-primary-500/20 to-secondary-500/20 border border-white/10 rounded-2xl p-4 mb-2 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-all shadow-md animate-fade-in"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <span className="material-symbols-rounded text-primary-400 text-2xl">chat_bubble_outline</span>
                                        <span className="absolute -top-1 -right-1 bg-primary-500 text-white font-bold text-[9px] w-4 h-4 rounded-full flex items-center justify-center animate-bounce">
                                            {messageRequests.length}
                                        </span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm">Solicitações de Mensagens</h4>
                                        <p className="text-xs text-slate-400 font-sans">Você tem {messageRequests.length} novos pedidos de conversa</p>
                                    </div>
                                </div>
                                <span className="material-symbols-rounded text-slate-400">chevron_right</span>
                            </div>
                        )}

                        {viewingRequestsList ? (
                            <div className="space-y-4 animate-fade-in">
                                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <button 
                                        onClick={() => setViewingRequestsList(false)}
                                        className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors font-medium"
                                    >
                                        <span className="material-symbols-rounded text-lg">arrow_back</span>
                                        Voltar para Conversas
                                    </button>
                                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                        Solicitações ({messageRequests.length})
                                    </span>
                                </div>

                                {messageRequests.length === 0 ? (
                                    <div className="text-center py-10 text-slate-500">
                                        <p className="text-sm font-sans">Nenhuma solicitação de mensagem.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {messageRequests.map((req) => (
                                            <div 
                                                key={req.id} 
                                                className="p-4 flex items-center justify-between bg-slate-800/40 rounded-2xl border border-white/5 hover:bg-slate-800/60 transition-all cursor-pointer shadow-sm"
                                                onClick={() => {
                                                    const chatPartner: User = {
                                                        id: req.follower_id, username: req.username,
                                                        avatar_url: req.avatar_url, last_seen: null,
                                                        display_name: null, public_photos: [], status_text: null, date_of_birth: null,
                                                        height_cm: null, weight_kg: null, tribes: [], position: null, hiv_status: null,
                                                        updated_at: '', lat: 0, lng: 0, age: req.age, distance_km: null, 
                                                        subscription_tier: 'free',
                                                        subscription_expires_at: null, is_incognito: false,
                                                        has_completed_onboarding: true,
                                                        has_private_albums: false,
                                                        email: '',
                                                        created_at: '',
                                                        status: 'active',
                                                        suspended_until: null,
                                                        kinks: [],
                                                        can_host: false,
                                                        video_url: null,
                                                        is_traveling: false,
                                                        is_verified: false,
                                                        has_seen_tour: false
                                                    };
                                                    setChatUser(chatPartner);
                                                }}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <img src={req.avatar_url} alt={req.username} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700" />
                                                    <div>
                                                        <h4 className="font-bold text-white text-sm">{req.username}, {req.age}</h4>
                                                        <p className="text-xs text-slate-400 mt-0.5 font-sans">Enviou uma solicitação de conexão</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                                                    <button 
                                                        onClick={() => rejectMessageRequest(req.id)} 
                                                        className="w-9 h-9 flex items-center justify-center bg-red-500/10 text-red-400 rounded-full hover:bg-red-500/20 transition-colors border border-white/5"
                                                        title="Recusar"
                                                    >
                                                        <span className="material-symbols-rounded text-lg">close</span>
                                                    </button>
                                                    <button 
                                                        onClick={() => acceptMessageRequest(req.id, req.follower_id)} 
                                                        className="w-9 h-9 flex items-center justify-center bg-green-500/10 text-green-400 rounded-full hover:bg-green-500/20 transition-colors border border-white/5"
                                                        title="Aceitar"
                                                    >
                                                        <span className="material-symbols-rounded text-lg">check</span>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <ConversationList 
                                conversations={conversations} 
                                loading={loadingConversations}
                                onConversationClick={handleConversationClick}
                                onDeleteClick={(convo) => setConfirmDelete(convo)}
                                currentUserId={currentUser?.id}
                                onEmptyAction={goToGrid}
                                t={t}
                                getLocale={getLocale}
                            />
                        )}
                    </>
                )}
                {activeTab === 'favorites' && (
                    <FavoriteList 
                        favorites={favoriteUsers}
                        loading={isFetchingFavorites}
                        onUserClick={(user) => setSelectedUser(user as any)}
                        onUnfavorite={unfavoriteUser}
                        t={t}
                    />
                )}
                {activeTab === 'winks' && (
                    <WinkList 
                        winks={winks}
                        loading={loadingWinks}
                        isPlus={currentUser?.subscription_tier === 'plus'}
                        onWinkClick={handlePremiumUserClick}
                        onUpgradeClick={() => setUnlockModal('winks')}
                        t={t}
                        getLocale={getLocale}
                    />
                )}
                 {activeTab === 'views' && (
                    <ProfileViewList 
                        views={profileViews}
                        loading={loadingProfileViews}
                        isPlus={currentUser?.subscription_tier === 'plus'}
                        onViewClick={handlePremiumUserClick}
                        onUpgradeClick={() => setUnlockModal('views')}
                        t={t}
                        getLocale={getLocale}
                    />
                )}
                {activeTab === 'requests' && (
                    <RequestList
                        requests={accessRequests}
                        loading={loadingRequests}
                        onRespond={respondToRequest}
                        t={t}
                        getLocale={getLocale}
                    />
                )}
            </div>
        </div>
        {confirmDelete && (
             <ConfirmationModal
                isOpen={!!confirmDelete}
                title={t('inbox.delete_chat', { defaultValue: 'Apagar Conversa' })}
                message={t('inbox.delete_chat_msg', { defaultValue: 'Tem certeza que deseja apagar permanentemente a conversa com {{name}}?', name: confirmDelete.other_participant_username })}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setConfirmDelete(null)}
                confirmText={t('inbox.delete', { defaultValue: 'Apagar' })}
             />
        )}
        {unlockModal && (
            <UnlockFeatureModal
                title={unlockModal === 'winks' ? t('inbox.unlock_winks_title', { defaultValue: 'Veja quem te chamou' }) : t('inbox.unlock_views_title', { defaultValue: 'Descubra quem te viu' })}
                description={t('inbox.unlock_desc', { defaultValue: 'Assine o Plus para acesso ilimitado ou veja um anúncio para liberar por 1 hora.' })}
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
                    setActiveTab(rewardModal);
                }}
            />
        )}
        </>
    );
};

// ... Sub-componentes ...

interface FavoriteListProps {
    favorites: any[];
    loading: boolean;
    onUserClick: (user: any) => void;
    onUnfavorite: (id: string) => void;
    t: any;
}
const FavoriteList: React.FC<FavoriteListProps> = ({ favorites, loading, onUserClick, onUnfavorite, t }) => {
    const onlineUsers = useMapStore((state) => state.onlineUsers);

    if (loading) return <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>;
    if (favorites.length === 0) return (
        <EmptyState 
            icon="star"
            title={t('inbox.no_favorites_title', { defaultValue: 'Nenhum Favorito' })}
            message={t('inbox.no_favorites_desc', { defaultValue: 'Você ainda não adicionou ninguém aos favoritos. Explore os perfis e salve seus preferidos!' })}
        />
    );
    
    return (
        <div className="space-y-3 pb-4">
            {favorites.map((user) => {
                const isOnline = onlineUsers.includes(user.favorite_id);
                // Mapear para o formato que setSelectedUser espera
                const profileObj = {
                    id: user.favorite_id,
                    username: user.username,
                    avatar_url: user.avatar_url,
                    age: user.age,
                    distance_km: user.distance_km,
                    is_verified: user.is_verified,
                    subscription_tier: user.subscription_tier,
                    // Fake the rest for modal loading
                    status: 'active',
                    is_incognito: false,
                    has_completed_onboarding: true
                };

                return (
                    <div 
                        key={user.favorite_id} 
                        className="relative p-4 flex items-center gap-4 rounded-3xl bg-slate-800/40 border border-white/5 hover:bg-slate-800/60 transition-all group shadow-sm backdrop-blur-sm" 
                    >
                        <div className="relative flex-shrink-0 cursor-pointer" onClick={() => onUserClick(profileObj)}>
                            <img loading="lazy" src={user.avatar_url} alt={user.username} className="w-14 h-14 rounded-full object-cover ring-2 ring-slate-700/50 group-hover:ring-primary-500/30 transition-all" />
                            {isOnline && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-tertiary-500 rounded-full border-2 border-dark-800 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>}
                        </div>
                        
                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onUserClick(profileObj)}>
                            <div className="flex justify-between items-start mb-0.5">
                                <div className="flex items-center gap-1.5">
                                    <h3 className="font-bold text-white leading-none font-outfit text-lg">{user.display_name || user.username}, {user.age}</h3>
                                    {user.is_verified && (
                                        <span className="material-symbols-rounded filled text-primary-500 text-sm" title="Verificado">verified</span>
                                    )}
                                    {user.subscription_tier === 'plus' && (
                                        <span className="material-symbols-rounded filled text-[12px] text-yellow-400">auto_awesome</span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                {user.distance_km != null && (
                                    <span className="text-xs text-slate-400 bg-black/30 px-2 py-0.5 rounded flex items-center gap-1">
                                        <span className="material-symbols-rounded !text-[12px]">location_on</span>
                                        {user.distance_km < 1 ? t('inbox.less_than_1km', { defaultValue: 'A menos de 1km' }) : `${user.distance_km.toFixed(1)} km`}
                                    </span>
                                )}
                            </div>
                        </div>

                        <button 
                            onClick={(e) => { e.stopPropagation(); onUnfavorite(user.favorite_id); }}
                            className="w-10 h-10 flex items-center justify-center rounded-full bg-black/20 text-primary-500 hover:bg-white/10 transition-colors border border-white/5"
                            title={t('inbox.remove_favorite', { defaultValue: 'Remover dos favoritos' })}
                        >
                            <span className="material-symbols-rounded filled text-xl">star</span>
                        </button>
                    </div>
                );
            })}
        </div>
    );
};

const ConversationItem = React.memo(({ 
    convo, 
    currentUserId, 
    isOnline, 
    onClick, 
    onDelete,
    t,
    getLocale
}: { 
    convo: ConversationPreview, 
    currentUserId?: string, 
    isOnline: boolean, 
    onClick: (convo: ConversationPreview) => void, 
    onDelete: (convo: ConversationPreview) => void,
    t: any,
    getLocale: any
}) => {
    const hasUnread = convo.unread_count > 0;
    
    return (
        <div 
            className={`relative py-3.5 px-3 flex items-center gap-3.5 hover:bg-white/[0.015] active:bg-white/[0.03] transition-all duration-200 cursor-pointer group rounded-xl ${hasUnread ? 'bg-primary-500/[0.01]' : ''}`} 
            onClick={() => onClick(convo)}
        >
            {/* Minimalist Left Accent Line for Unread Messages */}
            {hasUnread && (
                <div className="absolute left-0 top-3 bottom-3 w-0.5 bg-primary-500 rounded-r-full" />
            )}

            <div className="relative flex-shrink-0">
                <img 
                    loading="lazy" 
                    src={convo.other_participant_avatar_url} 
                    alt={convo.other_participant_username} 
                    className="w-11 h-11 rounded-full object-cover transition-transform duration-300" 
                />
                {isOnline && (
                    <span className="absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-dark-950 shadow-sm" />
                )}
            </div>
            
            <div className="flex-1 overflow-hidden min-w-0">
                <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`truncate text-sm tracking-tight ${hasUnread ? 'font-bold text-slate-100' : 'font-medium text-slate-300'}`}>
                        {convo.other_participant_username}
                    </h3>
                    <span className="text-[10px] text-slate-500 font-sans tracking-normal ml-2 flex-shrink-0">
                        {formatDistanceToNow(new Date(convo.last_message_created_at), { addSuffix: false, locale: getLocale() } as any)}
                    </span>
                </div>
                
                <p className={`text-xs truncate leading-normal pr-6 font-sans ${hasUnread ? 'text-slate-200 font-medium' : 'text-slate-450'}`}>
                    {convo.last_message_sender_id === currentUserId && (
                        <span className="text-slate-600 font-normal">{t('inbox.you', { defaultValue: 'Você: ' })}</span>
                    )}
                    {formatLastMessageContent(convo.last_message_content, t)}
                </p>
            </div>
            
            {/* Sleek action zone or tiny unread indicator */}
            <div className="flex items-center justify-end ml-2 flex-shrink-0 min-w-[20px]">
                {hasUnread ? (
                    <span className="h-2 w-2 rounded-full bg-primary-500 animate-pulse" />
                ) : (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(convo); }} 
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 p-1 text-slate-600 hover:text-red-400 rounded-md hover:bg-white/[0.04]"
                        title={t('inbox.delete', { defaultValue: 'Apagar' })}
                    >
                        <span className="material-symbols-rounded text-base">delete</span>
                    </button>
                )}
            </div>
        </div>
    );
});

interface ConversationListProps {
    conversations: ConversationPreview[]; 
    loading: boolean;
    onConversationClick: (convo: ConversationPreview) => void;
    onDeleteClick: (convo: ConversationPreview) => void;
    currentUserId?: string;
    onEmptyAction: () => void;
    t: any;
    getLocale: any;
}
const ConversationList: React.FC<ConversationListProps> = ({ conversations, loading, onConversationClick, onDeleteClick, currentUserId, onEmptyAction, t, getLocale }) => {
    const onlineUsers = useMapStore((state) => state.onlineUsers);
    const inboxAd = useAdStore((state) => state.inboxAd);
    const parentRef = useRef<HTMLDivElement>(null);

    const itemsWithAd = useMemo(() => {
        const items: any[] = [...conversations];
        
        // Add sponsored B2B ad at the very top of the inbox
        if (inboxAd) {
            items.splice(0, 0, { type: 'custom_ad', ad: inboxAd });
        }

        if (items.length > 3) {
            items.splice(inboxAd ? 4 : 3, 0, { type: 'ad' }); // Adjust index if inboxAd is present
        }
        return items;
    }, [conversations, inboxAd]);

    const rowVirtualizer = useVirtualizer({
        count: itemsWithAd.length,
        getScrollElement: () => parentRef.current,
        estimateSize: (index) => {
            const item = itemsWithAd[index];
            if (item && item.type === 'custom_ad') return 90; // Custom banner height
            if (item && item.type === 'ad') return 100; // AdSense height
            return 74; // Conversation height
        },
        overscan: 5,
    });

    if (loading) return <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>;
    if (conversations.length === 0) return (
        <EmptyState 
            icon="chat_bubble_outline"
            title={t('inbox.no_chats_title', { defaultValue: 'Tudo quieto por aqui' })}
            message={t('inbox.no_chats_desc', { defaultValue: 'Ainda não tem conversas? Explore o Grid e dê o primeiro passo!' })}
            actionLabel={t('inbox.explore_profiles', { defaultValue: 'Explorar Perfis' })}
            onAction={onEmptyAction}
        />
    );
    
    return (
        <div ref={parentRef} className="h-[calc(100vh-200px)] overflow-y-auto pr-1">
            <div
                style={{
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const item = itemsWithAd[virtualRow.index];
                    return (
                        <div
                            key={virtualRow.index}
                            style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size}px`,
                                transform: `translateY(${virtualRow.start}px)`,
                            }}
                        >
                            {'type' in item && item.type === 'custom_ad' ? (
                                <div className="py-2 px-1 h-full cursor-pointer" onClick={() => { if(item.ad.cta_url !== '#') window.open(item.ad.cta_url, '_blank') }}>
                                    <div className="relative rounded-xl overflow-hidden border border-primary-500/30 shadow-lg h-full bg-slate-800 flex items-center p-2 gap-3 group hover:border-primary-500/60 transition-colors">
                                        <div className="absolute top-0 right-0 bg-gradient-to-tr from-yellow-400 to-amber-600 text-white text-[8px] font-bold px-2 py-0.5 rounded-bl-lg z-10 shadow-sm border-l border-b border-white/10">PROMO</div>
                                        <img src={item.ad.image_url} alt={item.ad.title} className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-bold text-white text-sm truncate leading-tight">{item.ad.title}</h3>
                                            <p className="text-xs text-slate-300 line-clamp-2 leading-snug mt-0.5">{item.ad.description}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : 'type' in item && item.type === 'ad' ? (
                                <div className="py-2 h-full">
                                    <div className="rounded-xl overflow-hidden border border-white/5 shadow-lg h-full bg-slate-800/10">
                                        <AdSenseUnit
                                            client="ca-pub-9015745232467355"
                                            slot="3561488011"
                                            format="auto"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <ConversationItem 
                                    convo={item as ConversationPreview}
                                    currentUserId={currentUserId}
                                    isOnline={onlineUsers.includes((item as ConversationPreview).other_participant_id)}
                                    onClick={onConversationClick}
                                    onDelete={onDeleteClick}
                                    t={t}
                                    getLocale={getLocale}
                                />
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

interface WinkListProps {
    winks: WinkWithProfile[]; loading: boolean; isPlus: boolean;
    onWinkClick: (wink: WinkWithProfile) => void;
    onUpgradeClick: () => void;
    t: any;
    getLocale: any;
}
const WinkList: React.FC<WinkListProps> = ({ winks, loading, isPlus, onWinkClick, onUpgradeClick, t, getLocale }) => {
    const hasWinkPerk = useAdStore(state => state.hasPerk('view_winks'));
    const canView = isPlus || hasWinkPerk;

    if (loading) return <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>;
    if (winks.length === 0) return (
        <EmptyState 
            icon="favorite"
            title={t('inbox.no_winks_title', { defaultValue: 'Nenhum chamado' })}
            message={t('inbox.no_winks_desc', { defaultValue: 'Ninguém te chamou ainda. Capriche na foto do perfil!' })}
        />
    );

    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {winks.map(wink => (
                <div 
                    key={wink.id} 
                    onClick={() => canView ? onWinkClick(wink) : onUpgradeClick()} 
                    className="relative aspect-[3/4] cursor-pointer group rounded-2xl overflow-hidden bg-slate-800 shadow-lg border border-white/5 transition-transform active:scale-95"
                >
                     <img 
                        src={wink.avatar_url} 
                        alt={canView ? wink.username : t('inbox.blocked_profile', { defaultValue: 'Perfil Bloqueado' })} 
                        className={`w-full h-full object-cover transition-transform duration-700 ${canView ? 'group-hover:scale-110' : 'filter blur-md grayscale opacity-50 scale-110'}`} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80"></div>
                    
                    {canView ? (
                        <>
                            <div className="absolute bottom-2 left-2 right-2 text-white">
                                <h3 className="font-bold text-xs truncate">{wink.username}, {wink.age}</h3>
                                <p className="text-[9px] text-slate-300 font-medium uppercase tracking-wide">{formatDistanceToNow(new Date(wink.wink_created_at), { addSuffix: false, locale: getLocale() } as any)}</p>
                            </div>
                            <div className="absolute top-2 right-2 bg-primary-600/90 backdrop-blur-sm p-1 rounded-full shadow-lg">
                                <span className="material-symbols-rounded text-white text-[10px] filled block">favorite</span>
                            </div>
                        </>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <div className="w-10 h-10 bg-dark-900/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-white/20">
                                <span className="material-symbols-rounded text-lg text-primary-500 filled">lock</span>
                            </div>
                            <div className="absolute bottom-3 px-2 w-full text-center">
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm">{t('inbox.view', { defaultValue: 'Ver' })}</span>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

interface ProfileViewListProps {
    views: ProfileViewWithProfile[]; loading: boolean; isPlus: boolean;
    onViewClick: (view: ProfileViewWithProfile) => void;
    onUpgradeClick: () => void;
    t: any;
    getLocale: any;
}
const ProfileViewList: React.FC<ProfileViewListProps> = ({ views, loading, isPlus, onViewClick, onUpgradeClick, t, getLocale }) => {
    const hasViewPerk = useAdStore(state => state.hasPerk('view_profile_views'));
    const canView = isPlus || hasViewPerk;

    if (loading) return <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>;
    if (views.length === 0) return (
        <EmptyState 
            icon="visibility_off"
            title={t('inbox.no_views_title', { defaultValue: 'Sem visitas recentes' })}
            message={t('inbox.no_views_desc', { defaultValue: 'Ninguém passou por aqui. Tente postar no Agora para ganhar destaque!' })}
        />
    );

    return (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {views.map(view => (
                <div 
                    key={view.id} 
                    onClick={() => canView ? onViewClick(view) : onUpgradeClick()} 
                    className="relative aspect-[3/4] cursor-pointer group rounded-2xl overflow-hidden bg-slate-800 shadow-lg border border-white/5 transition-transform active:scale-95"
                >
                     <img 
                        src={view.avatar_url} 
                        alt={canView ? view.username : t('inbox.blocked_profile', { defaultValue: 'Perfil Bloqueado' })} 
                        className={`w-full h-full object-cover transition-transform duration-700 ${canView ? 'group-hover:scale-110' : 'filter blur-md grayscale opacity-50 scale-110'}`} 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80"></div>
                    
                    {canView ? (
                        <div className="absolute bottom-2 left-2 right-2 text-white">
                            <h3 className="font-bold text-xs truncate">{view.username}, {view.age}</h3>
                             <p className="text-[9px] text-slate-300 font-medium uppercase tracking-wide">{formatDistanceToNow(new Date(view.viewed_at), { addSuffix: false, locale: getLocale() } as any)}</p>
                        </div>
                    ) : (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <div className="w-10 h-10 bg-dark-900/80 backdrop-blur-md rounded-full flex items-center justify-center shadow-lg border border-white/20">
                                <span className="material-symbols-rounded text-lg text-secondary-500 filled">lock</span>
                            </div>
                             <div className="absolute bottom-3 px-2 w-full text-center">
                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wide bg-black/50 px-2 py-1 rounded-md backdrop-blur-sm">{t('inbox.view', { defaultValue: 'Ver' })}</span>
                            </div>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}

interface RequestListProps {
    requests: AlbumAccessRequest[]; loading: boolean;
    onRespond: (requestId: number, status: 'granted' | 'denied') => void;
    t: any;
    getLocale: any;
}
const RequestList: React.FC<RequestListProps> = ({ requests, loading, onRespond, t, getLocale }) => {
    if (loading) return <div className="flex justify-center p-10"><div className="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div></div>;
    if (requests.length === 0) return (
        <EmptyState 
            icon="lock_open_right"
            title={t('inbox.no_requests_title', { defaultValue: 'Sem solicitações' })}
            message={t('inbox.no_requests_desc', { defaultValue: 'Ninguém pediu acesso aos seus álbuns por enquanto.' })}
        />
    );

    return (
        <div className="space-y-3">
            {requests.map(req => (
                <div key={req.id} className="p-4 flex items-center gap-4 bg-slate-800/60 rounded-2xl border border-white/5 shadow-sm">
                    <img loading="lazy" src={req.avatar_url} alt={req.username} className="w-12 h-12 rounded-full object-cover border-2 border-slate-700" />
                    <div className="flex-1 overflow-hidden">
                        <p className="text-sm text-slate-200 leading-snug">
                            <span className="font-bold text-white">{req.username}</span> {t('inbox.requested_album', { defaultValue: 'pediu para ver seus álbuns privados.' })}
                        </p>
                        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">{formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: getLocale() } as any)}</span>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onRespond(req.id, 'denied')} className="w-10 h-10 flex items-center justify-center bg-dark-700/80 text-red-400 rounded-full hover:bg-red-500/20 transition-colors border border-white/5">
                            <span className="material-symbols-rounded text-xl">close</span>
                        </button>
                        <button onClick={() => onRespond(req.id, 'granted')} className="w-10 h-10 flex items-center justify-center bg-tertiary-600/20 text-tertiary-400 border border-tertiary-500/50 rounded-full hover:bg-tertiary-600/30 transition-colors shadow-[0_0_10px_rgba(74,222,128,0.2)]">
                            <span className="material-symbols-rounded text-xl">check</span>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
