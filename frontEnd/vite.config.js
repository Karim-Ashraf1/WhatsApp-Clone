import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://api-gateway:5000',
        changeOrigin: true,
        secure: false,
        ws: true
      },
      '/socket.io': {
        target: 'http://api-gateway:5000',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  }
})