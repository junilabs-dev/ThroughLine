import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from '../services/firebase';
import { getUserSettings, saveUserSettings } from '../services/firestoreService';
import type { UserSettings } from '../types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  settings: UserSettings;
  updateSettings: (newSettings: Partial<UserSettings>) => Promise<void>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<UserSettings>({
    aiStyle: 'Supportive',
    aiScope: 'all',
    dailyPromptEnabled: true,
    theme: 'light',
  });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const userPrefs = await getUserSettings(currentUser.uid);
          setSettings(userPrefs);
        } catch (err) {
          console.info('Could not load user settings, using defaults:', err);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Google Sign-In failed:', error);
      throw error;
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error: any) {
      console.error('Logout failed:', error);
      throw error;
    }
  };

  const updateSettings = async (newSettings: Partial<UserSettings>) => {
    const merged = { ...settings, ...newSettings };
    setSettings(merged);
    if (user) {
      await saveUserSettings(user.uid, newSettings);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        settings,
        updateSettings,
        login,
        logout: handleLogout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
