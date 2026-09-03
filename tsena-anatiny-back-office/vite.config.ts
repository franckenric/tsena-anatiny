import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:8080";

  return {
    plugins: [react()],
    server: {
      // Bind to 0.0.0.0 so the dev server is reachable from the phone/emulator
      // over the LAN (needed for Capacitor's server.url dev flow).
      host: true,
      port: 5175,
      strictPort: true,
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
        }
      }
    }
  };
});
