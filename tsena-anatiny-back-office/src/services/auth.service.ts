import type { AuthToken, AuthUser, LoginPayload } from "../types/auth";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? "/api/v1").replace(
  /\/$/,
  ""
);

const TOKEN_STORAGE_KEY = "tsena.auth.token";

function buildUrl(path: string): string {
  return `${API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

async function parseErrorMessage(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as { detail?: string };
    return json.detail ?? `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}`;
  }
}

async function login(payload: LoginPayload): Promise<AuthToken> {
  const formData = new URLSearchParams();
  formData.set("username", payload.phone);
  formData.set("password", payload.password);

  const response = await fetch(buildUrl("/login/access-token"), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: formData
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as AuthToken;
}

async function testToken(token: string): Promise<AuthUser> {
  const response = await fetch(buildUrl(`/login/test-token/${token}`), {
    method: "POST"
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return (await response.json()) as AuthUser;
}

function saveToken(token: string): void {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
}

function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

function clearStoredToken(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

export const authService = {
  login,
  testToken,
  saveToken,
  getStoredToken,
  clearStoredToken
};
