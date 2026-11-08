import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa';

// GitHub Pages project sites live under /<repo>/. Change this if the
// repository is renamed or the app is deployed to a custom domain root.
const PROD_BASE = '/weather-summary/';

/**
 * Windows 11 PWA widget definition. `widgets` is not yet part of the standard
 * manifest TypeScript types, so it is layered on top of `ManifestOptions`.
 */
interface WidgetDefinition {
  name: string;
  short_name?: string;
  description: string;
  tag: string;
  template: string;
  ms_ac_template: string;
  data?: string;
  type?: string;
  auth?: boolean;
  update?: number;
  multiple?: boolean;
  screenshots?: Array<{
    src: string;
    sizes: string;
    label?: string;
    platform?: string;
  }>;
  icons?: Array<{ src: string; sizes: string; type?: string }>;
}

const widgets: WidgetDefinition[] = [
  {
    name: 'Weather Summary',
    short_name: 'Weather',
    description: 'Current conditions and the short weather summary.',
    tag: 'weather-summary',
    template: 'weather-summary',
    ms_ac_template: 'widgets/weather-widget.json',
    data: 'widgets/weather-data.json',
    type: 'application/json',
    auth: false,
    update: 1800,
    multiple: false,
    screenshots: [
      {
        src: 'icons/widget-screenshot.png',
        sizes: '600x400',
        label: 'Current weather summary',
        platform: 'windows',
      },
    ],
  },
];

const manifest: Partial<ManifestOptions> & { widgets: WidgetDefinition[] } = {
  name: 'Weather Summary',
  short_name: 'Weather',
  description: 'A tiny, installable weather summary with low-poly 3D icons.',
  theme_color: '#0b1220',
  background_color: '#0b1220',
  display: 'standalone',
  orientation: 'portrait-primary',
  start_url: './',
  scope: './',
  icons: [
    { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    {
      src: 'icons/icon-512-maskable.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
  widgets,
};

export default defineConfig(({ mode }) => ({
  // `vite preview` also runs in production mode, so keying off `mode` keeps the
  // built app and the local preview on the same GitHub Pages base path.
  base: mode === 'production' ? PROD_BASE : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        // The generated service worker imports our Windows widget handlers.
        importScripts: ['widget-sw.js'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/air-quality-api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo-air',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
}));
