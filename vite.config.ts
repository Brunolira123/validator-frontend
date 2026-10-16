import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Ícones gerados a partir do VRUtil.ico oficial (laranja com engrenagem)
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'icons/*.png'],
      manifest: {
        name: 'Portal VRIP',
        short_name: 'Portal VRIP',
        description: 'Portal VRIP: módulos Comercial (Validador de Infraestrutura), Monitoramento e outros',
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
          // Maskable: fundo cheio no degradê do ícone (Android recorta em círculo/squircle)
          {
            src: '/icons/maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: '/icons/maskable-512.png',
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
        target: 'http://localhost:8075',
        changeOrigin: true,
        // Acessando pelo IP da rede (celular), o Origin não está na lista de CORS do backend
        // e o Spring devolve 403. Pelo proxy é mesma origem, então o Origin pode ser removido.
        configure: (proxy) => {
          proxy.on('proxyReq', (proxyReq) => proxyReq.removeHeader('origin'));
        },
      },
    },
  },
})