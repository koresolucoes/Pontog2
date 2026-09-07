import React from 'react';
import { createPortal } from 'react-dom';
import type { CommunityPost } from '../types';
import { CommunityPostDetailModal as CommunityPostDetailModalLegacy } from './CommunityPostDetailModalLegacy';

export const CommunityPostDetailModal: React.FC<{ post: CommunityPost; onClose: () => void; communityId: string }> = (props) => {
  if (typeof document === 'undefined') return null;
  return createPortal(<CommunityPostDetailModalLegacy {...props} />, document.body);
};
