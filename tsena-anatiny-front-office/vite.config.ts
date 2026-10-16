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
  const projectName = env.VITE_PROJECT_NAME?.trim() || "Tsena Anatiny";
  const isDev = mode !== "production";
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
      VitePWA({
        registerType: "prompt",
        injectRegister: null,
        includeAssets: [
          "favicon.svg",
          "favicon.png",
          "apple-touch-icon.png",
          "logo.png",
          "icons/pwa-192x192.png",
          "icons/pwa-512x512.png",
          "icons/pwa-maskable-512x512.png"
        ],
        manifest: {
          id: "/",
          name: `${projectName} — Boutique en ligne`,
          short_name: projectName,
          description:
            "Commandez vos produits et suivez vos commandes. Boutique en ligne, disponible hors connexion.",
          lang: "fr",
          dir: "ltr",
          start_url: "/",
          scope: "/",
          display: "standalone",
          display_override: ["standalone", "minimal-ui"],
          orientation: "portrait",
          background_color: "#f7f5f2",
          theme_color: "#d14715",
          categories: ["shopping", "food"],
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
          ],
          shortcuts: [
            {
              name: "Mon panier",
              short_name: "Panier",
              url: "/panier",
              icons: [{ src: "/icons/pwa-192x192.png", sizes: "192x192" }]
            },
            {
              name: "Mon compte",
              short_name: "Compte",
              url: "/compte",
              icons: [{ src: "/icons/pwa-192x192.png", sizes: "192x192" }]
            },
            {
              name: "Nouveautes",
              short_name: "Nouveautes",
              url: "/nouveautes",
              icons: [{ src: "/icons/pwa-192x192.png", sizes: "192x192" }]
            }
          ]
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,ico,woff2,json,webmanifest}"],
          navigateFallback: "/index.html",
          navigateFallbackDenylist: [/^\/api\//],
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: false,
          runtimeCaching: [
            {
              urlPattern: ({ request }) => request.destination === "image",
              handler: "CacheFirst",
              options: {
                cacheName: "tsena-images",
                expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
              handler: "NetworkFirst",
              options: {
                cacheName: "tsena-api",
                networkTimeoutSeconds: 6,
                expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 },
                cacheableResponse: { statuses: [0, 200] }
              }
            },
            {
              urlPattern: ({ request }) =>
                request.url.startsWith("https://fonts.googleapis.com") ||
                request.url.startsWith("https://fonts.gstatic.com"),
              handler: "StaleWhileRevalidate",
              options: {
                cacheName: "tsena-fonts",
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 }
              }
            }
          ]
        },
        devOptions: {
          enabled: false,
          suppressWarnings: true
        }
      })
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url))
      }
    },
    server: {
      // Bind to 0.0.0.0 so the dev server is reachable from the phone over
      // the LAN, same as the back-office. Without this Vite listens on
      // ::1 only and 192.168.x.x:5173 is refused.
      host: true,
      // Polling : les changements .ts/.tsx sont detectes sans rebuild.
      watch: usePolling
        ? { usePolling: true, interval: 300, ignored: ["**/dist/**", "**/node_modules/**"] }
        : undefined,
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true
        },
        // Notifications WebSocket. Without this the socket URL built from
        // window.location.host hits the dev server and never reaches the API.
        "/ws": {
          target: proxyTarget,
          changeOrigin: true,
          ws: true
        },
        // Product images: the API serves them under /files/..., so the dev
        // server has to proxy them like /api (the URLs stored in the DB are
        // relative to the API origin).
        "/files": {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: "dist",
      sourcemap: isDev
    }
  };
});
