import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMapStore } from '../stores/mapStore';
import { useAgoraStore } from '../stores/agoraStore';
import { useUserActionsStore } from '../stores/userActionsStore';
import { useAuthStore } from '../stores/authStore';
import { User } from '../types';
import { FilterModal } from './FilterModal';
import { AdSenseUnit } from './AdSenseUnit';

const ITEMS_PER_PAGE = 30;
const FALLBACK_AVATAR = 'https://placehold.co/400x400/1f2937/d1d5db/png?text=G';

type GridItem = User | { type: 'ad' };

const AdCard = memo(() => (
    <div className="relative aspect-[3/4] bg-dark-800/50 rounded-3xl overflow-hidden flex items-center justify-center border border-white/5">
        <AdSenseUnit
            client="ca-pub-9015745232467355"
            slot="8953415490"
            format="auto"
            className="w-full h-full"
        />
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-md text-[9px] font-bold text-white/50 tracking-widest border border-white/5">
            ADS
        </div>
    </div>
));

const UserCard = memo(({
    user,
    isAgora,
    isOnline,
    onClick,
}: {
    user: User;
    isAgora: boolean;
    isOnline: boolean;
    onClick: (user: User) => void;
}) => {
    const { t } = useTranslation();
    const profile = useAuthStore((state) => state.profile);
    const isPlus = user.subscription_tier === 'plus';
    const isPlusUser = profile?.subscription_tier === 'plus';
    const lookingFor = Array.isArray(user.looking_for) ? user.looking_for : [];
    const distance = typeof user.distance_km === 'number' && Number.isFinite(user.distance_km)
        ? user.distance_km
        : null;

    return (
        <div
            className={`relative aspect-[3/4] cursor-pointer group rounded-3xl overflow-hidden transition-all duration-500 bg-dark-800 ${
                isAgora
                    ? 'ring-2 ring-primary-500 shadow-[0_0_20px_rgba(245,12,105,0.4)]'
                    : 'hover:shadow-2xl hover:shadow-black/50'
            }`}
            onClick={() => onClick(user)}
        >
            <img
                src={user.avatar_url || FALLBACK_AVATAR}
                alt={user.username || 'Perfil'}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
                onError={(event) => {
                    const image = event.currentTarget;
                    image.onerror = null;
                    image.src = FALLBACK_AVATAR;
                }}
            />

            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-90" />

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
                {lookingFor.length > 0 && (
                    <div
                        className="bg-emerald-500/90 backdrop-blur-md text-white rounded-full p-1.5 shadow-lg border border-emerald-400/50"
                        title={t('profile.looking_for', { defaultValue: 'Buscando' })}
                    >
                        <span className="material-symbols-rounded filled block" style={{ fontSize: '14px' }}>search</span>
                    </div>
                )}
                {user.can_host && (
                    <div
                        className="bg-tertiary-500/90 backdrop-blur-md text-white rounded-full p-1.5 shadow-lg border border-tertiary-400/50"
                        title={t('edit_profile.can_host', { defaultValue: 'Tem Local' })}
                    >
                        <span className="material-symbols-rounded filled block" style={{ fontSize: '14px' }}>home</span>
                    </div>
                )}
            </div>

            {isOnline && (
                <div className="absolute top-4 left-4 z-10">
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-tertiary-500 shadow-[0_0_8px_rgba(39,174,96,0.8)] border border-white/20" />
                    </span>
                </div>
            )}

            <div className="absolute bottom-0 left-0 right-0 p-4 text-white transform translate-y-1 group-hover:translate-y-0 transition-transform duration-300">
                {user.current_checkin_venue_name && (
                    <div className="mb-2 inline-flex items-center gap-1 bg-primary-600/80 backdrop-blur-md px-2 py-1 rounded-md border border-primary-500/50 shadow-lg text-[10px] font-bold uppercase tracking-wider">
                        <span className="material-symbols-rounded" style={{ fontSize: '12px' }}>pin_drop</span>
                        <span className="truncate max-w-[120px]">
                            {t('venue.now_at', { defaultValue: 'Agora no' })} {user.current_checkin_venue_name}
                        </span>
                    </div>
                )}

                <div className="flex items-center gap-1 min-w-0">
                    <h3 className="font-extrabold text-lg truncate leading-none drop-shadow-lg tracking-tight">
                        {user.display_name || user.username || t('common.user', { defaultValue: 'Usuário' })}
                    </h3>
                    {user.is_verified && (
                        <span
                            className="material-symbols-rounded filled text-primary-500 text-sm"
                            title={t('onboarding.verified', { defaultValue: 'Verificado' })}
                        >
                            verified
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mt-1.5 opacity-90">
                    <span className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/5">
                        {Number.isFinite(user.age) && user.age > 0 ? user.age : '—'}
                    </span>
                    {distance !== null && (
                        <span className="bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-md border border-white/5 flex items-center gap-1">
                            <span className="material-symbols-rounded" style={{ fontSize: '10px' }}>location_on</span>
                            {isPlusUser ? (
                                distance < 1 ? `${Math.round(distance * 1000)}m` : `${distance.toFixed(1)}km`
                            ) : (
                                distance < 1
                                    ? t('profile_modal.approx_1km', { defaultValue: 'Cerca de 1km' })
                                    : `Aprox. ${distance.toFixed(0)}km`
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
});

const UserCardsGrid = ({
    items,
    agoraUserIds,
    onlineUsers,
    onUserClick,
    onLoadMore,
    hasMore,
}: {
    items: GridItem[];
    agoraUserIds: string[];
    onlineUsers: string[];
    onUserClick: (user: User) => void;
    onLoadMore: () => void;
    hasMore: boolean;
}) => {
    const { t } = useTranslation();

    return (
        <div className="flex-1 overflow-y-auto px-3 pt-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-3">
                {items.map((item, index) => {
                    if ('type' in item && item.type === 'ad') {
                        return <AdCard key={`ad-${index}`} />;
                    }

                    const user = item as User;
                    if (!user?.id) return null;

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

            {hasMore && (
                <div className="flex justify-center py-6 mt-1">
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
};

export const UserGrid: React.FC = () => {
    const { t } = useTranslation();
    const { users, onlineUsers, filters, setFilters, setSelectedUser } = useMapStore();
    const { agoraUserIds, fetchAgoraPosts } = useAgoraStore();
    const { favoriteIds } = useUserActionsStore();
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [visibleCount, setVisibleCount] = useState(ITEMS_PER_PAGE);

    useEffect(() => {
        void fetchAgoraPosts();
    }, [fetchAgoraPosts]);

    const handleUserClick = useCallback((user: User) => {
        setSelectedUser(user);
    }, [setSelectedUser]);

    const positions = Array.isArray(filters.positions) ? filters.positions : [];
    const tribes = Array.isArray(filters.tribes) ? filters.tribes : [];
    const lookingFor = Array.isArray(filters.lookingFor) ? filters.lookingFor : [];

    const toggleOnlineOnly = () => {
        setFilters({ onlineOnly: !filters.onlineOnly });
    };

    const removePosition = (position: string) => {
        setFilters({ positions: positions.filter((item) => item !== position) });
    };

    const removeTribe = (tribe: string) => {
        setFilters({ tribes: tribes.filter((item) => item !== tribe) });
    };

    const removeLookingFor = (intent: string) => {
        setFilters({ lookingFor: lookingFor.filter((item) => item !== intent) });
    };

    const resetAge = () => {
        setFilters({ minAge: 18, maxAge: 99 });
    };

    const { itemsWithAds, hasMore } = useMemo(() => {
        const safeUsers = Array.isArray(users)
            ? users.filter((user): user is User => Boolean(user?.id))
            : [];

        const sortedUsers = [...safeUsers].sort((a, b) => {
            const aIsAgora = agoraUserIds.includes(a.id);
            const bIsAgora = agoraUserIds.includes(b.id);
            if (aIsAgora !== bIsAgora) return aIsAgora ? -1 : 1;

            const aOnline = onlineUsers.includes(a.id);
            const bOnline = onlineUsers.includes(b.id);
            if (aOnline !== bOnline) return aOnline ? -1 : 1;

            return 0;
        });

        let finalUsers = sortedUsers;

        if (filters.favoritesOnly) {
            finalUsers = finalUsers.filter((user) => favoriteIds.includes(user.id));
        }
        if (filters.onlineOnly) {
            finalUsers = finalUsers.filter((user) => onlineUsers.includes(user.id));
        }
        if (typeof filters.minAge === 'number') {
            finalUsers = finalUsers.filter((user) => Number.isFinite(user.age) && user.age >= filters.minAge!);
        }
        if (typeof filters.maxAge === 'number') {
            finalUsers = finalUsers.filter((user) => Number.isFinite(user.age) && user.age <= filters.maxAge!);
        }
        if (positions.length > 0) {
            finalUsers = finalUsers.filter((user) => Boolean(user.position) && positions.includes(user.position!));
        }
        if (tribes.length > 0) {
            finalUsers = finalUsers.filter((user) =>
                Array.isArray(user.tribes) && user.tribes.some((tribe) => tribes.includes(tribe))
            );
        }
        if (lookingFor.length > 0) {
            finalUsers = finalUsers.filter((user) =>
                Array.isArray(user.looking_for) && user.looking_for.some((intent) => lookingFor.includes(intent))
            );
        }

        const slicedUsers = finalUsers.slice(0, visibleCount);
        const items: GridItem[] = [...slicedUsers];

        if (items.length > 8) {
            items.splice(8, 0, { type: 'ad' });
        }

        return {
            itemsWithAds: items,
            hasMore: finalUsers.length > visibleCount,
        };
    }, [users, onlineUsers, filters, agoraUserIds, favoriteIds, positions, tribes, lookingFor, visibleCount]);

    const isAgeFilterActive = filters.minAge !== 18 || filters.maxAge !== 99;
    const arePositionsFiltered = positions.length > 0;
    const areTribesFiltered = tribes.length > 0;
    const areIntentsFiltered = lookingFor.length > 0;
    const areAnyFiltersActive = isAgeFilterActive || arePositionsFiltered || areTribesFiltered || areIntentsFiltered;

    const FilterButton = ({ label, isActive }: { label: string; isActive: boolean }) => (
        <button
            onClick={() => setIsFilterModalOpen(true)}
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
                <div className="px-4 py-3 flex items-center space-x-2 overflow-x-auto sticky top-0 z-20 bg-dark-900/80 backdrop-blur-xl border-b border-white/5 mask-image-b pl-16 no-scrollbar">
                    <button
                        onClick={toggleOnlineOnly}
                        className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all duration-300 shadow-lg backdrop-blur-md ${
                            filters.onlineOnly
                                ? 'bg-tertiary-500/20 text-tertiary-400 border border-tertiary-500/50 shadow-[0_0_15px_rgba(39,174,96,0.15)]'
                                : 'bg-dark-800/60 text-slate-300 border border-white/10 hover:bg-dark-700/80'
                        }`}
                    >
                        <div className={`w-2 h-2 rounded-full ${filters.onlineOnly ? 'bg-tertiary-400 animate-pulse' : 'bg-slate-400'}`} />
                        {t('grid.online', { defaultValue: 'Online' })}
                    </button>

                    <FilterButton
                        label={t('common.filters', { defaultValue: 'Filtros' })}
                        isActive={areAnyFiltersActive}
                    />

                    {isAgeFilterActive && (
                        <button
                            onClick={resetAge}
                            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-primary-900/30 border border-primary-500/30 rounded-full text-xs font-bold text-primary-200 whitespace-nowrap hover:bg-primary-900/50 transition-colors"
                        >
                            <span>{filters.minAge}-{filters.maxAge} {t('grid.years', { defaultValue: 'anos' })}</span>
                            <span className="material-symbols-rounded text-[14px]">close</span>
                        </button>
                    )}

                    {positions.map((position) => (
                        <button
                            key={position}
                            onClick={() => removePosition(position)}
                            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-secondary-900/30 border border-secondary-500/30 rounded-full text-xs font-bold text-secondary-200 whitespace-nowrap hover:bg-secondary-900/50 transition-colors"
                        >
                            <span>{t(`constants.positions.${position}`, { defaultValue: position })}</span>
                            <span className="material-symbols-rounded text-[14px]">close</span>
                        </button>
                    ))}

                    {tribes.map((tribe) => (
                        <button
                            key={tribe}
                            onClick={() => removeTribe(tribe)}
                            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-dark-800 border border-white/10 rounded-full text-xs font-bold text-slate-300 whitespace-nowrap hover:bg-dark-700 transition-colors"
                        >
                            <span>{t(`constants.tribes.${tribe}`, { defaultValue: tribe })}</span>
                            <span className="material-symbols-rounded text-[14px]">close</span>
                        </button>
                    ))}

                    {lookingFor.map((intent) => (
                        <button
                            key={intent}
                            onClick={() => removeLookingFor(intent)}
                            className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 bg-emerald-900/30 border border-emerald-500/30 rounded-full text-xs font-bold text-emerald-200 whitespace-nowrap hover:bg-emerald-900/50 transition-colors"
                        >
                            <span>{t(`constants.looking_for.${intent}`, { defaultValue: intent })}</span>
                            <span className="material-symbols-rounded text-[14px]">close</span>
                        </button>
                    ))}
                </div>

                {itemsWithAds.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8 animate-fade-in">
                        <div className="w-24 h-24 bg-slate-800/50 rounded-full flex items-center justify-center mb-6 border border-white/5">
                            <span className="material-symbols-rounded text-5xl text-slate-600">search_off</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-200 tracking-tight">
                            {t('grid.no_one_here', { defaultValue: 'Ninguém por aqui' })}
                        </h2>
                        <p className="mt-3 text-slate-400 max-w-xs mx-auto leading-relaxed">
                            {t('grid.adjust_filters', { defaultValue: 'Tente ajustar seus filtros ou expanda a busca para encontrar alguém.' })}
                        </p>
                    </div>
                ) : (
                    <UserCardsGrid
                        items={itemsWithAds}
                        agoraUserIds={agoraUserIds}
                        onlineUsers={onlineUsers}
                        onUserClick={handleUserClick}
                        onLoadMore={() => setVisibleCount((current) => current + ITEMS_PER_PAGE)}
                        hasMore={hasMore}
                    />
                )}
            </div>

            {isFilterModalOpen && <FilterModal onClose={() => setIsFilterModalOpen(false)} />}
        </>
    );
};
