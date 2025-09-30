/// <reference types="vite/client" />

declare global {
  const __CLOUDPUB_SERVER_URL__: string;
  const __CLOUDPUB_ADMIN_URL__: string;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly CLOUDPUB_SERVER_URL?: string;
  readonly CLOUDPUB_ADMIN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}