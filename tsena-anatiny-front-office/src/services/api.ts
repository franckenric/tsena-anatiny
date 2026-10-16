const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(
  /\/+$/,
  ""
);

const TOKEN_KEY = "fo.auth.token";

/**
 * Le front-office ne detient plus de "compte de service" : il ne s'authentifie
 * jamais tout seul. Le jeton stocke ici appartient au CLIENT connecte et n'est
 * depose que par une connexion explicite (`customersService.login`, inscription
 * ou OAuth) — voir `AuthContext`.
 *
 * Consequence : `/login/access-token` n'est appele QUE lorsque le client se
 * connecte. Le catalogue etant public cote API (`GET /products`, `/categories`),
 * l'ancien mecanisme qui se connectait automatiquement a chaque chargement a ete
 * supprime : quand ses identifiants etaient invalides, il provoquait un
 * `POST /login/access-token` en boucle a chaque rafraichissement de page.
 */

export function buildApiUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getStoredApiToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setApiToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearApiToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

/**
 * Jeton du client connecte, ou `null` en mode invite. Aucun appel reseau :
 * l'API ne delivre un jeton que lors d'une connexion explicite.
 */
export function getApiToken(): string | null {
  return getStoredApiToken();
}

async function parseError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { detail?: unknown };
    const detail = json.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((item) => {
          if (item && typeof item === "object" && "msg" in item) {
            return String((item as { msg: unknown }).msg);
          }
          return String(item);
        })
        .join(", ");
    }
    return `Erreur HTTP ${response.status}`;
  } catch {
    return `Erreur HTTP ${response.status}`;
  }
}

export interface ApiFetchOptions extends RequestInit {
  /**
   * Endpoint public : aucun jeton n'est envoye, meme si un client est connecte.
   * Utile pour l'inscription, l'OTP, la validation de code promo, la commande
   * invite, etc.
   */
  skipAuth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { skipAuth = false, ...init } = options;

  const headers = new Headers(init.headers);
  const token = skipAuth ? null : getStoredApiToken();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...init,
    headers
  });

  if (!response.ok) {
    const message = await parseError(response);
    if (response.status === 401) {
      clearApiToken();
    }
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export interface ApiUser {
  id: number;
  email?: string;
}

/**
 * Restaure l'utilisateur a partir du jeton deja stocke. Ne declenche jamais de
 * connexion : sans session ouverte, il n'y a rien a restaurer.
 */
export async function getApiUser(): Promise<ApiUser> {
  const token = getStoredApiToken();
  if (!token) throw new Error("Aucune session active");
  const user = await apiFetch<ApiUser>(`/login/test-token/${token}`, {
    method: "POST",
    skipAuth: true
  });
  return user;
}
