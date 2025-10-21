import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [
      react(),
      tailwindcss()
    ],
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
        '/assets': {
          target: 'http://localhost:8000',
          changeOrigin: true,
          secure: false,
        },
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
