import React, { useEffect, useRef } from 'react';
import * as L from 'leaflet';
import { Venue, Coordinates } from '../types';
import { useTranslation } from 'react-i18next';
import { useAdStore } from '../stores/adStore';

interface PublicMapProps {
    venues: Venue[];
    center: Coordinates;
    cityName?: string | null;
    onVenueClick: (venue?: Venue) => void;
    fullHeight?: boolean;
    hideChrome?: boolean;
}

const createVenueIcon = (type: string, isPartner: boolean, isGolden: boolean = false) => {
    let iconName = 'place';
    let colorClass = '#9333ea';

    switch(type) {
        case 'sauna': iconName = 'hot_tub'; colorClass = '#ea580c'; break;
        case 'bar': iconName = 'local_bar'; colorClass = '#db2777'; break;
        case 'club': iconName = 'nightlife'; colorClass = '#4f46e5'; break;
        case 'cruising': iconName = 'visibility'; colorClass = '#1e293b'; break;
        case 'shop': iconName = 'shopping_bag'; colorClass = '#ef4444'; break;
        case 'cinema': iconName = 'theaters'; colorClass = '#0891b2'; break;
        case 'event': iconName = 'local_activity'; colorClass = '#f50c69'; break;
    }

    if (isGolden) colorClass = 'linear-gradient(to top right, #facc15, #d97706)';

    const html = `
        <div data-pg-marker="${type === 'event' ? 'event' : 'venue'}" style="position:relative;width:${type === 'event' ? '38' : '32'}px;height:${type === 'event' ? '38' : '32'}px;display:flex;align-items:center;justify-content:center;transform-origin:center;">
            <div style="position:absolute;inset:0;background:${isGolden ? '#facc15' : colorClass};border-radius:50%;opacity:${type === 'event' ? '.42' : '.3'};filter:blur(${type === 'event' ? '6' : '4'}px);${type === 'event' ? 'animation:pulse 2s infinite;' : ''}"></div>
            <div style="position:relative;width:100%;height:100%;background:${colorClass};border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:${isGolden ? '0 0 15px rgba(251,191,36,0.8)' : type === 'event' ? '0 0 22px rgba(245,12,105,.42)' : '0 4px 6px -1px rgba(0,0,0,.3)'};transition:transform .2s;">
                <span class="material-symbols-rounded" style="font-size:${type === 'event' ? '20' : '18'}px;color:white;font-weight:bold;">${iconName}</span>
            </div>
            ${isPartner && !isGolden ? '<div style="position:absolute;top:-4px;right:-4px;background-color:#facc15;color:black;font-size:8px;font-weight:bold;padding:0 3px;border-radius:9999px;border:1px solid white;">★</div>' : ''}
        </div>
    `;

    return L.divIcon({
        html,
        className: 'bg-transparent hover:z-[1000]',
        iconSize: [type === 'event' ? 38 : 32, type === 'event' ? 38 : 32],
        iconAnchor: [type === 'event' ? 19 : 16, type === 'event' ? 19 : 16],
        popupAnchor: [0, -20]
    });
};

export const PublicMap: React.FC<PublicMapProps> = ({ venues, center, cityName, onVenueClick, fullHeight = false, hideChrome = false }) => {
    const { t } = useTranslation();
    const { activePinoDouradoVenueIds } = useAdStore();
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<L.Map | null>(null);
    const markersRef = useRef<L.Marker[]>([]);
    const resizeObserverRef = useRef<ResizeObserver | null>(null);

    useEffect(() => {
        if (!mapContainerRef.current) return;

        if (!mapInstanceRef.current) {
            const map = L.map(mapContainerRef.current, {
                zoomControl: false,
                attributionControl: false,
                scrollWheelZoom: fullHeight,
                dragging: true,
                touchZoom: true,
                doubleClickZoom: true
            }).setView([center.lat, center.lng], 13);

            L.control.zoom({ position: 'topright' }).addTo(map);
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd' }).addTo(map);
            mapInstanceRef.current = map;
            setTimeout(() => { if (mapInstanceRef.current === map) map.invalidateSize(); }, 350);
        } else {
            mapInstanceRef.current.flyTo([center.lat, center.lng], 13, { duration: 1.1 });
        }

        markersRef.current.forEach(m => m.remove());
        markersRef.current = [];
        const map = mapInstanceRef.current;

        venues.forEach(venue => {
            if (venue.lat == null || venue.lng == null) return;
            const isGolden = venue.type !== 'event' && activePinoDouradoVenueIds.includes(venue.id);
            const marker = L.marker([venue.lat, venue.lng], {
                icon: createVenueIcon(venue.type, venue.is_partner, isGolden),
                zIndexOffset: venue.type === 'event' ? 350 : isGolden ? 300 : 200
            }).addTo(map);

            const popupContent = document.createElement('div');
            const isEvent = venue.type === 'event';
            popupContent.innerHTML = `
                <div class="text-center font-outfit p-1.5 min-w-[170px]">
                    <div class="w-full h-24 mb-2 rounded-lg overflow-hidden relative bg-slate-900">
                        ${venue.image_url ? `<img loading="lazy" src="${venue.image_url}" class="w-full h-full object-cover" />` : `<div class="w-full h-full flex items-center justify-center"><span class="material-symbols-rounded" style="font-size:30px;color:${isEvent ? '#f50c69' : '#64748b'}">${isEvent ? 'local_activity' : 'storefront'}</span></div>`}
                        <div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1"><span class="text-[10px] font-bold text-white uppercase tracking-wide">${isEvent ? 'Evento' : venue.type}</span></div>
                    </div>
                    <h3 class="text-sm font-bold text-slate-900 mb-1 leading-tight">${venue.name}</h3>
                    <p class="text-[10px] text-slate-500 mb-2 truncate">${(venue.address || 'Belo Horizonte').split(',')[0]}</p>
                    <button class="w-full text-white text-[10px] font-bold py-1.5 rounded transition-all" style="background:${isEvent ? '#f50c69' : 'linear-gradient(to right,#db2777,#7c3aed)'}">${isEvent ? 'Ver evento' : t('map.see_whos_here', { defaultValue: 'Ver quem está aqui' })}</button>
                </div>`;

            popupContent.querySelector('button')?.addEventListener('click', (e) => { e.stopPropagation(); onVenueClick(venue); });
            marker.bindPopup(popupContent, { className: 'landing-page-popup', closeButton: false, minWidth: 180, offset: [0, -10] });
            markersRef.current.push(marker);
        });

        if (mapContainerRef.current && !resizeObserverRef.current) {
            resizeObserverRef.current = new ResizeObserver(() => mapInstanceRef.current?.invalidateSize());
            resizeObserverRef.current.observe(mapContainerRef.current);
        }

        return () => {
            if (resizeObserverRef.current) {
                resizeObserverRef.current.disconnect();
                resizeObserverRef.current = null;
            }
        };
    }, [venues, center, onVenueClick, fullHeight, activePinoDouradoVenueIds, t]);

    return (
        <div className={`relative w-full overflow-hidden border border-white/10 shadow-2xl isolate transform-gpu ${fullHeight ? 'h-full rounded-none border-0' : 'h-[400px] rounded-3xl group'}`}>
            <div ref={mapContainerRef} className="w-full h-full z-0 bg-slate-900" />
            {!hideChrome && <>
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-dark-900/80 via-transparent to-transparent z-10" />
                <div className="absolute top-4 left-4 z-20 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg flex items-center gap-2 pointer-events-none">
                    <span className="material-symbols-rounded text-primary-500 text-sm">map</span>
                    <span className="text-xs font-bold text-white">{cityName ? t('map.guide_of', { defaultValue: 'Guia de {{city}}', city: cityName }) : t('map.hotspots_map', { defaultValue: 'Mapa de Hotspots' })}</span>
                </div>
                <button onClick={() => mapInstanceRef.current?.flyTo([center.lat, center.lng], 13, { duration: 1.1 })} className="absolute top-20 right-2.5 z-[400] w-[34px] h-[34px] bg-white rounded text-slate-800 shadow-md border-2 border-black/20 flex items-center justify-center" title={t('map.my_location', { defaultValue: 'Centralizar' })}><span className="material-symbols-rounded text-lg">my_location</span></button>
                <div className="absolute bottom-4 right-4 z-20 transition-transform duration-300 group-hover:scale-105"><button onClick={() => onVenueClick()} className="bg-white text-dark-950 font-bold py-2.5 px-5 rounded-xl shadow-lg text-xs flex items-center gap-2"><span className="material-symbols-rounded text-lg">explore</span>{t('map.explore_full_map', { defaultValue: 'Explorar Mapa Completo' })}</button></div>
            </>}
            <style>{`.landing-page-popup .leaflet-popup-content-wrapper{background:rgba(255,255,255,.96);color:#0f172a;border-radius:12px;padding:0;border:none}.landing-page-popup .leaflet-popup-tip{background:rgba(255,255,255,.96)}.leaflet-container{touch-action:none}`}</style>
        </div>
    );
};
