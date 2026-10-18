/**
 * Badge sur l'icone de l'application INSTALLEE (Badging API).
 *
 * Plateformes (etat 2026) :
 *   - iOS/iPadOS 16.4+  : supporte, mais uniquement depuis une PWA ajoutee a
 *     l'ecran d'accueil ;
 *   - Android           : Chrome et la plupart des lanceurs affichent au
 *     minimum une pastille, le chiffre depend du lanceur ;
 *   - Desktop           : Chrome/Edge affichent le chiffre sur l'icone de la
 *     barre des taches ;
 *   - Firefox/Safari ancien : absent, l'appel est simplement ignore.
 *
 * Rien ici ne doit jamais casser la boutique : `setAppBadge` n'existe pas dans
 * le DOM de TypeScript, et un navigateur qui ne le connait pas ne leve aucune
 * erreur — on encadre quand meme.
 *
 * NOTE : la classe Tailwind `h-4.5` de l'ancienne cloche ne produit rien sous
 * Tailwind 3 (echelle par defaut sans 4.5) : l'icone retombe sur 24 px. A ne
 * pas reproduire, d'ou `h-5 w-5` utilise ici.
 */

type BadgedNavigator = Navigator & {
  setAppBadge?: (contents?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
};

/** La Badging API existe-t-elle ? */
export function isBadgeSupported(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as BadgedNavigator;
  return typeof nav.setAppBadge === "function";
}

/**
 * Le document s'execute-t-il dans une application installee ?
 *
 * Sans ce test, le badge s'appliquerait aussi a un simple onglet de navigateur
 * et en modifierait le favicon — un changement visuel que personne n'a demande.
 */
export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
      // iOS : la PWA installee expose `navigator.standalone`.
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    );
  } catch {
    return false;
  }
}

/**
 * Affiche `count` sur l'icone (0 efface le badge). No-op partout ou la Badging
 * API est absente. Echoue silencieusement : le badge n'est jamais critique.
 */
export async function setAppBadge(count: number): Promise<void> {
  if (typeof navigator === "undefined") return;
  const nav = navigator as BadgedNavigator;
  try {
    if (count > 0 && typeof nav.setAppBadge === "function") {
      await nav.setAppBadge(count);
    } else if (typeof nav.clearAppBadge === "function") {
      await nav.clearAppBadge();
    }
  } catch {
    // Permission refusee, application non installee, navigateur non supporte…
  }
}

/** Efface explicitement le badge. */
export async function clearAppBadge(): Promise<void> {
  await setAppBadge(0);
}

/**
 * Applique le badge uniquement dans une application installee.
 *
 * C'est l'appel a utiliser depuis un React effect : on ne touche jamais au
 * favicon d'un onglet de navigateur.
 */
export async function setAppBadgeIfStandalone(count: number): Promise<void> {
  if (!isStandaloneDisplay()) return;
  await setAppBadge(count);
}
