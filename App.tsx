
import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Toaster, toast } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { useUiStore } from './stores/uiStore';
import { useMapStore } from './stores/mapStore';
import { useInboxStore } from './stores/inboxStore';
import { useUserActionsStore } from './stores/userActionsStore';
import { Auth } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { HomeView } from './components/HomeView';
import { UserGrid } from './components/UserGrid';
import { Map } from './components/Map';
import { Inbox } from './components/Inbox';
import { ProfileView } from './components/ProfileView';
import { ProfileModal } from './components/ProfileModal';
import { ChatWindow } from './components/ChatWindow';
import { AgoraView } from './components/AgoraView';
import { PwaInstallButton } from './components/PwaInstallButton';
import { usePwaStore } from './stores/pwaStore';
import { SubscriptionModal } from './components/SubscriptionModal';
import { DonationModal } from './components/DonationModal';
import { AdminPanel } from './pages/Admin/AdminPanel';
import { Onboarding } from './components/Onboarding';
import { Sidebar } from './components/Sidebar';
import { AnimatedBackground } from './components/AnimatedBackground';
import { SuspendedScreen } from './components/SuspendedScreen';
import { LegacyTribePromptModal } from './components/LegacyTribePromptModal';
import { NewsView } from './components/NewsView';
import { VenueDetailModal } from './components/VenueDetailModal';
import { GuidedTour } from './components/GuidedTour';
import { CommunityView } from './components/CommunityView';
import { useTranslation } from 'react-i18next';

const App: React.FC = () => {
    if (window.location.pathname.startsWith('/admin')) {
        return <AdminPanel />;
    }

    const { t } = useTranslation();
    const { session, user, loading, fetchProfile, showOnboarding } = useAuthStore();
    const { activeView, setActiveView, chatUser, setChatUser, isSubscriptionModalOpen, isDonationModalOpen, setSidebarOpen, isSuggestVenueModalOpen } = useUiStore();
    const { totalUnreadCount, fetchConversations, fetchWinks, fetchAccessRequests } = useInboxStore();
    const { setInstallPromptEvent, subscribeToPushNotifications } = usePwaStore();
    const { 
        selectedUser, 
        setSelectedUser, 
        selectedVenue,
        setSelectedVenue,
        requestLocationPermission, 
        stopLocationWatch, 
        cleanupRealtime,
        fetchVenues 
    } = useMapStore();

    const [showAuth, setShowAuth] = useState(false);

    useEffect(() => {
        const registerServiceWorker = async () => {
            if ('serviceWorker' in navigator) {
                try {
                    const registration = await navigator.serviceWorker.register('/service-worker.js');
                    const subscription = await registration.pushManager.getSubscription();
                    if (!subscription && Notification.permission === 'granted' && session) {
                        await subscribeToPushNotifications();
                    }
                } catch (error) {
                    console.error('Falha ao registrar Service Worker:', error);
                }
            }
        };

        registerServiceWorker();

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setInstallPromptEvent(e as any);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, [session, setInstallPromptEvent, subscribeToPushNotifications]);

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const paymentStatus = urlParams.get('payment');
        if (paymentStatus) {
            if (paymentStatus === 'success') {
                toast.success('Pagamento aprovado! Seu plano Plus está ativo.');
                if(session?.user) fetchProfile(session.user);
            } else if (paymentStatus === 'success_donation') {
                toast.success('Muito obrigado pelo seu apoio!');
            } else if (paymentStatus === 'failure') {
                toast.error('O pagamento falhou. Tente novamente.');
            }
            window.history.replaceState({}, document.title, "/");
        }
    }, [session, fetchProfile]);

    useEffect(() => {
        if (session && user && !loading) {
            if (user.status === 'active') {
                requestLocationPermission();
                fetchVenues();
                fetchConversations();
                fetchWinks();
                fetchAccessRequests();
                useUserActionsStore.getState().fetchFavorites();
            } else {
                stopLocationWatch();
                cleanupRealtime();
            }
        }
        
        if (!session) {
            stopLocationWatch();
            cleanupRealtime();
        }
    }, [session, user, loading, requestLocationPermission, stopLocationWatch, cleanupRealtime, fetchConversations, fetchWinks, fetchAccessRequests, fetchVenues]);

    const renderOtherViews = () => {
        switch (activeView) {
            case 'home': return <HomeView />;
            case 'grid': return <UserGrid />;
            case 'agora': return <AgoraView />;
            case 'communities': return <CommunityView />;
            case 'inbox': return <Inbox />;
            case 'profile': return <ProfileView />;
            case 'news': return <NewsView />;
            case 'map': return null;
            default: return <HomeView />;
        }
    };

    const renderUnauthenticatedView = () => {
        if (showAuth) {
            return <Auth />;
        }
        if (activeView === 'news') {
            return (
                <div className="h-screen w-screen bg-dark-900 relative overflow-hidden flex flex-col">
                    <AnimatedBackground />
                    <div className="relative z-10 flex-1 overflow-hidden">
                        <NewsView />
                    </div>
                </div>
            );
        }
        return <LandingPage onEnter={() => setShowAuth(true)} />;
    };

    return (
        <>
            <Toaster
                position="top-center"
                containerStyle={{ zIndex: 99999 }}
                toastOptions={{
                    className: '!bg-dark-900/95 !backdrop-blur-xl !text-white !border !border-white/10 !rounded-2xl !shadow-2xl !font-outfit',
                    duration: 4000,
                    success: {
                        iconTheme: { primary: '#4ade80', secondary: '#0f172a' },
                        style: { border: '1px solid rgba(74, 222, 128, 0.2)', background: 'rgba(5, 5, 5, 0.95)' }
                    },
                    error: {
                        iconTheme: { primary: '#f87171', secondary: '#0f172a' },
                        style: { border: '1px solid rgba(248, 113, 113, 0.2)', background: 'rgba(5, 5, 5, 0.95)' }
                    },
                    loading: {
                        style: { border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(5, 5, 5, 0.95)' }
                    },
                    style: { color: '#f8fafc', padding: '16px', fontSize: '14px', fontWeight: '600', boxShadow: '0 20px 50px -10px rgba(0,0,0,0.7)' },
                }}
            />
            
            {loading ? (
                <div className="min-h-screen bg-dark-900 flex items-center justify-center">
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-4 border-slate-700 opacity-30"></div>
                        <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-t-primary-600 animate-spin"></div>
                    </div>
                </div>
            ) : (!session || !user) ? (
                renderUnauthenticatedView()
            ) : (user.status === 'suspended' || user.status === 'banned') ? (
                <SuspendedScreen user={user} />
            ) : showOnboarding ? (
                <Onboarding />
            ) : (
                <div className="h-screen w-screen bg-dark-900 text-slate-50 flex flex-col antialiased overflow-hidden relative">
                    <GuidedTour />
                    {/* Fundo Animado Global (Apenas se não for mapa) */}
                    {activeView !== 'map' && <AnimatedBackground />}

                    <Sidebar />

                    <button 
                        onClick={() => setSidebarOpen(true)}
                        className="tour-step-menu fixed top-4 left-4 z-30 w-10 h-10 flex items-center justify-center rounded-full bg-dark-900/50 backdrop-blur-md border border-white/10 text-white shadow-lg hover:bg-slate-800 active:scale-95 transition-all"
                    >
                        <span className="material-symbols-rounded">menu</span>
                    </button>

                    <main className="flex-1 overflow-hidden pb-0 z-10 relative">
                        <div className="fixed inset-0 w-full h-full z-0">
                            <Map />
                        </div>

                        {activeView !== 'map' && (
                            <div key={activeView} className="fixed inset-0 z-10 w-full h-full animate-fade-in overflow-hidden">
                                {renderOtherViews()}
                            </div>
                        )}
                    </main>
                    
                    {selectedUser && (
                        <ProfileModal 
                            user={selectedUser} 
                            onClose={() => setSelectedUser(null)}
                            onStartChat={(userToChat) => setChatUser(userToChat)}
                        />
                    )}

                    {selectedVenue && (
                        <VenueDetailModal 
                            venue={selectedVenue}
                            onClose={() => setSelectedVenue(null)}
                        />
                    )}

                    {chatUser && (
                        <ChatWindow 
                            user={{
                                id: chatUser.id,
                                name: chatUser.username,
                                imageUrl: chatUser.avatar_url,
                                last_seen: chatUser.last_seen,
                                subscription_tier: chatUser.subscription_tier,
                                is_verified: chatUser.is_verified,
                            }} 
                            onClose={() => setChatUser(null)}
                        />
                    )}
                    
                    {isSubscriptionModalOpen && <SubscriptionModal />}
                    {isDonationModalOpen && <DonationModal />}
                    <LegacyTribePromptModal />

                    <PwaInstallButton />

                    {!isSuggestVenueModalOpen && (
                        <div className="fixed bottom-4 left-4 right-4 z-20 flex justify-center pointer-events-none">
                            <nav className="bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/50 pointer-events-auto max-w-lg w-full overflow-x-auto no-scrollbar">
                                <div className="flex justify-between items-center p-1.5 min-w-max sm:min-w-0 sm:grid sm:grid-cols-8 gap-1">
                                    <NavButton icon="home" label={t('nav.home', { defaultValue: 'Início' })} isActive={activeView === 'home'} onClick={() => setActiveView('home')} />
                                    <NavButton icon="grid_view" label={t('nav.grid', { defaultValue: 'Grade' })} isActive={activeView === 'grid'} onClick={() => setActiveView('grid')} />
                                    <NavButton icon="map" label={t('nav.map', { defaultValue: 'Mapa' })} isActive={activeView === 'map'} onClick={() => setActiveView('map')} className="tour-step-map" />
                                    <NavButton icon="groups" label={t('nav.communities', { defaultValue: 'Comunidades' })} isActive={activeView === 'communities'} onClick={() => setActiveView('communities')} />
                                    <NavButton icon="local_fire_department" label={t('nav.agora', { defaultValue: 'Agora' })} isActive={activeView === 'agora'} onClick={() => setActiveView('agora')} isFire />
                                    <NavButton icon="newspaper" label={t('nav.news', { defaultValue: 'News' })} isActive={activeView === 'news'} onClick={() => setActiveView('news')} />
                                    <NavButton icon="chat_bubble" label={t('nav.inbox', { defaultValue: 'Chat' })} isActive={activeView === 'inbox'} onClick={() => setActiveView('inbox')} notificationCount={totalUnreadCount} className="tour-step-inbox" />
                                    <NavButton icon="person" label={t('nav.profile', { defaultValue: 'Perfil' })} isActive={activeView === 'profile'} onClick={() => setActiveView('profile')} isPlus={user.subscription_tier === 'plus'} className="tour-step-profile" />
                                </div>
                            </nav>
                        </div>
                    )}
                </div>
            )}
        </>
    );
};

interface NavButtonProps {
    icon: string;
    label: string;
    isActive: boolean;
    onClick: () => void;
    isPlus?: boolean;
    isFire?: boolean;
    notificationCount?: number;
    className?: string;
}

const NavButton: React.FC<NavButtonProps> = ({ icon, label, isActive, onClick, isPlus = false, isFire = false, notificationCount = 0, className = "" }) => (
    <button
        onClick={onClick}
        className={`relative flex flex-col items-center justify-center py-2 px-1 min-w-[50px] w-full transition-all duration-300 group focus:outline-none rounded-xl ${className}`}
        aria-label={label}
    >
        <motion.div 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.9 }}
            className="relative"
        >
            <div 
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300
                    ${isActive 
                        ? isFire ? 'bg-gradient-to-tr from-orange-500 to-red-600 shadow-[0_0_15px_rgba(234,88,12,0.5)]' 
                        : 'bg-primary-500 shadow-[0_0_15px_rgba(245,12,105,0.4)]' 
                        : 'bg-transparent'}`
                }
            >
                <span 
                    className={`material-symbols-rounded text-[24px] transition-colors duration-300
                        ${isActive 
                            ? 'text-white filled' 
                            : 'text-slate-500 group-hover:text-primary-500'}`
                    }
                >
                    {icon}
                </span>
                {isActive && (
                    <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute inset-0 rounded-full border border-white/20"
                        initial={false}
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                )}
            </div>
            {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full text-white text-[10px] font-bold flex items-center justify-center border-2 border-dark-900 z-10 animate-bounce">
                    {notificationCount > 9 ? '9+' : notificationCount}
                </span>
             )}
        </motion.div>
        {isPlus && (
            <span className="absolute top-1 right-1 sm:right-2 material-symbols-rounded !text-[10px] text-yellow-400 filled shadow-black drop-shadow-md">auto_awesome</span>
        )}
    </button>
);

export default App;
