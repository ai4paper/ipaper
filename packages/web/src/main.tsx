import { createWebAPIs } from './api';
import { registerSW } from 'virtual:pwa-register';

import type { RuntimeAPIs } from '@ai4paper/ui/lib/api/types';
import '@ai4paper/ui/index.css';
import '@ai4paper/ui/styles/fonts';

declare global {
  interface Window {
    __IPAPER_RUNTIME_APIS__?: RuntimeAPIs;
  }
}

window.__IPAPER_RUNTIME_APIS__ = createWebAPIs();

if (import.meta.env.PROD) {
  registerSW({
    onRegisterError(error: unknown) {
      console.warn('[PWA] service worker registration failed:', error);
    },
  });
} else if ('serviceWorker' in navigator) {
  void navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
    .catch(() => {});
}

import('@ai4paper/ui/main');
