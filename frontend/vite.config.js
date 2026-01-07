import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 9087, // 원하는 포트로 변경하세요 (Change to desired port)
  },
})
