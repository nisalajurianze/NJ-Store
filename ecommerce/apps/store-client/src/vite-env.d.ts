/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_TIMEOUT_MS?: string;
  readonly VITE_ANALYTICS_ENDPOINT?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
