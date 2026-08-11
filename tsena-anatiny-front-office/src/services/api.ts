const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(
  /\/+$/,
  ""
);

const TOKEN_KEY = "fo.auth.token";

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
  const phone = import.meta.env.VITE_API_PHONE;
  const password = import.meta.env.VITE_API_PASSWORD;

  if (!phone || !password) {
    throw new Error(
      "Configuration API manquante. Renseignez VITE_API_PHONE et VITE_API_PASSWORD."
    );
  }

  const body = new URLSearchParams();
  body.set("username", phone);
  body.set("password", password);

  const response = await fetch(buildApiUrl("/login/access-token"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    throw new Error("Échec de l'authentification auprès de l'API");
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Réponse d'authentification invalide");
  }
  localStorage.setItem(TOKEN_KEY, data.access_token);
  return data.access_token;
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

export async function apiFetch<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const method = (options.method ?? "GET").toUpperCase();
  const isRead = method === "GET" || method === "HEAD" || method === "OPTIONS";

  let token: string | null = null;
  try {
    token = await getApiToken();
  } catch (err) {
    if (!isRead) throw err;
  }

  const headers = new Headers(options.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
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

export async function getApiUser(): Promise<ApiUser> {
  const token = await getApiToken();
  const user = await apiFetch<ApiUser>(`/login/test-token/${token}`, {
    method: "POST"
  });
  return user;
}
