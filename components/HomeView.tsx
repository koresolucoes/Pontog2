import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useHomeStore } from '../stores/homeStore';
import { useMapStore } from '../stores/mapStore';
import { useAgoraStore } from '../stores/agoraStore';
import { useAdStore } from '../stores/adStore';
import { useUserActionsStore } from '../stores/userActionsStore';
import { useUiStore } from '../stores/uiStore';
import { User, Ad } from '../types';
import { AdBanner } from './AdBanner';
import { AdDetailModal } from './AdDetailModal';

const SkeletonCard = () => (
  <div className="relative aspect-[3/4] overflow-hidden rounded-[24px] border border-white/[0.06] bg-white/[0.035]">
    <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-white/[0.06] to-transparent" />
  </div>
);

type QuickFilter = 'all' | 'online' | 'agora' | 'host' | 'favorites';

interface ProfileCardProps {
  user: User;
  isOnline: boolean;
  isAgora: boolean;
  isFavorite: boolean;
  onOpen: () => void;
  lastRef?: (node: HTMLButtonElement | null) => void;
}

const ProfileCard: React.FC<ProfileCardProps> = ({ user, isOnline, isAgora, isFavorite, onOpen, lastRef }) => (
  <motion.button
    ref={lastRef}
    type="button"
    onClick={onOpen}
    whileTap={{ scale: 0.975 }}
    className="group relative aspect-[3/4] overflow-hidden rounded-[24px] border border-white/[0.07] bg-[#111116] text-left shadow-[0_15px_45px_rgba(0,0,0,.22)]"
  >
    <img
      src={user.avatar_url}
      alt={user.display_name || user.username}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.025]"
    />
    <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/90" />

    <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
      {isAgora && (
        <span className="inline-flex h-8 items-center gap-1 rounded-full border border-primary-500/25 bg-primary-500/18 px-2.5 text-[10px] font-black tracking-wide text-white backdrop-blur-xl">
          <span className="material-symbols-rounded filled !text-[14px] text-primary-400">local_fire_department</span>AGORA
        </span>
      )}
      {!isAgora && isOnline && (
        <span className="inline-flex h-8 items-center gap-1.5 rounded-full border border-tertiary-500/20 bg-black/35 px-2.5 text-[10px] font-black tracking-wide text-white/85 backdrop-blur-xl">
          <span className="h-1.5 w-1.5 rounded-full bg-tertiary-500" />ONLINE
        </span>
      )}
    </div>

    {isFavorite && (
      <span className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/35 text-primary-400 backdrop-blur-xl">
        <span className="material-symbols-rounded filled !text-[17px]">favorite</span>
      </span>
    )}

    <div className="absolute inset-x-0 bottom-0 p-3.5 sm:p-4">
      <div className="flex items-center gap-1.5">
        <h3 className="min-w-0 truncate font-bricolage text-[19px] font-black tracking-[-0.03em] text-white">
          {user.display_name || user.username}{user.age ? `, ${user.age}` : ''}
        </h3>
        {user.is_verified && <span className="material-symbols-rounded filled !text-[18px] text-primary-400">verified</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold text-white/55">
        {user.distance_km != null && <span>{user.distance_km < 1 ? 'Perto de você' : `~${Math.round(user.distance_km)} km`}</span>}
        {user.distance_km != null && user.can_host && <span className="text-white/25">•</span>}
        {user.can_host && <span className="inline-flex items-center gap-1 text-white/68"><span className="material-symbols-rounded !text-[13px]">home</span>Tem local</span>}
      </div>
    </div>
  </motion.button>
);

const SponsoredCard: React.FC<{ ad: Ad; onOpen: () => void }> = ({ ad, onOpen }) => {
  const trackView = useAdStore((state) => state.trackView);
  useEffect(() => { if (ad.id) trackView(ad.id); }, [ad.id]);

  return (
    <button type="button" onClick={onOpen} className="relative col-span-2 overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.035] text-left md:col-span-3 lg:col-span-4">
      <div className="grid min-h-[128px] grid-cols-[116px_1fr] sm:grid-cols-[160px_1fr]">
        <img src={ad.image_url} alt={ad.title} className="h-full w-full object-cover" />
        <div className="flex min-w-0 flex-col justify-center p-4 sm:p-5">
          <p className="pg-eyebrow">Patrocinado</p>
          <h3 className="mt-1.5 truncate font-bricolage text-lg font-black text-white">{ad.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-white/45">{ad.description}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-xs font-black text-primary-300">{ad.cta_text}<span className="material-symbols-rounded !text-[15px]">arrow_forward</span></span>
        </div>
      </div>
    </button>
  );
};

export const HomeView: React.FC = () => {
  const { popularUsers, loading, error, hasMore, loadingMore, fetchPopularUsers, fetchMorePopularUsers } = useHomeStore();
  const { onlineUsers, setSelectedUser, myLocation, venues, setSelectedVenue } = useMapStore();
  const { agoraUserIds } = useAgoraStore();
  const { favoriteIds } = useUserActionsStore();
  const { feedAds, bannerAds } = useAdStore();
  const setActiveView = useUiStore((state) => state.setActiveView);

  const [quickFilter, setQuickFilter] = useState<QuickFilter>('all');
  const [selectedAd, setSelectedAd] = useState<Ad | null>(null);
  const initialFetchDone = useRef(false);
  const observer = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (myLocation && !initialFetchDone.current) {
      fetchPopularUsers();
      initialFetchDone.current = true;
    }
  }, [myLocation, fetchPopularUsers]);

  const filteredUsers = useMemo(() => {
    const result = popularUsers.filter((user) => {
      if (quickFilter === 'online') return onlineUsers.includes(user.id);
      if (quickFilter === 'agora') return agoraUserIds.includes(user.id);
      if (quickFilter === 'host') return !!user.can_host;
      if (quickFilter === 'favorites') return favoriteIds.includes(user.id);
      return true;
    });

    return [...result].sort((a, b) => {
      const agoraDelta = Number(agoraUserIds.includes(b.id)) - Number(agoraUserIds.includes(a.id));
      if (agoraDelta) return agoraDelta;
      return Number(onlineUsers.includes(b.id)) - Number(onlineUsers.includes(a.id));
    });
  }, [popularUsers, quickFilter, onlineUsers, agoraUserIds, favoriteIds]);

  const lastUserElementRef = useCallback((node: HTMLButtonElement | null) => {
    if (loadingMore) return;
    observer.current?.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0]?.isIntersecting && hasMore) fetchMorePopularUsers();
    }, { rootMargin: '300px' });
    if (node) observer.current.observe(node);
  }, [loadingMore, hasMore, fetchMorePopularUsers]);

  const filterOptions: Array<{ key: QuickFilter; label: string; icon?: string }> = [
    { key: 'all', label: 'Todos' },
    { key: 'online', label: 'Online', icon: 'circle' },
    { key: 'agora', label: 'Agora', icon: 'local_fire_department' },
    { key: 'host', label: 'Com local', icon: 'home' },
    { key: 'favorites', label: 'Favoritos', icon: 'favorite' },
  ];

  return (
    <div className="pg-page h-full overflow-y-auto pb-28 no-scrollbar">
      <div className="mx-auto w-full max-w-6xl px-3 pb-8 pt-2 sm:px-5 lg:px-7">
        <section className="px-1 pb-4 pt-1">
          <p className="pg-eyebrow">Perto de você</p>
          <div className="mt-1 flex items-end justify-between gap-4">
            <div>
              <h1 className="pg-title text-[32px] text-white sm:text-[38px]">Descobrir</h1>
              <p className="mt-1.5 text-sm font-medium text-white/45">Pessoas disponíveis, lugares vivos e o que está acontecendo agora.</p>
            </div>
            <button onClick={() => setActiveView('map')} className="pg-icon-btn hidden sm:inline-flex" aria-label="Abrir mapa"><span className="material-symbols-rounded">map</span></button>
          </div>
        </section>

        <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-4 pb-5 sm:-mx-5 sm:px-6">
          {filterOptions.map((option) => (
            <button key={option.key} type="button" onClick={() => setQuickFilter(option.key)} className={`pg-chip ${quickFilter === option.key ? 'pg-chip-active' : ''}`}>
              {option.icon && <span className={`material-symbols-rounded !text-[15px] ${option.key === 'agora' || option.key === 'favorites' ? 'filled' : ''}`}>{option.icon}</span>}
              {option.label}
            </button>
          ))}
        </div>

        {bannerAds[0] && (
          <div className="mb-6 overflow-hidden rounded-[24px] border border-white/[0.07] bg-white/[0.03]">
            <AdBanner ad={bannerAds[0]} />
          </div>
        )}

        {venues.length > 0 && (
          <section className="mb-7">
            <div className="mb-3 flex items-center justify-between px-1">
              <div><p className="pg-eyebrow">Acontecendo por perto</p><h2 className="mt-1 font-bricolage text-xl font-black tracking-[-0.025em] text-white">Locais</h2></div>
              <button onClick={() => setActiveView('map')} className="text-xs font-black text-primary-300">Ver no mapa</button>
            </div>
            <div className="no-scrollbar -mx-3 flex gap-3 overflow-x-auto px-3 sm:-mx-5 sm:px-5">
              {venues.slice(0, 8).map((venue) => (
                <button key={venue.id} onClick={() => setSelectedVenue(venue)} className="relative h-[176px] w-[148px] shrink-0 overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#111116] text-left sm:w-[172px]">
                  <img src={venue.image_url || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=500&q=75'} alt={venue.name} loading="lazy" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  {venue.is_partner && <span className="absolute left-2.5 top-2.5 rounded-full border border-amber-300/20 bg-black/40 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-amber-300 backdrop-blur">Parceiro</span>}
                  <div className="absolute inset-x-0 bottom-0 p-3"><p className="truncate text-sm font-black text-white">{venue.name}</p><p className="mt-0.5 truncate text-[10px] font-semibold text-white/45">{venue.type || 'Local LGBTQ+'}</p></div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between px-1">
            <div><p className="pg-eyebrow">Conexões</p><h2 className="mt-1 font-bricolage text-xl font-black tracking-[-0.025em] text-white">{quickFilter === 'all' ? 'Quem está por aqui' : filterOptions.find((option) => option.key === quickFilter)?.label}</h2></div>
            <span className="text-xs font-bold text-white/30">{filteredUsers.length}</span>
          </div>

          {error ? (
            <div className="pg-surface flex min-h-[220px] flex-col items-center justify-center px-6 text-center">
              <span className="material-symbols-rounded text-3xl text-red-300">wifi_off</span>
              <h3 className="mt-3 font-bricolage text-lg font-black text-white">Não conseguimos carregar agora</h3>
              <p className="mt-1 max-w-sm text-sm text-white/45">{error}</p>
              <button onClick={() => fetchPopularUsers()} className="pg-btn pg-btn-secondary mt-4">Tentar novamente</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
              {loading && popularUsers.length === 0 ? Array.from({ length: 8 }).map((_, index) => <SkeletonCard key={index} />) : filteredUsers.map((user, index) => (
                <React.Fragment key={user.id}>
                  <ProfileCard
                    user={user}
                    isOnline={onlineUsers.includes(user.id)}
                    isAgora={agoraUserIds.includes(user.id)}
                    isFavorite={favoriteIds.includes(user.id)}
                    onOpen={() => setSelectedUser(user)}
                    lastRef={index === filteredUsers.length - 1 ? lastUserElementRef : undefined}
                  />
                  {index === 5 && feedAds[0] && <SponsoredCard ad={feedAds[0]} onOpen={() => setSelectedAd(feedAds[0])} />}
                </React.Fragment>
              ))}
            </div>
          )}

          {!loading && !error && filteredUsers.length === 0 && (
            <div className="pg-surface flex min-h-[240px] flex-col items-center justify-center px-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-white/[0.05] text-white/45"><span className="material-symbols-rounded text-3xl">person_search</span></div>
              <h3 className="mt-4 font-bricolage text-lg font-black text-white">Nada por aqui ainda</h3>
              <p className="mt-1 max-w-xs text-sm leading-relaxed text-white/45">Tente outro filtro ou abra o mapa para explorar uma área maior.</p>
              <button onClick={() => setQuickFilter('all')} className="pg-btn pg-btn-secondary mt-4">Limpar filtro</button>
            </div>
          )}

          {loadingMore && <div className="flex justify-center py-7"><span className="h-6 w-6 animate-spin rounded-full border-2 border-white/15 border-t-primary-500" /></div>}
        </section>
      </div>

      {selectedAd && <AdDetailModal ad={selectedAd} onClose={() => setSelectedAd(null)} />}
    </div>
  );
};
