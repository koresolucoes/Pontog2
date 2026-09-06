import React from 'react';
import ReactDOM from 'react-dom/client';
import './i18n';
import App from './App';
import { installLeafletBasemapAdapter } from './engines/maps/public';

installLeafletBasemapAdapter();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
    <App />
);
