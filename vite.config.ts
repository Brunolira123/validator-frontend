import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Validador de Infraestrutura VR',
        short_name: 'Validador VR',
        description: 'Levantamento e validação de infraestrutura para clientes VR',
        theme_color: '#171717',
        background_color: '#171717',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Sem cache de /api: análises e status precisam vir sempre frescos.
        // Também impede o SW de servir index.html no lugar de chamadas à API.
        navigateFallbackDenylist: [/^\/api\//],
      },
    }),
  ],
  server: {
    host: '0.0.0.0',   // ← ADICIONA ESSA LINHA
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
})