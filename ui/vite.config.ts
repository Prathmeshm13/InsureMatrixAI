import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Proxy /mongo-api/* → local Express server (mongo-api.cjs)
      '/mongo-api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
})
