import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // For Docker
    port: 5173,
    allowedHosts: ['2605.batuhan.cloud', 'batuhan.cloud', 'localhost', '.batuhan.cloud'],
    proxy: {
      '/api': {
        target: 'http://backend:8000',
        changeOrigin: true
      }
    }
  }
})
