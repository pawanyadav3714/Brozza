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
  updateDoc
} from 'firebase/firestore';
import { db } from './firebase';
import { Dish } from '../types';
import { DISHES as BASE_DISHES } from '../data';

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
  const available = raw.available !== false && (raw.stock === undefined || Number(raw.stock) > 0);

  return {
    id,
    name,
    price,
    category,
    description,
    image,
    available,
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
    const combined = mergeDishes(BASE_DISHES, catalogDishes, individualDishes);
    onDishesUpdated(combined);
  };

  // 1. Listen to barozza_menu_catalog in orders collection (used by external admin brozza-admin.vercel.app)
  const catalogDocRef = doc(db, 'orders', 'barozza_menu_catalog');
  const unsubCatalog = onSnapshot(
    catalogDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
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
      if (!snapshot.empty) {
        individualDishes = snapshot.docs.map((docSnap) => normalizeDish({ id: docSnap.id, ...docSnap.data() }, docSnap.id));
        emitMerged();
      }
    },
    (error) => {
      console.warn('Firestore dishes collection subscription warning:', error.message);
    }
  );

  return () => {
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
    const dishData = {
      id: dish.id,
      dishId: dish.id,
      name: dish.name,
      price: dish.price,
      category: dish.category,
      description: dish.description,
      image: dish.image,
      imageUrl: dish.image,
      available: dish.available !== false,
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
 * Removes a dish from Firestore
 */
export async function deleteDishFromFirestore(dishId: string) {
  try {
    // 1. Delete from dishes collection
    await deleteDoc(doc(db, 'dishes', dishId));

    // 2. Remove from barozza_menu_catalog in orders collection
    const catalogRef = doc(db, 'orders', 'barozza_menu_catalog');
    const catalogSnap = await getDoc(catalogRef);
    if (catalogSnap.exists()) {
      const data = catalogSnap.data();
      if (Array.isArray(data.dishes)) {
        const filtered = data.dishes.filter((d: any) => d.id !== dishId && d.dishId !== dishId);
        await updateDoc(catalogRef, {
          dishes: filtered,
          totalDishes: filtered.length,
          lastUpdated: new Date().toISOString(),
        });
      }
    }
  } catch (error) {
    console.error('Failed to delete dish from Firestore:', error);
  }
}
