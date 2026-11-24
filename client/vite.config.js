import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Browser calls /api/... on the Vite server, which forwards to Express.
    // Same origin => no CORS problem, and cookies (JWT) will work later.
    proxy: {
      '/api': 'http://localhost:5000',
    },
  },
})
