import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { auth } from '../lib/firebase';

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  isSigningIn: boolean;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType>({ 
  user: null, 
  loading: true,
  isSigningIn: false,
  signInWithGoogle: async () => {},
  signOutUser: async () => {}
});

export const useFirebase = () => useContext(FirebaseContext);

export const FirebaseProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const signInWithGoogle = async () => {
    if (isSigningIn) {
      console.warn("Google sign-in is already in progress.");
      return;
    }
    setIsSigningIn(true);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });

    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        await signInWithPopup(auth, provider);
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

        if (
          code === 'auth/cancelled-popup-request' ||
          code === 'auth/popup-closed-by-user' ||
          msg.includes('cancelled-popup-request') ||
          msg.includes('popup-closed-by-user') ||
          isClosingError
        ) {
          console.warn("Google sign-in popup was dismissed or connection reset.");
        } else {
          console.error("Error signing in with Google:", error);
        }
        break;
      }
    }
    setIsSigningIn(false);
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
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
        setUser(currentUser);
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
    <FirebaseContext.Provider value={{ user, loading, isSigningIn, signInWithGoogle, signOutUser }}>
      {children}
    </FirebaseContext.Provider>
  );
};
