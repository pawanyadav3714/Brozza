import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  initializeAuth, 
  indexedDBLocalPersistence, 
  browserLocalPersistence, 
  inMemoryPersistence, 
  browserPopupRedirectResolver 
} from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

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
  dbInstance = dbId
    ? initializeFirestore(app, { experimentalForceLongPolling: true }, dbId)
    : initializeFirestore(app, { experimentalForceLongPolling: true });
} catch {
  dbInstance = dbId ? getFirestore(app, dbId) : getFirestore(app);
}

export const auth = authInstance;
export const db = dbInstance;

