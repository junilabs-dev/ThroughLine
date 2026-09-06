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

declare const __FIREBASE_API_KEY__: string | undefined;

/**
 * Secure Firebase Client Configuration Provider
 * Resolves credentials dynamically through the environment/config layer with zero hardcoding.
 * Supports runtime environment overrides without committing secrets to version control.
 */
export function getFirebaseConfig(): FirebaseClientConfig {
  let dynamicKey = '';
  try {
    if (typeof __FIREBASE_API_KEY__ !== 'undefined' && __FIREBASE_API_KEY__) {
      dynamicKey = __FIREBASE_API_KEY__;
    }
  } catch {
    // ignore
  }

  const envApiKey =
    dynamicKey ||
    (import.meta.env.VITE_FIREBASE_API_KEY as string | undefined)?.trim() ||
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined)?.trim() ||
    '';

  const apiKey = envApiKey || firebaseConfigRaw.apiKey || '';

  return {
    ...firebaseConfigRaw,
    apiKey,
  };
}
