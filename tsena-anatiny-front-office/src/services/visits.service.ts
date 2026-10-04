const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(
  /\/$/,
  ""
);

const VISITOR_KEY_STORAGE = "tsena.visitor.key";

/** Identifiant anonyme du navigateur, stable entre les visites.

 *  Ce n'est pas une donnee personnelle : aucune adresse IP, aucun cookie, aucune
 *  donnee de compte. C'est un compteur par navigateur, le back-office ne voit
 *  qu'un nombre, jamais une liste de visiteurs. */
function getVisitorKey(): string | null {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY_STORAGE);
    if (existing) return existing;

    // crypto.randomUUID si disponible, sinon une chaine de repli.
    const generated =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random()
            .toString(36)
            .slice(2, 10)}`;
    window.localStorage.setItem(VISITOR_KEY_STORAGE, generated);
    return generated;
  } catch {
    // Mode navigation privee ou localStorage bloque : on ne compte pas plutot
    // que de casser la navigation du client.
    return null;
  }
}

/** Jour calendaire local au format AAAA-MM-JJ.

 *  On envoie le jour du client, pas celui du serveur : le fuseau de
 *  Madagascar n'est pas celui de l'API, sinon les visites du soir seraient
 *  comptees le lendemain. */
function localVisitDate(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Signale une visite au back-office. Silencieux : aucun impact sur la boutique.

 *  L'API est idempotente sur (visitor_key, visit_date), donc cet appel peut etre
 *  relance sans risque (mode StrictMode, deux onglets, retry reseau) : il ne
 *  double jamais un compteur. */
export function trackVisit(): void {
  if (typeof window === "undefined") return;

  const visitorKey = getVisitorKey();
  if (!visitorKey) return;

  try {
    void fetch(`${API_BASE_URL}/visits/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // keepalive : l'enregistrement part meme si le client ferme l'onglet
      // juste apres.
      keepalive: true,
      body: JSON.stringify({
        visitor_key: visitorKey,
        visit_date: localVisitDate(),
        path: `${window.location.pathname}${window.location.search}`.slice(0, 255),
      }),
    }).catch(() => {
      // Hors ligne ou API indisponible : la visite n'est pas comptee, ce qui
      // est preferable a une erreur visible par le client.
    });
  } catch {
    // fetch indisponible : on ignore.
  }
}