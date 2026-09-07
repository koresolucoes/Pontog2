import React from 'react';
import { createPortal } from 'react-dom';
import type { NewsArticle } from '../types';
import { NewsReaderModal as NewsReaderModalLegacy } from './NewsReaderModalLegacy';

export const NewsReaderModal: React.FC<{ article: NewsArticle; onClose: () => void }> = (props) => {
  if (typeof document === 'undefined') return null;
  return createPortal(<NewsReaderModalLegacy {...props} />, document.body);
};
