import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Map as LegacyMap } from './MapLegacy';
import { PublicMap } from './PublicMap';
import { FilterModal } from './FilterModal';
import { EventDetailModal } from './EventDetailModal';
import { useMapStore } from '../stores/mapStore';
import { useAgoraStore } from '../stores/agoraStore';
import { useAuthStore } from '../stores/authStore';
import { useUiStore } from '../stores/uiStore';
import { useEventStore } from '../stores/eventStore';
import type { Venue } from '../types';
import './map-v2.css';

type MapMode = 'people' | 'venues' | 'events' | 'agora';

const ACTIVE_FILTER_COUNT = (filters: ReturnType<typeof useMapStore.getState>['filters']) =>
  Number(filters.onlineOnly) +
  Number(filters.favoritesOnly) +
  Number((filters.minAge ?? 18) > 18 || (filters.maxAge ?? 99) < 99) +
  Number(filters.positions.length > 0) +
  Number(filters.tribes.length > 0) +
  Number(filters.lookingFor.length > 0);

const BH_CENTER = { lat: -19.9191, lng: -43.9386 };

const formatEventDate = (value: string) => new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
}).format(new Date(value));

export const MapV2: React.FC = () => {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [mode, setMode] = useState<MapMode>('people');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const users = useMapStore((state) => state.users);
  const venues = useMapStore((state) => state.venues);
  const filters = useMapStore((state) => state.filters);
  const myLocation = useMapStore((state) => state.myLocation);
  const loading = useMapStore((state) => state.loading);
  const error = useMapStore((state) => state.error);
  const requestLocationPermission = useMapStore((state) => state.requestLocationPermission);
  const agoraUserIds = useAgoraStore((state) => state.agoraUserIds);
  const profile = useAuthStore((state) => state.profile);
  const activeView = useUiStore((state) => state.activeView);
  const events = useEventStore((state) => state.events);
  const selectedEvent = useEventStore((state) => state.selectedEvent);
  const eventsLoading = useEventStore((state) => state.loading);
  const fetchEvents = useEventStore((state) => state.fetchEvents);
  const setSelectedEvent = useEventStore((state) => state.setSelectedEvent);

  const visibleCount = mode === 'people' ? users.length : mode === 'venues' ? venues.length : mode === 'events' ? events.length : agoraUserIds.length;
  const activeFilters = useMemo(() => ACTIVE_FILTER_COUNT(filters), [filters]);
  const eventVenues = useMemo(() => events.filter((event) => event.lat != null && event.lng != null).map((event): Venue => ({
    id: event.id,
    name: event.title,
    type: 'event',
    description: event.description || '',
    address: event.location_name || event.venue_name || 'Belo Horizonte',
    lat: event.lat as number,
    lng: event.lng as number,
    image_url: event.cover_image_url || '',
    opening_hours: event.start_time,
    is_partner: false,
    is_verified: true,
    tags: event.tags,
    source_type: 'admin',
    website: event.source_url || undefined,
  })), [events]);

  const syncMarkerVisibility = () => {
    const root = rootRef.current;
    if (!root) return;

    root.querySelectorAll<HTMLElement>('.pg-map-legacy .leaflet-marker-icon').forEach((marker) => {
      const html = marker.innerHTML;
      const text = marker.textContent || '';
      const isSelf = html.includes('w-14 h-14');
      const hasAvatar = !!marker.querySelector('img');
      const isVenue = /hot_tub|local_bar|nightlife|visibility|place/.test(text) && !hasAvatar;
      const isAgora = html.includes('border-primary-500') || text.includes('local_fire_department');
      const isCluster = !hasAvatar && !isVenue;

      let visible = true;
      if (!isSelf) {
        if (mode === 'people') visible = hasAvatar || isCluster;
        if (mode === 'venues') visible = isVenue;
        if (mode === 'agora') visible = isAgora && (hasAvatar || isCluster);
        if (mode === 'events') visible = false;
      }
      marker.style.display = visible ? '' : 'none';
    });
  };

  useEffect(() => {
    syncMarkerVisibility();
    const root = rootRef.current;
    if (!root) return;
    const observer = new MutationObserver(() => syncMarkerVisibility());
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [mode]);

  useEffect(() => {
    const timeout = window.setTimeout(syncMarkerVisibility, 0);
    return () => window.clearTimeout(timeout);
  }, [users, venues, agoraUserIds, filters, mode]);

  useEffect(() => {
    if (activeView === 'map') void fetchEvents(myLocation);
    else {
      setMoreOpen(false);
      setFiltersOpen(false);
      setSelectedEvent(null);
    }
  }, [activeView, myLocation?.lat, myLocation?.lng]);

  const triggerLegacyAction = (index: number) => {
    const root = rootRef.current;
    const group = root?.querySelector<HTMLElement>('.pg-map-legacy > div > div[class*="top-24"][class*="right-4"][class*="flex-col"]');
    const buttons = group?.querySelectorAll<HTMLButtonElement>('button');
    buttons?.[index]?.click();
  };

  if (activeView !== 'map') {
    return <div ref={rootRef} className="pg-map-v2 h-full w-full"><div className="pg-map-legacy absolute inset-0"><LegacyMap /></div></div>;
  }

  return (
    <div ref={rootRef} className={`pg-map-v2 pg-map-mode-${mode} relative h-full w-full overflow-hidden`}>
      <div className={`pg-map-legacy absolute inset-0 ${mode === 'events' ? 'invisible' : ''}`}><LegacyMap /></div>
      {mode === 'events' && <div className="absolute inset-0 z-[2]"><PublicMap venues={eventVenues} center={myLocation || BH_CENTER} fullHeight hideChrome onVenueClick={(venue) => { if (!venue) return; const event = events.find((item) => item.id === venue.id); if (event) setSelectedEvent(event); }} /></div>}

      <div className="pointer-events-none absolute left-3 right-3 z-[45] sm:left-1/2 sm:right-auto sm:w-[min(680px,calc(100%-32px))] sm:-translate-x-1/2" style={{ top: '96px' }}>
        <div className="pg-glass pointer-events-auto flex items-center gap-1 rounded-[24px] p-1.5 shadow-[0_18px_55px_rgba(0,0,0,.4)]">
          {([
            ['people', 'group', 'Pessoas'],
            ['venues', 'place', 'Locais'],
            ['events', 'local_activity', 'Eventos'],
            ['agora', 'local_fire_department', 'Agora'],
          ] as const).map(([value, icon, label]) => (
            <button key={value} type="button" onClick={() => setMode(value)} className={`flex min-h-10 flex-1 items-center justify-center gap-1 rounded-[18px] px-1.5 text-[11px] font-extrabold transition sm:text-xs ${mode === value ? 'bg-white/[0.09] text-white shadow-sm' : 'text-white/42 hover:text-white/70'}`} aria-pressed={mode === value}>
              <span className={`material-symbols-rounded text-[17px] ${value === 'agora' && mode === value ? 'filled text-primary-300' : value === 'events' && mode === value ? 'filled text-[var(--pg-primary)]' : ''}`}>{icon}</span>
              <span className="hidden min-[360px]:inline">{label}</span>
              {mode === value && <span className="ml-0.5 rounded-full bg-white/[0.08] px-1.5 py-0.5 text-[9px] text-white/55">{visibleCount}</span>}
            </button>
          ))}
          {mode !== 'events' && <button type="button" onClick={() => setFiltersOpen(true)} className="pg-icon-btn relative !h-10 !w-10 shrink-0" aria-label="Filtros"><span className="material-symbols-rounded text-lg">tune</span>{activeFilters > 0 && <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary-500 px-1 text-[9px] font-black text-white">{activeFilters}</span>}</button>}
        </div>
      </div>

      {mode === 'events' && events.length > 0 && (
        <div className="pointer-events-none absolute inset-x-0 bottom-[88px] z-[44]">
          <div className="pointer-events-auto flex snap-x snap-mandatory gap-2 overflow-x-auto px-3 pb-3 pt-4 no-scrollbar sm:px-5">
            {events.map((event) => {
              const hasPin = event.lat != null && event.lng != null;
              const isLive = Date.now() >= new Date(event.start_time).getTime() && Date.now() <= new Date(event.end_time || new Date(new Date(event.start_time).getTime() + 6 * 3600000).toISOString()).getTime();
              return (
                <button key={event.id} type="button" onClick={() => setSelectedEvent(event)} className="pg-glass min-w-[270px] max-w-[300px] snap-start rounded-[24px] p-3 text-left shadow-[0_18px_55px_rgba(0,0,0,.46)] transition hover:border-[rgba(245,12,105,.2)] sm:min-w-[310px]">
                  <div className="flex items-start gap-3">
                    <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-[16px] ${isLive ? 'bg-[rgba(34,197,94,.12)] text-[var(--pg-online)]' : 'bg-[rgba(245,12,105,.12)] text-[var(--pg-primary)]'}`}>
                      <span className="text-[9px] font-black uppercase">{new Date(event.start_time).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                      <strong className="text-lg leading-none">{new Date(event.start_time).getDate()}</strong>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-1.5">
                        {isLive && <span className="rounded-full bg-emerald-400/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-emerald-300">Agora</span>}
                        <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${hasPin ? 'bg-white/[0.05] text-white/42' : 'bg-amber-400/[0.08] text-amber-200/55'}`}>{hasPin ? 'No mapa' : 'Local confirmado'}</span>
                      </div>
                      <h3 className="truncate text-sm font-black text-white/82">{event.title}</h3>
                      <p className="mt-1 truncate text-[11px] text-white/38">{event.location_name || event.venue_name || 'Belo Horizonte'}</p>
                      <p className="mt-1 text-[10px] font-semibold text-white/28">{formatEventDate(event.start_time)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-4 border-t border-white/[0.055] pt-2.5 text-[10px] font-bold text-white/34">
                    <span><b className="text-white/58">{event.interested_count}</b> interesses</span>
                    <span><b className="text-white/58">{event.going_count}</b> vão</span>
                    <span className="ml-auto text-[var(--pg-online)]"><b>{event.here_now_count}</b> aqui</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {profile?.is_traveling && mode !== 'events' && <button type="button" onClick={() => triggerLegacyAction(2)} className="pg-glass absolute left-1/2 z-[44] flex -translate-x-1/2 items-center gap-2 rounded-full px-3 py-2 text-xs font-bold text-white shadow-lg" style={{ top: '154px' }}><span className="material-symbols-rounded filled text-[16px] text-sky-300">flight</span><span>Modo Viajante ativo</span><span className="text-white/35">·</span><span className="text-primary-300">Alterar</span></button>}

      {mode !== 'events' && <div className="pointer-events-none absolute bottom-[104px] right-3 z-[45] flex flex-col items-end gap-2 sm:right-5">
        {moreOpen && <div className="pg-glass pointer-events-auto mb-1 w-52 overflow-hidden rounded-[24px] p-1.5 shadow-[0_22px_65px_rgba(0,0,0,.5)]"><button type="button" onClick={() => { triggerLegacyAction(1); setMoreOpen(false); }} className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-bold text-white/75 hover:bg-white/[0.05]"><span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-500/10 text-primary-300"><span className="material-symbols-rounded">add_location_alt</span></span><span><strong className="block text-sm text-white">Adicionar local</strong><span className="mt-0.5 block text-[11px] font-medium text-white/35">Ajude a comunidade</span></span></button><button type="button" onClick={() => { triggerLegacyAction(2); setMoreOpen(false); }} className="flex w-full items-center gap-3 rounded-[18px] px-3 py-3 text-left text-sm font-bold text-white/75 hover:bg-white/[0.05]"><span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-300"><span className="material-symbols-rounded">flight_takeoff</span></span><span><strong className="block text-sm text-white">Modo Viajante</strong><span className="mt-0.5 block text-[11px] font-medium text-white/35">{profile?.subscription_tier === 'plus' ? 'Explorar outra cidade' : 'Recurso Plus'}</span></span></button></div>}
        <button type="button" onClick={() => triggerLegacyAction(0)} className="pg-icon-btn pointer-events-auto !h-12 !w-12 !bg-[rgba(11,11,15,.9)] shadow-xl" aria-label="Centralizar no meu local"><span className="material-symbols-rounded filled">my_location</span></button>
        <button type="button" onClick={() => setMoreOpen((value) => !value)} className={`pg-icon-btn pointer-events-auto !h-12 !w-12 !bg-[rgba(11,11,15,.9)] shadow-xl ${moreOpen ? '!bg-white/10 !text-white' : ''}`} aria-label="Mais ações"><span className="material-symbols-rounded">{moreOpen ? 'close' : 'more_horiz'}</span></button>
      </div>}

      {mode === 'venues' && !loading && !error && venues.length === 0 && <button type="button" onClick={() => triggerLegacyAction(1)} className="pg-glass absolute left-3 right-3 z-[44] rounded-[24px] p-4 text-left shadow-2xl sm:left-5 sm:right-auto sm:w-[360px]" style={{ top: '158px' }}><div className="flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-500/12 text-primary-300"><span className="material-symbols-rounded">flag</span></span><span><strong className="block text-sm text-white">Ainda não temos locais aqui</strong><span className="mt-1 block text-xs leading-relaxed text-white/42">Conhece um ponto LGBTQ+? Adicione para ajudar quem está por perto.</span></span></div></button>}

      {mode === 'events' && !eventsLoading && events.length === 0 && <div className="pg-glass absolute left-3 right-3 z-[44] rounded-[24px] p-4 sm:left-5 sm:right-auto sm:w-[360px]" style={{ top: '158px' }}><div className="flex gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[rgba(245,12,105,.12)] text-[var(--pg-primary)]"><span className="material-symbols-rounded">event_busy</span></span><div><strong className="block text-sm text-white">Sem eventos próximos nesta região</strong><span className="mt-1 block text-xs leading-relaxed text-white/42">Quando houver programação verificada, ela aparece aqui.</span></div></div></div>}

      {!myLocation && !error && mode !== 'events' && <div className="pointer-events-none absolute inset-x-4 bottom-28 z-[44] flex justify-center"><div className="pg-glass rounded-full px-4 py-2 text-xs font-bold text-white/55">Encontrando sua região…</div></div>}
      {error && mode !== 'events' && <div className="absolute inset-x-4 bottom-28 z-[46] flex justify-center"><button type="button" onClick={() => requestLocationPermission()} className="pg-btn pg-btn-secondary !rounded-full !border-red-500/20 !bg-red-500/10 !text-red-200"><span className="material-symbols-rounded">refresh</span>Tentar localização novamente</button></div>}

      {filtersOpen && <FilterModal onClose={() => setFiltersOpen(false)} />}
      {selectedEvent && <EventDetailModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
};
