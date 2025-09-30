/// <reference types="vite/client" />

declare global {
  const __CLOUDPUB_SERVER_URL__: string;
  const __CLOUDPUB_CLIENT_URL__: string;
}

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly CLOUDPUB_SERVER_URL?: string;
  readonly CLOUDPUB_CLIENT_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}