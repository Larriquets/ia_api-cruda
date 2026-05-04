import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const spaFallback = () => ({
  name: 'spa-fallback',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url && !req.url.includes('.') && !req.url.startsWith('/@') && !req.url.startsWith('/node_modules')) {
        req.url = '/'
      }
      next()
    })
  },
})

export default defineConfig({
  plugins: [react(), spaFallback()],
  server: {
    port: 5173,
  },
})
