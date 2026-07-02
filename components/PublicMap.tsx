
import React, { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import { Venue, Coordinates } from '../types';
import { useTranslation } from 'react-i18next';

interface PublicMapProps {
    venues: Venue[];
    center: Coordinates;
    cityName?: string | null;
    onVenueClick: () => void;
}

const createVenueIcon = (type: string, isPartner: boolean) => {
    let iconName = 'place';
    let colorClass = '#9333ea'; // Purple-600 default

    switch(type) {
        case 'sauna': iconName = 'hot_tub'; colorClass = '#ea580c'; break; // Orange-600
        case 'bar': iconName = 'local_bar'; colorClass = '#db2777'; break; // Pink-600
        case 'club': iconName = 'nightlife'; colorClass = '#4f46e5'; break; // Indigo-600
        case 'cruising': iconName = 'visibility'; colorClass = '#1e293b'; break; // Slate-800
        case 'shop': iconName = 'shopping_bag'; colorClass = '#ef4444'; break; // Red-500
        case 'cinema': iconName = 'theaters'; colorClass = '#0891b2'; break; // Cyan-600
    }

    const html = `
        <div style="
            position: relative;
            width: 32px; 
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            transform-origin: center;
        ">
            <div style="
                position: absolute;
                inset: 0;
                background-color: ${colorClass};
                border-radius: 50%;
                opacity: 0.3;
                filter: blur(4px);
                animation: pulse 2s infinite;
            "></div>
            <div style="
                position: relative;
                width: 100%;
                height: 100%;
                background-color: ${colorClass};
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px solid white;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
                transition: transform 0.2s;
            ">
                <span class="material-symbols-rounded" style="font-size: 18px; color: white; font-weight: bold;">${iconName}</span>
            </div>
            ${isPartner ? '<div style="position: absolute; top: -4px; right: -4px; background-color: #facc15; color: black; font-size: 8px; font-weight: bold; padding: 0 3px; border-radius: 9999px; border: 1px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">★</div>' : ''}
        </div>
    `;

    return L.divIcon({
        html: html,
        className: 'bg-transparent hover:z-[1000]',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -20]
    });
};

export const PublicMap: React.FC<PublicMapProps> = ({ venues, center, cityName, onVenueClick }) => {
    const { t } = useTranslation();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.Marker[]>([]);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        // Inicializa o mapa se não existir
        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current, {
                zoomControl: false, // Desativamos o padrão para adicionar um customizado ou posicionado
                attributionControl: false,
                scrollWheelZoom: false, // Mantém false para não sequestrar o scroll da página
                dragging: true, // Habilita arrastar em desktop e mobile
                touchZoom: true, // Habilita zoom de pinça
                doubleClickZoom: true
            }).setView([center.lat, center.lng], 13);

            // Adiciona controles de zoom no canto superior direito
            L.control.zoom({
                position: 'topright'
            }).addTo(map);

            // Dark theme map tiles
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                maxZoom: 19,
                subdomains: 'abcd',
            }).addTo(map);

            mapInstanceRef.current = map;

            // Força um recálculo do tamanho após um breve delay para garantir que a animação CSS terminou
            setTimeout(() => {
                map.invalidateSize();
            }, 500);
        } else {
            // Atualiza o centro se mudar (ex: geolocalização terminou)
            // Animação suave para nova posição
            mapInstanceRef.current.flyTo([center.lat, center.lng], 13, { duration: 1.5 });
        }

        // Limpa marcadores antigos
        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];

        const map = mapInstanceRef.current;

        // Adiciona novos marcadores
        venues.forEach(venue => {
            if (!venue.lat || !venue.lng) return;

            const marker = L.marker([venue.lat, venue.lng], {
                icon: createVenueIcon(venue.type, venue.is_partner)
            }).addTo(map);

            // Popup Customizado para Landing Page
            const popupContent = document.createElement('div');
            popupContent.innerHTML = `
                <div class="text-center font-outfit p-1.5 min-w-[160px]">
                    <div class="w-full h-24 mb-2 rounded-lg overflow-hidden relative">
                        <img loading="lazy" src="${venue.image_url || 'https://placehold.co/300x200/1e293b/64748b?text=PontoG'}" class="w-full h-full object-cover" />
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1">
                             <span class="text-[10px] font-bold text-white uppercase tracking-wide">${venue.type}</span>
                        </div>
                    </div>
                    <h3 class="text-sm font-bold text-slate-900 mb-1 leading-tight">${venue.name}</h3>
                    <p class="text-[10px] text-slate-500 mb-2 truncate">${venue.address.split(',')[0]}</p>
                    <button class="w-full bg-gradient-to-r from-primary-600 to-secondary-600 text-white text-[10px] font-bold py-1.5 rounded hover:shadow-lg transition-all">
                        ${t('map.see_whos_here', { defaultValue: 'Ver quem está aqui' })}
                    </button>
                </div>
            `;
            
            // Adiciona listener ao botão dentro do popup
            popupContent.querySelector('button')?.addEventListener('click', (e) => {
                e.stopPropagation();
                onVenueClick();
            });

            marker.bindPopup(popupContent, {
                className: 'landing-page-popup',
                closeButton: false,
                minWidth: 180,
                offset: [0, -10]
            });

            markersRef.current.push(marker);
        });

        // Configura o ResizeObserver para corrigir o tamanho do mapa automaticamente
        if (mapContainerRef.current && !resizeObserverRef.current) {
            resizeObserverRef.current = new ResizeObserver(() => {
                if (mapInstanceRef.current) {
                    mapInstanceRef.current.invalidateSize();
                }
            });
            resizeObserverRef.current.observe(mapContainerRef.current);
        }

        return () => {
            // Cleanup
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
                resizeObserverRef.current = null;
            }
        };

    }, [venues, center, onVenueClick]);

    return (
        <div className="relative w-full h-[400px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl group isolate transform-gpu">
            <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-900" />
            
            {/* Overlay Gradients para misturar com a página - pointer-events-none garante que o clique passe para o mapa */}
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-dark-900/80 via-transparent to-transparent z-10"></div>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-dark-900/20 via-transparent to-transparent z-10"></div>

            {/* Badge de Localização */}
            <div className="absolute top-4 left-4 z-20 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg flex items-center gap-2 pointer-events-none">
                <span className="material-symbols-rounded text-primary-500 text-sm animate-pulse">map</span>
                <span className="text-xs font-bold text-white">
                    {cityName ? t('map.guide_of', { defaultValue: 'Guia de {{city}}', city: cityName }) : t('map.hotspots_map', { defaultValue: 'Mapa de Hotspots' })}
                </span>
            </div>

            {/* Botão Centralizar */}
            <button 
                onClick={() => {
                    if (mapInstanceRef.current) {
                        mapInstanceRef.current.flyTo([center.lat, center.lng], 13, { duration: 1.5 });
                    }
                }}
                className="absolute top-20 right-2.5 z-[400] w-[34px] h-[34px] bg-white rounded text-slate-800 shadow-md border-2 border-black/20 flex items-center justify-center hover:bg-slate-50 transition-colors"
                title={t('map.my_location', { defaultValue: 'Centralizar' })}
            >
                <span className="material-symbols-rounded text-lg">my_location</span>
            </button>

            {/* CTA Overlay (aparece no hover em telas grandes) */}
            <div className="absolute bottom-4 right-4 z-20 transition-transform duration-300 group-hover:scale-105">
                <button 
                    onClick={onVenueClick}
                    className="bg-white text-dark-950 font-bold py-2.5 px-5 rounded-xl shadow-lg hover:bg-slate-100 text-xs flex items-center gap-2"
                >
                    <span className="material-symbols-rounded text-lg">explore</span>
                    {t('map.explore_full_map', { defaultValue: 'Explorar Mapa Completo' })}
                </button>
            </div>
            
            {/* CSS for custom popup override only for this component context if needed */}
            <style>{`
                .landing-page-popup .leaflet-popup-content-wrapper {
                    background: rgba(255, 255, 255, 0.95);
                    color: #0f172a;
                    border-radius: 12px;
                    padding: 0;
                    border: none;
                }
                .landing-page-popup .leaflet-popup-tip {
                    background: rgba(255, 255, 255, 0.95);
                }
                /* Garante que o mapa receba eventos de toque */
                .leaflet-container {
                    touch-action: none;
                }
            `}</style>
        </div>
    );
};
