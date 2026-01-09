import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => ({
    plugins: [react()],
    base: command === 'build' || mode === 'production' ? '/conference/' : '/',
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 9087,
    },
    preview: {
        port: 9087,
        allowedHosts: ['rnd.dacon.kr'],
    },
}))
