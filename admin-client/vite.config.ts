import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    // Use relative base so the build works regardless of the public root or domain
    // This avoids hard-coding "/admin/" which breaks when the app is served at root
    base: './',
    envPrefix: ['VITE_', 'CLOUDPUB_'],
    define: {
      __CLOUDPUB_SERVER_URL__: JSON.stringify(env.CLOUDPUB_SERVER_URL || ''),
      __CLOUDPUB_ADMIN_URL__: JSON.stringify(env.CLOUDPUB_ADMIN_URL || ''),
    },
    server: {
      port: 3002,
      host: '0.0.0.0',
      strictPort: true,
      allowedHosts: ['admin-client', 'localhost', '.cloudpub.ru']
    }
  }
})
