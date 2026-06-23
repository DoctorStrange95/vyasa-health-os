import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',    // immediately activate new SW so stale chunk hashes never crash iOS
      injectRegister: 'auto',
      includeAssets: ['logo.svg', 'favicon.svg', 'icon-192.png', 'icon-512.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Vyasa Health OS',
        short_name: 'Vyasa',
        description: 'Digital clinic for doctors — prescriptions, bookings, OPD queue & patient records.',
        theme_color: '#0a1628',
        background_color: '#0a1628',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/app/dashboard',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        skipWaiting: true,            // activate new SW immediately on install
        clientsClaim: true,           // take control of existing tabs immediately
        // SPA fallback: any navigation request not matching a precached file
        // gets served index.html so React Router handles it client-side
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//],
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        cleanupOutdatedCaches: true,   // drop caches from previous SW versions
        runtimeCaching: [
          {
            // Backend API — fresh cache name (v3) abandons the previously
            // poisoned 'api-cache'. Only cache successful (200) responses so a
            // failed/empty response can never be served back as stale data.
            urlPattern: ({ url }) => url.pathname.startsWith('/api/') || url.hostname.includes('render.com'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache-v3',
              networkTimeoutSeconds: 10,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 }, // 1 day
              cacheableResponse: { statuses: [200] },
            },
          },
          {
            // Google Fonts + CDN assets
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
