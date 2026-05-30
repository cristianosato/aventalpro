import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Evita warnings de módulos muito grandes do Firebase
      output: {
        manualChunks: {
          firebase: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
          react: ['react', 'react-dom'],
        }
      }
    },
    chunkSizeWarningLimit: 1000,
  },
  // Garante que Vite entende os módulos do Firebase corretamente
  optimizeDeps: {
    include: ['firebase/app', 'firebase/firestore', 'firebase/auth'],
  },
  // Necessário para Firebase funcionar no browser corretamente
  define: {
    'process.env': {}
  }
})
