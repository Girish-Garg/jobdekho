import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The version Settings shows (lib/project.js), from the one package.json the
// release bumps, so the page and the npm package never disagree.
const { version } = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

const proxy = {
  target: 'http://localhost:3000',
  changeOrigin: true,
};

export default defineConfig({
  plugins: [react()],
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: {
    proxy: {
      // ws: Apply assist's live view is a WebSocket under /api.
      '/api': { ...proxy, ws: true },
      '/auth': proxy,
    },
  },
});
