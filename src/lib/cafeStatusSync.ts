/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { doc, onSnapshot, setDoc, getDocs, collection, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { CafeStatus } from '../types';

export const DEFAULT_CAFE_STATUS: CafeStatus = {
  isOpen: true,
  status: 'open',
  isCafeOpen: true,
  closureReason: '',
  reopenTime: '',
  formattedReopenTime: '',
  storeName: 'The Barozza Cafe',
};

const CACHE_KEY = 'barozza_cafe_status';
const BROADCAST_CHANNEL_NAME = 'barozza_cafe_status_channel';

let broadcastChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
  }
} catch {
  broadcastChannel = null;
}

/**
 * Returns the cached CafeStatus synchronously with zero delay
 */
export function getCachedCafeStatus(): CafeStatus {
  if (typeof window === 'undefined') return DEFAULT_CAFE_STATUS;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.isOpen === 'boolean') {
        return {
          ...DEFAULT_CAFE_STATUS,
          ...parsed,
          status: parsed.isOpen ? 'open' : 'closed',
          isCafeOpen: parsed.isOpen,
        };
      }
    }
  } catch (err) {
    console.warn('Failed to parse cached cafe status:', err);
  }
  return DEFAULT_CAFE_STATUS;
}

/**
 * Normalizes raw Firestore document data into a valid CafeStatus object
 */
export function normalizeCafeStatus(data: any): CafeStatus {
  if (!data) return DEFAULT_CAFE_STATUS;

  // Cafe is closed if isOpen === false, isCafeOpen === false, status === 'closed', or cafeClosed === true
  const isExplicitlyClosed = 
    data.isOpen === false || 
    data.isCafeOpen === false || 
    data.status === 'closed' || 
    data.cafeClosed === true;

  const isOpen = !isExplicitlyClosed;
  const reopenTime = String(data.reopenTime || data.formattedReopenTime || '').trim();
  const closureReason = String(data.closureReason || '').trim() || 
    (!isOpen ? (reopenTime ? `Cafe is temporarily closed. Reopening at ${reopenTime}.` : 'The Barozza Cafe is currently closed. We will reopen shortly!') : '');

  return {
    isOpen,
    status: isOpen ? 'open' : 'closed',
    isCafeOpen: isOpen,
    closureReason,
    reopenTime,
    formattedReopenTime: reopenTime,
    closedAt: data.closedAt || (isOpen ? undefined : new Date().toISOString()),
    updatedAt: data.updatedAt || new Date().toISOString(),
    closedBy: data.closedBy || 'The Admin',
    storeName: data.storeName || 'The Barozza Cafe',
  };
}

/**
 * Subscribes in real-time to Cafe Operational Status across all Firestore documents,
 * BroadcastChannel, and localStorage events for instant, zero-delay propagation.
 */
export function subscribeToCafeStatus(onStatusChange: (status: CafeStatus) => void): () => void {
  // 1. Synchronous immediate emit (0ms latency)
  const initial = getCachedCafeStatus();
  onStatusChange(initial);

  let currentKnownStatus = initial;
  let lastProcessedTimestamp = initial.updatedAt ? new Date(initial.updatedAt).getTime() : 0;

  const emitIfChanged = (newStatus: CafeStatus) => {
    const incomingTs = newStatus.updatedAt ? new Date(newStatus.updatedAt).getTime() : 0;
    if (incomingTs > 0 && lastProcessedTimestamp > 0 && incomingTs < lastProcessedTimestamp) {
      // Discard older out-of-order update
      return;
    }
    if (incomingTs > 0) {
      lastProcessedTimestamp = incomingTs;
    }

    // Only emit and update cache if values genuinely differ
    if (
      currentKnownStatus.isOpen !== newStatus.isOpen ||
      currentKnownStatus.reopenTime !== newStatus.reopenTime ||
      currentKnownStatus.closureReason !== newStatus.closureReason
    ) {
      currentKnownStatus = newStatus;
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(newStatus));
      } catch {}
      onStatusChange(newStatus);
    }
  };

  // 2. Instant tab-to-tab BroadcastChannel listener (sub-millisecond latency within same browser)
  const handleBroadcastMessage = (event: MessageEvent) => {
    if (event.data && typeof event.data.isOpen === 'boolean') {
      emitIfChanged(event.data);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcastMessage);
  }

  // 3. Storage event listener (backup for multi-tab sync)
  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === CACHE_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue);
        emitIfChanged(normalizeCafeStatus(parsed));
      } catch {}
    }
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('storage', handleStorageEvent);
  }

  // 4. Firestore real-time listeners across multi-source status docs for instant cloud sync
  const targetDocs = [
    { col: 'orders', id: 'barozza_cafe_status' },
    { col: 'orders', id: 'cafe_status' },
    { col: 'settings', id: 'cafe_status' },
    { col: 'cafe_status', id: 'status' },
    { col: 'orders', id: 'barozza_menu_catalog' },
  ];

  const unsubs: Array<() => void> = [];

  for (const target of targetDocs) {
    try {
      const docRef = doc(db, target.col, target.id);
      const unsub = onSnapshot(
        docRef,
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const normalized = normalizeCafeStatus(data);
            emitIfChanged(normalized);
          }
        },
        (error) => {
          // Graceful fallback (e.g. if collection rules block or doc missing)
          console.debug(`Notice on ${target.col}/${target.id} status listener:`, error.message);
        }
      );
      unsubs.push(unsub);
    } catch (e) {
      console.warn(`Could not attach listener to ${target.col}/${target.id}:`, e);
    }
  }

  return () => {
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcastMessage);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('storage', handleStorageEvent);
    }
    unsubs.forEach((u) => u());
  };
}

/**
 * Instantly updates the cafe operational status in local storage, BroadcastChannel,
 * and synchronizes concurrently in parallel to all Firestore documents with zero delay.
 */
export async function updateCafeStatus(
  isOpen: boolean,
  options?: {
    closureReason?: string;
    reopenTime?: string;
    closedBy?: string;
  }
): Promise<CafeStatus> {
  const reopenTime = (options?.reopenTime || '').trim();
  const closureReason = (options?.closureReason || '').trim() || 
    (!isOpen ? (reopenTime ? `Cafe is temporarily closed. Reopening at ${reopenTime}.` : 'The Barozza Cafe is currently closed. Ordering will resume shortly!') : '');
  
  const now = new Date().toISOString();
  const statusObject: CafeStatus = {
    isOpen,
    status: isOpen ? 'open' : 'closed',
    isCafeOpen: isOpen,
    closureReason,
    reopenTime,
    formattedReopenTime: reopenTime,
    closedAt: isOpen ? '' : now,
    updatedAt: now,
    closedBy: options?.closedBy || 'The Admin',
    storeName: 'The Barozza Cafe',
  };

  // 1. Immediate local persistence & sub-millisecond broadcast
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(statusObject));
  } catch {}

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(statusObject);
    } catch {}
  }

  // 2. Parallel, concurrent writes to all Firestore status documents
  const firestorePayload = {
    isOpen,
    isCafeOpen: isOpen,
    status: isOpen ? 'open' : 'closed',
    cafeClosed: !isOpen,
    closureReason,
    reopenTime,
    formattedReopenTime: reopenTime,
    closedAt: isOpen ? '' : now,
    updatedAt: now,
    lastUpdated: now,
    closedBy: options?.closedBy || 'The Admin',
    storeName: 'The Barozza Cafe',
  };

  const targets = [
    { col: 'orders', id: 'barozza_cafe_status' },
    { col: 'orders', id: 'cafe_status' },
    { col: 'settings', id: 'cafe_status' },
    { col: 'cafe_status', id: 'status' },
    { col: 'orders', id: 'barozza_menu_catalog' },
  ];

  const cloudPromises = targets.map((t) =>
    setDoc(doc(db, t.col, t.id), firestorePayload, { merge: true }).catch((err) => {
      console.warn(`Could not sync status to ${t.col}/${t.id}:`, err.message);
    })
  );

  // Trigger writes concurrently
  Promise.all(cloudPromises).catch(() => {});

  // 3. Asynchronously background update dishes collection so external portals reading individual dish docs stay aligned
  (async () => {
    try {
      const dishesSnap = await getDocs(collection(db, 'dishes'));
      if (!dishesSnap.empty) {
        const batch = writeBatch(db);
        dishesSnap.docs.forEach((d) => {
          batch.update(d.ref, {
            cafeClosed: !isOpen,
            reopenTime: reopenTime,
            formattedReopenTime: reopenTime,
            lastUpdated: now,
          });
        });
        await batch.commit();
      }
    } catch (e) {
      console.debug('Background dishes collection status sync notice:', e);
    }
  })();

  return statusObject;
}
