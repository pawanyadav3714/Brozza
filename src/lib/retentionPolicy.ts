/**
 * 2-Day Data Retention & Auto-Purge Policy
 * 
 * Orders, parcels, and drafts are retained for 48 hours (2 days).
 * After 2 days, records are automatically purged from both Cloud Firestore
 * and client-side LocalStorage.
 */

import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { Order } from '../types';

export const RETENTION_PERIOD_MS = 2 * 24 * 60 * 60 * 1000; // 48 Hours (2 Days)

/**
 * Extracts a numeric timestamp from Firestore Timestamp, number, or ISO string
 */
export function getRecordTimestamp(record: any): number {
  if (!record) return Date.now();
  if (record.createdAt?.seconds) {
    return record.createdAt.seconds * 1000;
  }
  if (typeof record.createdAt === 'number') {
    return record.createdAt;
  }
  if (typeof record.createdAt === 'string') {
    const parsed = Date.parse(record.createdAt);
    if (!isNaN(parsed)) return parsed;
  }
  if (record.updatedAt?.seconds) {
    return record.updatedAt.seconds * 1000;
  }
  return Date.now();
}

/**
 * Checks whether an order or parcel is older than 2 days
 */
export function isRecordExpired(record: any, maxAgeMs = RETENTION_PERIOD_MS): boolean {
  const recordTime = getRecordTimestamp(record);
  const age = Date.now() - recordTime;
  return age > maxAgeMs;
}

/**
 * Filters out expired orders (> 2 days) from local storage and returns cleaned array
 */
export function purgeExpiredLocalStorageOrders(): Order[] {
  try {
    const saved = localStorage.getItem('barozza_cafe_orders');
    if (!saved) return [];
    const parsed: Order[] = JSON.parse(saved);
    if (!Array.isArray(parsed)) return [];
    
    const valid = parsed.filter((o) => !isRecordExpired(o));
    localStorage.setItem('barozza_cafe_orders', JSON.stringify(valid));
    return valid;
  } catch (e) {
    console.warn('Failed to purge expired orders from localStorage:', e);
    return [];
  }
}

/**
 * Automatically purges all orders and parcels older than 2 days from Cloud Firestore
 */
export async function purgeExpiredRecordsFromFirestore(): Promise<{
  deletedOrders: number;
  deletedParcels: number;
}> {
  let deletedOrders = 0;
  let deletedParcels = 0;

  try {
    // 1. Fetch and evaluate orders older than 2 days
    const ordersCol = collection(db, 'orders');
    const ordersSnap = await getDocs(ordersCol);

    const expiredOrders: string[] = [];
    const associatedParcelIds: string[] = [];

    ordersSnap.forEach((docSnap) => {
      // Never delete catalog or system documents
      if (docSnap.id === 'barozza_menu_catalog' || docSnap.data().isCatalog) return;
      
      const data = docSnap.data();
      if (isRecordExpired(data)) {
        expiredOrders.push(docSnap.id);
        if (data.parcelId) {
          associatedParcelIds.push(data.parcelId);
        }
      }
    });

    for (const orderId of expiredOrders) {
      try {
        await deleteDoc(doc(db, 'orders', orderId));
        deletedOrders++;
      } catch (err) {
        console.warn(`Could not delete expired order ${orderId}:`, err);
      }
    }

    // 2. Fetch and evaluate parcels older than 2 days
    const parcelsCol = collection(db, 'parcels');
    const parcelsSnap = await getDocs(parcelsCol);

    const expiredParcels = new Set<string>(associatedParcelIds);
    parcelsSnap.forEach((pSnap) => {
      const data = pSnap.data();
      if (isRecordExpired(data)) {
        expiredParcels.add(pSnap.id);
      }
    });

    for (const pId of expiredParcels) {
      try {
        await deleteDoc(doc(db, 'parcels', pId));
        deletedParcels++;
      } catch (err) {
        console.warn(`Could not delete expired parcel ${pId}:`, err);
      }
    }

    // Also clean local storage cache
    purgeExpiredLocalStorageOrders();

    if (deletedOrders > 0 || deletedParcels > 0) {
      console.info(`[2-Day Retention Policy] Purged ${deletedOrders} orders and ${deletedParcels} parcels older than 48 hours.`);
    }
  } catch (error) {
    console.warn('[2-Day Retention Policy] Encountered notice during database purge check:', error);
  }

  return { deletedOrders, deletedParcels };
}
