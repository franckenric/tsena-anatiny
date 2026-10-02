/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_API_EMAIL?: string;
  readonly VITE_API_PHONE?: string;
  readonly VITE_API_PASSWORD?: string;
  readonly VITE_FACEBOOK_APP_ID?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Nombre de produits charges par page (defaut : 12). */
  readonly VITE_PRODUCTS_PAGE_SIZE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt(): Promise<void>;
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
