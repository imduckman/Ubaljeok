import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': process.env.UBALJEOK_API_PROXY_TARGET ?? 'http://localhost',
    },
  },
})
