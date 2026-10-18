/**
 * Abonnement Web Push de l'appareil courant.
 *
 * Le push ne passe PAS par Gmail : le message est remis au service de push du
 * navigateur (FCM pour Chrome/Android, APNs pour Safari/iOS), qui notifie
 * l'application installee meme fermee. C'est ce qui permet d'afficher un
 * chiffre sur l'icone sans que la boutique soit ouverte.
 *
 * Contraintes reelles :
 *   - iOS : impossible tant que le client n'a pas ajoute le site a l'ecran
 *     d'accueil ; la demande de permission doit partir d'un geste (clic) ;
 *   - Android/desktop : fonctionne dans l'onglet, mais le badge n'apparait
 *     que pour une application installee ;
 *   - permission refusee : rien a faire de cote client, on masque juste
 *     l'action (iOS ne re-propose la permission qu'apres rechargement).
 */

import {
  fetchVapidPublicKey,
  subscribePush,
  unsubscribePush
} from "../services/notifications.service";

/** Le navigateur sait-il faire du push (et du service worker) ? */
export function isPushSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

export function getNotificationPermission():
  | NotificationPermission
  | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

/**
 * `applicationServerKey` attend un Uint8Array, l'API ne prend qu'une chaine
 * base64url : on decode a la main (atob n'accepte pas le base64url).
 *
 * On part d'un `ArrayBuffer` explicite : depuis TypeScript 5.7, `Uint8Array`
 * est parametre sur le type du buffer, et une annotation `Uint8Array` nue
 * vaut `Uint8Array<ArrayBufferLike>`, refuse par `BufferSource`. L'inference
 * conserve le bon type dans les deux sens.
 */
function base64UrlToUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  // L'API Web Push attend le point non compresse SEC1 (RFC 5480 §2.2) : l'octet
  // 0x04 suivi de X puis Y (65 o). Le serveur livre X||Y seul (64 o) ; sans ce
  // prefixe, `pushManager.subscribe` rejette la cle (« must contain a valid
  // P-256 public key »). A distinguer du format « raw » de WebCrypto (X||Y sans
  // 0x04), qui est different.
  const buffer = new ArrayBuffer(raw.length + 1);
  const output = new Uint8Array(buffer);
  output[0] = 0x04;
  for (let i = 0; i < raw.length; i += 1) {
    output[i + 1] = raw.charCodeAt(i);
  }
  return output;
}

/** Abonnement push deja enregistre pour cet origine, s'il existe. */
export async function getExistingSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;
  try {
    const registration = await navigator.serviceWorker.ready;
    return await registration.pushManager.getSubscription();
  } catch {
    return null;
  }
}

export type SubscribeResult =
  | { status: "subscribed"; subscription: PushSubscription }
  | { status: "denied" }
  | { status: "unsupported" }
  | { status: "error"; message: string };

/**
 * Demande la permission, abonne l'appareil et le signale a l'API.
 *
 * Doit etre appele depuis un gestionnaire d'evenement utilisateur : iOS refuse
 * `Notification.requestPermission()` en dehors d'un geste explicite.
 */
export async function subscribeToPush(): Promise<SubscribeResult> {
  if (!isPushSupported()) {
    return { status: "unsupported" };
  }

  let permission: NotificationPermission;
  try {
    permission = await Notification.requestPermission();
  } catch {
    return { status: "denied" };
  }
  if (permission !== "granted") {
    return { status: "denied" };
  }

  try {
    const { public_key: publicKey } = await fetchVapidPublicKey();
    const registration = await navigator.serviceWorker.ready;

    // Reutiliser l'abonnement existant evite un second consentement et
    // conserve le meme `endpoint` cote serveur (pas de doublon).
    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToUint8Array(publicKey)
      }));

    const json = subscription.toJSON();
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
      return { status: "error", message: "Abonnement push incomplet" };
    }
    await subscribePush({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      user_agent: navigator.userAgent
    });
    return { status: "subscribed", subscription };
  } catch (error) {
    // Cas le plus frequent : PWA non installee sur iOS, ou serveur sans cles
    // VAPID (503). On remonte un message plutot qu'une trace.
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Abonnement impossible"
    };
  }
}

/**
 * Retire l'abonnement de l'appareil ET sa copie serveur.
 *
 * On coupe aussi l'abonnement navigateur (et non seulement la ligne serveur) :
 * sinon le telephone continuerait d'afficher les notifications deja recues.
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;
  try {
    const subscription = await getExistingSubscription();
    if (!subscription) return false;
    const endpoint = subscription.toJSON().endpoint;
    if (endpoint) {
      await unsubscribePush(endpoint);
    }
    return await subscription.unsubscribe();
  } catch {
    return false;
  }
}
