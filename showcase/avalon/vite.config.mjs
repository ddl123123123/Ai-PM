import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const path = (file) => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  root: path('./'),
  base: './',
  plugins: [
    {
      name: 'portfolio-room-session',
      enforce: 'pre',
      resolveId(source, importer) {
        if (!importer?.includes('/src/')) return;
        if (/\/net\/(client|route)$/.test(source)) return path('./session.ts');
        if (/\/net\/account$/.test(source)) return path('./account.ts');
      },
    },
    react(),
  ],
});
