import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/analyse': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/analyse-pediatric': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      }
    }
  }
})
