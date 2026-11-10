import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig(({ mode }) => {
  const keyName = 'NEXT_PUBLIC_AkunSUPABASE_PUBLISHABLE_KEY'
  const env = loadEnv(mode, import.meta.dirname, keyName)
  return {
    plugins: [react(), tailwindcss()],
    define: {
      [`import.meta.env.${keyName}`]: JSON.stringify(env[keyName] ?? ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
