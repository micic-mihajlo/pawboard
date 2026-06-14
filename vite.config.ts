import { defineConfig } from 'vite'
import { devtools } from '@tanstack/devtools-vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'

// Load `.env` into process.env so server functions (DATABASE_URL,
// OPERATOR_ACCESS_CODE) see it during dev and build.
try {
  ;(process as { loadEnvFile?: (path?: string) => void }).loadEnvFile?.()
} catch {
  // No .env file present (e.g. CI/production) — rely on real env vars.
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({ rollupConfig: { external: [/^@sentry\//] } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
})

export default config
