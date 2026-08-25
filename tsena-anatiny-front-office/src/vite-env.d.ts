/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_API_PHONE?: string;
  readonly VITE_API_PASSWORD?: string;
  readonly VITE_FACEBOOK_APP_ID?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface GoogleUser {
  authentication: { accessToken: string; idToken: string; refreshToken: string };
  email: string;
  familyName: string;
  givenName: string;
  id: string;
  name: string;
  serverAuthCode?: string;
}
