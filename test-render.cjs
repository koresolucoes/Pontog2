require('@babel/register')({
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    '@babel/preset-react',
    '@babel/preset-typescript'
  ],
  extensions: ['.ts', '.tsx', '.js', '.jsx']
});

const React = require('react');
const { renderToString } = require('react-dom/server');

// Mock Zustand stores
jest = { mock: () => {} }; // Mock jest for simplicity

const path = require('path');
const moduleAlias = require('module-alias');
moduleAlias.addAliases({
  '../../../stores/authStore': path.resolve(__dirname, 'mock-authStore.js'),
  '../../../stores/ownerStore': path.resolve(__dirname, 'mock-ownerStore.js'),
  '../../../stores/adStore': path.resolve(__dirname, 'mock-adStore.js'),
  '../../../lib/supabase': path.resolve(__dirname, 'mock-supabase.js'),
  'lucide-react': path.resolve(__dirname, 'mock-lucide.js'),
  'react-hot-toast': path.resolve(__dirname, 'mock-toast.js')
});

// Create mocks
const fs = require('fs');
fs.writeFileSync('mock-authStore.js', 'module.exports = { useAuthStore: () => ({ user: { id: "test" } }) };');
fs.writeFileSync('mock-ownerStore.js', 'module.exports = { useOwnerStore: () => ({ managedVenues: [], fetchManagedVenues: () => {} }) };');
fs.writeFileSync('mock-adStore.js', 'module.exports = { useAdStore: () => ({}) };');
fs.writeFileSync('mock-supabase.js', 'module.exports = { supabase: { from: () => ({ select: () => ({ eq: () => ({}) }) }) } };');
fs.writeFileSync('mock-lucide.js', 'module.exports = new Proxy({}, { get: () => () => null });');
fs.writeFileSync('mock-toast.js', 'module.exports = { default: { success: () => {}, error: () => {} } };');

try {
  const { OwnerMarketingView } = require('./pages/Owner/views/OwnerMarketingView.tsx');
  const html = renderToString(React.createElement(OwnerMarketingView));
  console.log("Render successful!");
} catch (e) {
  console.error("Render failed:");
  console.error(e);
}
