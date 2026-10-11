import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:8080";
  // Vrai dans le compose dev → le watcher Vite poll le systeme de fichiers.
  // Necessaire quand la source est un bind mount Docker (Windows/macOS
  // Docker Desktop), ou les evenements inotify ne circulent pas. Desactive
  // hors Docker (VITE_USE_POLLING vide).
  const usePolling = env.VITE_USE_POLLING === "true";

  return {
    plugins: [react()],
    server: {
      // Bind to 0.0.0.0 so the dev server is reachable from the phone/emulator
      // over the LAN (needed for Capacitor's server.url dev flow).
      host: true,
      port: 5175,
      strictPort: true,
      // Polling : les changements .ts/.tsx sont detectes sans rebuild.
      watch: usePolling
        ? { usePolling: true, interval: 300, ignored: ["**/dist/**", "**/node_modules/**"] }
        : undefined,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true
        },
        // Notifications WebSocket (proxied because the WebView resolves
        // window.location.host to the dev server, not the backend).
        "/ws": {
          target: proxyTarget,
          changeOrigin: true,
          ws: true
        },
        // Fichiers statiques (images produits) : l'API les sert sous
        // /files/..., on doit les proxyer comme /api depuis le dev server.
        "/files": {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    }
  };
});
