
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usePwaStore } from '../stores/pwaStore';
import { useUiStore } from '../stores/uiStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useInboxStore } from '../stores/inboxStore';
import { EditProfileModal } from './EditProfileModal';
import { MyAlbumsModal } from './MyAlbumsModal';
import { NotificationType } from '../types';
import { format } from 'date-fns';
import { BlockedUsersModal } from './BlockedUsersModal';
import { AdSenseUnit } from './AdSenseUnit';
import { VerificationModal } from './VerificationModal';
import { useTranslation } from 'react-i18next';
import { useVideoStore } from '../stores/videoStore';

const ToggleSwitch: React.FC<{
    label: string;
    isChecked: boolean;
    onChange: (enabled: boolean) => void;
    isPremiumFeature?: boolean;
}> = ({ label, isChecked, onChange, isPremiumFeature = false }) => {
    const { user } = useAuthStore();
    const { setSubscriptionModalOpen } = useUiStore();
    const isPlus = user?.subscription_tier === 'plus';

    const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
        e.stopPropagation(); 
        if (isPremiumFeature && !isPlus) {
            setSubscriptionModalOpen(true);
        }
    };

    const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.stopPropagation();
        if (isPremiumFeature && !isPlus) {
            setSubscriptionModalOpen(true);
            e.preventDefault(); 
            return;
        }
        onChange(e.target.checked);
    };
    
    return (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-dark-800/40 border border-white/5 cursor-pointer transition-all hover:bg-dark-800/60 active:scale-[0.99]" onClick={handleContainerClick}>
             <div className="flex items-center gap-3">
                <span className="font-medium text-slate-200 text-sm">{label}</span>
                {isPremiumFeature && !isPlus && <span className="material-symbols-rounded filled !text-[16px] text-yellow-400 drop-shadow-sm">auto_awesome</span>}
            </div>
            <label className="relative inline-flex items-center cursor-pointer" onClick={e => e.stopPropagation()}>
                <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={handleToggleChange}
                    className="sr-only peer"
                    disabled={isPremiumFeature && !isPlus}
                />
                <div className="w-11 h-6 bg-dark-700 rounded-full peer peer-focus:ring-2 peer-focus:ring-primary-500/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500 shadow-inner"></div>
            </label>
        </div>
    );
};

const ActionButton: React.FC<{
    icon: string;
    label: string;
    onClick: () => void;
    variant?: 'default' | 'danger' | 'premium';
    subtitle?: string;
}> = ({ icon, label, onClick, variant = 'default', subtitle }) => {
    const baseClasses = "w-full p-4 rounded-2xl border flex items-center justify-between group transition-all active:scale-98 shadow-sm";
    const variantClasses = {
        default: "bg-dark-800/40 border-white/5 hover:bg-dark-800/60 text-slate-200",
        danger: "bg-red-500/5 border-red-500/10 hover:bg-red-500/10 text-red-400",
        premium: "bg-gradient-to-r from-dark-800/60 to-dark-800/40 border-yellow-500/20 hover:border-yellow-500/40 text-yellow-400"
    };

    return (
        <button onClick={onClick} className={`${baseClasses} ${variantClasses[variant]}`}>
            <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${variant === 'danger' ? 'bg-red-500/10' : 'bg-dark-700/50'} shadow-inner`}>
                    <span className={`material-symbols-rounded text-2xl ${variant === 'premium' ? 'filled' : ''}`}>{icon}</span>
                </div>
                <div className="text-left">
                    <span className={`font-bold block text-sm ${variant === 'default' ? 'text-slate-100' : ''}`}>{label}</span>
                    {subtitle && <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wide">{subtitle}</span>}
                </div>
            </div>
            <span className="material-symbols-rounded text-slate-600 group-hover:text-slate-400 transition-colors">chevron_right</span>
        </button>
    );
}

const StatCard: React.FC<{ icon: string; label: string; count: number | string; onClick: () => void; color: string }> = ({ icon, label, count, onClick, color }) => (
    <button onClick={onClick} className="flex-1 bg-dark-800/40 backdrop-blur-md border border-white/5 rounded-2xl p-3 flex items-center gap-3 hover:bg-dark-800/60 transition-all active:scale-95 group">
        <div className={`w-10 h-10 rounded-full bg-${color}-500/10 flex items-center justify-center group-hover:scale-110 transition-transform`}>
            <span className={`material-symbols-rounded text-${color}-500 text-xl filled`}>{icon}</span>
        </div>
        <div className="text-left">
            <span className="block text-xl font-black text-white font-outfit leading-none">{count}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{label}</span>
        </div>
    </button>
);

export const ProfileView: React.FC = () => {
    const { user, signOut, toggleIncognitoMode } = useAuthStore();
    const { setSubscriptionModalOpen, setDonationModalOpen, setActiveView } = useUiStore();
    const { 
        pushState, 
        checkPushSupport, 
        subscribeToPushNotifications,
        isSubscribing 
    } = usePwaStore();
    const {
        preferences,
        loading: loadingPreferences,
        fetchPreferences,
        updatePreference
    } = useNotificationStore();
    const { winks, profileViews } = useInboxStore();

    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isMyAlbumsOpen, setIsMyAlbumsOpen] = useState(false);
    const [isBlockedUsersModalOpen, setIsBlockedUsersModalOpen] = useState(false);
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const { t } = useTranslation();
    const videos = useVideoStore((state) => state.videos);
    const userVideos = videos.filter(v => v.user_id === user?.id);

    useEffect(() => {
        checkPushSupport();
    }, [checkPushSupport]);

    useEffect(() => {
        if (pushState === 'granted') {
            fetchPreferences();
        }
    }, [pushState, fetchPreferences]);

    if (!user) return null;

    const renderPushSection = () => {
        switch (pushState) {
            case 'granted':
                return (
                    <div className="space-y-2">
                        {loadingPreferences ? <p className="text-slate-400 text-xs p-2">{t('profile.loading', { defaultValue: 'Carregando...' })}</p> : (
                            <>
                                <ToggleSwitch 
                                    label={t('profile.new_messages', { defaultValue: 'Novas Mensagens' })}
                                    isChecked={preferences.find(p => p.notification_type === 'new_message')?.enabled ?? true}
                                    onChange={(enabled) => updatePreference('new_message', enabled)}
                                />
                                <ToggleSwitch 
                                    label={t('profile.new_winks', { defaultValue: 'Novos Chamados (Winks)' })}
                                    isChecked={preferences.find(p => p.notification_type === 'new_wink')?.enabled ?? true}
                                    onChange={(enabled) => updatePreference('new_wink', enabled)}
                                />
                                <ToggleSwitch 
                                    label={t('profile.album_requests', { defaultValue: 'Solicitações de Álbuns' })}
                                    isChecked={preferences.find(p => p.notification_type === 'new_album_request')?.enabled ?? true}
                                    onChange={(enabled) => updatePreference('new_album_request', enabled)}
                                />
                            </>
                        )}
                    </div>
                );
            case 'denied':
                return <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center uppercase tracking-wide">{t('profile.notifications_blocked', { defaultValue: 'Notificações bloqueadas no navegador' })}</div>;
            case 'unsupported':
                return <div className="p-4 rounded-2xl bg-slate-800/50 text-slate-500 text-xs font-medium text-center">{t('profile.unsupported_browser', { defaultValue: 'Navegador não suportado' })}</div>;
            case 'prompt':
            default:
                return (
                    <ActionButton 
                        icon="notifications" 
                        label={t('profile.enable_notifications', { defaultValue: 'Ativar Notificações' })} 
                        onClick={subscribeToPushNotifications} 
                        subtitle={isSubscribing ? t('profile.activating', { defaultValue: 'Ativando...' }) : t('profile.dont_miss_messages', { defaultValue: 'Não perca nenhuma mensagem' })}
                    />
                );
        }
    }

    const allPhotos = [user.avatar_url, ...(user.public_photos || [])].filter(Boolean);

    return (
        <>
            <div className="bg-[#0f0f13] h-full overflow-y-auto pb-24 no-scrollbar font-sans">
                {/* Header (Logo & Bell) - As seen in the design */}
                <div className="flex justify-between items-center px-6 pt-6 pb-2">
                    <div className="flex items-center gap-2">
                        <img src="/logo.png" className="w-8 h-8 rounded-full" alt="Ponto G" />
                        <h1 className="text-xl font-bold text-pink-500 tracking-tight">Ponto G</h1>
                    </div>
                    <button onClick={() => setActiveView('inbox')} className="text-white hover:text-pink-400 transition-colors">
                        <span className="material-symbols-rounded">notifications</span>
                    </button>
                </div>

                {/* Avatar Section */}
                <div className="flex justify-center mt-4">
                    <div className="relative">
                        <div className="w-32 h-32 rounded-full p-[3px] bg-gradient-to-tr from-pink-600 via-purple-500 to-indigo-500 shadow-xl shadow-pink-900/20">
                            <img loading="lazy" src={user.avatar_url} alt={user.username} className="w-full h-full rounded-full object-cover border-4 border-[#0f0f13]" />
                        </div>
                        <div className="absolute bottom-2 right-2 w-6 h-6 bg-green-500 border-[3px] border-[#0f0f13] rounded-full flex items-center justify-center shadow-sm">
                            <span className="material-symbols-rounded text-white text-[12px] font-bold">check</span>
                        </div>
                    </div>
                </div>

                {/* Info Section */}
                <div className="text-center mt-4 px-4">
                    <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2">
                        {user.display_name || user.username}, {user.age || 'N/A'}
                        {user.is_verified && (
                            <span className="material-symbols-rounded text-pink-500 text-xl" title="Verificado">verified</span>
                        )}
                    </h2>
                    <p className="text-sm text-orange-200/80 font-medium mt-1">
                        {user.city || 'São Paulo'}, {user.state || 'SP'} • {user.distance_km ? `${user.distance_km.toFixed(1)}km away` : '2km away'}
                    </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-3 mt-6 px-6">
                    <button 
                        onClick={() => setIsEditProfileOpen(true)}
                        className="flex-1 bg-dark-800/80 border border-white/10 text-white font-semibold py-3 rounded-full flex justify-center items-center gap-2 hover:bg-dark-700 transition-colors"
                    >
                        <span className="material-symbols-rounded text-lg">edit</span> Editar Perfil
                    </button>
                    {user.subscription_tier !== 'plus' && (
                        <button 
                            onClick={() => setSubscriptionModalOpen(true)}
                            className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 rounded-full flex justify-center items-center gap-2 shadow-lg shadow-pink-900/30 hover:shadow-pink-900/50 transition-all"
                        >
                            <span className="material-symbols-rounded text-lg">stars</span> Seja Premium
                        </button>
                    )}
                </div>

                {/* Sobre Mim */}
                <div className="mt-8 px-5">
                    <h3 className="text-[11px] font-black text-orange-400/90 uppercase tracking-widest mb-3 ml-1">Sobre Mim</h3>
                    <div className="bg-[#1a1a20] p-4 rounded-2xl text-slate-300 text-sm leading-relaxed border border-white/5">
                        {user.status_text || 'Sem descrição.'}
                    </div>
                </div>

                {/* Interesses */}
                <div className="mt-6 px-5">
                    <h3 className="text-[11px] font-black text-orange-400/90 uppercase tracking-widest mb-3 ml-1">Interesses</h3>
                    <div className="bg-[#1a1a20] p-4 rounded-2xl flex flex-wrap gap-2 border border-white/5">
                        {user.kinks && user.kinks.length > 0 ? (
                            user.kinks.map((kink, idx) => {
                                const colors = [
                                    'bg-pink-500/10 text-pink-300 border-pink-500/20',
                                    'bg-purple-500/10 text-purple-300 border-purple-500/20',
                                    'bg-green-500/10 text-green-300 border-green-500/20',
                                    'bg-blue-500/10 text-blue-300 border-blue-500/20',
                                    'bg-orange-500/10 text-orange-300 border-orange-500/20'
                                ];
                                const colorClass = colors[idx % colors.length];
                                return (
                                    <span key={kink} className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${colorClass}`}>
                                        #{kink}
                                    </span>
                                );
                            })
                        ) : (
                            <span className="text-slate-500 text-xs">Nenhum interesse listado.</span>
                        )}
                        {(user.tribes || []).map((tribe, idx) => (
                             <span key={tribe} className="px-3 py-1.5 rounded-full text-xs font-semibold border bg-slate-800 text-slate-300 border-white/10">
                                #{tribe}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Grid Detalhes */}
                <div className="mt-6 px-5">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                        {user.gender_identity && (
                        <InfoItem 
                            icon="wc" 
                            label={t('profile_modal.gender_identity', { defaultValue: 'Identidade' })} 
                            value={t(`constants.options.${user.gender_identity}`, { defaultValue: user.gender_identity })} 
                        />
                        )}
                        {user.pronouns && (
                        <InfoItem 
                            icon="match_case" 
                            label={t('profile_modal.pronouns', { defaultValue: 'Pronomes' })} 
                            value={t(`constants.options.${user.pronouns}`, { defaultValue: user.pronouns })} 
                        />
                        )}
                        {user.sexual_orientation && (
                        <InfoItem 
                            icon="favorite" 
                            label={t('profile_modal.sexual_orientation', { defaultValue: 'Orientação' })} 
                            value={t(`constants.options.${user.sexual_orientation}`, { defaultValue: user.sexual_orientation })} 
                        />
                        )}
                        {user.relationship_status && (
                        <InfoItem 
                            icon="diversity_1" 
                            label={t('profile_modal.relationship_status', { defaultValue: 'Status' })} 
                            value={t(`constants.options.${user.relationship_status}`, { defaultValue: user.relationship_status })} 
                        />
                        )}
                        {user.height_cm && <InfoItem icon="height" label={t('profile_modal.height', { defaultValue: 'Altura' })} value={`${user.height_cm} cm`} />}
                        {user.weight_kg && <InfoItem icon="monitor_weight" label={t('profile_modal.weight', { defaultValue: 'Peso' })} value={`${user.weight_kg} kg`} />}
                        {user.position && (
                        <InfoItem 
                            icon="transgender" 
                            label={t('profile_modal.position', { defaultValue: 'Posição' })} 
                            value={t(`constants.positions.${user.position}`, { defaultValue: user.position })} 
                        />
                        )}
                        {user.hiv_status && (
                        <InfoItem 
                            icon="health_and_safety" 
                            label={t('profile_modal.hiv_status', { defaultValue: 'Status HIV' })} 
                            value={t(`constants.hiv_statuses.${user.hiv_status}`, { defaultValue: user.hiv_status })} 
                        />
                        )}
                    </div>
                </div>

                {/* Galeria Pública */}
                <div className="mt-6 px-5">
                    <h3 className="text-[11px] font-black text-orange-400/90 uppercase tracking-widest mb-3 ml-1">Galeria Pública</h3>
                    {allPhotos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2 auto-rows-[100px]">
                            {allPhotos.slice(0, 5).map((photo, i) => {
                                let colSpan = 'col-span-1';
                                let rowSpan = 'row-span-1';
                                
                                // Emulate the masonry layout for 5 photos
                                if (allPhotos.length >= 3 && i === 2) {
                                    rowSpan = 'row-span-2';
                                }
                                
                                const isLastAndMore = i === 4 && allPhotos.length > 5;
                                
                                return (
                                    <div key={i} className={`relative rounded-xl overflow-hidden ${colSpan} ${rowSpan}`}>
                                        <img src={photo} className="w-full h-full object-cover" alt="Gallery item" />
                                        {isLastAndMore && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white font-black text-xl">
                                                +{allPhotos.length - 5}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="bg-[#1a1a20] p-6 rounded-2xl text-center border border-white/5">
                            <span className="material-symbols-rounded text-slate-500 text-3xl mb-2">no_photography</span>
                            <p className="text-slate-400 text-sm">Sem fotos na galeria.</p>
                        </div>
                    )}
                </div>

                {/* Vídeos Públicos */}
                <div className="mt-6 px-5">
                    <h3 className="text-[11px] font-black text-red-500/90 uppercase tracking-widest mb-3 ml-1 flex items-center gap-1">
                        <span className="material-symbols-rounded text-[14px]">play_circle</span> Vídeos ({userVideos.length})
                    </h3>
                    {userVideos.length > 0 ? (
                        <div className="grid grid-cols-3 gap-2">
                            {userVideos.map((video, i) => (
                                <div key={video.id} className="relative aspect-[9/16] rounded-xl overflow-hidden bg-slate-800 cursor-pointer group" onClick={() => {
                                    useUiStore.getState().setActiveView('videos');
                                }}>
                                    {video.thumbnail_url ? (
                                        <img src={video.thumbnail_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" alt={video.title} />
                                    ) : (
                                        <video src={video.video_url} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                    )}
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-2">
                                        <div className="flex items-center gap-1 text-white/90">
                                            <span className="material-symbols-rounded text-[12px]">play_arrow</span>
                                            <span className="text-[10px] font-bold">{video.views_count || 0}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-[#1a1a20] p-6 rounded-2xl text-center border border-white/5">
                            <span className="material-symbols-rounded text-slate-500 text-3xl mb-2">videocam_off</span>
                            <p className="text-slate-400 text-sm">Nenhum vídeo publicado.</p>
                        </div>
                    )}
                </div>

                {/* Álbum Privado */}
                <div className="mt-6 px-5 pb-6">
                    <div onClick={() => setIsMyAlbumsOpen(true)} className="bg-[#2a171d] border border-pink-900/40 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:bg-[#331c23] transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-11 h-11 bg-pink-900/40 rounded-full flex items-center justify-center shadow-inner">
                                <span className="material-symbols-rounded text-pink-400">lock</span>
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm tracking-wide">Álbum Privado</h4>
                                <p className="text-pink-200/50 text-xs font-medium mt-0.5">Gerenciar fotos ocultas</p>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center">
                            <span className="material-symbols-rounded text-pink-400/80">chevron_right</span>
                        </div>
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="px-5 mt-2 space-y-6">
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard 
                            icon="favorite" 
                            label="Winks" 
                            count={winks.length} 
                            color="pink"
                            onClick={() => setActiveView('inbox')} 
                        />
                        <StatCard 
                            icon="visibility" 
                            label={t('profile.views', { defaultValue: 'Visitas' })} 
                            count={profileViews.length} 
                            color="purple"
                            onClick={() => setActiveView('inbox')} 
                        />
                    </div>

                    <section className="space-y-3">
                         <h3 className="text-[10px] font-bold uppercase text-slate-500 ml-2 tracking-widest">{t('profile.my_account', { defaultValue: 'Minha Conta' })}</h3>
                         <div className="space-y-2">
                            {!user.is_verified && (
                                <ActionButton 
                                    icon="verified" 
                                    label={t('profile.verify_profile', { defaultValue: 'Verificar Perfil' })} 
                                    onClick={() => setIsVerificationModalOpen(true)} 
                                    subtitle={t('profile.verify_profile_subtitle', { defaultValue: 'Ganhe o selo de verificado' })}
                                />
                            )}
                            <ToggleSwitch
                                label={t('profile.invisible_mode', { defaultValue: 'Modo Invisível' })}
                                isChecked={user.is_incognito}
                                onChange={toggleIncognitoMode}
                                isPremiumFeature={true}
                            />
                            <ActionButton icon="block" label={t('profile.blocked_users', { defaultValue: 'Bloqueados' })} onClick={() => setIsBlockedUsersModalOpen(true)} />
                         </div>
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-[10px] font-bold uppercase text-slate-500 ml-2 tracking-widest">{t('profile.notifications', { defaultValue: 'Notificações' })}</h3>
                        {renderPushSection()}
                    </section>

                    <section className="space-y-3">
                        <h3 className="text-[10px] font-bold uppercase text-slate-500 ml-2 tracking-widest">{t('profile.app', { defaultValue: 'App' })}</h3>
                         <div className="space-y-2">
                             <ActionButton icon="volunteer_activism" label={t('profile.support_project', { defaultValue: 'Apoie o Projeto' })} onClick={() => setDonationModalOpen(true)} subtitle={t('profile.support_subtitle', { defaultValue: 'Ajude a manter o app no ar' })} />
                             
                             <div className="my-2 rounded-2xl overflow-hidden shadow-md border border-white/5">
                                <AdSenseUnit
                                    client="ca-pub-9015745232467355"
                                    slot="4962199596"
                                    format="auto"
                                    responsive={true}
                                    className="bg-slate-800/30 min-h-[80px] flex items-center justify-center"
                                />
                            </div>

                            <ActionButton icon="logout" label={t('profile.logout', { defaultValue: 'Sair da Conta' })} onClick={signOut} variant="danger" />
                        </div>
                    </section>
                    
                    <div className="text-center py-6">
                        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Ponto G v1.2.0 (Beta)</p>
                        <p className="text-[9px] text-slate-700 font-medium mt-1">Propriedade de Kore Serviços de Tecnologia</p>
                    </div>
                </div>
            </div>
            {isEditProfileOpen && <EditProfileModal onClose={() => setIsEditProfileOpen(false)} />}
            {isMyAlbumsOpen && <MyAlbumsModal onClose={() => setIsMyAlbumsOpen(false)} />}
            {isBlockedUsersModalOpen && <BlockedUsersModal onClose={() => setIsBlockedUsersModalOpen(false)} />}
            <VerificationModal isOpen={isVerificationModalOpen} onClose={() => setIsVerificationModalOpen(false)} />
        </>
    );
};

const InfoItem = ({ icon, label, value }: { icon: string, label: string, value: string }) => (
    <div className="flex items-center space-x-3 bg-[#1a1a20] p-3 rounded-xl border border-white/5">
        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
             <span className="material-symbols-rounded text-lg text-slate-300">{icon}</span>
        </div>
        <div className="overflow-hidden">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide font-bold">{label}</p>
            <p className="font-semibold text-slate-200 truncate">{value}</p>
        </div>
    </div>
);

