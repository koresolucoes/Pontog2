

import React, { useState } from 'react';
import { useUiStore } from '../stores/uiStore';
import { useAuthStore } from '../stores/authStore';
import { MyAlbumsModal } from './MyAlbumsModal';
import { BlockedUsersModal } from './BlockedUsersModal';
import { LegalModal, LegalDocType } from './LegalModals';
import { useTranslation } from 'react-i18next';

export const Sidebar: React.FC = () => {
    const { isSidebarOpen, setSidebarOpen, setSubscriptionModalOpen, setDonationModalOpen, setActiveView } = useUiStore();
    const { user, toggleCanHost, toggleIncognitoMode, signOut } = useAuthStore();
    
    const [isMyAlbumsOpen, setIsMyAlbumsOpen] = useState(false);
    const [isBlockedUsersOpen, setIsBlockedUsersOpen] = useState(false);
    const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocType | null>(null);
    const { t, i18n } = useTranslation();

    if (!user) return null;

    const handleClose = () => setSidebarOpen(false);

    const handleToggleHost = () => {
        toggleCanHost(!user.can_host);
    };

    const handleToggleIncognito = () => {
        if (user.subscription_tier !== 'plus') {
            setSubscriptionModalOpen(true);
            handleClose();
        } else {
            toggleIncognitoMode(!user.is_incognito);
        }
    };

    const handleNavClick = (view: any) => {
        setActiveView(view);
        handleClose();
    }

    const changeLanguage = (lng: string) => {
        i18n.changeLanguage(lng);
    };

    return (
        <>
            {/* Backdrop */}
            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={handleClose}
            />

            {/* Sidebar Drawer */}
            <div 
                className={`fixed inset-y-0 left-0 z-[91] w-72 bg-dark-950/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ease-out flex flex-col shadow-2xl ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                {/* Header */}
                <div className="p-6 pt-8 flex flex-col items-center border-b border-white/5 bg-gradient-to-b from-dark-900 to-dark-950">
                    <div className="relative w-20 h-20 mb-3">
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary-500 to-secondary-500 rounded-full animate-pulse opacity-75 blur-md"></div>
                        <img 
                            src={user.avatar_url} 
                            alt={user.username} 
                            className="relative w-full h-full rounded-full object-cover border-2 border-white/10"
                        />
                        {user.subscription_tier === 'plus' && (
                            <div className="absolute -top-1 -right-1 bg-yellow-400 text-black rounded-full p-1 shadow-lg border border-white">
                                <span className="material-symbols-rounded filled !text-[14px] block">auto_awesome</span>
                            </div>
                        )}
                    </div>
                    <h2 className="text-xl font-bold text-white">{user.username}</h2>
                    <p className="text-xs text-slate-400 font-medium">{user.subscription_tier === 'plus' ? 'Membro Plus' : 'Membro Grátis'}</p>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    
                    {/* Quick Action: Host Status */}
                    <div className="bg-dark-900/50 p-4 rounded-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 text-slate-200 font-bold text-sm">
                                <span className={`material-symbols-rounded ${user.can_host ? 'text-tertiary-500 filled' : 'text-slate-500'}`}>home</span>
                                Tenho Local
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={user.can_host}
                                    onChange={handleToggleHost}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-dark-800 rounded-full peer peer-focus:ring-2 peer-focus:ring-tertiary-500/30 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tertiary-500 shadow-inner"></div>
                            </label>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-tight">
                            Ative para mostrar no mapa e na grade que você pode receber visitas agora.
                        </p>
                    </div>

                    {/* Menu Items */}
                    <nav className="space-y-1">
                        <SidebarLink 
                            icon="newspaper" 
                            label="G News & Blog" 
                            onClick={() => handleNavClick('news')}
                            iconColor="text-blue-400"
                        />
                        <div className="py-2">
                            <div className="h-px bg-white/5 mx-2"></div>
                        </div>
                        <SidebarLink 
                            icon="photo_library" 
                            label={t('sidebar.albums', { defaultValue: 'Álbuns Privados' })} 
                            onClick={() => { setIsMyAlbumsOpen(true); handleClose(); }} 
                        />
                        <SidebarLink 
                            icon="block" 
                            label={t('sidebar.blocked', { defaultValue: 'Usuários Bloqueados' })} 
                            onClick={() => { setIsBlockedUsersOpen(true); handleClose(); }} 
                        />
                        <div className="py-2">
                            <div className="h-px bg-white/5 mx-2"></div>
                        </div>
                        <SidebarLink 
                            icon="visibility_off" 
                            label={t('sidebar.incognito', { defaultValue: 'Modo Invisível' })} 
                            subLabel={user.subscription_tier !== 'plus' ? 'Plus' : undefined}
                            onClick={handleToggleIncognito} 
                            isActive={user.is_incognito}
                            activeColor="text-green-400"
                        />
                        <SidebarLink 
                            icon="volunteer_activism" 
                            label={t('sidebar.support', { defaultValue: 'Apoie o Projeto' })} 
                            onClick={() => { setDonationModalOpen(true); handleClose(); }} 
                            iconColor="text-primary-500"
                        />
                        
                        <div className="py-2">
                            <div className="h-px bg-white/5 mx-2"></div>
                        </div>

                        <div className="px-3 py-2">
                            <p className="text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-wider">{t('legal.legal', { defaultValue: 'Legal' })}</p>
                            <nav className="space-y-1">
                                <SidebarLink 
                                    icon="gavel" 
                                    label={t('legal.terms', { defaultValue: 'Termos de Uso' })} 
                                    onClick={() => { setActiveLegalDoc('terms'); handleClose(); }} 
                                />
                                <SidebarLink 
                                    icon="policy" 
                                    label={t('legal.privacy', { defaultValue: 'Política de Privacidade' })} 
                                    onClick={() => { setActiveLegalDoc('privacy'); handleClose(); }} 
                                />
                                <SidebarLink 
                                    icon="rule" 
                                    label={t('legal.guidelines', { defaultValue: 'Diretrizes' })} 
                                    onClick={() => { setActiveLegalDoc('guidelines'); handleClose(); }} 
                                />
                            </nav>
                        </div>
                        
                        <div className="py-2">
                            <div className="h-px bg-white/5 mx-2"></div>
                        </div>
                        <div className="px-3 py-2">
                            <p className="text-[10px] uppercase text-slate-500 font-bold mb-2 tracking-wider">{t('settings.language', { defaultValue: 'Idioma' })}</p>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => changeLanguage('pt')} 
                                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${i18n.language.startsWith('pt') ? 'bg-primary-500/20 border-primary-500 text-primary-400 font-bold' : 'bg-dark-800 border-white/5 text-slate-400 hover:bg-dark-700'}`}
                                >
                                    PT
                                </button>
                                <button 
                                    onClick={() => changeLanguage('en')} 
                                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${i18n.language.startsWith('en') ? 'bg-primary-500/20 border-primary-500 text-primary-400 font-bold' : 'bg-dark-800 border-white/5 text-slate-400 hover:bg-dark-700'}`}
                                >
                                    EN
                                </button>
                                <button 
                                    onClick={() => changeLanguage('es')} 
                                    className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${i18n.language.startsWith('es') ? 'bg-primary-500/20 border-primary-500 text-primary-400 font-bold' : 'bg-dark-800 border-white/5 text-slate-400 hover:bg-dark-700'}`}
                                >
                                    ES
                                </button>
                            </div>
                        </div>

                         <SidebarLink 
                            icon="logout" 
                            label={t('sidebar.logout', { defaultValue: 'Sair da Conta' })} 
                            onClick={() => { signOut(); handleClose(); }} 
                            variant="danger"
                        />
                    </nav>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 text-center flex flex-col items-center justify-center">
                    <img 
                        src="https://wwmiqdovqgysncmqnmvp.supabase.co/storage/v1/object/public/venues/Logo/Logo.png" 
                        alt="Logo" 
                        className="h-6 w-auto object-contain mb-2 opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">Ponto G v1.2.0</p>
                    <p className="text-[9px] text-slate-700 font-medium mt-1">Propriedade de Kore Serviços de Tecnologia</p>
                </div>
            </div>

            {/* Nested Modals */}
            {isMyAlbumsOpen && <MyAlbumsModal onClose={() => setIsMyAlbumsOpen(false)} />}
            {isBlockedUsersOpen && <BlockedUsersModal onClose={() => setIsBlockedUsersOpen(false)} />}
            {activeLegalDoc && <LegalModal type={activeLegalDoc} onClose={() => setActiveLegalDoc(null)} />}
        </>
    );
};

interface SidebarLinkProps {
    icon: string;
    label: string;
    subLabel?: string;
    onClick: () => void;
    variant?: 'default' | 'danger';
    isActive?: boolean;
    iconColor?: string;
    activeColor?: string;
}

const SidebarLink: React.FC<SidebarLinkProps> = ({ 
    icon, label, subLabel, onClick, variant = 'default', isActive = false, iconColor, activeColor 
}) => {
    return (
        <button 
            onClick={onClick}
            className={`w-full flex items-center justify-between p-3 rounded-xl transition-all active:scale-95 ${
                variant === 'danger' 
                    ? 'hover:bg-red-500/10 text-red-400' 
                    : 'hover:bg-white/5 text-slate-300 hover:text-white'
            }`}
        >
            <div className="flex items-center gap-3">
                <span className={`material-symbols-rounded text-xl ${isActive && activeColor ? activeColor : (iconColor || '')} ${isActive ? 'filled' : ''}`}>
                    {icon}
                </span>
                <span className={`text-sm font-medium ${isActive && activeColor ? activeColor : ''}`}>{label}</span>
            </div>
            {subLabel && (
                <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-md uppercase tracking-wide">
                    {subLabel}
                </span>
            )}
            {isActive && !subLabel && (
                <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(74,222,128,0.5)]"></div>
            )}
        </button>
    );
};
