import { defineConfig, type Plugin } from 'vite';
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
  id: './',
  name: 'Weather Summary',
  short_name: 'Weather',
  description: 'A tiny, installable weather summary with low-poly 3D icons.',
  lang: 'en',
  dir: 'ltr',
  theme_color: '#0b1220',
  background_color: '#0b1220',
  display: 'standalone',
  orientation: 'portrait-primary',
  start_url: './',
  scope: './',
  categories: ['weather', 'utilities'],
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
  shortcuts: [
    {
      name: 'Weather where I am',
      short_name: 'Locate',
      description: 'Jump straight to the weather at your current location.',
      url: './?locate=1',
      icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
    },
    {
      name: 'Change location',
      short_name: 'Location',
      description: 'Search for a city, area, or pincode.',
      url: './?location=1',
      icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }],
    },
  ],
  screenshots: [
    {
      src: 'icons/widget-screenshot.png',
      sizes: '600x400',
      type: 'image/png',
      label: 'Weather Summary widget',
      form_factor: 'wide',
    },
  ],
  widgets,
};

/**
 * Add a Content-Security-Policy to the built HTML. It is only applied to
 * production builds so the Vite dev server and HMR keep working normally.
 */
function contentSecurityPolicy(): Plugin {
  const policy = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self' https://api.open-meteo.com https://air-quality-api.open-meteo.com https://geocoding-api.open-meteo.com https://api.bigdatacloud.net https://api-bdc.io https://nominatim.openstreetmap.org https://api.waqi.info",
    "worker-src 'self'",
    "manifest-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  return {
    name: 'weather-summary-csp',
    apply: 'build',
    transformIndexHtml(html) {
      return {
        html,
        tags: [
          {
            tag: 'meta',
            attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
            injectTo: 'head-prepend',
          },
        ],
      };
    },
  };
}

export default defineConfig(({ mode }) => ({
  // `vite preview` also runs in production mode, so keying off `mode` keeps the
  // built app and the local preview on the same GitHub Pages base path.
  base: mode === 'production' ? PROD_BASE : '/',
  plugins: [
    react(),
    VitePWA({
      // Keep the running app on its current version until the user accepts the
      // update banner; a deploy should never reload the page mid-use.
      registerType: 'prompt',
      includeAssets: [
        'favicon.svg',
        'icons/apple-touch-icon.png',
        'icons/icon.svg',
        'icons/icon-maskable.svg',
      ],
      manifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,json}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
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
          {
            urlPattern: /^https:\/\/geocoding-api\.open-meteo\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'open-meteo-geocoding',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 40, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/api\.bigdatacloud\.net\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'reverse-geocoding',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 40, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/api\.waqi\.info\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'waqi',
              networkTimeoutSeconds: 6,
              expiration: { maxEntries: 20, maxAgeSeconds: 30 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
    contentSecurityPolicy(),
  ],
}));
