import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import vuetify from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Vite Configuration for BNO 5+1 Tracker
 * Configures Vue 3, Vuetify 3 auto-import, PWA service worker with offline caching, and path aliases.
 */
export default defineConfig({
  // Use relative base path for maximum compatibility across static hosts (GitHub Pages, GitLab Pages)
  base: './',
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    // Auto-import Vuetify components and styles as needed
    vuetify({ autoImport: true }),
    // Progressive Web App (PWA) configuration with Workbox offline caching
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'maskable-icon.png'],
      manifest: {
        name: 'BNO 5+1 Tracker - UK Settlement & Absence Tracker',
        short_name: 'BNO Tracker',
        description:
          'Track your UK absences on the BNO 5+1 route toward Indefinite Leave to Remain (ILR / Settlement) and British Citizenship.',
        theme_color: '#1867c0',
        background_color: '#1867c0',
        display: 'standalone',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:woff|woff2|eot|ttf|otf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-fonts-cache',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})


