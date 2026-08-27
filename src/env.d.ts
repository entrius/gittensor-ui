/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_REACT_APP_BASE_URL: string;
  readonly VITE_REACT_APP_MIRROR_BASE_URL?: string;
  readonly VITE_WEB3FORMS_ACCESS_KEY?: string;
  /** Dev only: serve /serving endpoints from local fixtures. */
  readonly VITE_SERVING_MOCK?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
