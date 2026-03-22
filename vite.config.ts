import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: false,
        devOptions: {
          enabled: true
        },
        manifest: {
          name: 'The Courtyard F Wing',
          short_name: 'Courtyard F',
          description: 'Transparent Fund Management',
          theme_color: '#5A5A40',
          background_color: '#F5F5F0',
          display: 'standalone',
          icons: [
            {
              src: 'https://raw.githubusercontent.com/acegikmo135/assets/main/vbub4efh.jpg',
              sizes: '192x192',
              type: 'image/jpeg',
              purpose: 'any maskable'
            },
            {
              src: 'https://raw.githubusercontent.com/acegikmo135/assets/main/vbub4efh.jpg',
              sizes: '512x512',
              type: 'image/jpeg',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
