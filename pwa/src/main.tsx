import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import './styles.css';

// `prompt` registration keeps the running app on its current version until the
// user chooses to reload, so a deploy never yanks the UI out from under them.
const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    window.dispatchEvent(new Event('pwa:update-available'));
  },
  onOfflineReady() {
    window.dispatchEvent(new Event('pwa:offline-ready'));
  },
});

window.addEventListener('pwa:apply-update', () => {
  void updateServiceWorker(true);
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element not found');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
