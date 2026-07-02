
import React, { useEffect, useMemo, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useHomeStore } from '../stores/homeStore';
import { useMapStore } from '../stores/mapStore';
import { useAgoraStore } from '../stores/agoraStore';
import { User } from '../types';
import { AdSenseUnit } from './AdSenseUnit';
import { useTranslation } from 'react-i18next';

import { useUserActionsStore } from '../stores/userActionsStore';

const GridLoader: React.FC = () => (
    <>
        {Array.from({ length: 6 }).map((_, i) => (
            <motion.div 
                key={`skeleton-${i}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="relative aspect-[3/4] bg-dark-800/50 rounded-3xl animate-pulse border border-white/5"
            />
        ))}
    </>
);

const containerVariants = {
    hidden: { opacity: 0 },
    show: {
        opacity: 1,
        transition: { staggerChildren: 0.05 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
};

export const HomeView: React.FC = () => {
    const { t } = useTranslation();
    const { popularUsers, loading, error, hasMore, loadingMore, fetchPopularUsers, fetchMorePopularUsers } = useHomeStore();
    const { onlineUsers, setSelectedUser, myLocation, filters, venues, setSelectedVenue } = useMapStore();
    const { agoraUserIds } = useAgoraStore();
    const { favoriteIds } = useUserActionsStore();

    const initialFetchDone = useRef(false);

    useEffect(() => {
        if (myLocation && !initialFetchDone.current) {
            fetchPopularUsers();
            initialFetchDone.current = true;
        }
    }, [myLocation, fetchPopularUsers]);

    const observer = useRef<IntersectionObserver | null>(null);
    const lastUserElementRef = useCallback((node: HTMLDivElement) => {
        if (loadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchMorePopularUsers();
            }
        });
        if (node) observer.current.observe(node);
    }, [loadingMore, hasMore, fetchMorePopularUsers]);

    const handleUserClick = (user: User) => {
        setSelectedUser(user);
    };
    
    const itemsWithAds = useMemo(() => {
        let sortedUsers = [...popularUsers];
        
        if (filters.favoritesOnly) {
            sortedUsers = sortedUsers.filter(u => favoriteIds.includes(u.id));
        }

        if (filters.onlineOnly) {
            sortedUsers = sortedUsers.filter(u => onlineUsers.includes(u.id));
        }

        sortedUsers.sort((a, b) => {
            const aIsAgora = agoraUserIds.includes(a.id);
            const bIsAgora = agoraUserIds.includes(b.id);
            if (aIsAgora && !bIsAgora) return -1;
            if (!aIsAgora && bIsAgora) return 1;

            const aOnline = onlineUsers.includes(a.id);
            const bOnline = onlineUsers.includes(b.id);
            if (aOnline && !bOnline) return -1;
            if (!aOnline && bOnline) return 1;
            
            return 0;
        });

        const items: (User | { type: 'ad' })[] = [...sortedUsers];
        // Insert an ad after the 8th item
        if (items.length > 8) {
            items.splice(8, 0, { type: 'ad' });
        }
        return items;
    }, [popularUsers, onlineUsers, agoraUserIds, filters.favoritesOnly, filters.onlineOnly, favoriteIds]);


    if (loading && popularUsers.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8 bg-dark-900">
                <div className="w-14 h-14 border-4 border-dashed rounded-full animate-spin border-primary-500 mb-4 opacity-80"></div>
                <h2 className="text-lg font-bold text-slate-300 tracking-wide">{t('home.searching', { defaultValue: 'Buscando destaques...' })}</h2>
            </div>
        );
    }
    
    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center text-red-400 p-8 bg-dark-900">
                <div className="bg-red-500/10 p-4 rounded-full mb-4">
                    <span className="material-symbols-rounded text-4xl">error_outline</span>
                </div>
                <h2 className="text-xl font-bold text-white">{t('common.ops', { defaultValue: 'Ops!' })}</h2>
                <p className="mt-2 text-slate-400 max-w-xs">{error}</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-dark-900 pb-24">
            {/* Header with pl-16 safe zone for hamburger menu */}
            <header className="p-5 pb-3 bg-dark-900/90 backdrop-blur-xl sticky top-0 z-10 border-b border-white/5 pl-16">
                <h1 className="text-2xl font-black text-white tracking-tight font-outfit">{t('home.community', { defaultValue: 'Comunidade' })}</h1>
                <p className="text-sm text-slate-400 font-medium">{t('home.community_desc', { defaultValue: 'Perfis e eventos em alta na sua região 🔥' })}</p>
            </header>
            
            <div className="flex-1 overflow-y-auto px-3 pt-3">
                {venues.length > 0 && (
                    <div className="mb-6">
                        <div className="flex items-center justify-between px-2 mb-3">
                            <h2 className="text-lg font-bold text-white font-outfit tracking-tight">{t('home.events_venues', { defaultValue: 'Eventos & Locais' })}</h2>
                            <span className="text-xs text-primary-500 font-bold uppercase tracking-wider">{t('home.upcoming', { defaultValue: 'Próximos' })}</span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto pb-4 px-2 no-scrollbar snap-x snap-mandatory">
                            {venues.map(venue => (
                                <motion.div
                                    key={venue.id}
                                    whileHover={{ scale: 0.98 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => setSelectedVenue(venue)}
                                    className="relative flex-shrink-0 w-64 h-40 bg-slate-800 rounded-3xl overflow-hidden cursor-pointer border border-white/5 snap-center shadow-lg"
                                >
                                    <img 
                                        src={venue.image_url || 'https://images.unsplash.com/photo-1574883446549-3617e4d8fb85?ixlib=rb-4.0.3&auto=format&fit=crop&w=500&q=80'} 
                                        alt={venue.name} 
                                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-110"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                                    <div className="absolute bottom-3 left-3 right-3">
                                        <h3 className="font-bold text-white text-base truncate drop-shadow-md leading-tight">{venue.name}</h3>
                                        <p className="text-xs text-slate-300 flex items-center gap-1 mt-1">
                                            <span className="material-symbols-rounded text-[14px] text-primary-400">location_on</span>
                                            <span className="truncate">{venue.address}</span>
                                        </p>
                                    </div>
                                    <div className="absolute top-3 left-3 bg-black/60 backdrop-blur-md px-2 py-1 rounded-md border border-white/10 flex items-center gap-1">
                                        <span className="material-symbols-rounded text-[12px] text-white">event</span>
                                        <span className="text-[10px] font-bold text-white uppercase tracking-wider">{venue.type}</span>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="flex items-center justify-between px-2 mb-3">
                    <h2 className="text-lg font-bold text-white font-outfit tracking-tight">{t('home.featured_profiles', { defaultValue: 'Perfis em Destaque' })}</h2>
                </div>

                {itemsWithAds.length === 0 && !loading ? (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex flex-col items-center justify-center h-64 text-center text-slate-500 p-8"
                    >
                        <span className="material-symbols-rounded text-5xl mb-3 text-slate-700">explore_off</span>
                        <h2 className="text-lg font-bold text-slate-300">{t('home.no_profiles', { defaultValue: 'Nenhum perfil encontrado.' })}</h2>
                        <p className="mt-2 text-sm">{t('home.explore_map', { defaultValue: 'Explore o mapa para encontrar mais pessoas.' })}</p>
                    </motion.div>
                ) : (
                    <motion.div 
                        variants={containerVariants}
                        initial="hidden"
                        animate="show"
                        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-4"
                    >
                        <AnimatePresence mode="popLayout">
                            {itemsWithAds.map((item, index) => {
                                if ('type' in item && item.type === 'ad') {
                                    return (
                                        <motion.div 
                                            variants={itemVariants}
                                            layout
                                            key={`ad-${index}`} 
                                            className="relative aspect-[3/4] bg-dark-800/50 rounded-3xl overflow-hidden flex items-center justify-center border border-white/5"
                                        >
                                            <AdSenseUnit
                                                client="ca-pub-9015745232467355"
                                                slot="8953415490"
                                                format="auto"
                                                className="w-full h-full"
                                            />
                                            <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md text-[9px] font-bold text-white/50 tracking-widest border border-white/5">ADS</div>
                                        </motion.div>
                                    );
                                }
                                
                                const user = item as User;
                                const isLastUser = index === itemsWithAds.length - 1;
                                const isAgora = agoraUserIds.includes(user.id);
                                const isPlus = user.subscription_tier === 'plus';
                                
                                return (
                                    <motion.div 
                                        variants={itemVariants}
                                        layout
                                        ref={isLastUser ? lastUserElementRef : null}
                                        key={user.id} 
                                        className={`relative aspect-[3/4] cursor-pointer group rounded-3xl overflow-hidden transition-shadow duration-500 bg-dark-800 ${isAgora ? 'ring-2 ring-primary-500 shadow-[0_0_20px_rgba(245,12,105,0.4)]' : 'hover:shadow-2xl hover:shadow-black/50'}`}
                                        onClick={() => handleUserClick(user)}
                                        whileHover={{ y: -4, scale: 0.98 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                    <img 
                                        src={user.avatar_url} 
                                        alt={user.username} 
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" 
                                    />
                                    
                                    {/* Badges Container - Top Right (z-10 to ensure visibility over overlay) */}
                                    <div className="absolute top-3 right-3 flex flex-col gap-2 items-end z-10">
                                        {isAgora && (
                                            <div className="bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full p-1.5 shadow-lg shadow-primary-900/50 animate-pulse-fire border border-white/20">
                                                <span className="material-symbols-rounded filled block" style={{ fontSize: '16px' }}>local_fire_department</span>
                                            </div>
                                        )}
                                        {isPlus && !isAgora && (
                                            <div className="bg-yellow-500/90 backdrop-blur-md text-black rounded-full p-1.5 shadow-lg border border-yellow-300/50">
                                                <span className="material-symbols-rounded filled block" style={{ fontSize: '14px' }}>auto_awesome</span>
                                            </div>
                                        )}
                                        {user.can_host && (
                                            <div className="bg-tertiary-500/90 backdrop-blur-md text-white rounded-full p-1.5 shadow-lg border border-tertiary-400/50" title={t('home.has_place', { defaultValue: 'Tem Local' })}>
                                                <span className="material-symbols-rounded filled block" style={{ fontSize: '14px' }}>home</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90"></div>
                                    
                                    <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-extrabold text-lg truncate leading-none font-outfit drop-shadow-md">{user.display_name || user.username}</h3>
                                        </div>
                                        
                                        <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium opacity-90">
                                            {onlineUsers.includes(user.id) && (
                                                <span className="relative flex h-2 w-2 mr-0.5">
                                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-400 opacity-75"></span>
                                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary-500"></span>
                                                </span>
                                            )}
                                            <span className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/5">{user.age}</span>
                                            {user.distance_km != null && (
                                                <span className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/5">
                                                    {user.distance_km < 1 ? `${Math.round(user.distance_km * 1000)}m` : `${user.distance_km.toFixed(0)}km`}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                        </AnimatePresence>
                        {loadingMore && <GridLoader />}
                    </motion.div>
                )}
            </div>
        </div>
    );
};
