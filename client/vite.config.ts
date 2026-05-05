import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { readdirSync } from 'fs'

// libsodium-wrappers-sumo's ESM build does `import "./libsodium-sumo.mjs"` as a
// relative path, but in Bun's content-addressable store the two packages live in
// separate directories. This plugin redirects that import to the actual file.
function findLibsodiumSumo(): string {
  const bunDir = path.resolve(__dirname, '../node_modules/.bun')
  const entry = readdirSync(bunDir).find(d => d.startsWith('libsodium-sumo@'))
  if (!entry) throw new Error('libsodium-sumo not found in Bun package store')
  return path.join(bunDir, entry, 'node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs')
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  optimizeDeps: {
    include: [
      '@meshsdk/core',
      '@meshsdk/react',
    ],
    esbuildOptions: {
      target: 'esnext',
      plugins: [
        {
          name: 'fix-libsodium-sumo',
          setup(build) {
            const sumoPath = findLibsodiumSumo()
            build.onResolve({ filter: /^\.\/libsodium-sumo\.mjs$/ }, () => ({
              path: sumoPath,
            }))
          },
        },
      ],
    },
  },
})
