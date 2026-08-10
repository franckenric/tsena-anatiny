/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_API_PROXY_TARGET?: string;
  readonly VITE_API_PHONE?: string;
  readonly VITE_API_PASSWORD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
