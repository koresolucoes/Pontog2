
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useMapStore } from '../stores/mapStore';
import { useAuthStore } from '../stores/authStore';
import { useAgoraStore } from '../stores/agoraStore';
import { useUiStore } from '../stores/uiStore';
import { useUserActionsStore } from '../stores/userActionsStore';
import { useAdStore } from '../stores/adStore';
import * as L from 'leaflet';
import { User, Venue } from '../types';
import { TravelModeModal } from './TravelModeModal';
import { SuggestVenueModal } from './SuggestVenueModal';
import { useTranslation } from 'react-i18next';

// Helper para ícone do Venue
const createVenueIcon = (type: string, isPartner: boolean, isGolden: boolean = false) => {
    let iconName = 'place';
    let colorClass = 'bg-secondary-600';
    let ringClass = isPartner ? 'ring-4 ring-yellow-400/50' : 'ring-2 ring-white';

    switch(type) {
        case 'sauna': iconName = 'hot_tub'; colorClass = 'bg-orange-600'; break;
        case 'bar': iconName = 'local_bar'; colorClass = 'bg-primary-600'; break;
        case 'club': iconName = 'nightlife'; colorClass = 'bg-indigo-600'; break;
        case 'cruising': iconName = 'visibility'; colorClass = 'bg-slate-800'; break;
    }

    if (isGolden) {
        colorClass = 'bg-gradient-to-tr from-yellow-400 to-amber-600';
        ringClass = 'ring-4 ring-yellow-400 shadow-[0_0_15px_rgba(251,191,36,0.8)] animate-pulse';
    }

    const html = `
        <div class="relative w-10 h-10 transition-transform hover:scale-110">
            <div class="absolute -inset-2 ${isGolden ? 'bg-amber-400' : colorClass} opacity-30 rounded-full blur-sm ${isPartner || isGolden ? 'animate-pulse' : ''}"></div>
            <div class="relative w-full h-full rounded-full ${colorClass} flex items-center justify-center shadow-lg ${ringClass} z-10">
                <span class="material-symbols-rounded text-white text-xl">${iconName}</span>
            </div>
            ${isPartner && !isGolden ? '<div class="absolute -top-1 -right-1 bg-yellow-400 text-black text-[8px] font-bold px-1 rounded-full border border-white z-20">★</div>' : ''}
            ${isGolden ? '<div class="absolute -top-2 -right-2 bg-gradient-to-tr from-yellow-400 to-amber-600 text-white text-[10px] font-bold px-1.5 rounded-full border border-white z-20 shadow-lg">PRO</div>' : ''}
        </div>
    `;

    return L.divIcon({
        html: html,
        className: 'bg-transparent',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -24]
    });
};

// Ícone para Clusters (Grupos de usuários)
const createClusterIcon = (count: number, hasAgora: boolean) => {
    const size = count > 100 ? 60 : count > 10 ? 50 : 40;
    const bgClass = hasAgora 
        ? 'bg-gradient-to-tr from-orange-500 to-red-600' 
        : 'bg-gradient-to-tr from-primary-500 to-secondary-500';
    
    const html = `
        <div class="relative w-full h-full flex items-center justify-center transition-transform hover:scale-110">
            <div class="absolute -inset-3 ${bgClass} opacity-40 rounded-full blur-md animate-pulse"></div>
            <div class="relative w-full h-full rounded-full ${bgClass} border-2 border-white shadow-2xl flex items-center justify-center z-10">
                <span class="text-white font-black font-outfit" style="font-size: ${size/2.5}px;">${count}</span>
            </div>
            ${hasAgora ? `
            <div class="absolute -top-2 -right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center border-2 border-white z-20 shadow-sm">
                <span class="material-symbols-rounded filled text-white text-[14px]">local_fire_department</span>
            </div>` : ''}
        </div>
    `;

    return L.divIcon({
        html: html,
        className: 'bg-transparent',
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
};

// Função para gerar o HTML do marcador dinâmico
const createLiveMarker = (user: User, isOnline: boolean, isAgora: boolean) => {
    const isPlus = user.subscription_tier === 'plus';
    
    let ringHtml = '';
    let badgeHtml = '';
    let hosterBadgeHtml = '';
    let borderClass = 'border-2 border-white';
    let containerClass = '';

    if (isAgora) {
        borderClass = 'border-2 border-primary-500';
        containerClass = 'z-20';
        ringHtml = `
            <div class="absolute -inset-3 bg-primary-500/30 rounded-full blur-md animate-pulse"></div>
            <div class="absolute -inset-1 bg-gradient-to-tr from-primary-500 to-secondary-500 rounded-full opacity-70 animate-spin-slow"></div>
        `;
        badgeHtml = `
            <div class="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-primary-500 to-secondary-500 text-white rounded-full flex items-center justify-center shadow-lg border border-white scale-110 z-30">
                <span class="material-symbols-rounded filled animate-pulse" style="font-size: 14px;">local_fire_department</span>
            </div>
        `;
    } else if (isOnline) {
        borderClass = 'border-2 border-tertiary-400';
        ringHtml = `
            <div class="absolute -inset-1 bg-tertiary-500 rounded-full opacity-75 animate-ping"></div>
        `;
        badgeHtml = `
            <div class="absolute bottom-0 right-0 w-3.5 h-3.5 bg-tertiary-500 border-2 border-white rounded-full z-30"></div>
        `;
    } else if (isPlus) {
        borderClass = 'border-2 border-yellow-400';
        badgeHtml = `
            <div class="absolute -top-1 -right-1 w-5 h-5 bg-yellow-400 text-black rounded-full flex items-center justify-center shadow-sm border border-white z-30">
                <span class="material-symbols-rounded filled" style="font-size: 10px;">auto_awesome</span>
            </div>
        `;
    }
    
    if (user.can_host) {
         hosterBadgeHtml = `
            <div class="absolute -top-1.5 -left-1.5 w-6 h-6 bg-tertiary-600 text-white rounded-full flex items-center justify-center shadow-md border-2 border-white z-40" style="z-index: 40;">
                <span class="material-symbols-rounded filled" style="font-size: 14px;">home</span>
            </div>
        `;
    }

    const html = `
        <div class="relative w-12 h-12 transition-transform duration-300 hover:scale-110 ${containerClass}">
            ${ringHtml}
            <div class="relative w-full h-full rounded-full overflow-hidden ${borderClass} shadow-lg bg-dark-800">
                <img loading="lazy" src="${user.avatar_url}" class="w-full h-full object-cover" alt="${user.username}" />
            </div>
            ${badgeHtml}
            ${hosterBadgeHtml}
        </div>
    `;

    return L.divIcon({
        html: html,
        className: 'bg-transparent',
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -28]
    });
};

const MyLocationMarkerIcon = (avatarUrl: string, canHost: boolean, isTraveling: boolean, t: any) => {
    let hosterBadgeHtml = '';
    if (canHost) {
         hosterBadgeHtml = `
            <div class="absolute -top-2 -left-2 w-7 h-7 bg-tertiary-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white z-50" style="z-index: 50;">
                <span class="material-symbols-rounded filled" style="font-size: 16px;">home</span>
            </div>
        `;
    }
    
    let travelingBadgeHtml = '';
    if (isTraveling) {
        travelingBadgeHtml = `
            <div class="absolute -bottom-2 -right-2 w-7 h-7 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white z-50 animate-bounce" style="z-index: 50;">
                <span class="material-symbols-rounded filled" style="font-size: 16px;">flight</span>
            </div>
        `;
    }

    const html = `
        <div class="relative w-14 h-14">
            <div class="absolute -inset-4 bg-blue-500/20 rounded-full animate-pulse"></div>
            <div class="absolute -inset-1 bg-blue-500/40 rounded-full blur-sm"></div>
            <div class="relative w-full h-full rounded-full overflow-hidden border-4 border-blue-500 shadow-2xl bg-slate-900 z-10">
                <img loading="lazy" src="${avatarUrl}" class="w-full h-full object-cover" />
            </div>
            ${hosterBadgeHtml}
            ${travelingBadgeHtml}
            <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full border border-white shadow-md z-20 whitespace-nowrap">
                ${t('map.you', { defaultValue: 'VOCÊ' })}
            </div>
        </div>
    `;
    return L.divIcon({
        html: html,
        className: 'bg-transparent',
        iconSize: [56, 56],
        iconAnchor: [28, 28]
    });
};

// Let's create a consistent, seed-based coordinate displacement based on user's ID to preserve user privacy for free subscribers
const getConsistentFuzzOffset = (userId: string): { latOffset: number; lngOffset: number } => {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
        hash = userId.charCodeAt(i) + ((hash << 5) - hash);
    }
    const latSign = hash % 2 === 0 ? 1 : -1;
    // Offset range approx 150m to 450m (0.0015 to 0.0045 degrees)
    const latOffset = latSign * (0.0015 + (Math.abs(hash) % 30) / 10000); 
    
    const lngSign = (hash >> 2) % 2 === 0 ? 1 : -1;
    const lngOffset = lngSign * (0.0015 + (Math.abs(hash >> 3) % 30) / 10000);
    
    return { latOffset, lngOffset };
};

export const Map: React.FC = () => {
  const { 
      users, venues, myLocation, onlineUsers, loading, error, filters, 
      setSelectedUser, setSelectedVenue, requestLocationPermission, disableTravelMode 
  } = useMapStore();
  const { profile } = useAuthStore();
  const { agoraUserIds } = useAgoraStore();
  const { favoriteIds } = useUserActionsStore();
  const { activeView, setSubscriptionModalOpen, isSuggestVenueModalOpen, setSuggestVenueModalOpen } = useUiStore();
  const { activePinoDouradoVenueIds } = useAdStore();
  const { t } = useTranslation();
  
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map()); // Guarda ID -> Marker
  const clusterMarkersRef = useRef<L.Marker[]>([]); // Guarda Clusters
  const venueMarkersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
  const myLocationMarkerRef = useRef<L.Marker | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  
  const [isMapCreated, setIsMapCreated] = useState(false); 
  const [areTilesLoaded, setAreTilesLoaded] = useState(false);
  const [showTravelModal, setShowTravelModal] = useState(false);
  const isInitializingRef = useRef(false);

  // --- CLUSTERING LOGIC ---
  const updateMarkers = useCallback(() => {
      const map = mapInstanceRef.current;
      if (!map || !isMapCreated) return;

      const bounds = map.getBounds();

      // 1. Filter visible users
      const visibleUsers = users.filter(user => {
          if (!Number.isFinite(user.lat) || !Number.isFinite(user.lng)) return false;
          
          // CRITICAL: Filter by map bounds for high-scale performance
          if (!bounds.contains([user.lat!, user.lng!])) return false;
          
          if (filters.favoritesOnly && !favoriteIds.includes(user.id)) return false;
          if (filters.onlineOnly && !onlineUsers.includes(user.id)) return false;
          
          return true;
      });

      // Se o usuário não for assinante Plus, aplicamos uma desfocagem (fuzzing) determinística baseada no ID do outro usuário.
      // Isso protege as coordenadas exatas dos outros usuários no mapa para não-assinantes.
      const isPlusUser = profile?.subscription_tier === 'plus';
      const mapUsers = visibleUsers.map(user => {
          if (isPlusUser) return user;
          const { latOffset, lngOffset } = getConsistentFuzzOffset(user.id);
          return {
              ...user,
              lat: user.lat! + latOffset,
              lng: user.lng! + lngOffset
          };
      });

      // 2. Clear existing markers
      userMarkersRef.current.forEach(m => m.remove());
      userMarkersRef.current.clear();
      clusterMarkersRef.current.forEach(m => m.remove());
      clusterMarkersRef.current = [];

      const zoom = map.getZoom();
      
      // Configuração de Clusterização
      const CLUSTER_RADIUS_PX = 75; // Aumentado para 75px para evitar overlap excessivo e melhorar performance
      const shouldCluster = zoom < 18; // Clusteriza até o zoom 17

      if (!shouldCluster) {
          // Renderização Normal (Sem Cluster)
          mapUsers.forEach(user => {
              const isOnline = onlineUsers.includes(user.id);
              const isAgora = agoraUserIds.includes(user.id);
              
              const marker = L.marker([user.lat!, user.lng!], {
                  icon: createLiveMarker(user, isOnline, isAgora),
                  zIndexOffset: isAgora ? 800 : isOnline ? 500 : 100
              });
              marker.on('click', () => setSelectedUser(user));
              marker.addTo(map);
              userMarkersRef.current.set(user.id, marker);
          });
          return;
      }

      // Algoritmo de Clusterização Simples (Greedy)
      const clusters: { lat: number, lng: number, users: User[], hasAgora: boolean }[] = [];
      const processedUsers = new Set<string>();

      // Prioriza usuários "Agora" ou "Online" como sementes de cluster
      const sortedUsers = [...mapUsers].sort((a, b) => {
          const aScore = (agoraUserIds.includes(a.id) ? 2 : 0) + (onlineUsers.includes(a.id) ? 1 : 0);
          const bScore = (agoraUserIds.includes(b.id) ? 2 : 0) + (onlineUsers.includes(b.id) ? 1 : 0);
          return bScore - aScore;
      });

      sortedUsers.forEach(user => {
          if (processedUsers.has(user.id)) return;

          const userPoint = map.latLngToLayerPoint([user.lat!, user.lng!]);
          let addedToCluster = false;

          // Tenta adicionar a um cluster existente
          for (const cluster of clusters) {
              const clusterPoint = map.latLngToLayerPoint([cluster.lat, cluster.lng]);
              const distance = userPoint.distanceTo(clusterPoint);

              if (distance < CLUSTER_RADIUS_PX) {
                  cluster.users.push(user);
                  if (agoraUserIds.includes(user.id)) cluster.hasAgora = true;
                  processedUsers.add(user.id);
                  addedToCluster = true;
                  break;
              }
          }

          // Cria novo cluster se não couber em nenhum
          if (!addedToCluster) {
              clusters.push({
                  lat: user.lat!,
                  lng: user.lng!,
                  users: [user],
                  hasAgora: agoraUserIds.includes(user.id)
              });
              processedUsers.add(user.id);
          }
      });

      // Renderiza os Clusters e Marcadores Únicos
      clusters.forEach(cluster => {
          if (cluster.users.length === 1) {
              // Cluster de 1 pessoa = Marcador Normal
              const user = cluster.users[0];
              const isOnline = onlineUsers.includes(user.id);
              const isAgora = agoraUserIds.includes(user.id);
              
              const marker = L.marker([user.lat!, user.lng!], {
                  icon: createLiveMarker(user, isOnline, isAgora),
                  zIndexOffset: isAgora ? 800 : isOnline ? 500 : 100
              });
              marker.on('click', () => setSelectedUser(user));
              marker.addTo(map);
              userMarkersRef.current.set(user.id, marker);
          } else {
              // Marcador de Cluster
              const clusterMarker = L.marker([cluster.lat, cluster.lng], {
                  icon: createClusterIcon(cluster.users.length, cluster.hasAgora),
                  zIndexOffset: 1000
              });

              clusterMarker.on('click', () => {
                  // Ao clicar, zoom para caber todos os usuários do cluster
                  const bounds = L.latLngBounds(cluster.users.map(u => [u.lat!, u.lng!]));
                  map.fitBounds(bounds, { padding: [50, 50], maxZoom: 19, animate: true });
              });

              clusterMarker.addTo(map);
              clusterMarkersRef.current.push(clusterMarker);
          }
      });

  }, [users, onlineUsers, agoraUserIds, filters, favoriteIds, setSelectedUser, isMapCreated]);

  // FIX: UseRef para manter a referência da função updateMarkers atualizada dentro dos listeners do Leaflet
  // Isso resolve o problema de "Stale Closure" onde o mapa não atualizava ao mover/zoom
  const updateMarkersRef = useRef(updateMarkers);

  useEffect(() => {
      updateMarkersRef.current = updateMarkers;
  }, [updateMarkers]);


  useEffect(() => {
    return () => {
        if (resizeObserverRef.current) {
            resizeObserverRef.current.disconnect();
        }
        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
            userMarkersRef.current.clear();
            venueMarkersRef.current.clear();
            clusterMarkersRef.current = [];
            myLocationMarkerRef.current = null;
        }
        isInitializingRef.current = false;
    };
  }, []);

  useEffect(() => {
      if (activeView === 'map' && mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          setTimeout(() => {
              mapInstanceRef.current?.invalidateSize();
          }, 300);
      }
  }, [activeView]);

  useEffect(() => {
    if (!myLocation || !mapContainerRef.current) return;
    
    if (mapInstanceRef.current) {
        // Se o mapa já existe, apenas movemos a view se necessário,
        // mas não reinventamos a roda. Deixamos o 'updateMarkers' cuidar dos pinos.
        return;
    }

    if (isInitializingRef.current) return;
    isInitializingRef.current = true;

    const waitForDimensionsAndInit = () => {
        const element = mapContainerRef.current;
        if (!element) {
            isInitializingRef.current = false;
            return;
        }

        if (element.clientWidth === 0 || element.clientHeight === 0) {
            requestAnimationFrame(waitForDimensionsAndInit);
            return;
        }

        if (mapInstanceRef.current) {
            isInitializingRef.current = false;
            return;
        }

        try {
            const newMap = L.map(element, {
                zoomControl: false,
                attributionControl: false,
                zoomAnimation: true,
                fadeAnimation: true,
                markerZoomAnimation: true,
                preferCanvas: true // Importante para performance!
            }).setView(myLocation, 15);

            const tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
                subdomains: 'abcd',
                updateWhenIdle: true,
            });

            tileLayer.on('load', () => {
                setTimeout(() => {
                    setAreTilesLoaded(true);
                    newMap.invalidateSize();
                }, 300); 
            });

            tileLayer.addTo(newMap);

            // FIX: Use the Ref to call the latest version of updateMarkers
            // This ensures clustering logic works with current state (users array) on zoom/move
            newMap.on('zoomend', () => updateMarkersRef.current());
            newMap.on('moveend', () => updateMarkersRef.current());

            setTimeout(() => {
                setAreTilesLoaded(true);
                if (newMap) newMap.invalidateSize();
            }, 2000);

            mapInstanceRef.current = newMap;
            setIsMapCreated(true);

            // Força resize inicial
            const observer = new ResizeObserver(() => {
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.invalidateSize();
                }
            });
            observer.observe(element);
            resizeObserverRef.current = observer;

        } catch (err) {
            console.error("Erro ao inicializar mapa:", err);
        } finally {
            isInitializingRef.current = false;
        }
    };

    requestAnimationFrame(waitForDimensionsAndInit);

  }, [myLocation]); // Removed updateMarkers from dependency to prevent re-init, Ref handles updates

  // Atualiza posição e Ícone do "Você"
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (map && myLocation && profile) {
        const canHost = !!profile.can_host;
        const isTraveling = !!profile.is_traveling;

        if (!myLocationMarkerRef.current) {
            myLocationMarkerRef.current = L.marker(myLocation, { 
                icon: MyLocationMarkerIcon(profile.avatar_url, canHost, isTraveling, t), 
                zIndexOffset: 2000 // Acima de tudo
            }).addTo(map);
        } else {
            const oldLatLng = myLocationMarkerRef.current.getLatLng();
            if (oldLatLng.distanceTo(myLocation) > 2) {
                myLocationMarkerRef.current.setLatLng(myLocation);
                // Opcional: só pan se estiver longe da visão
                if (!map.getBounds().contains(myLocation)) {
                    map.panTo(myLocation);
                }
            }
            myLocationMarkerRef.current.setIcon(MyLocationMarkerIcon(profile.avatar_url, canHost, isTraveling, t));
            myLocationMarkerRef.current.setZIndexOffset(2000);
        }
    }
  }, [myLocation, profile, isMapCreated, t]);

  // Chama o updateMarkers sempre que os dados mudam
  useEffect(() => {
      updateMarkers();
  }, [users, onlineUsers, agoraUserIds, filters, favoriteIds, updateMarkers]);

  // Gerenciamento dos Marcadores de Locais (Venues) - Separado pois não clusteriza com users
  useEffect(() => {
      const map = mapInstanceRef.current;
      if (!map || !isMapCreated) return;

      const markers = venueMarkersRef.current;
      if (venues.length === 0) {
          markers.forEach(m => m.remove());
          markers.clear();
          return;
      }

      const venueIds = new Set(venues.map(v => v.id));
      markers.forEach((marker, id) => {
          if (!venueIds.has(id)) {
              marker.remove();
              markers.delete(id);
          }
      });

      venues.forEach(venue => {
          if (!Number.isFinite(venue.lat) || !Number.isFinite(venue.lng)) return;

          let marker = markers.get(venue.id);
          const isGolden = activePinoDouradoVenueIds.includes(venue.id);
          if (!marker) {
              marker = L.marker([venue.lat, venue.lng], {
                  icon: createVenueIcon(venue.type, venue.is_partner, isGolden),
                  zIndexOffset: isGolden ? 300 : 200 
              });
              
              const partnerLabel = t('map.partner', { defaultValue: '★ Parceiro' });
              const routeLabel = t('map.route', { defaultValue: 'Rota' });
              const viewMoreLabel = t('map.view_more', { defaultValue: 'Ver Mais' });

              // Popup customizado para o local
              const popupContent = document.createElement('div');
              popupContent.innerHTML = `
                <div class="w-64 overflow-hidden rounded-2xl bg-slate-900 shadow-2xl border border-white/10 font-outfit">
                    <div class="h-32 w-full relative">
                        <img loading="lazy" src="${venue.image_url || 'https://placehold.co/600x400/1f2937/ffffff?text=Local'}" class="w-full h-full object-cover" />
                        <div class="absolute top-2 left-2 bg-black/60 backdrop-blur-md px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase">${venue.type}</div>
                        ${venue.is_partner && !isGolden ? `<div class="absolute top-2 right-2 bg-yellow-400 text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-md">${partnerLabel}</div>` : ''}
                        ${isGolden ? `<div class="absolute top-2 right-2 bg-gradient-to-tr from-yellow-400 to-amber-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-md">PRO</div>` : ''}
                    </div>
                    <div class="p-4">
                        <h3 class="text-lg font-bold text-white leading-tight mb-1">${venue.name}</h3>
                        <p class="text-xs text-slate-400 mb-2 flex items-center gap-1">
                            <span class="material-symbols-rounded text-[12px]">location_on</span> ${venue.address}
                        </p>
                        <p class="text-sm text-slate-300 leading-snug mb-3 line-clamp-2">${venue.description}</p>
                        <div class="flex gap-2">
                            <a href="https://www.google.com/maps/search/?api=1&query=${venue.lat},${venue.lng}" target="_blank" class="flex-1 bg-dark-800 text-white text-xs font-bold py-2 rounded-lg text-center hover:bg-dark-700 transition-colors border border-white/10">${routeLabel}</a>
                            <button class="flex-1 bg-primary-500 text-white text-xs font-bold py-2 rounded-lg hover:bg-primary-600 transition-colors shadow-lg shadow-primary-900/20 btn-view-more">${viewMoreLabel}</button>
                        </div>
                    </div>
                </div>
              `;
              
              // Adicionar listener ao botão "Ver Mais"
              const btnViewMore = popupContent.querySelector('.btn-view-more');
              if (btnViewMore) {
                  btnViewMore.addEventListener('click', (e) => {
                      e.stopPropagation();
                      setSelectedVenue(venue);
                      map.closePopup();
                  });
              }
              
              marker.bindPopup(popupContent, {
                  className: 'custom-venue-popup',
                  closeButton: false,
                  maxWidth: 300,
                  minWidth: 250
              });

              marker.addTo(map);
              markers.set(venue.id, marker);
          } else {
              // Update existing icon and zIndex if status changes
              marker.setIcon(createVenueIcon(venue.type, venue.is_partner, isGolden));
              marker.setZIndexOffset(isGolden ? 300 : 200);
          }
      });

  }, [venues, activePinoDouradoVenueIds, isMapCreated, setSelectedVenue, t]);

  const handleTravelClick = () => {
      if (profile?.subscription_tier === 'plus') {
          if (profile.is_traveling) {
              disableTravelMode();
          } else {
              setShowTravelModal(true);
          }
      } else {
          setSubscriptionModalOpen(true);
      }
  };

  const handleCenterLocation = () => {
      if (myLocation && mapInstanceRef.current) {
          mapInstanceRef.current.flyTo(myLocation, 16, { animate: true, duration: 1 });
      } else {
          requestLocationPermission();
      }
  };

  const isScanning = !myLocation || !isMapCreated || !areTilesLoaded;
  const isError = !!error;
  const scanColor = isError ? 'red' : 'primary';

  // Empty State Check
  const hasNoVenues = isMapCreated && !isScanning && !isError && venues.length === 0;

  return (
      <div className="w-full h-full relative bg-dark-900 isolate overflow-hidden">
          <div 
            ref={mapContainerRef} 
            className="w-full h-full absolute inset-0 z-0 outline-none focus:outline-none"
            style={{ opacity: 1 }} 
          />

          {/* Floating Action Button: Travel Mode */}
          {isMapCreated && !isScanning && (
              <div className="absolute top-24 right-4 z-[40] flex flex-col gap-3">
                  
                  {/* Botão Centralizar */}
                  <button
                    onClick={handleCenterLocation}
                    className="w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 bg-dark-800/90 text-white backdrop-blur-md border border-white/10 hover:bg-dark-700"
                    title={t('map.my_location', { defaultValue: 'Minha Localização' })}
                  >
                      <span className="material-symbols-rounded filled">my_location</span>
                  </button>

                  {/* Botão Adicionar Local */}
                  <button
                    onClick={() => setSuggestVenueModalOpen(true)}
                    className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 backdrop-blur-md border border-white/10 ${
                        hasNoVenues 
                        ? 'bg-primary-500 text-white animate-pulse-fire shadow-primary-900/50' 
                        : 'bg-dark-800/90 text-primary-500 hover:text-primary-400'
                    }`}
                    title={t('map.add_place', { defaultValue: 'Adicionar Local' })}
                  >
                      <span className="material-symbols-rounded filled">add_location_alt</span>
                  </button>

                  {/* Botão Viajar */}
                  <button
                    onClick={handleTravelClick}
                    className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 ${
                        profile?.is_traveling 
                        ? 'bg-blue-600 text-white border-2 border-white animate-pulse' 
                        : 'bg-dark-800/90 text-slate-400 backdrop-blur-md border border-white/10 hover:text-white'
                    }`}
                    title={t('map.travel_mode', { defaultValue: 'Modo Viajante' })}
                  >
                      <span className="material-symbols-rounded filled">{profile?.is_traveling ? 'flight_land' : 'flight_takeoff'}</span>
                      {!profile?.is_traveling && profile?.subscription_tier !== 'plus' && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full flex items-center justify-center border border-slate-900">
                              <span className="material-symbols-rounded text-[10px] text-black font-bold">lock</span>
                          </span>
                      )}
                  </button>
              </div>
          )}
          
          {/* Banner Modo Viajante */}
          {profile?.is_traveling && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[40] bg-blue-600/90 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-lg border border-white/20 flex items-center gap-2 animate-slide-in-up">
                  <span className="material-symbols-rounded filled text-sm">flight</span>
                  <span className="text-xs font-bold uppercase tracking-wide">{t('map.travel_mode_active', { defaultValue: 'Modo Viajante Ativo' })}</span>
              </div>
          )}

          {/* Gamification Empty State Overlay */}
          {hasNoVenues && (
              <div className="absolute top-24 left-4 right-16 z-[40] animate-fade-in">
                  <div 
                    className="bg-dark-900/90 backdrop-blur-md border border-primary-500/30 rounded-2xl p-4 shadow-2xl relative overflow-hidden cursor-pointer"
                    onClick={() => setSuggestVenueModalOpen(true)}
                  >
                      <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-primary-500 to-secondary-500"></div>
                      <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                              <span className="material-symbols-rounded filled text-primary-500 text-xl animate-bounce">flag</span>
                          </div>
                          <div>
                              <h3 className="font-bold text-white text-sm">{t('map.empty_title', { defaultValue: 'Ainda não chegamos aqui!' })}</h3>
                              <p className="text-xs text-slate-300 mt-1 leading-snug">
                                  {t('map.empty_desc_1', { defaultValue: 'Seja o' })} <span className="text-primary-400 font-bold">{t('map.empty_desc_2', { defaultValue: 'Explorador Local' })}</span>. {t('map.empty_desc_3', { defaultValue: 'Adicione o primeiro point e ganhe destaque e recompensas.' })}
                              </p>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {/* Overlay de Carregamento / Scanner (Fade Out quando pronto) */}
          <div 
            className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-dark-900 transition-opacity duration-1000 ease-in-out ${!isScanning && !isError ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/50 via-dark-900 to-dark-900"></div>
            
            <div className="relative z-10 flex flex-col items-center">
                {/* NEW ANIMATION: Digital Radar Pulse */}
                <div className="relative w-64 h-64 flex items-center justify-center mb-10">
                    
                    {/* Central Glowing Core */}
                    <div className={`absolute w-6 h-6 rounded-full bg-${scanColor}-500 shadow-[0_0_30px_rgba(236,72,153,0.8)] z-20 animate-pulse`}></div>
                    <div className={`absolute w-full h-full rounded-full bg-${scanColor}-500/5 animate-ping-slow`}></div>

                    {/* Rotating Rings */}
                    {!isError && (
                        <>
                            {/* Inner Ring (Reverse) */}
                            <div className={`absolute w-32 h-32 rounded-full border-2 border-dashed border-${scanColor}-500/30 animate-spin-reverse border-t-transparent border-b-transparent`}></div>
                            
                            {/* Middle Ring (Slow) */}
                            <div className={`absolute w-48 h-48 rounded-full border border-${scanColor}-500/20 animate-spin-slow border-r-transparent border-l-transparent`}></div>
                            
                            {/* Outer Ring (Slower Reverse) */}
                            <div className={`absolute w-64 h-64 rounded-full border border-slate-700/50 animate-spin-reverse-slow border-t-${scanColor}-500/40`}></div>
                            
                            {/* Radar Sweep Gradient */}
                            <div className={`absolute w-full h-full rounded-full animate-radar-spin opacity-30 bg-gradient-to-tr from-transparent via-${scanColor}-500/10 to-transparent`}></div>
                        </>
                    )}
                    
                    {/* Static Decorators */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-20">
                        <div className="w-[1px] h-full bg-white/20"></div>
                        <div className="absolute h-[1px] w-full bg-white/20"></div>
                    </div>
                </div>

                <div className="text-center space-y-2">
                    <h2 className={`text-2xl font-black tracking-[0.2em] font-outfit uppercase ${isError ? 'text-red-500' : 'text-white animate-pulse'}`}>
                        {isError ? t('map.signal_lost', { defaultValue: 'SINAL PERDIDO' }) : t('map.scanning', { defaultValue: 'ESCANEANDO' })}
                    </h2>
                    <p className={`text-xs font-mono uppercase tracking-widest ${isError ? 'text-red-400/70' : 'text-primary-400/70'}`}>
                        {isError ? t('map.check_connection', { defaultValue: 'Verifique sua conexão' }) : t('map.triangulating', { defaultValue: 'Triangulando Localização...' })}
                    </p>
                </div>

                {isError && (
                    <button 
                        onClick={() => requestLocationPermission()} 
                        className="mt-8 px-8 py-3 bg-red-500/10 border border-red-500/50 text-red-400 font-bold rounded-xl hover:bg-red-500/20 transition-all active:scale-95 flex items-center gap-2 cursor-pointer pointer-events-auto"
                    >
                        <span className="material-symbols-rounded animate-spin">refresh</span>
                        {t('map.try_again', { defaultValue: 'Tentar Novamente' })}
                    </button>
                )}
            </div>
          </div>
          
          {showTravelModal && <TravelModeModal onClose={() => setShowTravelModal(false)} />}
          {isSuggestVenueModalOpen && <SuggestVenueModal onClose={() => setSuggestVenueModalOpen(false)} />}
      </div>
  );
};
