
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve('./'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 9002,
    strictPort: true
  },
  build: {
    outDir: 'build', // Output to 'build' folder instead of 'dist'
    chunkSizeWarningLimit: 1600,
  }
})