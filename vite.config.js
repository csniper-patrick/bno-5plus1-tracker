import fs from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueJsx from '@vitejs/plugin-vue-jsx'
import vueDevTools from 'vite-plugin-vue-devtools'
import vuetify from 'vite-plugin-vuetify'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * Resolve deployment base URL dynamically from GitLab CI environment.
 * Prioritizes CI_PAGES_URL and VITE_CI_PAGES_URL.
 */
const pagesUrl = (
  process.env.VITE_CI_PAGES_URL ||
  process.env.CI_PAGES_URL ||
  'https://csniper.gitlab.io/bno-5plus1-tracker'
)
  .trim()
  .replace(/\/+$/, '')

/**
 * Vite Configuration for BNO 5+1 Tracker
 * Configures Vue 3, Vuetify 3 auto-import, PWA service worker with offline caching,
 * dynamic SEO generation from CI_PAGES_URL, and path aliases.
 */
export default defineConfig({
  // Use relative base path for maximum compatibility across static hosts (GitHub Pages, GitLab Pages)
  base: './',
  define: {
    'import.meta.env.VITE_CI_PAGES_URL': JSON.stringify(pagesUrl),
    'import.meta.env.CI_PAGES_URL': JSON.stringify(pagesUrl),
  },
  plugins: [
    vue(),
    vueJsx(),
    vueDevTools(),
    // Auto-import Vuetify components and styles as needed
    vuetify({ autoImport: true }),
    // Dynamic SEO generation and HTML replacement plugin
    {
      name: 'dynamic-seo-plugin',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const url = req.url ? req.url.split('?')[0] : ''
          if (url === '/sitemap.xml') {
            const { generateSitemapXml } = await import('./src/utils/seo.js')
            const host = req.headers.host ? `http://${req.headers.host}` : pagesUrl
            const activeUrl = process.env.VITE_CI_PAGES_URL || process.env.CI_PAGES_URL || host
            const sitemap = generateSitemapXml(activeUrl)
            res.setHeader('Content-Type', 'application/xml; charset=utf-8')
            res.end(sitemap)
            return
          }
          if (url === '/robots.txt') {
            const { generateRobotsTxt } = await import('./src/utils/seo.js')
            const host = req.headers.host ? `http://${req.headers.host}` : pagesUrl
            const activeUrl = process.env.VITE_CI_PAGES_URL || process.env.CI_PAGES_URL || host
            const robots = generateRobotsTxt(activeUrl)
            res.setHeader('Content-Type', 'text/plain; charset=utf-8')
            res.end(robots)
            return
          }
          next()
        })
      },
      transformIndexHtml(html) {
        return html
          .replace(/%VITE_CI_PAGES_URL%/g, pagesUrl)
          .replace(/%CI_PAGES_URL%/g, pagesUrl)
          .replace(/https:\/\/csniper\.gitlab\.io\/bno-5plus1-tracker/g, pagesUrl)
      },
      async closeBundle() {
        const outDir = resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist')
        if (fs.existsSync(outDir)) {
          const { generateSitemapXml, generateRobotsTxt } = await import('./src/utils/seo.js')
          fs.writeFileSync(resolve(outDir, 'sitemap.xml'), generateSitemapXml(pagesUrl), 'utf-8')
          fs.writeFileSync(resolve(outDir, 'robots.txt'), generateRobotsTxt(pagesUrl), 'utf-8')
        }
      },
    },
    // Progressive Web App (PWA) configuration with Workbox offline caching
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.ico',
        'favicon.svg',
        'apple-touch-icon.png',
        'maskable-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'og-image.png',
        'og-image.svg',
        'robots.txt',
        'sitemap.xml',
      ],
      manifest: {
        name: 'BNO 5+1 Tracker (Unofficial 3rd-Party App)',
        short_name: 'BNO Tracker',
        description:
          'Unofficial 3rd-party app to track your UK absences on the BNO 5+1 route toward Indefinite Leave to Remain (ILR / Settlement) and British Citizenship.',
        theme_color: '#012169',
        background_color: '#012169',
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
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2,ttf,eot,webmanifest}'],
        runtimeCaching: [
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|tiff|bmp|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /\.(?:woff|woff2|eot|ttf|otf)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-fonts-cache',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 24 * 60 * 60, // 60 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
          {
            urlPattern: /^https:\/\/(?:cdn\.jsdelivr\.net|fonts\.gstatic\.com|cdnjs\.cloudflare\.com)\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'external-cdn-assets',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 24 * 60 * 60,
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
  ssr: {
    noExternal: ['vuetify'],
  },
  ssgOptions: {
    script: 'async',
    formatting: 'minify',
    crittersOptions: false,
    async onFinished() {
      const outDir = resolve(fileURLToPath(new URL('.', import.meta.url)), 'dist')
      const { generateSitemapXml, generateRobotsTxt } = await import('./src/utils/seo.js')
      await fs.promises.writeFile(resolve(outDir, 'sitemap.xml'), generateSitemapXml(pagesUrl), 'utf-8')
      await fs.promises.writeFile(resolve(outDir, 'robots.txt'), generateRobotsTxt(pagesUrl), 'utf-8')
    },
  },
})


