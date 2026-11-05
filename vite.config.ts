import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    // Jogo instalável e offline. autoUpdate: deploy novo entra na próxima abertura, sem pedir nada.
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        id: '/',
        name: 'Hora do Banho',
        short_name: 'Hora do Banho',
        description: 'Fuja do tutor. Banho, hoje não!',
        lang: 'pt-BR',
        start_url: '/',
        scope: '/',
        // Jogo: tela cheia e deitado, como o cenário foi desenhado.
        display: 'fullscreen',
        display_override: ['fullscreen', 'standalone'],
        orientation: 'landscape',
        // Cor do primeiro quadro da abertura: a tela de carregamento do Android emenda nela.
        background_color: '#f8f7fa',
        theme_color: '#f8f7fa',
        icons: [
          { src: '/icones/icone-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icones/icone-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icones/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Tudo no precache: depois da primeira abertura o jogo roda sem internet. woff fica de
        // fora porque todo navegador que instala PWA lê woff2.
        globPatterns: ['**/*.{js,css,html,webp,png,svg,mp3,woff2}'],
        // O Three.js passa de 500 kB; o padrão de 2 MB do Workbox cobre, mas fica explícito.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  server: { host: true },
})
