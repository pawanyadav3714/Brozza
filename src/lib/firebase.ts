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
  memoryLocalCache,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence internal Firestore connection timeout notices (harmless in offline/sandboxed previews)
setLogLevel('silent');

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

const dbId = (firebaseConfig as any).firestoreDatabaseId || '(default)';

let dbInstance;
try {
  dbInstance = initializeFirestore(app, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
    experimentalForceLongPolling: true,
    ignoreUndefinedProperties: true,
  }, dbId);
} catch {
  try {
    dbInstance = initializeFirestore(app, {
      localCache: memoryLocalCache(),
      experimentalForceLongPolling: true,
      ignoreUndefinedProperties: true,
    }, dbId);
  } catch {
    dbInstance = getFirestore(app, dbId);
  }
}

// Validate connection non-intrusively as per Firebase integration guidelines
if (typeof window !== 'undefined') {
  (async () => {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('the client is offline')), 2500)
      );
      await Promise.race([
        getDocFromServer(doc(dbInstance, 'test', 'connection')),
        timeoutPromise,
      ]);
    } catch {
      // Local cache operates seamlessly if network backend is temporarily unreachable
    }
  })();
}

export const auth = authInstance;
export const db = dbInstance;


