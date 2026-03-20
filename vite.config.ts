import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'jsmediatags': 'jsmediatags/dist/jsmediatags.min.js',
    },
  },
  server: {
    host: true, // Enables local network access (e.g. 192.168.x.x)
    port: 5173,
    proxy: {
      '/api': 'http://127.0.0.1:3001',
      '/uploads': 'http://127.0.0.1:3001'
    }
  }
})
