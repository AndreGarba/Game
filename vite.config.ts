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
        // Jogo novo: nome, descrição e ícones (public/icones) aqui e no index.html.
        name: 'Game Template',
        short_name: 'Game Template',
        description: 'Jogo de exemplo do template: corra, pule e pegue moedas.',
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
        // Arquivo acima disto fica fora do precache sem aviso no jogo: suba o teto se a arte crescer.
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  // O pedaço da TelaRpg leva o three.js (~520 kB, 140 kB com gzip). Ele é import() à parte e baixa
  // durante a abertura, então o aviso padrão de 500 kB não diz nada aqui.
  build: { chunkSizeWarningLimit: 600 },
  server: { host: true },
})
