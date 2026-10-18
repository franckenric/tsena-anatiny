import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { fileURLToPath, URL } from "node:url";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Les 3 projets partagent un seul .env a la racine du depot.
  const repoRoot = fileURLToPath(new URL("..", import.meta.url));
  const env = loadEnv(mode, repoRoot, "");
  const proxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:8080";
  // Nom de la boutique, repris dans le manifest PWA (comme le front-office).
  const projectName = env.VITE_PROJECT_NAME?.trim() || "Tsena Anatiny";
  // Vrai dans le compose dev → le watcher Vite poll le systeme de fichiers.
  // Necessaire quand la source est un bind mount Docker (Windows/macOS
  // Docker Desktop), ou les evenements inotify ne circulent pas. Desactive
  // hors Docker (VITE_USE_POLLING vide).
  const usePolling = env.VITE_USE_POLLING === "true";

  return {
    // Charge .env depuis la racine du depot (fichier unique partage).
    envDir: repoRoot,
    plugins: [
      react(),
      // PWA : le back-office n'avait ni manifest ni service worker, il n'etait
      // donc pas installable (au contraire du front-office). On ajoute le
      // manifest + le service worker pour qu'il s'installe (iOS / Android /
      // bureau) et serve l'app shell hors connexion.
      VitePWA({
        // autoUpdate : l'admin charge toujours la derniere version (pas de
        // banniere de mise a jour a gerer dans l'UI).
        registerType: "autoUpdate",
        injectRegister: "auto",
        includeAssets: [
          "favicon.png",
          "apple-touch-icon.png",
          "apple-touch-icon-512.png",
          "apple-touch-icon-precomposed.png",
          "logo.png",
          "icons/pwa-192x192.png",
          "icons/pwa-512x512.png",
          "icons/pwa-maskable-512x512.png"
        ],
        manifest: {
          id: "/",
          name: `${projectName} — Back Office`,
          short_name: "Back Office",
          description:
            "Gestion de la boutique : produits, stock, commandes, clients et livraisons.",
          lang: "fr",
          dir: "ltr",
          start_url: "/",
          scope: "/",
          display: "standalone",
          display_override: ["standalone", "minimal-ui"],
          background_color: "#ffffff",
          theme_color: "#e85a28",
          categories: ["business", "productivity"],
          icons: [
            {
              src: "/icons/pwa-192x192.png",
              sizes: "192x192",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/icons/pwa-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "any"
            },
            {
              src: "/icons/pwa-maskable-512x512.png",
              sizes: "512x512",
              type: "image/png",
              purpose: "maskable"
            }
          ]
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2,ttf,webmanifest}"],
          // SPA (BrowserRouter) : une navigation retombe sur l'app shell.
          navigateFallback: "/index.html",
          // Les appels API ne passent jamais par le cache : les donnees du
          // back-office (commandes, clients, stock) doivent rester fraiches.
          navigateFallbackDenylist: [/^\/api\//, /^\/files\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true
        },
        devOptions: {
          enabled: false,
          suppressWarnings: true
        }
      })
    ],
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
