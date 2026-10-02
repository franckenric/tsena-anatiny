const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(
  /\/+$/,
  ""
);

const TOKEN_KEY = "fo.auth.token";

/**
 * Connexion au compte de service partagee par tous les appels. Sans ces deux
 * garde-fous, chaque appel parallele repartait sur un nouveau POST
 * /login/access-token et un identifiants invalide transformait la navigation
 * en boucle de connexions (visible dans les logs de l'API).
 */
let inflightToken: Promise<string> | null = null;
let tokenCooldownUntil = 0;
const TOKEN_COOLDOWN_MS = 60_000;

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

async function fetchAccessToken(): Promise<string> {
  if (inflightToken) return inflightToken;
  if (Date.now() < tokenCooldownUntil) {
    throw new Error("Authentification API temporairement indisponible");
  }

  // L'API attend un email (clients) ou un numero de telephone (back-office)
  // dans le champ `username` : voir `authenticate_by_identifier`.
  const identifier = (
    import.meta.env.VITE_API_EMAIL ??
    import.meta.env.VITE_API_PHONE ??
    ""
  ).trim();
  const password = import.meta.env.VITE_API_PASSWORD;

  if (!identifier || !password) {
    throw new Error(
      "Configuration API manquante. Renseignez VITE_API_EMAIL (ou VITE_API_PHONE) et VITE_API_PASSWORD."
    );
  }

  inflightToken = (async () => {
    const body = new URLSearchParams();
    body.set("username", identifier);
    body.set("password", password);

    const response = await fetch(buildApiUrl("/login/access-token"), {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    if (!response.ok) {
      // 400/401 = identifiants invalides : inutile de reessayer aussitot,
      // l'API ne va pas changer de valeur entre deux appels.
      tokenCooldownUntil = Date.now() + TOKEN_COOLDOWN_MS;
      throw new Error("Échec de l'authentification auprès de l'API");
    }

    const data = (await response.json()) as { access_token?: string };
    if (!data.access_token) {
      tokenCooldownUntil = Date.now() + TOKEN_COOLDOWN_MS;
      throw new Error("Réponse d'authentification invalide");
    }
    localStorage.setItem(TOKEN_KEY, data.access_token);
    tokenCooldownUntil = 0;
    return data.access_token;
  })();

  try {
    return await inflightToken;
  } finally {
    inflightToken = null;
  }
}

export async function getApiToken(): Promise<string> {
  const stored = getStoredApiToken();
  if (stored) return stored;
  return fetchAccessToken();
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
   * Endpoint public (inscription, OTP...) : aucune authentification n'est
   * requise. Utile car l'obtention du jeton de service ne doit jamais bloquer
   * ces appels.
   */
  skipAuth?: boolean;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { skipAuth = false, ...init } = options;
  const method = (init.method ?? "GET").toUpperCase();
  const isRead = method === "GET" || method === "HEAD" || method === "OPTIONS";

  let token: string | null = null;
  if (!skipAuth) {
    try {
      token = await getApiToken();
    } catch (err) {
      if (!isRead) throw err;
    }
  }

  const headers = new Headers(init.headers);
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
 * connexion au compte de service : sans session ouverte, il n'y a rien a
 * restaurer.
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
