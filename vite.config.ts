import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      VitePWA({
        registerType: 'prompt',
        injectRegister: null,
        devOptions: {
          enabled: false,
        },
        manifest: {
          name: 'Courtyard F',
          short_name: 'Courtyard F',
          description: 'Transparent Fund Management',
          theme_color: '#1d4ed8',
          background_color: '#F5F5F0',
          display: 'standalone',
          start_url: '/',
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
      port: 5000,
      host: '0.0.0.0',
      allowedHosts: true,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: {
        ignored: [
          '**/.local/**',
          '**/dev-dist/**',
          '**/node_modules/**',
          '**/.git/**',
          '**/.cache/**',
          '**/dist/**',
        ],
      },
    },
  };
});
