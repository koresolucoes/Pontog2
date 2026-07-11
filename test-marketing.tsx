import React from 'react';
import { renderToString } from 'react-dom/server';
import { OwnerMarketingView } from './pages/Owner/views/OwnerMarketingView';

// Mocks to avoid errors during render
jest.mock('./stores/authStore', () => ({
  useAuthStore: () => ({ user: { id: 'test' } })
}));
// Wait, we don't have jest, this is just a quick node script.
