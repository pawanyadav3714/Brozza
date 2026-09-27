/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  deleteDoc, 
  getDoc,
  getDocs,
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Dish } from '../types';
import { DISHES as BASE_DISHES } from '../data';

const DELETED_DISHES_KEY = 'barozza_deleted_dishes';
const DISHES_CHANNEL_NAME = 'barozza_dishes_sync_channel';

let dishesChannel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    dishesChannel = new BroadcastChannel(DISHES_CHANNEL_NAME);
  }
} catch {
  dishesChannel = null;
}

/**
 * Returns set of deleted dish IDs and normalized names to ensure deleted items never reappear
 */
export function getDeletedDishKeys(): { ids: Set<string>; names: Set<string> } {
  const ids = new Set<string>();
  const names = new Set<string>();
  if (typeof window === 'undefined') return { ids, names };
  try {
    const raw = localStorage.getItem(DELETED_DISHES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.ids)) {
        parsed.ids.forEach((id: string) => ids.add(String(id)));
      }
      if (Array.isArray(parsed?.names)) {
        parsed.names.forEach((name: string) => names.add(String(name).trim().toLowerCase()));
      }
    }
  } catch {}
  return { ids, names };
}

/**
 * Marks a dish as permanently deleted in local cache and broadcasts across open tabs
 */
export function markDishAsDeletedLocally(dishId: string, dishName?: string) {
  const { ids, names } = getDeletedDishKeys();
  if (dishId) ids.add(dishId);
  if (dishName) names.add(dishName.trim().toLowerCase());
  try {
    localStorage.setItem(DELETED_DISHES_KEY, JSON.stringify({
      ids: Array.from(ids),
      names: Array.from(names),
    }));
  } catch {}

  if (dishesChannel) {
    try {
      dishesChannel.postMessage({ type: 'DISH_DELETED', dishId, dishName });
    } catch {}
  }
}

/**
 * Normalizes raw dish data from Firestore (supports both barozza_menu_catalog format and dishes collection format)
 */
export function normalizeDish(raw: any, fallbackId?: string): Dish {
  const id = String(raw.id || raw.dishId || fallbackId || `dish-${Date.now()}`);
  const name = String(raw.name || 'Delicious Special');
  const price = Number(raw.price) || 0;
  const category = String(raw.category || 'Starters');
  const description = String(raw.description || '');
  const image = String(raw.image || raw.imageUrl || '/images/frenchh.png');

  // Parse available quantity: check quantityAvailable, stock, or fallback
  const rawQty = raw.quantityAvailable !== undefined 
    ? raw.quantityAvailable 
    : (raw.stock !== undefined ? raw.stock : (typeof raw.quantity === 'number' ? raw.quantity : undefined));
  
  let quantityAvailable = rawQty !== undefined ? Math.max(0, Math.floor(Number(rawQty))) : 20;
  if (isNaN(quantityAvailable)) quantityAvailable = 20;

  // Available if flag is not false AND quantityAvailable > 0
  const available = raw.available !== false && quantityAvailable > 0;

  return {
    id,
    name,
    price,
    category,
    description,
    image,
    available,
    quantityAvailable,
  };
}

/**
 * Merges a list of dishes while maintaining unique ids and names, prioritizing newest additions
 */
export function mergeDishes(baseList: Dish[], ...overlays: Dish[][]): Dish[] {
  const dishMap = new Map<string, Dish>();

  // 1. Seed base dishes
  for (const dish of baseList) {
    if (dish && dish.id) {
      dishMap.set(dish.id, dish);
    }
  }

  // 2. Overlay incoming items
  for (const list of overlays) {
    if (!Array.isArray(list)) continue;
    for (const item of list) {
      if (!item || !item.name) continue;
      // Match by exact ID first
      if (dishMap.has(item.id)) {
        dishMap.set(item.id, { ...dishMap.get(item.id)!, ...item, id: item.id });
        continue;
      }
      // Also match by lowercase name to prevent duplicate entries with different ID schemes (e.g. 1 vs prod_1)
      const existingKey = Array.from(dishMap.keys()).find(
        (key) => dishMap.get(key)?.name.trim().toLowerCase() === item.name.trim().toLowerCase()
      );
      if (existingKey) {
        dishMap.set(existingKey, { ...dishMap.get(existingKey)!, ...item, id: existingKey });
      } else {
        dishMap.set(item.id, item);
      }
    }
  }

  return Array.from(dishMap.values());
}

/**
 * Real-time synchronization listener for menu dishes across Customer App and Admin Dashboard
 */
export function subscribeToDishes(onDishesUpdated: (dishes: Dish[]) => void) {
  let catalogDishes: Dish[] = [];
  let individualDishes: Dish[] = [];

  const emitMerged = () => {
    const { ids: delIds, names: delNames } = getDeletedDishKeys();

    // Filter out deleted dishes from individualDishes and catalogDishes
    const cleanIndividual = individualDishes.filter(
      (d) => !delIds.has(d.id) && !delNames.has(d.name.trim().toLowerCase())
    );
    const cleanCatalog = catalogDishes.filter(
      (d) => !delIds.has(d.id) && !delNames.has(d.name.trim().toLowerCase())
    );

    const hasCloudDishes = cleanIndividual.length > 0 || cleanCatalog.length > 0;
    
    // Crucial: Only fallback to BASE_DISHES if NO cloud dishes exist at all in Firestore.
    // If dishes exist in Firestore, do NOT seed BASE_DISHES so deleted items stay permanently removed.
    const base = hasCloudDishes 
      ? [] 
      : BASE_DISHES.filter(
          (d) => !delIds.has(d.id) && !delNames.has(d.name.trim().toLowerCase())
        );

    const combined = mergeDishes(base, cleanCatalog, cleanIndividual);
    const finalFiltered = combined.filter(
      (d) => !delIds.has(d.id) && !delNames.has(d.name.trim().toLowerCase())
    );
    onDishesUpdated(finalFiltered);
  };

  // Instant BroadcastChannel listener for multi-tab synchronization
  const handleBroadcastMessage = (event: MessageEvent) => {
    if (event.data?.type === 'DISH_DELETED') {
      const { dishId, dishName } = event.data;
      if (dishId) {
        individualDishes = individualDishes.filter((d) => d.id !== dishId);
        catalogDishes = catalogDishes.filter((d) => d.id !== dishId && (d as any).dishId !== dishId);
      }
      if (dishName) {
        const lower = dishName.trim().toLowerCase();
        individualDishes = individualDishes.filter((d) => d.name.trim().toLowerCase() !== lower);
        catalogDishes = catalogDishes.filter((d) => d.name.trim().toLowerCase() !== lower);
      }
      emitMerged();
    }
  };

  if (dishesChannel) {
    dishesChannel.addEventListener('message', handleBroadcastMessage);
  }

  // 1. Listen to barozza_menu_catalog in orders collection (used by external admin brozza-admin.vercel.app)
  const catalogDocRef = doc(db, 'orders', 'barozza_menu_catalog');
  const unsubCatalog = onSnapshot(
    catalogDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        
        // Sync any deleted IDs recorded in the catalog document
        if (Array.isArray(data?.deletedDishIds)) {
          const { ids, names } = getDeletedDishKeys();
          data.deletedDishIds.forEach((id: string) => ids.add(String(id)));
          if (Array.isArray(data?.deletedDishNames)) {
            data.deletedDishNames.forEach((name: string) => names.add(String(name).trim().toLowerCase()));
          }
          try {
            localStorage.setItem(DELETED_DISHES_KEY, JSON.stringify({
              ids: Array.from(ids),
              names: Array.from(names),
            }));
          } catch {}
        }

        if (Array.isArray(data?.dishes)) {
          catalogDishes = data.dishes.map((d: any, idx: number) => normalizeDish(d, `cat-dish-${idx}`));
          emitMerged();
        }
      }
    },
    (error) => {
      console.warn('Firestore barozza_menu_catalog subscription warning:', error.message);
    }
  );

  // 2. Listen to the dedicated dishes collection (used for granular document CRUD)
  const dishesColRef = collection(db, 'dishes');
  const unsubDishes = onSnapshot(
    dishesColRef,
    (snapshot) => {
      individualDishes = snapshot.docs.map((docSnap) => normalizeDish({ id: docSnap.id, ...docSnap.data() }, docSnap.id));
      emitMerged();
    },
    (error) => {
      console.warn('Firestore dishes collection subscription warning:', error.message);
    }
  );

  return () => {
    if (dishesChannel) {
      dishesChannel.removeEventListener('message', handleBroadcastMessage);
    }
    unsubCatalog();
    unsubDishes();
  };
}

/**
 * Saves a new dish or updates an existing dish in Firestore, ensuring both the dishes collection
 * and barozza_menu_catalog are updated so both admin dashboard and customer site stay in sync.
 */
export async function saveDishToFirestore(dish: Dish, allDishes: Dish[]) {
  try {
    const qty = dish.quantityAvailable !== undefined 
      ? Math.max(0, Math.floor(Number(dish.quantityAvailable))) 
      : (dish.available === false ? 0 : 20);

    const isAvailable = dish.available !== false && qty > 0;

    const dishData = {
      id: dish.id,
      dishId: dish.id,
      name: dish.name,
      price: dish.price,
      category: dish.category,
      description: dish.description,
      image: dish.image,
      imageUrl: dish.image,
      available: isAvailable,
      quantityAvailable: qty,
      stock: qty,
      lastUpdated: new Date().toISOString(),
    };

    // 1. Save to dedicated dishes collection
    await setDoc(doc(db, 'dishes', dish.id), dishData, { merge: true });

    // 2. Sync to barozza_menu_catalog in orders collection
    const catalogRef = doc(db, 'orders', 'barozza_menu_catalog');
    const catalogSnap = await getDoc(catalogRef);
    let existingDishes: any[] = [];
    if (catalogSnap.exists()) {
      const data = catalogSnap.data();
      existingDishes = Array.isArray(data.dishes) ? data.dishes : [];
    } else {
      existingDishes = allDishes.map((d) => ({
        id: d.id,
        dishId: d.id,
        name: d.name,
        price: d.price,
        category: d.category,
        description: d.description,
        imageUrl: d.image,
        available: d.available !== false && (d.quantityAvailable === undefined || d.quantityAvailable > 0),
        quantityAvailable: d.quantityAvailable ?? 20,
      }));
    }

    const itemIndex = existingDishes.findIndex(
      (d: any) => d.id === dish.id || d.dishId === dish.id || d.name?.trim().toLowerCase() === dish.name.trim().toLowerCase()
    );

    if (itemIndex >= 0) {
      existingDishes[itemIndex] = { ...existingDishes[itemIndex], ...dishData };
    } else {
      existingDishes.unshift(dishData);
    }

    await setDoc(catalogRef, {
      isCatalog: true,
      type: 'menu_catalog',
      storeName: 'The Barozza Cafe',
      totalDishes: existingDishes.length,
      lastUpdated: new Date().toISOString(),
      dishes: existingDishes,
    }, { merge: true });
  } catch (error) {
    console.error('Failed to sync dish to Firestore:', error);
  }
}

/**
 * Direct real-time helper for Admin to manually update a dish's available quantity
 */
export async function updateDishStockInFirestore(dishId: string, newQuantity: number, allDishes: Dish[]) {
  const target = allDishes.find((d) => d.id === dishId);
  if (!target) return;
  const safeQty = Math.max(0, Math.floor(newQuantity));
  const updatedDish: Dish = {
    ...target,
    quantityAvailable: safeQty,
    available: safeQty > 0,
  };
  await saveDishToFirestore(updatedDish, allDishes);
}

/**
 * Removes a dish from Firestore and permanently ensures it disappears from both Admin and User dashboards
 */
export async function deleteDishFromFirestore(dishId: string, dishName?: string) {
  try {
    // 1. Mark as deleted locally and broadcast immediately across tabs (0ms latency)
    markDishAsDeletedLocally(dishId, dishName);

    // 2. Delete primary doc from dishes collection
    await deleteDoc(doc(db, 'dishes', dishId)).catch(() => {});

    // 3. Also check if any duplicate document in dishes collection has this name or id
    try {
      const dishesSnap = await getDocs(collection(db, 'dishes'));
      for (const d of dishesSnap.docs) {
        const data = d.data();
        const matchesId = d.id === dishId || data.id === dishId || data.dishId === dishId;
        const matchesName = dishName && data.name?.trim().toLowerCase() === dishName.trim().toLowerCase();
        if (matchesId || matchesName) {
          await deleteDoc(d.ref).catch(() => {});
        }
      }
    } catch {}

    // 4. Remove from barozza_menu_catalog in orders collection and persist deleted IDs/names
    const catalogRef = doc(db, 'orders', 'barozza_menu_catalog');
    const catalogSnap = await getDoc(catalogRef);
    if (catalogSnap.exists()) {
      const data = catalogSnap.data();
      const existingDeletedIds: string[] = Array.isArray(data.deletedDishIds) ? data.deletedDishIds : [];
      const existingDeletedNames: string[] = Array.isArray(data.deletedDishNames) ? data.deletedDishNames : [];

      const nextDeletedIds = Array.from(new Set([...existingDeletedIds, dishId]));
      const nextDeletedNames = dishName
        ? Array.from(new Set([...existingDeletedNames, dishName.trim().toLowerCase()]))
        : existingDeletedNames;

      let filtered: any[] = [];
      if (Array.isArray(data.dishes)) {
        filtered = data.dishes.filter((d: any) => {
          if (d.id === dishId || d.dishId === dishId) return false;
          if (dishName && d.name?.trim().toLowerCase() === dishName.trim().toLowerCase()) return false;
          return true;
        });
      }

      await updateDoc(catalogRef, {
        dishes: filtered,
        totalDishes: filtered.length,
        deletedDishIds: nextDeletedIds,
        deletedDishNames: nextDeletedNames,
        lastUpdated: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Failed to delete dish from Firestore:', error);
  }
}
