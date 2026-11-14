import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import inaCbgCmi from './api/ina-cbg-cmi.mjs'

function inaCbgEndpoint() {
  const mount = (server: {middlewares: {use: (path: string, handler: typeof inaCbgCmi) => void}}) =>
    server.middlewares.use('/api/ina-cbg-cmi', inaCbgCmi)
  return {name: 'local-ina-cbg-cmi', configureServer: mount, configurePreviewServer: mount}
}

export default defineConfig(async ({ mode }) => {
  const keyName = 'NEXT_PUBLIC_AkunSUPABASE_PUBLISHABLE_KEY'
  const fallbackName = 'VITE_SUPABASE_PUBLISHABLE_KEY'
  const env = loadEnv(mode, import.meta.dirname, [keyName, fallbackName])
  const integrationKey = env[keyName]?.trim()
  const authKey = integrationKey || env[fallbackName]?.trim()

  if (mode === 'vercel') {
    if (!authKey?.startsWith('sb_publishable_')) {
      throw new Error(`Set ${keyName} or ${fallbackName} before deploying to Vercel.`)
    }

    const settings = await fetch('https://vowutzxizrrywpwcobth.supabase.co/auth/v1/settings', {
      headers: { apikey: authKey },
      signal: AbortSignal.timeout(10_000),
    }).catch(() => null)
    if (!settings?.ok) {
      throw new Error('Cannot verify the publishable key against the Akun Supabase project.')
    }
  }

  return {
    plugins: [react(), tailwindcss(), inaCbgEndpoint()],
    define: {
      [`import.meta.env.${keyName}`]: JSON.stringify(integrationKey ?? ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, './src'),
      },
    },
  }
})
