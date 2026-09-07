import React from 'react';
import type { PrivateAlbum } from '../types';
import { SelectAlbumModal as LegacySelectAlbumModal } from './SelectAlbumModalLegacy';
import { setAlbumShareIntent } from '../modules/albums/shareIntent';

interface SelectAlbumModalProps {
  onClose: () => void;
  onSelect: (album: PrivateAlbum & { is_view_once?: boolean; expires_in_hours?: number }) => void;
}

export const SelectAlbumModal: React.FC<SelectAlbumModalProps> = ({ onClose, onSelect }) => (
  <LegacySelectAlbumModal
    onClose={onClose}
    onSelect={(album) => {
      setAlbumShareIntent(album.id, {
        isViewOnce: !!album.is_view_once,
        expiresInHours: album.expires_in_hours,
      });
      onSelect(album);
    }}
  />
);
