/*
 * Handlers Web Push — front-office.
 *
 * Importe en tete du service worker Workbox genere par Vite
 * (voir `workbox.importScripts` dans vite.config.ts). Meme structure que
 * `back-office/public/push-sw.js`, adaptee aux icones et au parcours client.
 *
 * Le payload vient de l'API (app/core/push.py) :
 *   { title, body, url, tag, badge }
 * `badge` est le nombre de non-lus lu en base : c'est lui qui s'affiche sur
 * l'icone de l'application installee.
 */

const FALLBACK_ICON = "/icons/pwa-192x192.png";
const FALLBACK_BADGE = "/favicon.png";

/**
 * Pose le nombre de non-lus sur l'icone.
 *
 * `setAppBadge` n'existe pas partout (Firefox, Safari anterieur a 16.4) et
 * n'agit que sur une application installee : l'echec est bavard nulle part.
 */
async function applyBadge(count) {
  if (typeof count !== "number" || !Number.isFinite(count)) return;
  try {
    if (typeof self.registration.setAppBadge === "function") {
      await self.registration.setAppBadge(count > 0 ? count : 0);
    }
  } catch {
    // Pas de Badging API : la notification s'affiche quand meme.
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
    badge: FALLBACK_BADGE,
    // Deux notifications pour la meme commande se remplacent au lieu de
    // s'empiler dans le centre de notifications du telephone.
    tag: payload.tag || undefined,
    renotify: false,
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
  const target =
    (event.notification.data && event.notification.data.url) || "/notifications";

  event.waitUntil(
    (async () => {
      // Onglet deja ouvert : on le refocus plutot qu'en ouvrir un second.
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
      // Une commande livree ou annulee ouvre la page « Mes notifications »,
      // le client voit donc tout l'historique et pas seulement l'evenement.
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
      return undefined;
    })()
  );
});

/*
 * A l'ouverture de l'application, le badge est recalcule depuis l'API par le
 * contexte React (`unreadCount`) : pas de risque qu'il reste fige apres une
 * lecture des notifications.
 */
