import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth, 
  indexedDBLocalPersistence, 
  browserLocalPersistence, 
  inMemoryPersistence, 
  browserPopupRedirectResolver 
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore, 
  doc, 
  getDocFromServer,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Suppress internal Firestore connection timeout notices (harmless in offline/sandboxed previews)
setLogLevel('error');

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
    popupRedirectResolver: browserPopupRedirectResolver,
  });
} catch {
  authInstance = getAuth(app);
}

const rawDbId = (firebaseConfig as any).firestoreDatabaseId;
const dbId = rawDbId && rawDbId !== '(default)' && rawDbId !== '' ? rawDbId : undefined;

let dbInstance;
try {
  const firestoreSettings: any = {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    experimentalAutoDetectLongPolling: true,
    ignoreUndefinedProperties: true,
  };
  dbInstance = dbId
    ? initializeFirestore(app, firestoreSettings, dbId)
    : initializeFirestore(app, firestoreSettings);
} catch {
  dbInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

// Validate connection non-intrusively as per Firebase integration guidelines
if (typeof window !== 'undefined') {
  (async () => {
    try {
      await getDocFromServer(doc(dbInstance, 'test', 'connection'));
    } catch (error: any) {
      if (error?.message && error.message.includes('the client is offline')) {
        console.warn('Firestore offline notice: Local cache active.');
      }
    }
  })();
}

export const auth = authInstance;
export const db = dbInstance;

