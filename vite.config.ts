import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages serves from /<repo>/, not the domain root. The deploy workflow
  // sets VITE_BASE from the repository name; locally it stays '/'.
  base: process.env.VITE_BASE ?? '/',
  server: {
    host: '127.0.0.1',
    // Honour an assigned PORT so the server can share a machine with other dev
    // servers; falls back to the project's usual port when nothing is set.
    port: Number(process.env.PORT) || 5188,
    strictPort: true,
  },
  preview: {
    host: '127.0.0.1',
    port: Number(process.env.PORT) || 4188,
    strictPort: true,
  },
  build: {
    sourcemap: true,
    chunkSizeWarningLimit: 900,
  },
});
