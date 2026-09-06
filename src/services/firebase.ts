import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import { getFirebaseConfig } from '../config/firebaseConfig';

const firebaseConfig = getFirebaseConfig();

// Initialize Firebase App instance safely using credentials from secure config service
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Initialize Firestore with specific database ID if configured
export const db: Firestore = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Zero-crash payload sanitizer stripping undefined values
export function cleanPayload<T extends Record<string, any>>(obj: T): T {
  const cleaned: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) {
      continue;
    }
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      cleaned[key] = cleanPayload(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value
        .filter((item) => item !== undefined)
        .map((item) => (item !== null && typeof item === 'object' ? cleanPayload(item) : item));
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned as T;
}

export { signInWithPopup, fbSignOut as signOut, onAuthStateChanged, type User };
