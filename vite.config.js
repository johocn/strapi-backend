import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [
    uni()
  ],
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern'
      }
    }
  },
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: false
  },
  build: {
    outDir: 'dist/build/h5',
    emptyOutDir: false
  }
})
