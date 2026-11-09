import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    host: true, // aynı Wi-Fi'daki cihazlardan da açılabilsin
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
  },
});
