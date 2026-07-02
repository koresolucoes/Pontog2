
import React, { useMemo, useEffect, useState, memo, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useMapStore } from '../stores/mapStore';
import { useAgoraStore } from '../stores/agoraStore';
import { useUserActionsStore } from '../stores/userActionsStore';
import { User } from '../types';
import { FilterModal } from './FilterModal';
import { AdSenseUnit } from './AdSenseUnit';
import { useVirtualizer } from '@tanstack/react-virtual';

const ITEMS_PER_PAGE = 30;

// Extracted and Memoized Ad Card
const AdCard = memo(() => (
    <div className="relative aspect-[3/4] bg-dark-800/50 rounded-3xl overflow-hidden flex items-center justify-center border border-white/5">
        <AdSenseUnit
            client="ca-pub-9015745232467355"
            slot="8953415490"
            format="auto"
            className="w-full h-full"
        />
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md text-[9px] font-bold text-white/50 tracking-widest border border-white/5">ADS</div>
    </div>
));

// Extracted and Memoized User Card
const UserCard = memo(({ 
    user, 
    isAgora, 
    isOnline, 
    onClick 
}: { 
    user: User; 
    isAgora: boolean; 
    isOnline: boolean; 
    onClick: (user: User) => void;
}) => {
    const { t } = useTranslation();
    const isPlus = user.subscription_tier === 'plus';

    return (
        <div 
            className={`relative aspect-[3/4] cursor-pointer group rounded-3xl overflow-hidden transition-all duration-500 bg-dark-800 ${isAgora ? 'ring-2 ring-primary-500 shadow-[0_0_20px_rgba(245,12,105,0.4)]' : 'hover:shadow-2xl hover:shadow-black/50'}`}
            onClick={() => onClick(user)}
        >
            <img 
                src={user.avatar_url} 
                alt={user.username} 
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" 
            />
            
            {/* Cinematic Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90"></div>
            
            {/* Badges Container - Top Right (z-10 to be above gradient) */}
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
                    <div className="bg-tertiary-500/90 backdrop-blur-md text-white rounded-full p-1.5 shadow-lg border border-tertiary-400/50" title={t('edit_profile.can_host', { defaultValue: 'Tem Local' })}>
                        <span className="material-symbols-rounded filled block" style={{ fontSize: '14px' }}>home</span>
                    </div>
                )}
            </div>

            {/* Online Indicator - Top Left */}
            {isOnline && (
                <div className="absolute top-4 left-4">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-tertiary-500 shadow-[0_0_8px_rgba(39,174,96,0.8)] border border-white/20"></span>
                    </span>
                </div>
            )}

            {/* User Info - Bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                <div className="flex items-center gap-1">
                    <h3 className="font-extrabold text-lg truncate leading-none drop-shadow-lg tracking-tight">{user.display_name || user.username}</h3>
                    {user.is_verified && (
                        <span className="material-symbols-rounded filled text-primary-500 text-sm" title={t('onboarding.verified', { defaultValue: 'Verificado' })}>verified</span>
                    )}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mt-1.5 opacity-90">
                    <span className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/5">{user.age}</span>
                    {user.distance_km != null && (
                        <span className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/5 flex items-center gap-1">
                            <span className="material-symbols-rounded" style={{ fontSize: '10px' }}>location_on</span>
                            {user.distance_km < 1 ? `${Math.round(user.distance_km * 1000)}m` : `${user.distance_km.toFixed(0)}km`}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
});

export const UserGrid: React.FC = () => {
    const { t } = useTranslation();
    const { users, onlineUsers, filters, setFilters, setSelectedUser } = useMapStore();
    const { agoraUserIds, fetchAgoraPosts } = useAgoraStore();
    const { favoriteIds } = useUserActionsStore();
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

    useEffect(() => {
        fetchAgoraPosts();
    }, [fetchAgoraPosts]);

    const handleUserClick = useCallback((user: User) => {
        setSelectedUser(user);
    }, [setSelectedUser]);

    const toggleOnlineOnly = () => {
        setFilters({ ...filters, onlineOnly: !filters.onlineOnly });
    };

    const handleFilterClick = () => {
        setIsFilterModalOpen(true);
    }

    // Actions to remove individual filters directly from the header
    const removePosition = (pos: string) => {
        setFilters({ positions: filters.positions.filter(p => p !== pos) });
    };

    const removeTribe = (tribe: string) => {
        setFilters({ tribes: filters.tribes.filter(t => t !== tribe) });
    };

    const resetAge = () => {
        setFilters({ minAge: 18, maxAge: 99 });
    };

    const handleLoadMore = () => {
        setVisibleCount(prev => prev + ITEMS_PER_PAGE);
    };

    const { itemsWithAds, hasMore } = useMemo(() => {
        let sortedUsers = [...users].sort((a, b) => {
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

        const { onlineOnly, favoritesOnly, minAge, maxAge, positions, tribes } = filters;

        // Apply filters
        let finalUsers = sortedUsers;
        if (favoritesOnly) {
            finalUsers = finalUsers.filter(user => favoriteIds.includes(user.id));
        }
        if (onlineOnly) {
            finalUsers = finalUsers.filter(user => onlineUsers.includes(user.id));
        }
        if (minAge) {
            finalUsers = finalUsers.filter(user => user.age >= minAge);
        }
        if (maxAge) {
            finalUsers = finalUsers.filter(user => user.age <= maxAge);
        }
        if (positions.length > 0) {
            finalUsers = finalUsers.filter(user => user.position && positions.includes(user.position));
        }
        if (tribes.length > 0) {
            finalUsers = finalUsers.filter(user =>
                user.tribes && user.tribes.some(t => tribes.includes(t))
            );
        }
        
        const totalCount = finalUsers.length;
        const slicedUsers = finalUsers.slice(0, visibleCount);
        
        const items: (User | { type: 'ad' })[] = [...slicedUsers];
        // Ad logic: Insert after 8th item if available
        if (items.length > 8) {
            items.splice(8, 0, { type: 'ad' });
        }
        
        return { 
            itemsWithAds: items, 
            hasMore: totalCount > visibleCount 
        };
    }, [users, onlineUsers, filters, agoraUserIds, visibleCount]);

    const isAgeFilterActive = filters.minAge !== 18 || filters.maxAge !== 99;
    const arePositionsFiltered = filters.positions.length > 0;
    const areTribesFiltered = filters.tribes.length > 0;
    const areAnyFiltersActive = isAgeFilterActive || arePositionsFiltered || areTribesFiltered;

    const FilterButton = ({ label, isActive }: { label: string, isActive: boolean }) => (
        <button 
            onClick={handleFilterClick} 
            className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 shadow-lg backdrop-blur-md ${
                isActive 
                    ? 'bg-primary-500/90 text-white shadow-primary-900/30 border border-primary-500/50' 
                    : 'bg-dark-800/60 text-slate-300 border border-white/10 hover:bg-dark-700/80'
            }`}
        >
            <span className="material-symbols-rounded !text-[18px]">tune</span>
            {label}
        </button>
    );

    return (
        <>
        <div className="h-full flex flex-col pb-24 bg-dark-900">
            {/* Header Flutuante com Glassmorphism */}
            <div className="px-4 py-3 flex items-center space-x-2 overflow-x-auto sticky top-0 z-20 bg-dark-900/80 backdrop-blur-xl border-b border-white/5 mask-image-b pl-16 no-scrollbar">
                <button
                    onClick={toggleOnlineOnly}
                    className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 shadow-lg backdrop-blur-md ${
                        filters.onlineOnly 
                            ? 'bg-tertiary-500/20 text-tertiary-400 border border-tertiary-500/50 shadow-[0_0_15px_rgba(39,174,96,0.15)]' 
                            : 'bg-dark-800/60 text-slate-300 border border-white/10 hover:bg-dark-700/80'
                    }`}
                >
                    <div className={`w-2 h-2 rounded-full ${filters.onlineOnly ? 'bg-tertiary-400 animate-pulse shadow-[0_0_8px_#27AE60]' : 'bg-slate-400'}`}></div>
                    {t('grid.online', { defaultValue: 'Online' })}
                </button>
                
                <FilterButton label={t('common.filters', { defaultValue: 'Filtros' })} isActive={areAnyFiltersActive} />

                {/* Active Filter Chips - Recognition rather than Recall */}
                {isAgeFilterActive && (
                    <button onClick={resetAge} className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-primary-900/30 border border-primary-500/30 rounded-full text-xs font-bold text-primary-200 whitespace-nowrap hover:bg-primary-900/50 transition-colors animate-fade-in">
                        <span>{filters.minAge}-{filters.maxAge} {t('grid.years', { defaultValue: 'anos' })}</span>
                        <span className="material-symbols-rounded text-[14px]">close</span>
                    </button>
                )}
                
                {filters.positions.map(pos => (
                    <button key={pos} onClick={() => removePosition(pos)} className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-secondary-900/30 border border-secondary-500/30 rounded-full text-xs font-bold text-secondary-200 whitespace-nowrap hover:bg-secondary-900/50 transition-colors animate-fade-in">
                        <span>{t(`constants.positions.${pos}`, { defaultValue: pos })}</span>
                        <span className="material-symbols-rounded text-[14px]">close</span>
                    </button>
                ))}

                {filters.tribes.map(tribe => (
                    <button key={tribe} onClick={() => removeTribe(tribe)} className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-dark-800 border border-white/10 rounded-full text-xs font-bold text-slate-300 whitespace-nowrap hover:bg-dark-700 transition-colors animate-fade-in">
                        <span>{t(`constants.tribes.${tribe}`, { defaultValue: tribe })}</span>
                        <span className="material-symbols-rounded text-[14px]">close</span>
                    </button>
                ))}
            </div>
            
            {itemsWithAds.length === 0 ? (
                 <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8 animate-fade-in">
                    <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                        <span className="material-symbols-rounded text-5xl text-slate-600">search_off</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-200 tracking-tight">{t('grid.no_one_here', { defaultValue: 'Ninguém por aqui' })}</h2>
                    <p className="mt-3 text-slate-400 max-w-xs mx-auto leading-relaxed">{t('grid.adjust_filters', { defaultValue: 'Tente ajustar seus filtros ou expanda a busca para encontrar alguém.' })}</p>
                </div>
            ) : (
                <VirtualizedGrid 
                    items={itemsWithAds} 
                    agoraUserIds={agoraUserIds}
                    onlineUsers={onlineUsers}
                    onUserClick={handleUserClick}
                    onLoadMore={handleLoadMore}
                    hasMore={hasMore}
                />
            )}
        </div>
        {isFilterModalOpen && <FilterModal onClose={() => setIsFilterModalOpen(false)} />}
        </>
    );
};

const VirtualizedGrid = ({ items, agoraUserIds, onlineUsers, onUserClick, onLoadMore, hasMore }: any) => {
    const { t } = useTranslation();
    const parentRef = useRef<HTMLDivElement>(null);
    const [columns, setColumns] = useState(2);
    
    useEffect(() => {
        if (!parentRef.current) return;
        const observer = new ResizeObserver((entries) => {
            const width = entries[0].contentRect.width;
            if (width >= 1024) setColumns(5); // lg
            else if (width >= 768) setColumns(4); // md
            else if (width >= 640) setColumns(3); // sm
            else setColumns(2); // default
        });
        observer.observe(parentRef.current);
        return () => observer.disconnect();
    }, []);

    const rowVirtualizer = useVirtualizer({
        count: Math.ceil(items.length / columns),
        getScrollElement: () => parentRef.current,
        estimateSize: () => {
            if (!parentRef.current) return 250;
            const width = parentRef.current.clientWidth;
            const columnWidth = (width - (12 * (columns + 1))) / columns;
            return (columnWidth * (4/3)) + 12; // Aspect ratio 3/4 + gap
        },
        overscan: 2,
    });

    return (
        <div ref={parentRef} className="flex-1 overflow-y-auto px-3 pt-3">
            <div 
                style={{ 
                    height: `${rowVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative'
                }}
            >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const rowItems = items.slice(virtualRow.index * columns, (virtualRow.index + 1) * columns);
                    return (
                        <div
                            key={virtualRow.index}
                            className={`grid gap-3 grid-cols-${columns}`}
                            style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                                gap: '12px',
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: `${virtualRow.size - 12}px`,
                                transform: `translateY(${virtualRow.start}px)`
                            }}
                        >
                            {rowItems.map((item: any, idx: number) => {
                                if ('type' in item && item.type === 'ad') {
                                    return <AdCard key={`ad-${virtualRow.index}-${idx}`} />;
                                }
                                const user = item as User;
                                return (
                                    <UserCard 
                                        key={user.id} 
                                        user={user} 
                                        isAgora={agoraUserIds.includes(user.id)} 
                                        isOnline={onlineUsers.includes(user.id)} 
                                        onClick={onUserClick} 
                                    />
                                );
                            })}
                        </div>
                    );
                })}
            </div>
            {hasMore && (
                <div className="flex justify-center py-6 mt-4">
                    <button 
                        onClick={onLoadMore}
                        className="bg-slate-800 text-white font-bold py-3 px-8 rounded-full border border-white/10 hover:bg-slate-700 transition-colors shadow-lg active:scale-95"
                    >
                        {t('grid.load_more', { defaultValue: 'Ver mais pessoas' })}
                    </button>
                </div>
            )}
        </div>
    );
}
