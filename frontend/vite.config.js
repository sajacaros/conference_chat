import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/conference/',
  server: {
    port: 9087, // Dev server port
  },
  preview: {
    port: 9087, // Preview server port
    allowedHosts: ['rnd.dacon.kr'],
  },
})
