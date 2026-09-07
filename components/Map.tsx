import React from 'react';
import { MapV2 } from './MapV2';

export const Map: React.FC = () => (
  <div className="pg-map-shell-compact h-full w-full">
    <style>{`
      .pg-map-shell-compact .pg-map-v2 > div[style*="top: 96px"] {
        top: max(10px, env(safe-area-inset-top)) !important;
      }
      .pg-map-shell-compact .pg-map-v2 > button[style*="top: 154px"] {
        top: calc(max(10px, env(safe-area-inset-top)) + 58px) !important;
      }
      .pg-map-shell-compact .pg-map-v2 > button[style*="top: 158px"] {
        top: calc(max(10px, env(safe-area-inset-top)) + 116px) !important;
      }
    `}</style>
    <MapV2 />
  </div>
);
