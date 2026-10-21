/**
 * Mise a jour automatique de la PWA back-office.
 *
 * Le service worker est enregistre en mode "autoUpdate" (skipWaiting +
 * clientsClaim, cf. vite.config.ts) : quand une nouvelle version est
 * deployee, le navigateur installe le nouveau service worker, l'active
 * immediatement et recharge la page tout seul (vite-plugin-pwa fait
 * `window.location.reload()` sur l'evenement "activated"). Aucune banniere,
 * aucune action a faire cote utilisateur.
 *
 * Le navigateur ne verifie le contenu du service worker qu'a la navigation
 * (donc au lancement de l'app). Sur un mobile, l'application installee peut
 * rester ouverte plusieurs heures : la nouvelle version n'etait donc
 * applicable qu'a la prochaine ouverture. On ajoute deux declencheurs :
 * - un controle horaire quand l'onglet est visible ;
 * - un controle a chaque retour au premier plan (visibilitychange).
 *
 * Le rechargement automatique suit la detection : si une nouvelle version
 * est trouvee pendant que l'utilisateur saisit une commande, la page est
 * rechargee par vite-plugin-pwa, ce qui peut interrompre la saisie.
 */
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function installAutoUpdateWatch(): void {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
    return;
  }

  const checkForUpdate = (registration: ServiceWorkerRegistration) => {
    if (document.visibilityState !== "visible") return;
    void registration.update();
  };

  void navigator.serviceWorker.ready
    .then((registration) => {
      window.setInterval(() => checkForUpdate(registration), CHECK_INTERVAL_MS);

      // Retour au premier plan : l'app est de nouveau visible, on peut
      // verifier immediatement si une version plus recente existe.
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
          checkForUpdate(registration);
        }
      });
    })
    .catch(() => {
      // Service worker indisponible : rien a surveiller.
    });
}
