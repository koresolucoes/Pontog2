
import React, { useEffect, useRef, useState } from 'react';
import { useMapStore } from '../stores/mapStore';
import * as L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { useHardwareBack } from '../lib/useHardwareBack';

interface TravelModeModalProps {
    onClose: () => void;
}

export const TravelModeModal: React.FC<TravelModeModalProps> = ({ onClose }) => {
    useHardwareBack(true, onClose);
    const { t } = useTranslation();
    const { myLocation, enableTravelMode } = useMapStore();
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

    useEffect(() => {
        if (!mapRef.current) return;

        const initialCoords = myLocation || { lat: -23.5505, lng: -46.6333 }; // Default SP
        setSelectedCoords(initialCoords);

        const map = L.map(mapRef.current, {
            zoomControl: false,
            attributionControl: false
        }).setView(initialCoords, 10);

        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
        }).addTo(map);

        const icon = L.divIcon({
            html: `<div class="w-8 h-8 bg-blue-500 rounded-full border-4 border-white shadow-xl animate-bounce"></div>`,
            className: 'bg-transparent',
            iconSize: [32, 32],
            iconAnchor: [16, 32]
        });

        const marker = L.marker(initialCoords, { icon, draggable: false }).addTo(map);
        markerRef.current = marker;

        map.on('move', () => {
            const center = map.getCenter();
            marker.setLatLng(center);
            setSelectedCoords({ lat: center.lat, lng: center.lng });
        });

        mapInstance.current = map;

        // Fix for map tiles not loading completely due to modal animation
        setTimeout(() => {
            if (mapInstance.current) {
                mapInstance.current.invalidateSize();
            }
        }, 300);

        return () => {
            map.remove();
            mapInstance.current = null;
        };
    }, []); // Run once

    const handleConfirm = () => {
        if (selectedCoords) {
            enableTravelMode(selectedCoords);
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-dark-900/90 backdrop-blur-sm flex items-center justify-center z-[80] animate-fade-in p-4">
            <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/10 h-[80vh] flex flex-col">
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                            <span className="material-symbols-rounded text-blue-400 filled">flight</span>
                        </div>
                        <div>
                            <h2 className="font-bold text-white text-lg font-outfit">{t('travel_mode.title', { defaultValue: 'Modo Viajante' })}</h2>
                            <p className="text-xs text-slate-400">{t('travel_mode.drag_map', { defaultValue: 'Arraste o mapa para escolher' })}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors">
                        <span className="material-symbols-rounded text-slate-400">close</span>
                    </button>
                </div>

                <div className="flex-1 relative">
                    <div ref={mapRef} className="absolute inset-0 z-0" />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
                        <div className="w-4 h-4 bg-white rounded-full shadow-lg border-2 border-blue-500"></div>
                    </div>
                </div>

                <div className="p-5 border-t border-white/10 bg-slate-800/50 flex flex-col gap-3">
                    <p className="text-center text-xs text-slate-400 mb-1">
                        {t('travel_mode.disclaimer', { defaultValue: 'Sua localização será fixada aqui até você desativar.' })}
                    </p>
                    <button 
                        onClick={handleConfirm}
                        className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-900/20 active:scale-95 flex items-center justify-center gap-2"
                    >
                        <span className="material-symbols-rounded filled">location_on</span>
                        {t('travel_mode.confirm', { defaultValue: 'Confirmar Localização' })}
                    </button>
                </div>
            </div>
        </div>
    );
};
