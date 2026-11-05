/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { restaurant as r } from './src/config/restaurant.ts'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const site = r.siteUrl.endsWith('/') ? r.siteUrl : `${r.siteUrl}/`
const title = `${r.name} — Order Pizza Online in ${r.city}`

/** Injects SEO meta, Open Graph and Restaurant JSON-LD from src/config/restaurant.ts; emits sitemap + robots. */
function seo(): Plugin {
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: r.name,
    description: r.description,
    servesCuisine: ['Pizza', 'Italian'],
    priceRange: '$$',
    url: site,
    image: `${site}images/hero-1600.webp`,
    telephone: r.phone,
    address: { '@type': 'PostalAddress', streetAddress: r.address, addressLocality: r.city, addressCountry: r.country },
    ...(r.latitude && r.longitude ? { geo: { '@type': 'GeoCoordinates', latitude: r.latitude, longitude: r.longitude } } : {}),
    openingHoursSpecification: r.hours.filter((h) => !h.closed).map((h) => ({
      '@type': 'OpeningHoursSpecification', dayOfWeek: dayNames[h.day], opens: h.open, closes: h.close,
    })),
    hasMenu: `${site}#/menu`,
    acceptsReservations: false,
  }
  return {
    name: 'restaurant-seo',
    transformIndexHtml(html) {
      const tags = `
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(r.description)}" />
    <link rel="canonical" href="${esc(site)}" />
    <meta property="og:type" content="restaurant" />
    <meta property="og:site_name" content="${esc(r.name)}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(r.description)}" />
    <meta property="og:url" content="${esc(site)}" />
    <meta property="og:image" content="${esc(site)}images/hero-1600.webp" />
    <meta name="twitter:card" content="summary_large_image" />
    <script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`
      return html.replace('<!--SEO-->', tags)
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: `User-agent: *\nAllow: /\n\nSitemap: ${site}sitemap.xml\n` })
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${esc(site)}</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>\n</urlset>\n`,
      })
    },
  }
}

export default defineConfig({
  // Relative base works on GitHub Pages project sites (/repo/), user sites and custom domains.
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    seo(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo.svg', 'favicon.ico', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: r.name,
        short_name: r.name.split(' ')[0],
        description: r.description,
        theme_color: '#b3261e',
        background_color: '#fbf6ec',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        scope: './',
        categories: ['food', 'shopping'],
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell + small product photos are precached so the menu works offline.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}', 'images/*-400.webp', 'images/hero-960.webp'],
        navigateFallback: 'index.html',
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/images/'),
            handler: 'CacheFirst',
            options: { cacheName: 'images', expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 } },
          },
          {
            // the published menu file: always try the network first so price changes show up
            urlPattern: ({ url }) => url.pathname.endsWith('/catalog.json'),
            handler: 'NetworkFirst',
            options: { cacheName: 'catalog', networkTimeoutSeconds: 4 },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
})
