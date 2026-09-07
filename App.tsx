
import React, { lazy, Suspense, useEffect, useState } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { useUiStore } from './stores/uiStore';
import { useMapStore } from './stores/mapStore';
import { useInboxStore } from './stores/inboxStore';
import { useUserActionsStore } from './stores/userActionsStore';
import { useAdStore } from './stores/adStore';
import { mountFeatureRealtime } from './composition/featureRealtimeLifecycle';
import { mountLocationVisibilityLifecycle } from './composition/locationVisibilityLifecycle';
import { Auth } from './components/Auth';
import { LandingPage } from './components/LandingPage';
import { HomeView } from './components/HomeView';
import { Map } from './components/Map';
import { PwaInstallButton } from './components/PwaInstallButton';
import { usePwaStore } from './stores/pwaStore';
import { Onboarding } from './components/Onboarding';
import { Sidebar } from './components/Sidebar';
import { AnimatedBackground } from './components/AnimatedBackground';
import { SuspendedScreen } from './components/SuspendedScreen';
import { LegacyTribePromptModal } from './components/LegacyTribePromptModal';
import { GuidedTour } from './components/GuidedTour';
import { ErrorBoundary } from './components/ErrorBoundary';
import { PulseDock } from './components/navigation/PulseDock';
import { ContextBar } from './components/navigation/ContextBar';

const UserGrid = lazy(() => import('./components/UserGrid').then((module) => ({ default: module.UserGrid })));
const Inbox = lazy(() => import('./components/Inbox').then((module) => ({ default: module.Inbox })));
const ProfileView = lazy(() => import('./components/ProfileView').then((module) => ({ default: module.ProfileView })));
const ProfileModal = lazy(() => import('./components/ProfileModal').then((module) => ({ default: module.ProfileModal })));
const ChatWindow = lazy(() => import('./components/ChatWindow').then((module) => ({ default: module.ChatWindow })));
const AgoraView = lazy(() => import('./components/AgoraView').then((module) => ({ default: module.AgoraView })));
const SubscriptionModal = lazy(() => import('./components/SubscriptionModal').then((module) => ({ default: module.SubscriptionModal })));
const DonationModal = lazy(() => import('./components/DonationModal').then((module) => ({ default: module.DonationModal })));
const AdminPanel = lazy(() => import('./pages/Admin/AdminPanel').then((module) => ({ default: module.AdminPanel })));
const OwnerPanel = lazy(() => import('./pages/Owner/OwnerPanel').then((module) => ({ default: module.OwnerPanel })));
const NewsView = lazy(() => import('./components/NewsView').then((module) => ({ default: module.NewsView })));
const VenueDetailModal = lazy(() => import('./components/VenueDetailModal').then((module) => ({ default: module.VenueDetailModal })));
const CommunityView = lazy(() => import('./components/CommunityView').then((module) => ({ default: module.CommunityView })));
const VideosView = lazy(() => import('./components/VideosView').then((module) => ({ default: module.VideosView })));

const FullScreenLoader: React.FC = () => (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-slate-700 opacity-30"></div>
            <div className="absolute top-0 left-0 w-16 h-16 rounded-full border-4 border-t-primary-600 animate-spin"></div>
        </div>
    </div>
);

const ViewLoader: React.FC = () => (
    <div className="h-full w-full bg-dark-900/70 flex items-center justify-center">
        <div className="relative">
            <div className="w-10 h-10 rounded-full border-4 border-slate-700 opacity-30"></div>
            <div className="absolute top-0 left-0 w-10 h-10 rounded-full border-4 border-t-primary-600 animate-spin"></div>
        </div>
    </div>
);

const CONTEXT_BAR_VIEWS = new Set(['home', 'map', 'agora', 'inbox', 'profile']);

const App: React.FC = () => {
    if (window.location.pathname.startsWith('/admin')) {
        return (
            <Suspense fallback={<FullScreenLoader />}>
                <AdminPanel />
            </Suspense>
        );
    }
    if (window.location.pathname.startsWith('/owner')) {
        return (
            <Suspense fallback={<FullScreenLoader />}>
                <OwnerPanel />
            </Suspense>
        );
    }

    const { session, user, loading, fetchProfile, showOnboarding } = useAuthStore();
    const { activeView, setActiveView, chatUser, setChatUser, isSubscriptionModalOpen, isDonationModalOpen, setSidebarOpen, isSuggestVenueModalOpen, isCommunityPostCreateOpen } = useUiStore();
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
        const handleHashChange = () => {
            const hash = window.location.hash.replace('#', '');
            const validViews = ['home', 'grid', 'agora', 'communities', 'inbox', 'profile', 'news', 'videos', 'map'];
            if (validViews.includes(hash)) {
                useUiStore.getState().setActiveView(hash as any);
            }
        };

        window.addEventListener('hashchange', handleHashChange);
        window.addEventListener('popstate', handleHashChange);

        const hash = window.location.hash.replace('#', '');
        if (hash && ['home', 'grid', 'agora', 'communities', 'inbox', 'profile', 'news', 'videos', 'map'].includes(hash)) {
            handleHashChange();
        } else {
            window.history.replaceState(null, '', `#${activeView}`);
        }

        return () => {
            window.removeEventListener('hashchange', handleHashChange);
            window.removeEventListener('popstate', handleHashChange);
        };
    }, []);

    useEffect(() => {
        const currentHash = window.location.hash.replace('#', '');
        if (currentHash !== activeView) {
            window.history.pushState(null, '', `#${activeView}`);
        }
    }, [activeView]);

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
        if (session?.user?.id && user?.id && !loading) {
            if (user.status === 'active') {
                requestLocationPermission();
                fetchVenues();
                fetchConversations();
                fetchWinks();
                fetchAccessRequests();
                useUserActionsStore.getState().fetchFavorites();
                useAdStore.getState().fetchAds();
            } else {
                stopLocationWatch();
                cleanupRealtime();
            }
        }

        if (!session?.user?.id) {
            stopLocationWatch();
            cleanupRealtime();
        }
    }, [session?.user?.id, user?.id, user?.status, loading, requestLocationPermission, stopLocationWatch, cleanupRealtime, fetchConversations, fetchWinks, fetchAccessRequests, fetchVenues]);

    useEffect(() => {
        if (!session?.user?.id || !user || loading || user.status !== 'active') return;
        return mountLocationVisibilityLifecycle();
    }, [session?.user?.id, user?.id, user?.status, loading]);

    useEffect(() => {
        if (!session?.user?.id || !user || loading || user.status !== 'active') return;

        let cancelled = false;
        let dispose: (() => void) | undefined;

        void mountFeatureRealtime(activeView)
            .then((nextDispose) => {
                if (cancelled) {
                    nextDispose?.();
                    return;
                }
                dispose = nextDispose;
            })
            .catch((error) => {
                console.error(`Failed to mount realtime lifecycle for view ${activeView}:`, error);
            });

        return () => {
            cancelled = true;
            dispose?.();
        };
    }, [activeView, session?.user?.id, user?.id, user?.status, loading]);

    const renderOtherViews = () => {
        switch (activeView) {
            case 'home': return <HomeView />;
            case 'grid': return <UserGrid />;
            case 'agora': return <AgoraView />;
            case 'communities': return <CommunityView />;
            case 'inbox': return <Inbox />;
            case 'profile': return <ProfileView />;
            case 'news': return <NewsView />;
            case 'videos': return <VideosView />;
            case 'map': return null;
            default: return <HomeView />;
        }
    };

    const renderUnauthenticatedView = () => {
        if (showAuth) return <Auth />;
        if (activeView === 'news') {
            return (
                <div className="h-screen w-screen bg-dark-900 relative overflow-hidden flex flex-col">
                    <AnimatedBackground />
                    <div className="relative z-10 flex-1 overflow-hidden">
                        <Suspense fallback={<ViewLoader />}><NewsView /></Suspense>
                    </div>
                </div>
            );
        }
        return <LandingPage onEnter={() => setShowAuth(true)} />;
    };

    const shouldHideShell = !!chatUser || !!isSuggestVenueModalOpen || !!isCommunityPostCreateOpen;
    const hasContextBar = CONTEXT_BAR_VIEWS.has(activeView);

    return (
        <ErrorBoundary>
        <>
            <Toaster
                position="top-center"
                containerStyle={{ zIndex: 99999 }}
                toastOptions={{
                    className: '!bg-dark-900/95 !backdrop-blur-xl !text-white !border !border-white/10 !rounded-2xl !shadow-2xl !font-outfit',
                    duration: 4000,
                    success: { iconTheme: { primary: '#4ade80', secondary: '#0f172a' }, style: { border: '1px solid rgba(74, 222, 128, 0.2)', background: 'rgba(5, 5, 5, 0.95)' } },
                    error: { iconTheme: { primary: '#f87171', secondary: '#0f172a' }, style: { border: '1px solid rgba(248, 113, 113, 0.2)', background: 'rgba(5, 5, 5, 0.95)' } },
                    loading: { style: { border: '1px solid rgba(255, 255, 255, 0.1)', background: 'rgba(5, 5, 5, 0.95)' } },
                    style: { color: '#f8fafc', padding: '16px', fontSize: '14px', fontWeight: '600', boxShadow: '0 20px 50px -10px rgba(0,0,0,0.7)' },
                }}
            />

            {loading ? (
                <FullScreenLoader />
            ) : (!session || !user) ? (
                renderUnauthenticatedView()
            ) : (user.status === 'suspended' || user.status === 'banned') ? (
                <SuspendedScreen user={user} />
            ) : showOnboarding ? (
                <Onboarding />
            ) : (
                <div className="h-screen w-screen bg-dark-900 text-slate-50 flex flex-col antialiased overflow-hidden relative">
                    <GuidedTour />
                    {activeView !== 'map' && <AnimatedBackground />}

                    <Sidebar />

                    {!shouldHideShell && hasContextBar && (
                        <ContextBar
                            activeView={activeView}
                            user={user}
                            onOpenAccount={() => setSidebarOpen(true)}
                        />
                    )}

                    <main className="flex-1 overflow-hidden pb-0 z-10 relative">
                        <div className="fixed inset-0 w-full h-full z-0"><Map /></div>

                        {activeView !== 'map' && (
                            <div
                                key={activeView}
                                className={`fixed inset-0 z-10 w-full h-full animate-fade-in overflow-hidden ${hasContextBar ? 'pt-[88px]' : ''}`}
                            >
                                <Suspense fallback={<ViewLoader />}>{renderOtherViews()}</Suspense>
                            </div>
                        )}
                    </main>

                    {selectedUser && (
                        <Suspense fallback={null}>
                            <ProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} onStartChat={(userToChat) => setChatUser(userToChat)} />
                        </Suspense>
                    )}

                    {selectedVenue && (
                        <Suspense fallback={null}>
                            <VenueDetailModal venue={selectedVenue} onClose={() => setSelectedVenue(null)} />
                        </Suspense>
                    )}

                    {chatUser && (
                        <Suspense fallback={null}>
                            <ChatWindow
                                user={{
                                    id: chatUser.id,
                                    name: chatUser.username,
                                    imageUrl: chatUser.avatar_url,
                                    last_seen: chatUser.last_seen,
                                    subscription_tier: chatUser.subscription_tier,
                                    is_verified: chatUser.is_verified,
                                    current_checkin_venue_id: chatUser.current_checkin_venue_id,
                                    current_checkin_venue_name: chatUser.current_checkin_venue_name,
                                }}
                                onClose={() => setChatUser(null)}
                            />
                        </Suspense>
                    )}

                    {isSubscriptionModalOpen && <Suspense fallback={null}><SubscriptionModal /></Suspense>}
                    {isDonationModalOpen && <Suspense fallback={null}><DonationModal /></Suspense>}
                    <LegacyTribePromptModal />
                    <PwaInstallButton />

                    <PulseDock
                        activeView={activeView}
                        onNavigate={(view) => setActiveView(view)}
                        unreadCount={totalUnreadCount}
                        user={user}
                        hidden={shouldHideShell}
                    />
                </div>
            )}
        </>
        </ErrorBoundary>
    );
};

export default App;
