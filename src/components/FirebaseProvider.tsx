import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

export interface AppUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isGuest?: boolean;
}

export interface AuthErrorInfo {
  code: string;
  message: string;
  domain: string;
}

interface FirebaseContextType {
  user: User | AppUser | null;
  loading: boolean;
  isSigningIn: boolean;
  authError: AuthErrorInfo | null;
  clearAuthError: () => void;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: (name?: string, email?: string) => void;
  signOutUser: () => Promise<void>;
}

const GUEST_STORAGE_KEY = 'barozza_guest_user';

const FirebaseContext = createContext<FirebaseContextType>({ 
  user: null, 
  loading: true,
  isSigningIn: false,
  authError: null,
  clearAuthError: () => {},
  signInWithGoogle: async () => {},
  signInAsGuest: () => {},
  signOutUser: async () => {}
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | AppUser | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem(GUEST_STORAGE_KEY);
        if (stored) {
          return JSON.parse(stored) as AppUser;
        }
      } catch {}
    }
    return null;
  });
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<AuthErrorInfo | null>(null);

  const clearAuthError = () => {
    setAuthError(null);
  };

  const signInAsGuest = (name?: string, email?: string) => {
    const guestUser: AppUser = {
      uid: `guest-${Date.now()}`,
      displayName: name?.trim() || 'Verified Guest Diner',
      email: email?.trim() || 'guest@barozza.cafe',
      photoURL: null,
      isGuest: true,
    };
    setUser(guestUser);
    setAuthError(null);
    try {
      sessionStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestUser));
    } catch {}
  };

  const signInWithGoogle = async () => {
    if (isSigningIn) {
      console.warn("Google sign-in is already in progress.");
      return;
    }
    setIsSigningIn(true);
    setAuthError(null);

    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const result = await signInWithPopup(auth, provider);
        if (result?.user) {
          try {
            sessionStorage.removeItem(GUEST_STORAGE_KEY);
          } catch {}
          setUser(result.user);
          setAuthError(null);
        }
        break;
      } catch (error: any) {
        const code = error?.code || '';
        const msg = String(error?.message || error || '');
        const isClosingError = 
          msg.includes('Database is closing') || 
          msg.includes('closing/hidden') || 
          msg.includes('database connection is closing');

        if (isClosingError && attempts < maxAttempts) {
          console.warn(`Transient database closing during sign-in, retrying (${attempts}/${maxAttempts})...`);
          await new Promise((res) => setTimeout(res, 500));
          continue;
        }

        const currentHostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';

        if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
          console.warn(
            `[Firebase Auth] Domain '${currentHostname}' is not yet authorized in Firebase Console. Add '${currentHostname}' under Authentication > Settings > Authorized domains.`
          );
          setAuthError({
            code: 'auth/unauthorized-domain',
            message: `Domain '${currentHostname}' is not authorized in Firebase Console yet.`,
            domain: currentHostname,
          });
        } else if (
          code === 'auth/cancelled-popup-request' ||
          code === 'auth/popup-closed-by-user' ||
          msg.includes('cancelled-popup-request') ||
          msg.includes('popup-closed-by-user') ||
          isClosingError
        ) {
          console.warn("Google sign-in popup was dismissed or connection reset.");
        } else {
          console.warn("Notice during Google sign-in:", error);
          setAuthError({
            code: code || 'auth/unknown',
            message: msg || 'Sign-in could not be completed.',
            domain: currentHostname,
          });
        }
        break;
      }
    }
    setIsSigningIn(false);
  };

  const signOutUser = async () => {
    try {
      try {
        sessionStorage.removeItem(GUEST_STORAGE_KEY);
      } catch {}
      await signOut(auth);
      setUser(null);
      setAuthError(null);
    } catch (error) {
      console.warn("Notice during sign out:", error);
      setUser(null);
    }
  };

  useEffect(() => {
    // Gracefully handle any stray unhandled IndexedDB closing rejections from background tabs/iframes
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = String(event.reason?.message || event.reason || '');
      if (
        reason.includes('Database is closing') ||
        reason.includes('closing/hidden') ||
        reason.includes('database connection is closing')
      ) {
        event.preventDefault();
        console.warn('Absorbed transient browser IndexedDB closing/hidden event:', reason);
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    const unsubscribe = onAuthStateChanged(
      auth, 
      (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
          try {
            sessionStorage.removeItem(GUEST_STORAGE_KEY);
          } catch {}
        } else {
          // If we have a guest user in session storage, keep guest session active
          try {
            const stored = sessionStorage.getItem(GUEST_STORAGE_KEY);
            if (stored) {
              setUser(JSON.parse(stored));
            } else {
              setUser(null);
            }
          } catch {
            setUser(null);
          }
        }
        setLoading(false);
      },
      (error) => {
        console.warn("Auth state change notice:", error);
        setLoading(false);
      }
    );

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      unsubscribe();
    };
  }, []);

  return (
    <FirebaseContext.Provider value={{ 
      user, 
      loading, 
      isSigningIn, 
      authError, 
      clearAuthError, 
      signInWithGoogle, 
      signInAsGuest, 
      signOutUser 
    }}>
      {children}
    </FirebaseContext.Provider>
  );
};
