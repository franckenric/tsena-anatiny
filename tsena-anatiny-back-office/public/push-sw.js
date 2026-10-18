/*
 * Handlers Web Push — back-office.
 *
 * Ce fichier est importe en tete du service worker genere par Workbox
 * (voir `workbox.importScripts` dans vite.config.ts). Il ne remplace pas le
 * service worker Workbox : il ajoute uniquement les deux evenements qui font
 * vivre les notifications hors application.
 *
 * Deux points faciles a rater :
 *   - le badge (chiffre sur l'icone) s'applique via `setAppBadge`, PAS via
 *     l'option `badge` de showNotification : celle-ci attend une URL d'image
 *     (spec W3C), pas un nombre ;
 *   - si le payload n'est pas du JSON valide (push de test, proxy qui tronque),
 *     on affiche quand meme quelque chose : un push silencieux est un push
 *     perdu.
 */

const FALLBACK_ICON = "/icons/pwa-192x192.png";
const FALLBACK_BADGE = "/favicon.png";

/**
 * Affiche le nombre de non-lus sur l'icone de l'application.
 *
 * `ServiceWorkerRegistration.setAppBadge` existe sur Chromium ; sur iOS la
 * Badging API est aussi exposee au service worker depuis Safari 16.4. Hors
 * application installee, l'appel est ignore : aucune erreur a gerer.
 */
async function applyBadge(count) {
  if (typeof count !== "number" || !Number.isFinite(count)) return;
  try {
    if (typeof self.registration.setAppBadge === "function") {
      await self.registration.setAppBadge(count > 0 ? count : 0);
    }
  } catch {
    // Badge non supporte : la notification reste affichee, rien de plus.
  }
}

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Notification";
  const options = {
    body: payload.body || "",
    icon: FALLBACK_ICON,
    // PWA installee : iOS utilise cette icone comme vignette de notification.
    badge: FALLBACK_BADGE,
    // Regroupement : deux notifications pour la meme commande se remplacent
    // au lieu de s'empiler dans le centre de notifications.
    tag: payload.tag || undefined,
    renotify: false,
    // Donnee reportee sur le clic pour ouvrir la bonne page.
    data: { url: payload.url || "/notifications" }
  };

  event.waitUntil(
    (async () => {
      await applyBadge(payload.badge);
      await self.registration.showNotification(title, options);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) ||
    "/notifications";

  event.waitUntil(
    (async () => {
      // Reutiliser un onglet deja ouvert plutot que d'en ouvrir un second.
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true
      });
      for (const client of clients) {
        try {
          if (new URL(client.url).pathname === target && "focus" in client) {
            return client.focus();
          }
        } catch {
          // URL inexploitable : on passe au client suivant.
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
      return undefined;
    })()
  );
});

/*
 * Quand l'utilisateur ferme la derniere notification sans la lire, on laisse
 * le badge tel quel : il reflete le nombre de non-lus cote API, et le
 * recalculer ici risquerait de le mettre a 0 a tort.
 */
