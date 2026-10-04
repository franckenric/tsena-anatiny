const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(
  /\/$/,
  ""
);

const TOKEN_STORAGE_KEY = "tsena.auth.token";

export interface VisitDay {
  date: string;
  count: number;
}

export interface VisitsSummary {
  /** Visites de la semaine affichee, somme des sept jours. */
  total: number;
  /** Visites de la semaine precedente, pour la comparaison. */
  previous_week_total: number;
  week_start: string | null;
  week_end: string | null;
  /** Un entree par jour, du lundi au dimanche, jours sans visite inclus. */
  by_day: VisitDay[] | null;
}

/** Compteurs de visites du front-office, jour par jour sur une semaine.

 *  `offset` change la semaine affichee : -1 = semaine precedente,
 *  0 = semaine en cours, +1 = semaine suivante. */
export async function getVisitsSummary(offset = 0): Promise<VisitsSummary> {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  const params = new URLSearchParams({ offset: String(offset) });

  const response = await fetch(`${API_BASE_URL}/visits/summary?${params}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  });

  if (!response.ok) {
    throw new Error(
      `Erreur lors du chargement des visites (${response.status})`
    );
  }

  return (await response.json()) as VisitsSummary;
}
