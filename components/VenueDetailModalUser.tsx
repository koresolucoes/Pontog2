import React from 'react';
import { VenueDetailModal as VenueDetailModalV2 } from './VenueDetailModalV2';
import type { Venue } from '../types';

interface VenueDetailModalProps {
  venue: Venue;
  onClose: () => void;
}

/**
 * Product-facing venue modal.
 *
 * The P0 trust audit left an implementation note at the end of the modal to
 * document that mocks/fallbacks had been removed. That note belongs in docs,
 * not in the product UI, so this wrapper keeps the audited implementation and
 * removes only the technical audit copy from the rendered experience.
 */
export const VenueDetailModal: React.FC<VenueDetailModalProps> = (props) => (
  <div className="pg-venue-user-modal">
    <style>{`
      .pg-venue-user-modal article .space-y-5 > section:last-child {
        display: none !important;
      }
    `}</style>
    <VenueDetailModalV2 {...props} />
  </div>
);
