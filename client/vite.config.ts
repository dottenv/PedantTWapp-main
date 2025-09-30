import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    base: '/',
    envPrefix: ['VITE_', 'CLOUDPUB_'],
    define: {
      __CLOUDPUB_SERVER_URL__: JSON.stringify(env.CLOUDPUB_SERVER_URL || ''),
      __CLOUDPUB_CLIENT_URL__: JSON.stringify(env.CLOUDPUB_CLIENT_URL || ''),
    },
    server: {
      port: 3000,
      host: '0.0.0.0',
      strictPort: true,
      allowedHosts: ['client', 'localhost', '.cloudpub.ru']
    }
  }
})
