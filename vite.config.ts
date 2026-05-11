import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
      '/qhimgs1': {
        target: 'https://p3.ssl.qhimgs1.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/qhimgs1/, ''),
        headers: {
          Referer: 'https://p3.ssl.qhimgs1.com/',
        },
      },
    },
  },
})
