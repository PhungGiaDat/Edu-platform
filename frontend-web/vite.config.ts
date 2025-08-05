import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


// 👇 defineConfig giúp gợi ý type chính xác trong TS
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  return {
    plugins: [
      react(),
      tailwindcss() // 👈 Plugin Tailwind CSS cho Vite
    ],
    server: {
      host: '0.0.0.0', // 👈 Bắt buộc cho cloudflared / test mobile
      port: 5173,      // default của Vite
      cors: true,      // Nếu bạn gọi API từ frontend (để test)
      hmr: {
        clientPort: 443, // 👈 Fix HMR khi dùng cloudflared HTTPS
      },
      headers: {
        'Access-Control-Allow-Origin': '*', // optional
      },
      allowedHosts: [
        env.VITE_PUBLIC_HOST?.replace(/^https?:\/\//, '') || 'localhost'
      ],
    },
  }
})
