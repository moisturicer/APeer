import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import wasm from 'vite-plugin-wasm'
import topLevelAwait from 'vite-plugin-top-level-await'
import path from 'path'
import { readdirSync } from 'fs'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// libsodium-wrappers-sumo's ESM build does `import "./libsodium-sumo.mjs"` as a
// relative path, but in Bun's content-addressable store the two packages live in
// separate directories. This plugin redirects that import to the actual file
// during both dev serving and production builds.
function fixLibsodiumSumo(): Plugin {
  const bunDir = path.resolve(__dirname, '../node_modules/.bun')
  const entry = readdirSync(bunDir).find(d => d.startsWith('libsodium-sumo@'))
  if (!entry) throw new Error('libsodium-sumo not found in Bun package store')
  const sumoPath = path.join(bunDir, entry, 'node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs')

  return {
    name: 'fix-libsodium-sumo',
    resolveId(id, importer) {
      if (id === './libsodium-sumo.mjs' && importer?.includes('libsodium-wrappers')) {
        return sumoPath
      }
    },
  }
}

export default defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
    wasm(),
    topLevelAwait(),
    react(),
    fixLibsodiumSumo()
  ],
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
            const bunDir = path.resolve(__dirname, '../node_modules/.bun')
            const entry = readdirSync(bunDir).find(d => d.startsWith('libsodium-sumo@'))
            if (!entry) throw new Error('libsodium-sumo not found in Bun package store')
            const sumoPath = path.join(bunDir, entry, 'node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs')
            build.onResolve({ filter: /^\.\/libsodium-sumo\.mjs$/ }, () => ({ path: sumoPath }))
          },
        },
      ],
    },
  },
})
