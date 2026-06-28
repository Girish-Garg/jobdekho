import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const proxy = {
  target: 'http://localhost:3000',
  changeOrigin: true,
};

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': proxy,
      '/auth': proxy,
    },
  },
});
