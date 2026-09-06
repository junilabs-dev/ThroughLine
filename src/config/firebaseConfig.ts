import firebaseConfigRaw from '../../firebase-applet-config.json';

export interface FirebaseClientConfig {
  projectId: string;
  appId: string;
  apiKey: string;
  authDomain: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
}

/**
 * Secure Firebase Client Configuration Provider
 * Resolves credentials through the environment/config layer with zero hardcoding.
 * Supports runtime environment overrides (e.g. VITE_FIREBASE_API_KEY or VITE_GEMINI_API_KEY).
 */
export function getFirebaseConfig(): FirebaseClientConfig {
  const envApiKey =
    (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim() ||
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim();

  const apiKey = envApiKey || firebaseConfigRaw.apiKey;

  return {
    ...firebaseConfigRaw,
    apiKey,
  };
}
