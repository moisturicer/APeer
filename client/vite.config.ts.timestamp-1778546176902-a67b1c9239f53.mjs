// vite.config.ts
import { defineConfig } from "file:///mnt/c/Users/hp/Desktop/projects/APeer/APeer/node_modules/.bun/vite@5.4.21+144f69348538ea2c/node_modules/vite/dist/node/index.js";
import react from "file:///mnt/c/Users/hp/Desktop/projects/APeer/APeer/node_modules/.bun/@vitejs+plugin-react@4.7.0+e4f25f48d7a373c1/node_modules/@vitejs/plugin-react/dist/index.js";
import wasm from "file:///mnt/c/Users/hp/Desktop/projects/APeer/APeer/node_modules/.bun/vite-plugin-wasm@3.6.0+e4f25f48d7a373c1/node_modules/vite-plugin-wasm/exports/import.mjs";
import topLevelAwait from "file:///mnt/c/Users/hp/Desktop/projects/APeer/APeer/node_modules/.bun/vite-plugin-top-level-await@1.6.0+86c8f53f8cc89d0e/node_modules/vite-plugin-top-level-await/exports/import.mjs";
import path from "path";
import { readdirSync } from "fs";
import { nodePolyfills } from "file:///mnt/c/Users/hp/Desktop/projects/APeer/APeer/node_modules/.bun/vite-plugin-node-polyfills@0.26.0+86c8f53f8cc89d0e/node_modules/vite-plugin-node-polyfills/dist/index.js";
var __vite_injected_original_dirname = "/mnt/c/Users/hp/Desktop/projects/APeer/APeer/client";
function fixLibsodiumSumo() {
  const bunDir = path.resolve(__vite_injected_original_dirname, "../node_modules/.bun");
  const entry = readdirSync(bunDir).find((d) => d.startsWith("libsodium-sumo@"));
  if (!entry) throw new Error("libsodium-sumo not found in Bun package store");
  const sumoPath = path.join(bunDir, entry, "node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs");
  return {
    name: "fix-libsodium-sumo",
    resolveId(id, importer) {
      if (id === "./libsodium-sumo.mjs" && importer?.includes("libsodium-wrappers")) {
        return sumoPath;
      }
    }
  };
}
var vite_config_default = defineConfig({
  plugins: [
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true
      },
      protocolImports: true
    }),
    wasm(),
    topLevelAwait(),
    react(),
    fixLibsodiumSumo()
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  },
  optimizeDeps: {
    include: [
      "@meshsdk/core",
      "@meshsdk/react"
    ],
    esbuildOptions: {
      target: "esnext",
      plugins: [
        {
          name: "fix-libsodium-sumo",
          setup(build) {
            const bunDir = path.resolve(__vite_injected_original_dirname, "../node_modules/.bun");
            const entry = readdirSync(bunDir).find((d) => d.startsWith("libsodium-sumo@"));
            if (!entry) throw new Error("libsodium-sumo not found in Bun package store");
            const sumoPath = path.join(bunDir, entry, "node_modules/libsodium-sumo/dist/modules-sumo-esm/libsodium-sumo.mjs");
            build.onResolve({ filter: /^\.\/libsodium-sumo\.mjs$/ }, () => ({ path: sumoPath }));
          }
        }
      ]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvbW50L2MvVXNlcnMvaHAvRGVza3RvcC9wcm9qZWN0cy9BUGVlci9BUGVlci9jbGllbnRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9tbnQvYy9Vc2Vycy9ocC9EZXNrdG9wL3Byb2plY3RzL0FQZWVyL0FQZWVyL2NsaWVudC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vbW50L2MvVXNlcnMvaHAvRGVza3RvcC9wcm9qZWN0cy9BUGVlci9BUGVlci9jbGllbnQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcsIHR5cGUgUGx1Z2luIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5pbXBvcnQgd2FzbSBmcm9tICd2aXRlLXBsdWdpbi13YXNtJ1xyXG5pbXBvcnQgdG9wTGV2ZWxBd2FpdCBmcm9tICd2aXRlLXBsdWdpbi10b3AtbGV2ZWwtYXdhaXQnXHJcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnXHJcbmltcG9ydCB7IHJlYWRkaXJTeW5jIH0gZnJvbSAnZnMnXHJcbmltcG9ydCB7IG5vZGVQb2x5ZmlsbHMgfSBmcm9tICd2aXRlLXBsdWdpbi1ub2RlLXBvbHlmaWxscydcclxuXHJcbi8vIGxpYnNvZGl1bS13cmFwcGVycy1zdW1vJ3MgRVNNIGJ1aWxkIGRvZXMgYGltcG9ydCBcIi4vbGlic29kaXVtLXN1bW8ubWpzXCJgIGFzIGFcclxuLy8gcmVsYXRpdmUgcGF0aCwgYnV0IGluIEJ1bidzIGNvbnRlbnQtYWRkcmVzc2FibGUgc3RvcmUgdGhlIHR3byBwYWNrYWdlcyBsaXZlIGluXHJcbi8vIHNlcGFyYXRlIGRpcmVjdG9yaWVzLiBUaGlzIHBsdWdpbiByZWRpcmVjdHMgdGhhdCBpbXBvcnQgdG8gdGhlIGFjdHVhbCBmaWxlXHJcbi8vIGR1cmluZyBib3RoIGRldiBzZXJ2aW5nIGFuZCBwcm9kdWN0aW9uIGJ1aWxkcy5cclxuZnVuY3Rpb24gZml4TGlic29kaXVtU3VtbygpOiBQbHVnaW4ge1xyXG4gIGNvbnN0IGJ1bkRpciA9IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9ub2RlX21vZHVsZXMvLmJ1bicpXHJcbiAgY29uc3QgZW50cnkgPSByZWFkZGlyU3luYyhidW5EaXIpLmZpbmQoZCA9PiBkLnN0YXJ0c1dpdGgoJ2xpYnNvZGl1bS1zdW1vQCcpKVxyXG4gIGlmICghZW50cnkpIHRocm93IG5ldyBFcnJvcignbGlic29kaXVtLXN1bW8gbm90IGZvdW5kIGluIEJ1biBwYWNrYWdlIHN0b3JlJylcclxuICBjb25zdCBzdW1vUGF0aCA9IHBhdGguam9pbihidW5EaXIsIGVudHJ5LCAnbm9kZV9tb2R1bGVzL2xpYnNvZGl1bS1zdW1vL2Rpc3QvbW9kdWxlcy1zdW1vLWVzbS9saWJzb2RpdW0tc3Vtby5tanMnKVxyXG5cclxuICByZXR1cm4ge1xyXG4gICAgbmFtZTogJ2ZpeC1saWJzb2RpdW0tc3VtbycsXHJcbiAgICByZXNvbHZlSWQoaWQsIGltcG9ydGVyKSB7XHJcbiAgICAgIGlmIChpZCA9PT0gJy4vbGlic29kaXVtLXN1bW8ubWpzJyAmJiBpbXBvcnRlcj8uaW5jbHVkZXMoJ2xpYnNvZGl1bS13cmFwcGVycycpKSB7XHJcbiAgICAgICAgcmV0dXJuIHN1bW9QYXRoXHJcbiAgICAgIH1cclxuICAgIH0sXHJcbiAgfVxyXG59XHJcblxyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtcclxuICAgIG5vZGVQb2x5ZmlsbHMoe1xyXG4gICAgICBnbG9iYWxzOiB7XHJcbiAgICAgICAgQnVmZmVyOiB0cnVlLFxyXG4gICAgICAgIGdsb2JhbDogdHJ1ZSxcclxuICAgICAgICBwcm9jZXNzOiB0cnVlLFxyXG4gICAgICB9LFxyXG4gICAgICBwcm90b2NvbEltcG9ydHM6IHRydWUsXHJcbiAgICB9KSxcclxuICAgIHdhc20oKSxcclxuICAgIHRvcExldmVsQXdhaXQoKSxcclxuICAgIHJlYWN0KCksXHJcbiAgICBmaXhMaWJzb2RpdW1TdW1vKClcclxuICBdLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MTczLFxyXG4gICAgcHJveHk6IHtcclxuICAgICAgJy9hcGknOiB7XHJcbiAgICAgICAgdGFyZ2V0OiAnaHR0cDovL2xvY2FsaG9zdDozMDAwJyxcclxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICBpbmNsdWRlOiBbXHJcbiAgICAgICdAbWVzaHNkay9jb3JlJyxcclxuICAgICAgJ0BtZXNoc2RrL3JlYWN0JyxcclxuICAgIF0sXHJcbiAgICBlc2J1aWxkT3B0aW9uczoge1xyXG4gICAgICB0YXJnZXQ6ICdlc25leHQnLFxyXG4gICAgICBwbHVnaW5zOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbmFtZTogJ2ZpeC1saWJzb2RpdW0tc3VtbycsXHJcbiAgICAgICAgICBzZXR1cChidWlsZCkge1xyXG4gICAgICAgICAgICBjb25zdCBidW5EaXIgPSBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vbm9kZV9tb2R1bGVzLy5idW4nKVxyXG4gICAgICAgICAgICBjb25zdCBlbnRyeSA9IHJlYWRkaXJTeW5jKGJ1bkRpcikuZmluZChkID0+IGQuc3RhcnRzV2l0aCgnbGlic29kaXVtLXN1bW9AJykpXHJcbiAgICAgICAgICAgIGlmICghZW50cnkpIHRocm93IG5ldyBFcnJvcignbGlic29kaXVtLXN1bW8gbm90IGZvdW5kIGluIEJ1biBwYWNrYWdlIHN0b3JlJylcclxuICAgICAgICAgICAgY29uc3Qgc3Vtb1BhdGggPSBwYXRoLmpvaW4oYnVuRGlyLCBlbnRyeSwgJ25vZGVfbW9kdWxlcy9saWJzb2RpdW0tc3Vtby9kaXN0L21vZHVsZXMtc3Vtby1lc20vbGlic29kaXVtLXN1bW8ubWpzJylcclxuICAgICAgICAgICAgYnVpbGQub25SZXNvbHZlKHsgZmlsdGVyOiAvXlxcLlxcL2xpYnNvZGl1bS1zdW1vXFwubWpzJC8gfSwgKCkgPT4gKHsgcGF0aDogc3Vtb1BhdGggfSkpXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0sXHJcbiAgICAgIF0sXHJcbiAgICB9LFxyXG4gIH0sXHJcbn0pXHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMlUsU0FBUyxvQkFBaUM7QUFDclgsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixPQUFPLG1CQUFtQjtBQUMxQixPQUFPLFVBQVU7QUFDakIsU0FBUyxtQkFBbUI7QUFDNUIsU0FBUyxxQkFBcUI7QUFOOUIsSUFBTSxtQ0FBbUM7QUFZekMsU0FBUyxtQkFBMkI7QUFDbEMsUUFBTSxTQUFTLEtBQUssUUFBUSxrQ0FBVyxzQkFBc0I7QUFDN0QsUUFBTSxRQUFRLFlBQVksTUFBTSxFQUFFLEtBQUssT0FBSyxFQUFFLFdBQVcsaUJBQWlCLENBQUM7QUFDM0UsTUFBSSxDQUFDLE1BQU8sT0FBTSxJQUFJLE1BQU0sK0NBQStDO0FBQzNFLFFBQU0sV0FBVyxLQUFLLEtBQUssUUFBUSxPQUFPLHNFQUFzRTtBQUVoSCxTQUFPO0FBQUEsSUFDTCxNQUFNO0FBQUEsSUFDTixVQUFVLElBQUksVUFBVTtBQUN0QixVQUFJLE9BQU8sMEJBQTBCLFVBQVUsU0FBUyxvQkFBb0IsR0FBRztBQUM3RSxlQUFPO0FBQUEsTUFDVDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0Y7QUFFQSxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUEsSUFDUCxjQUFjO0FBQUEsTUFDWixTQUFTO0FBQUEsUUFDUCxRQUFRO0FBQUEsUUFDUixRQUFRO0FBQUEsUUFDUixTQUFTO0FBQUEsTUFDWDtBQUFBLE1BQ0EsaUJBQWlCO0FBQUEsSUFDbkIsQ0FBQztBQUFBLElBQ0QsS0FBSztBQUFBLElBQ0wsY0FBYztBQUFBLElBQ2QsTUFBTTtBQUFBLElBQ04saUJBQWlCO0FBQUEsRUFDbkI7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBLEVBQ0Y7QUFBQSxFQUNBLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxjQUFjO0FBQUEsSUFDWixTQUFTO0FBQUEsTUFDUDtBQUFBLE1BQ0E7QUFBQSxJQUNGO0FBQUEsSUFDQSxnQkFBZ0I7QUFBQSxNQUNkLFFBQVE7QUFBQSxNQUNSLFNBQVM7QUFBQSxRQUNQO0FBQUEsVUFDRSxNQUFNO0FBQUEsVUFDTixNQUFNLE9BQU87QUFDWCxrQkFBTSxTQUFTLEtBQUssUUFBUSxrQ0FBVyxzQkFBc0I7QUFDN0Qsa0JBQU0sUUFBUSxZQUFZLE1BQU0sRUFBRSxLQUFLLE9BQUssRUFBRSxXQUFXLGlCQUFpQixDQUFDO0FBQzNFLGdCQUFJLENBQUMsTUFBTyxPQUFNLElBQUksTUFBTSwrQ0FBK0M7QUFDM0Usa0JBQU0sV0FBVyxLQUFLLEtBQUssUUFBUSxPQUFPLHNFQUFzRTtBQUNoSCxrQkFBTSxVQUFVLEVBQUUsUUFBUSw0QkFBNEIsR0FBRyxPQUFPLEVBQUUsTUFBTSxTQUFTLEVBQUU7QUFBQSxVQUNyRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
