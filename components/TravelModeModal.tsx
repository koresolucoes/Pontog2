import React, { useEffect, useRef, useState } from 'react';
import { useMapStore } from '../stores/mapStore';
import * as L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { ModalShell } from './ui/ModalShell';
import { Button } from './ui/Button';

interface TravelModeModalProps {
  onClose: () => void;
}

export const TravelModeModal: React.FC<TravelModeModalProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { myLocation, enableTravelMode } = useMapStore();
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;
    const initialCoords = myLocation || { lat: -23.5505, lng: -46.6333 };
    setSelectedCoords(initialCoords);

    const map = L.map(mapRef.current, { zoomControl: false, attributionControl: false }).setView(initialCoords, 10);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', { maxZoom: 19 }).addTo(map);
    map.on('move', () => {
      const center = map.getCenter();
      setSelectedCoords({ lat: center.lat, lng: center.lng });
    });
    mapInstance.current = map;

    const timer = window.setTimeout(() => map.invalidateSize(), 220);
    return () => {
      window.clearTimeout(timer);
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  const handleConfirm = async () => {
    if (!selectedCoords) return;
    await enableTravelMode(selectedCoords);
    onClose();
  };

  return (
    <ModalShell
      onClose={onClose}
      size="lg"
      icon="flight"
      eyebrow="Explorar outra cidade"
      title={t('travel_mode.title', { defaultValue: 'Modo viajante' })}
      description="Escolha um ponto no mapa. O Ponto G passa a mostrar pessoas e locais daquela região sem expor sua localização física atual."
      footer={
        <div className="grid grid-cols-[.75fr_1.25fr] gap-2">
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="light" icon="location_on" onClick={handleConfirm} disabled={!selectedCoords}>{t('travel_mode.confirm', { defaultValue: 'Explorar aqui' })}</Button>
        </div>
      }
    >
      <div className="relative h-[45vh] min-h-[300px] overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#111116]">
        <div ref={mapRef} className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center">
          <div className="relative flex h-12 w-12 items-center justify-center rounded-full border border-primary-500/30 bg-primary-500/15 backdrop-blur-sm">
            <span className="absolute h-4 w-4 rounded-full bg-primary-500 shadow-[0_0_22px_rgba(245,12,105,.65)]" />
            <span className="absolute h-9 w-9 rounded-full border border-primary-400/25" />
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-3 bottom-3 z-[500] rounded-2xl border border-white/10 bg-black/55 px-3 py-2.5 text-center text-[11px] font-semibold text-white/60 backdrop-blur-xl">
          Arraste o mapa até a região que você quer explorar
        </div>
      </div>
    </ModalShell>
  );
};
