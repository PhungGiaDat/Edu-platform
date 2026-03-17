import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [
      react(),
      tailwindcss()
    ],


    resolve:{
      alias:{
        '@': path.resolve(__dirname, './src'),
      },
    },

    assetsInclude: [
      '**/*.iset',
      '**/*.fset',
      '**/*.fset3',
      '**/*.mind',
      '**/*.flist'
    ],
    build: {
      // Use terser to strip all console.log/debugger calls from production bundle.
      // The project has 200+ console.log calls across AR/game/pet code — removing
      // them shaves meaningful parse/execution time on iOS Safari.
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Three.js ecosystem — split into its own chunk to reduce main bundle
            if (id.includes('node_modules/three') || 
                id.includes('node_modules/@react-three')) {
              return 'three-vendor';
            }
            // React core — isolated for long-term caching
            if (id.includes('node_modules/react') ||
                id.includes('node_modules/react-dom') ||
                id.includes('node_modules/react-router')) {
              return 'react-vendor';
            }
          }
        }
      }
    },

    server: {
      host: '0.0.0.0',
      port: 5173,
      cors: true,
      hmr: {
        clientPort: 443,
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
      },
      allowedHosts: [
        'localhost',
        '.trycloudflare.com',
        '.ngrok.io',
        '.ngrok-free.app',
        env.VITE_PUBLIC_HOST?.replace(/^https?:\/\//, ''),
      ].filter(Boolean),
      
      // ✅ PROXY - Forward to backend
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, ''), // ✅ Remove /api prefix
        },
          '/assets/model2D': {  // ✅ Chỉ proxy model2D
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
        // '/assets': {
        //   target: 'http://localhost:8000',
        //   changeOrigin: true,
        //   secure: false,
        // },
        '/ws': {
          target: 'ws://localhost:8000',
          changeOrigin: true,
          ws: true,
          secure: false,
        },
      },
    },
  }
})
