import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Pour un déploiement GitHub Pages sur un repo non-racine, remplacer '/' par '/NOM_DU_REPO/'.
export default defineConfig({
  plugins: [react()],
  base: '/caroussel-maker/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
