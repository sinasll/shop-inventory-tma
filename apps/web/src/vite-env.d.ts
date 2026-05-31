/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_CONTACT_ADMIN_URL?: string;
  readonly VITE_DEV_TELEGRAM_ID?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
