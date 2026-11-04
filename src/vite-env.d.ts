/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string;
  readonly VITE_FIREBASE_PROJECT_ID?: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly VITE_FIREBASE_APP_ID?: string;
  readonly VITE_DEMO_MODE?: string;
  readonly VITE_USE_EMULATORS?: string;
  /** Build for a sandboxed frame: exports open in the in-app viewer. */
  readonly VITE_EMBEDDED?: string;
  /** Demo Mode: start an admin session with sample students, teams and scores. */
  readonly VITE_DEMO_AUTOSEED?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
