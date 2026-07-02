
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { usePwaStore } from '../stores/pwaStore';
import { useUiStore } from '../stores/uiStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useInboxStore } from '../stores/inboxStore'; // Adicionado para estatísticas
import { EditProfileModal } from './EditProfileModal';
import { MyAlbumsModal } from './MyAlbumsModal';
import { NotificationType } from '../types';
import { format } from 'date-fns';
import { BlockedUsersModal } from './BlockedUsersModal';
import { AdSenseUnit } from './AdSenseUnit';
import { VerificationModal } from './VerificationModal';
import { useTranslation } from 'react-i18next';

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
    const { winks, profileViews } = useInboxStore(); // Acessa dados da Inbox para o Dashboard

    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isMyAlbumsOpen, setIsMyAlbumsOpen] = useState(false);
    const [isBlockedUsersModalOpen, setIsBlockedUsersModalOpen] = useState(false);
    const [isVerificationModalOpen, setIsVerificationModalOpen] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        checkPushSupport();
    }, [checkPushSupport]);

    useEffect(() => {
        if (pushState === 'granted') {
            fetchPreferences();
        }
    }, [pushState, fetchPreferences]);

    if (!user) return null;

    const renderSubscriptionSection = () => {
        if (user.subscription_tier === 'plus') {
            return (
                <div className="p-1 rounded-2xl bg-gradient-to-r from-yellow-600 to-amber-600 shadow-lg shadow-yellow-900/20">
                    <div className="bg-slate-900/95 rounded-xl p-5 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                        <div className="flex items-center justify-between relative z-10">
                            <div>
                                <div className="flex items-center gap-2 text-yellow-400 mb-1">
                                    <span className="material-symbols-rounded filled text-xl">auto_awesome</span>
                                    <span className="font-black text-base tracking-wide">PONTO G PLUS</span>
                                </div>
                                <p className="text-xs text-slate-400 font-medium">{t('profile.subscription_active', { defaultValue: 'Assinatura ativa e operante.' })}</p>
                            </div>
                            {user.subscription_expires_at && (
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-500 uppercase font-bold">{t('profile.valid_until', { defaultValue: 'Válida até' })}</p>
                                    <p className="text-sm font-bold text-slate-200">{format(new Date(user.subscription_expires_at), 'dd/MM')}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            );
        }
        return (
             <div onClick={() => setSubscriptionModalOpen(true)} className="group cursor-pointer relative overflow-hidden rounded-2xl">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500 to-secondary-500 opacity-90 group-hover:opacity-100 transition-opacity"></div>
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 mix-blend-overlay"></div>
                
                <div className="relative p-5 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center font-black text-2xl text-white shadow-inner border border-white/20">G+</div>
                        <div>
                            <h4 className="font-bold text-white text-lg leading-tight">{t('profile.be_plus', { defaultValue: 'Seja Plus' })}</h4>
                            <p className="text-xs text-white/80 font-medium mt-0.5 opacity-90">{t('profile.discover_who_viewed', { defaultValue: 'Descubra quem te viu e mais.' })}</p>
                        </div>
                    </div>
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-primary-500 shadow-lg transform group-hover:scale-110 transition-transform">
                        <span className="material-symbols-rounded filled text-xl">arrow_forward</span>
                    </div>
                </div>
            </div>
        );
    }
    
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

    return (
        <>
            <div className="bg-dark-900 h-full overflow-y-auto pb-24 no-scrollbar">
                {/* Immersive Header */}
                <div className="relative w-full h-72 overflow-hidden">
                    {/* Blurred Background Image */}
                    <div className="absolute inset-0">
                        <img loading="lazy" src={user.avatar_url} className="w-full h-full object-cover blur-3xl opacity-40 scale-125" />
                        <div className="absolute inset-0 bg-gradient-to-b from-dark-900/20 via-dark-900/60 to-dark-900"></div>
                    </div>

                    <div className="absolute inset-0 flex flex-col items-center justify-center pt-8 z-10">
                        <div className="relative mb-4 group">
                            <div className="w-32 h-32 rounded-full p-1 bg-gradient-to-tr from-primary-500 to-secondary-500 shadow-2xl shadow-primary-900/50">
                                <img loading="lazy" src={user.avatar_url} alt={user.username} className="w-full h-full rounded-full object-cover border-4 border-dark-900" />
                            </div>
                            <button 
                                onClick={() => setIsEditProfileOpen(true)}
                                className="absolute bottom-1 right-1 bg-dark-800 text-white p-2.5 rounded-full border border-white/10 shadow-lg hover:bg-primary-500 transition-colors active:scale-90"
                            >
                                <span className="material-symbols-rounded text-xl block">edit</span>
                            </button>
                        </div>
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black text-white tracking-tight drop-shadow-lg">{user.username}</h1>
                            {user.is_verified && (
                                <div className="bg-primary-500/20 text-primary-500 rounded-full p-1 flex items-center justify-center" title={t('profile.verified_profile', { defaultValue: 'Perfil Verificado' })}>
                                    <span className="material-symbols-rounded filled text-lg">verified</span>
                                </div>
                            )}
                        </div>
                        <p className="text-slate-300 text-sm font-medium mt-1 max-w-xs truncate opacity-80 px-6 text-center">
                            {user.status_text || t('profile.add_status', { defaultValue: 'Adicione um status...' })}
                        </p>
                    </div>
                </div>

                <div className="px-4 space-y-6 -mt-6 relative z-20">
                    {/* Stats Dashboard */}
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard 
                            icon="favorite" 
                            label="Winks" 
                            count={winks.length} 
                            color="primary"
                            onClick={() => useUiStore.getState().setActiveView('inbox')} 
                        />
                        <StatCard 
                            icon="visibility" 
                            label={t('profile.views', { defaultValue: 'Visitas' })} 
                            count={profileViews.length} 
                            color="secondary"
                            onClick={() => useUiStore.getState().setActiveView('inbox')} 
                        />
                    </div>

                     <section>
                        {renderSubscriptionSection()}
                    </section>

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
                            <ActionButton icon="photo_library" label={t('profile.private_albums', { defaultValue: 'Álbuns Privados' })} onClick={() => setIsMyAlbumsOpen(true)} subtitle={t('profile.private_albums_subtitle', { defaultValue: 'Gerencie suas fotos ocultas' })} />
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
