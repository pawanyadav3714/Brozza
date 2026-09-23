/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, setDoc, serverTimestamp, doc, onSnapshot, query, orderBy, limit, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './lib/firebase';
import { subscribeToDishes, saveDishToFirestore, deleteDishFromFirestore } from './lib/dishesSync';
import { useFirebase } from './components/FirebaseProvider';
import Header from './components/Header';
import DishCarousel from './components/DishCarousel';
import CartModal from './components/CartModal';
import CheckoutStep from './components/CheckoutStep';
import PaymentStep from './components/PaymentStep';
import SuccessStep from './components/SuccessStep';
import AdminDashboard from './components/AdminDashboard';
import AdminSyncGatewayModal from './components/AdminSyncGatewayModal';
import ContactModal from './components/ContactModal';
import { PhoneCall, Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { DISHES, INITIAL_INVENTORY } from './data';
import { Dish, CartItem, AppStep, UserAddress, OrderStatus, InventoryItem, Order, PipelineStage } from './types';
import { normalizePipelineStage } from './components/ParcelPipelineTracker';
import { 
  RETENTION_PERIOD_MS, 
  isRecordExpired, 
  purgeExpiredLocalStorageOrders, 
  purgeExpiredRecordsFromFirestore 
} from './lib/retentionPolicy';

const DEFAULT_DEMO_ORDERS: Order[] = [
  {
    id: 'brz-ord-101',
    userId: 'demo-user',
    dishId: 'd1',
    dishName: 'Artisanal Cold Brew Coffee',
    dishImage: '/images/coldcoffe.png',
    quantity: 1,
    totalPrice: 180,
    status: 'Pending',
    customerName: 'Priyanshu Verma',
    customerPhone: '+91 98765 43210',
    customerAddress: 'GEC Palamu Campus, Block A, Room 304',
    parcelId: 'PRCL-BRZ-LIVE-101',
    trackingNumber: 'BRZTRK98101',
    createdAt: { seconds: Math.floor((Date.now() - 6 * 60 * 1000) / 1000) },
    updatedAt: { seconds: Math.floor(Date.now() / 1000) },
  },
  {
    id: 'brz-ord-102',
    userId: 'demo-user',
    dishId: 'd2',
    dishName: 'Crispy French Fries & Dip',
    dishImage: '/images/frenchh.png',
    quantity: 2,
    totalPrice: 240,
    status: 'Received',
    customerName: 'Priyanshu Verma',
    customerPhone: '+91 98765 43210',
    customerAddress: 'GEC Palamu Campus, Block A, Room 304',
    parcelId: 'PRCL-BRZ-LIVE-102',
    trackingNumber: 'BRZTRK98102',
    createdAt: { seconds: Math.floor((Date.now() - 28 * 60 * 1000) / 1000) },
    updatedAt: { seconds: Math.floor(Date.now() / 1000) },
  }
];

export default function App() {
  const { user } = useFirebase();
  const [step, setStep] = useState<AppStep>('menu');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  // Multi-item cart state for batch parcel ordering
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    const saved = localStorage.getItem('barozza_cafe_cart');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        console.warn('Failed to parse cached cart:', e);
      }
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('barozza_cafe_cart', JSON.stringify(cartItems));
    } catch (e) {
      console.warn('Failed to save cart to localStorage:', e);
    }
  }, [cartItems]);

  const [userAddress, setUserAddress] = useState<UserAddress | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('idle');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentParcelId, setCurrentParcelId] = useState<string | null>(null);
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{ method?: string; paymentId?: string } | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number | null>(null);
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Real-time live orders list with persistence and 2-day retention policy
  const [orders, setOrders] = useState<Order[]>(() => {
    const validCachedOrders = purgeExpiredLocalStorageOrders();
    if (validCachedOrders.length > 0) {
      const seen = new Set<string>();
      return validCachedOrders.filter((o: any) => {
        const key = o?.id || `${o?.parcelId || ''}-${o?.trackingNumber || ''}`;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    }
    return DEFAULT_DEMO_ORDERS.filter((o) => !isRecordExpired(o, RETENTION_PERIOD_MS));
  });

  // Menu Catalog State with persistence
  const [dishes, setDishes] = useState<Dish[]>(() => {
    const saved = localStorage.getItem('barozza_cafe_dishes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Clean any legacy placeholder banner references for dish item cards and normalize quantity
          return parsed.map((d: Dish) => {
            let img = d.image;
            let name = d.name;
            if (d.image === '/images/unscriptedBanner.jpg') {
              if (d.name?.toLowerCase().includes('fries')) img = '/images/frenchh.png';
              else {
                img = '/images/momos.png';
                if (d.name === 'Unscripted Special Banner Item') name = 'Barozza Special Combo Platter';
              }
            }
            const qty = d.quantityAvailable !== undefined ? Number(d.quantityAvailable) : (d.available === false ? 0 : 20);
            const safeQty = isNaN(qty) ? 20 : Math.max(0, Math.floor(qty));
            return {
              ...d,
              image: img,
              name,
              quantityAvailable: safeQty,
              available: d.available !== false && safeQty > 0,
            };
          });
        }
      } catch (e) {
        console.warn('Failed to parse cached dishes:', e);
      }
    }
    return DISHES;
  });

  // Inventory State with persistence
  const [inventory, setInventory] = useState<InventoryItem[]>(() => {
    const saved = localStorage.getItem('barozza_cafe_inventory');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Failed to parse cached inventory:', e);
      }
    }
    return INITIAL_INVENTORY;
  });

  // Real-time synchronization for Menu Dishes from Firestore (barozza_menu_catalog & dishes collection)
  // This ensures any new dishes added by the admin anywhere immediately appear on the customer site
  useEffect(() => {
    const unsubscribe = subscribeToDishes((syncedDishes) => {
      if (syncedDishes && syncedDishes.length > 0) {
        setDishes(syncedDishes);
        try {
          localStorage.setItem('barozza_cafe_dishes', JSON.stringify(syncedDishes));
        } catch (e) {
          console.warn('Failed to cache synced dishes:', e);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Persist inventory
  useEffect(() => {
    localStorage.setItem('barozza_cafe_inventory', JSON.stringify(inventory));
  }, [inventory]);

  // Dish Handlers for Admin
  const handleUpdateDish = (updatedDish: Dish) => {
    const nextDishes = dishes.map((d) => (d.id === updatedDish.id ? updatedDish : d));
    setDishes(nextDishes);
    saveDishToFirestore(updatedDish, nextDishes);
  };

  const handleUpdateDishQuantity = (dishId: string, newQuantity: number) => {
    const safeQty = Math.max(0, Math.floor(newQuantity));
    const isAvailable = safeQty > 0;
    const target = dishes.find((d) => d.id === dishId);
    if (!target) return;
    const updated: Dish = {
      ...target,
      quantityAvailable: safeQty,
      available: isAvailable,
    };
    const nextDishes = dishes.map((d) => (d.id === dishId ? updated : d));
    setDishes(nextDishes);
    saveDishToFirestore(updated, nextDishes);
  };

  const handleAddDish = (newDish: Dish) => {
    const nextDishes = [newDish, ...dishes];
    setDishes(nextDishes);
    saveDishToFirestore(newDish, nextDishes);
  };

  const handleDeleteDish = (dishId: string) => {
    setDishes((prev) => prev.filter((d) => d.id !== dishId));
    deleteDishFromFirestore(dishId);
  };

  const handleToggleDishAvailability = (dishId: string) => {
    const target = dishes.find((d) => d.id === dishId);
    if (!target) return;
    const isCurrentlyAvailable = target.available !== false && (target.quantityAvailable === undefined || target.quantityAvailable > 0);
    const nextAvailable = !isCurrentlyAvailable;
    const nextQuantity = nextAvailable ? (target.quantityAvailable && target.quantityAvailable > 0 ? target.quantityAvailable : 20) : 0;
    const toggled: Dish = {
      ...target,
      available: nextAvailable,
      quantityAvailable: nextQuantity,
    };
    const nextDishes = dishes.map((d) => (d.id === dishId ? toggled : d));
    setDishes(nextDishes);
    saveDishToFirestore(toggled, nextDishes);
  };

  const handleResetDishes = () => {
    setDishes(DISHES);
    localStorage.removeItem('barozza_cafe_dishes');
  };

  // Inventory Handlers for Admin
  const handleUpdateInventoryItem = (updatedItem: InventoryItem) => {
    setInventory((prev) => prev.map((i) => (i.id === updatedItem.id ? updatedItem : i)));
  };

  const handleAddInventoryItem = (newItem: InventoryItem) => {
    setInventory((prev) => [newItem, ...prev]);
  };

  const handleDeleteInventoryItem = (itemId: string) => {
    setInventory((prev) => prev.filter((i) => i.id !== itemId));
  };

  const handleAdjustInventoryStock = (itemId: string, delta: number) => {
    setInventory((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const nextQty = Math.max(0, Math.round((item.quantity + delta) * 10) / 10);
          return {
            ...item,
            quantity: nextQty,
            lastUpdated: 'Just now',
          };
        }
        return item;
      })
    );
  };

  const handleResetInventory = () => {
    setInventory(INITIAL_INVENTORY);
    localStorage.removeItem('barozza_cafe_inventory');
  };

  // Real-time live orders tracking across the storefront (filtered by current user & 2-day retention)
  useEffect(() => {
    const q = query(collection(db, 'orders'), limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const seen = new Set<string>();
        const expiredOrderIdsToDelete: string[] = [];
        const expiredParcelIdsToDelete: string[] = [];

        const list = snapshot.docs
          .filter((docSnap) => {
            if (docSnap.id === 'barozza_menu_catalog' || docSnap.data().isCatalog) return false;
            const data = docSnap.data();

            // 2-Day Retention Auto-Purge Check
            if (isRecordExpired(data, RETENTION_PERIOD_MS)) {
              expiredOrderIdsToDelete.push(docSnap.id);
              if (data.parcelId) {
                expiredParcelIdsToDelete.push(data.parcelId);
              }
              return false;
            }

            if (user && data.userId && data.userId !== user.uid) {
              return false;
            }
            if (seen.has(docSnap.id)) return false;
            seen.add(docSnap.id);
            return true;
          })
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              ...data,
              id: docSnap.id,
              dishImage: data.dishImage || dishes.find((d) => d.id === data.dishId)?.image || '/images/frenchh.png',
            } as Order;
          })
          .sort((a, b) => {
            const timeA = (a.createdAt as any)?.seconds || 0;
            const timeB = (b.createdAt as any)?.seconds || 0;
            return timeB - timeA;
          });

        // Trigger immediate background deletion for any detected expired records
        if (expiredOrderIdsToDelete.length > 0) {
          expiredOrderIdsToDelete.forEach((ordId) => {
            deleteDoc(doc(db, 'orders', ordId)).catch(() => {});
          });
        }
        if (expiredParcelIdsToDelete.length > 0) {
          expiredParcelIdsToDelete.forEach((prcId) => {
            deleteDoc(doc(db, 'parcels', prcId)).catch(() => {});
          });
        }

        setOrders(list);
        try {
          localStorage.setItem('barozza_cafe_orders', JSON.stringify(list));
        } catch (e) {
          console.warn('Failed to cache orders:', e);
        }
      },
      (error) => {
        console.warn('Live orders tracking error:', error);
      }
    );

    return () => unsubscribe();
  }, [dishes, user]);

  // Automatic 2-Day Retention Database & Storage Purge Routine
  useEffect(() => {
    // Initial run on mount
    purgeExpiredRecordsFromFirestore().catch((err) => {
      console.warn('Initial 2-day database purge check notice:', err);
    });

    // Periodic sweep every 30 minutes
    const purgeInterval = setInterval(() => {
      purgeExpiredRecordsFromFirestore().catch(() => {});
    }, 30 * 60 * 1000);

    return () => clearInterval(purgeInterval);
  }, []);

  // Real-time single active order tracking
  useEffect(() => {
    if (!currentOrderId) return;

    const unsubscribe = onSnapshot(
      doc(db, 'orders', currentOrderId), 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setOrderStatus(data.status as OrderStatus);
        }
      },
      (error) => {
        console.warn("Order status tracking error:", error);
      }
    );

    return () => unsubscribe();
  }, [currentOrderId]);

  const handleUpdateOrderStatus = async (orderId: string, newStage: PipelineStage) => {
    // 1. Immediate optimistic UI update
    setOrders((prev) => {
      const updated = prev.map((o) => (o.id === orderId ? { ...o, status: newStage } : o));
      try {
        localStorage.setItem('barozza_cafe_orders', JSON.stringify(updated));
      } catch (e) {
        // ignore
      }
      return updated;
    });

    if (currentOrderId === orderId) {
      setOrderStatus(newStage);
    }

    // 2. Sync to Firebase Firestore
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStage,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn('Firestore stage update (demo or network):', err);
    }
  };

  const handleAddToCart = (dish: Dish, qty: number = 1) => {
    const currentDish = dishes.find((d) => d.id === dish.id) || dish;
    const maxStock = currentDish.quantityAvailable !== undefined ? currentDish.quantityAvailable : (currentDish.available === false ? 0 : 20);
    
    if (maxStock <= 0 || currentDish.available === false) {
      return;
    }

    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === dish.id);
      if (existing) {
        const newQty = Math.min(maxStock, existing.quantity + qty);
        return prev.map((item) =>
          item.id === dish.id ? { ...item, quantity: newQty, quantityAvailable: maxStock } : item
        );
      }
      const initialQty = Math.min(maxStock, qty);
      return [...prev, { ...dish, quantity: initialQty, quantityAvailable: maxStock }];
    });
  };

  const handleUpdateCartQuantity = (dishId: string, newQty: number) => {
    const currentDish = dishes.find((d) => d.id === dishId);
    const maxStock = currentDish?.quantityAvailable !== undefined ? currentDish.quantityAvailable : 99;

    setCartItems((prev) => {
      if (newQty <= 0) {
        return prev.filter((item) => item.id !== dishId);
      }
      const cappedQty = Math.min(maxStock, newQty);
      return prev.map((item) =>
        item.id === dishId ? { ...item, quantity: cappedQty, quantityAvailable: maxStock } : item
      );
    });
  };

  const handleRemoveFromCart = (dishId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== dishId));
  };

  const handleClearCart = () => {
    setCartItems([]);
  };

  const totalCartItemsCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  const handleDishSelect = (dish: Dish) => {
    setSelectedDish(dish);
    setQuantity(1);
    const currentDish = dishes.find((d) => d.id === dish.id) || dish;
    const maxStock = currentDish.quantityAvailable !== undefined ? currentDish.quantityAvailable : (currentDish.available === false ? 0 : 20);
    if (maxStock > 0 && currentDish.available !== false) {
      handleAddToCart(currentDish, 1);
    }
    setIsCartOpen(true);
  };

  const handleProceedToCheckout = () => {
    setIsCartOpen(false);
    setStep('checkout');
  };

  const handleAddressConfirm = (address: UserAddress) => {
    setUserAddress(address);
    setStep('payment');
  };

  const handlePaymentConfirm = async (paymentInfo?: { method: 'cod' | 'qr' | 'razorpay'; paymentId?: string }) => {
    if (!userAddress || !user) return;

    // Items to order: either all items in the cart or fallback to selectedDish
    const itemsToOrder: CartItem[] = cartItems.length > 0
      ? cartItems
      : (selectedDish ? [{ ...selectedDish, quantity }] : []);

    if (itemsToOrder.length === 0) return;

    // Generate unique batch identifier for ordering all parcels at once
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const timeStampNum = Date.now().toString().slice(-6);
    const batchId = `BATCH-BRZ-${timeStampNum}-${randomSuffix}`;
    const batchTotal = itemsToOrder.reduce((acc, item) => acc + item.price * item.quantity, 0);

    const chosenMethod = paymentInfo?.method || 'razorpay';
    const paymentId = paymentInfo?.paymentId || '';
    const paymentStatus = chosenMethod === 'cod' ? 'pending' : 'paid';
    setLastPaymentInfo({ method: chosenMethod, paymentId });

    const newlyCreatedOrders: Order[] = [];
    let firstParcelId = '';

    try {
      // Order all parcels at a time
      for (let i = 0; i < itemsToOrder.length; i++) {
        const item = itemsToOrder[i];
        const itemRandom = Math.floor(1000 + Math.random() * 9000);
        const parcelId = `PRCL-BRZ-${timeStampNum}-${itemRandom}`;
        const trackingNumber = `BRZTRK${timeStampNum}${itemRandom}`;
        const weightEstimate = `${(0.42 * item.quantity).toFixed(2)} kg`;

        if (!firstParcelId) {
          firstParcelId = parcelId;
        }

        const orderData = {
          userId: user.uid,
          dishId: item.id,
          dishName: item.name,
          dishImage: item.image,
          quantity: item.quantity,
          totalPrice: item.price * item.quantity,
          batchId: batchId,
          batchCount: itemsToOrder.length,
          batchTotal: batchTotal,
          status: 'Pending',
          customerName: userAddress.name,
          customerPhone: userAddress.phone,
          customerAddress: userAddress.address,
          paymentMethod: chosenMethod,
          paymentId: paymentId,
          paymentStatus: paymentStatus,
          parcelId: parcelId,
          trackingNumber: trackingNumber,
          parcelType: 'Artisanal Cafe Fresh Food Express Parcel',
          parcelWeight: weightEstimate,
          parcelStatus: 'booked',
          destinationLocation: userAddress.address,
          deliveryNotes: `Dispatched via The Barozza Express Courier Fleet (${chosenMethod.toUpperCase()}) [Parcel ${i + 1}/${itemsToOrder.length} • Batch ${batchId}]`,
          syncedToFirebase: true,
          syncedAt: serverTimestamp(),
          externalAdminUrl: 'https://brozza-admin.vercel.app/',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'orders'), orderData);

        const newLocalOrder: Order = {
          id: docRef.id,
          ...orderData,
          status: 'Pending',
          createdAt: { seconds: Math.floor(Date.now() / 1000) },
          updatedAt: { seconds: Math.floor(Date.now() / 1000) },
        } as Order;
        newlyCreatedOrders.push(newLocalOrder);

        // Dual-sync to dedicated 'parcels' collection for admin applet
        const parcelData = {
          parcelId: parcelId,
          orderId: docRef.id,
          batchId: batchId,
          userId: user.uid,
          recipientName: userAddress.name,
          recipientPhone: userAddress.phone,
          destination: userAddress.address,
          parcelType: 'Artisanal Cafe Fresh Food Express Parcel',
          parcelWeight: weightEstimate,
          parcelStatus: 'booked',
          itemsSummary: `${item.quantity}x ${item.name}`,
          totalValue: item.price * item.quantity,
          pickupLocation: 'The Barozza Cafe Kitchen Hub, GEC Palamu',
          estimatedDeliveryMinutes: 30,
          syncedToFirebase: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          externalAdminUrl: 'https://brozza-admin.vercel.app/',
        };

        try {
          await setDoc(doc(db, 'parcels', parcelId), parcelData);
        } catch (parcelErr) {
          console.warn('Parcels dual-sync notification:', parcelErr);
        }
      }

      setCurrentOrderId(newlyCreatedOrders[0]?.id || null);
      setCurrentParcelId(firstParcelId || batchId);

      // Prepend to local orders state immediately, deduplicating against any live listener snapshot
      setOrders((prev) => {
        const map = new Map<string, Order>();
        for (const o of newlyCreatedOrders) {
          if (o.id) map.set(o.id, o);
        }
        for (const o of prev) {
          if (o.id && !map.has(o.id)) {
            map.set(o.id, o);
          }
        }
        const updated = Array.from(map.values());
        try {
          localStorage.setItem('barozza_cafe_orders', JSON.stringify(updated));
        } catch (e) {
          // ignore
        }
        return updated;
      });

      // Clear the cart since all parcels have now been ordered
      setCartItems([]);
      try {
        localStorage.removeItem('barozza_cafe_cart');
      } catch (e) {
        // ignore
      }

      // Automatically deduct ordered portions from kitchen stock and sync live to Firestore
      setDishes((prevDishes) => {
        let updatedList = [...prevDishes];
        for (const item of itemsToOrder) {
          const target = updatedList.find((d) => d.id === item.id);
          if (target) {
            const currentStock = target.quantityAvailable !== undefined ? target.quantityAvailable : 20;
            const newStock = Math.max(0, currentStock - item.quantity);
            const updatedDish: Dish = {
              ...target,
              quantityAvailable: newStock,
              available: newStock > 0,
            };
            updatedList = updatedList.map((d) => (d.id === item.id ? updatedDish : d));
            saveDishToFirestore(updatedDish, updatedList);
          }
        }
        return updatedList;
      });

      setStep('success');
    } catch (error) {
      console.error("Error creating batch orders:", error);
      setCurrentParcelId(firstParcelId || batchId);
      if (newlyCreatedOrders.length > 0) {
        setOrders((prev) => {
          const map = new Map<string, Order>();
          for (const o of newlyCreatedOrders) {
            if (o.id) map.set(o.id, o);
          }
          for (const o of prev) {
            if (o.id && !map.has(o.id)) {
              map.set(o.id, o);
            }
          }
          return Array.from(map.values());
        });
      }
      setCartItems([]);
      setStep('success');
      setOrderStatus('ordered');
    }
  };

  const resetApp = () => {
    setStep('menu');
    setSelectedDish(null);
    setQuantity(1);
    setIsCartOpen(false);
    setUserAddress(null);
    setOrderStatus('idle');
    setCurrentOrderId(null);
    setCurrentParcelId(null);
    setLastPaymentInfo(null);
  };

  const totalPrice = selectedDish ? selectedDish.price * quantity : 0;

  // Dynamic categories computed from all dishes (including any newly added dishes from admin dashboard)
  const availableCategories = useMemo(() => {
    const list = ['All'];
    const seen = new Set<string>();
    dishes.forEach((d) => {
      const cat = d.category ? d.category.trim() : 'General';
      const lower = cat.toLowerCase();
      if (!seen.has(lower)) {
        seen.add(lower);
        const formatted = cat.charAt(0).toUpperCase() + cat.slice(1);
        list.push(formatted);
      }
    });
    return list;
  }, [dishes]);

  // Filter dishes for customer menu
  const displayedDishes = useMemo(() => {
    let result = dishes;
    if (selectedFilter !== 'All') {
      result = result.filter(
        (d) => (d.category || 'General').trim().toLowerCase() === selectedFilter.trim().toLowerCase()
      );
    }
    if (maxPriceFilter !== null) {
      result = result.filter((d) => d.price <= maxPriceFilter);
    }
    return result;
  }, [dishes, selectedFilter, maxPriceFilter]);

  if (step === 'admin') {
    return (
      <div className="min-h-screen bg-black font-sans text-white selection:bg-red-500/30 selection:text-white">
        <div className="relative z-10">
          <Header 
            cartCount={selectedDish ? 1 : 0} 
            onOpenCart={() => setIsCartOpen(true)}
            onOpenAdmin={() => setIsSyncModalOpen(true)}
            onBackToMenu={() => setStep('menu')}
            step={step}
            orderStatus={orderStatus}
            orders={orders}
          />
          <AdminDashboard 
            onBack={() => setStep('menu')}
            dishes={dishes}
            onUpdateDish={handleUpdateDish}
            onAddDish={handleAddDish}
            onDeleteDish={handleDeleteDish}
            onToggleDishAvailability={handleToggleDishAvailability}
            onResetDishes={handleResetDishes}
            onUpdateDishQuantity={handleUpdateDishQuantity}
            inventory={inventory}
            onUpdateInventoryItem={handleUpdateInventoryItem}
            onAddInventoryItem={handleAddInventoryItem}
            onDeleteInventoryItem={handleDeleteInventoryItem}
            onAdjustInventoryStock={handleAdjustInventoryStock}
            onResetInventory={handleResetInventory}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black font-sans text-white selection:bg-red-500/30 selection:text-white">
      
      <div className="relative z-10">
        <Header 
          cartCount={totalCartItemsCount > 0 ? totalCartItemsCount : (selectedDish ? 1 : 0)} 
          onOpenCart={() => setIsCartOpen(true)}
          onOpenAdmin={() => setIsSyncModalOpen(true)}
          onBackToMenu={() => setStep('menu')}
          step={step}
          orderStatus={orderStatus}
          orders={orders}
        />

        <main className="pb-24">
          <AnimatePresence mode="wait">
            {step === 'menu' && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="max-w-7xl mx-auto px-4 pt-4 pb-8 sm:py-12">
                  <div className="flex flex-col items-center text-center gap-6 mb-8 sm:mb-12">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.8 }}
                    >
                      <motion.h1 
                        animate={{ 
                          y: [0, -6, 0],
                        }}
                        transition={{ 
                          duration: 4, 
                          repeat: Infinity, 
                          ease: "easeInOut" 
                        }}
                        className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4 drop-shadow-2xl"
                      >
                        Welcome to{" "}
                        <motion.span 
                          className="text-red-500 inline-block drop-shadow-[0_0_25px_rgba(239,68,68,0.4)]"
                          animate={{
                            filter: [
                              "drop-shadow(0 0 15px rgba(239,68,68,0.35))",
                              "drop-shadow(0 0 32px rgba(239,68,68,0.75))",
                              "drop-shadow(0 0 15px rgba(239,68,68,0.35))"
                            ],
                            scale: [1, 1.018, 1],
                          }}
                          transition={{
                            duration: 3.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        >
                          The Barozza Cafe
                        </motion.span>
                      </motion.h1>
                      <p className="text-gray-300 max-w-2xl mx-auto text-xl font-medium backdrop-blur-sm px-4 py-2 rounded-full border border-white/10 bg-white/5">
                        Experience the finest artisanal coffee and gourmet dishes in a celestial atmosphere.
                      </p>
                    </motion.div>
                    
                    {/* Price Filter Pills */}
                    <div className="flex flex-wrap sm:flex-nowrap justify-center items-center gap-1.5 sm:gap-2 -mt-4 mb-2 max-w-full px-2 w-full py-2">
                      <button
                        type="button"
                        onClick={() => setMaxPriceFilter(null)}
                        className={`shrink-0 px-2 py-1 sm:px-4 sm:py-2 backdrop-blur-md rounded-full text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
                          maxPriceFilter === null
                            ? 'bg-red-600 border border-red-400 text-white shadow-red-900/50 scale-105'
                            : 'bg-white/10 border border-white/20 text-gray-300 hover:bg-red-500 hover:text-white hover:border-red-500'
                        }`}
                      >
                        All Prices
                      </button>
                      {[30, 40, 60, 70, 90].map((price) => (
                        <button
                          key={price}
                          type="button"
                          onClick={() => setMaxPriceFilter(price)}
                          className={`shrink-0 px-2 py-1 sm:px-4 sm:py-2 backdrop-blur-md rounded-full text-[9px] sm:text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
                            maxPriceFilter === price
                              ? 'bg-red-600 border border-red-400 text-white shadow-red-900/50 scale-105'
                              : 'bg-white/10 border border-white/20 text-gray-300 hover:bg-red-500 hover:text-white hover:border-red-500'
                          }`}
                        >
                          ₹{price} & Below
                        </button>
                      ))}
                    </div>
                  </div>

                  <DishCarousel 
                    dishes={displayedDishes} 
                    onSelectDish={handleDishSelect} 
                    cartItems={cartItems}
                    onAddToCart={(dish) => handleAddToCart(dish, 1)}
                  />

                  <section className="mt-20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-10">
                      <h2 className="text-3xl font-black text-white flex items-center gap-4">
                        <span className="w-12 h-1 bg-red-500 rounded-full" />
                        Popular Near You
                      </h2>
                      {totalCartItemsCount > 0 && (
                        <button
                          type="button"
                          onClick={() => setIsCartOpen(true)}
                          className="self-start sm:self-auto px-4 py-2 rounded-2xl bg-red-600/20 border border-red-500/40 text-red-300 text-xs font-black flex items-center gap-2 hover:bg-red-600 hover:text-white transition-all cursor-pointer"
                        >
                          <ShoppingBag className="w-4 h-4" />
                          <span>{cartItems.length} Dishes ({totalCartItemsCount} portions) in Bag • ₹{totalCartPrice.toFixed(2)}</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                      {displayedDishes.map((dish, dishIdx) => {
                        const availableStock = dish.quantityAvailable !== undefined ? dish.quantityAvailable : (dish.available === false ? 0 : 20);
                        const isAvailable = dish.available !== false && availableStock > 0;
                        const isLowStock = isAvailable && availableStock <= 5;
                        const inCartItem = cartItems.find((item) => item.id === dish.id);
                        const inCartQty = inCartItem?.quantity || 0;

                        return (
                          <motion.div
                            key={`store-dish-${dish.id}-${dishIdx}`}
                            whileHover={{ y: -6 }}
                            onClick={() => handleDishSelect(dish)}
                            className={`backdrop-blur-xl rounded-[2.5rem] overflow-hidden border shadow-2xl transition-all cursor-pointer group flex flex-col justify-between ${
                              isAvailable
                                ? inCartQty > 0
                                  ? 'bg-neutral-900/90 border-red-500/50 shadow-red-950/40'
                                  : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                                : 'bg-neutral-950/70 border-red-500/20 opacity-80'
                            }`}
                          >
                            {/* Dish Image Container */}
                            <div className="aspect-[4/3] overflow-hidden relative">
                              <img 
                                src={dish.image} 
                                alt={dish.name} 
                                className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${
                                  !isAvailable ? 'grayscale-[60%]' : ''
                                }`}
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = '/images/frenchh.png';
                                }}
                              />
                              <div className="absolute top-5 right-5 flex items-center gap-1.5">
                                {inCartQty > 0 && (
                                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white shadow-xl flex items-center gap-1">
                                    <ShoppingBag className="w-3 h-3" />
                                    {inCartQty} in Bag
                                  </span>
                                )}
                                <div className="bg-red-500 px-3.5 py-1 rounded-full text-xs font-black text-white shadow-xl">
                                  4.5 ★
                                </div>
                              </div>
                              <div className="absolute top-5 left-5">
                                <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                                  {dish.category || 'General'}
                                </span>
                              </div>
                              {/* Low stock callout on image */}
                              {isLowStock && (
                                <div className="absolute bottom-3 left-3">
                                  <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/90 backdrop-blur-md text-black shadow-xl flex items-center gap-1.5 animate-pulse">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping" />
                                    Only {availableStock} left!
                                  </span>
                                </div>
                              )}
                              {!isAvailable && (
                                <div className="absolute inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center">
                                  <span className="px-4 py-2 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-widest border border-red-400/50 shadow-2xl">
                                    Sold Out
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Dish Details & Cart Button Container */}
                            <div className="p-7 flex flex-col flex-1 justify-between">
                              <div>
                                <div className="flex justify-between items-start mb-2.5">
                                  <h3 className="text-xl sm:text-2xl font-bold text-white group-hover:text-red-400 transition-colors leading-tight">
                                    {dish.name}
                                  </h3>
                                  <span className="text-xl font-black text-red-500 shrink-0 ml-3">
                                    ₹{dish.price.toFixed(2)}
                                  </span>
                                </div>
                                <p className="text-gray-400 line-clamp-2 mb-5 font-medium text-xs sm:text-sm leading-relaxed">
                                  {dish.description}
                                </p>
                                <div className="flex items-center justify-between pb-4 mb-4 border-t border-white/5 pt-3">
                                  <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-widest">
                                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                    5-10 min
                                  </div>
                                  <div className="flex items-center">
                                    {!isAvailable ? (
                                      <span className="text-xs font-black uppercase tracking-wider text-red-300 bg-red-950/80 border border-red-500/50 px-3 py-1 rounded-full shadow-md shadow-red-950/50">
                                        Sold Out
                                      </span>
                                    ) : isLowStock ? (
                                      <span className="text-xs font-black uppercase tracking-wider text-amber-200 bg-amber-950/90 border border-amber-500/60 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md shadow-amber-950/60 animate-pulse">
                                        <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-300 animate-ping" />
                                        Only {availableStock} Left
                                      </span>
                                    ) : (
                                      <span className="text-xs font-black uppercase tracking-wider text-emerald-200 bg-emerald-950/80 border border-emerald-500/50 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md shadow-emerald-950/50">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-300" />
                                        {availableStock} Available
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Cart Action Buttons */}
                              <div className="pt-1 mt-auto">
                                {!isAvailable ? (
                                  <button
                                    type="button"
                                    disabled
                                    className="w-full py-3 px-4 rounded-2xl bg-neutral-900 border border-white/10 text-gray-500 font-black text-xs uppercase tracking-wider text-center cursor-not-allowed"
                                  >
                                    Currently Sold Out
                                  </button>
                                ) : inCartQty === 0 ? (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleAddToCart(dish, 1);
                                    }}
                                    className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-950/40 hover:shadow-red-900/60 active:scale-95 transition-all cursor-pointer group/btn"
                                  >
                                    <Plus className="w-4 h-4 transition-transform group-hover/btn:rotate-90 duration-300" />
                                    <span>Add to Cart</span>
                                  </button>
                                ) : (
                                  <div 
                                    onClick={(e) => e.stopPropagation()} 
                                    className="flex items-center justify-between gap-2 bg-red-950/30 border border-red-500/40 rounded-2xl p-1.5 shadow-inner"
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setIsCartOpen(true);
                                      }}
                                      className="flex items-center gap-2 pl-3 hover:text-red-400 transition-colors cursor-pointer min-w-0"
                                      title="Open Bag & Review Parcels"
                                    >
                                      <ShoppingBag className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                      <span className="text-xs font-black text-white truncate">{inCartQty} in Bag</span>
                                    </button>
                                    <div className="flex items-center gap-1.5 bg-neutral-900/90 rounded-xl p-1 border border-white/10 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleUpdateCartQuantity(dish.id, inCartQty - 1);
                                        }}
                                        className="p-1.5 hover:bg-white/10 rounded-lg text-red-400 hover:text-white transition-colors cursor-pointer"
                                        title={inCartQty <= 1 ? "Remove from bag" : "Decrease quantity"}
                                      >
                                        {inCartQty <= 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                      </button>
                                      <span className="w-5 text-center font-black text-xs text-white">
                                        {inCartQty}
                                      </span>
                                      <button
                                        type="button"
                                        disabled={inCartQty >= availableStock}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (inCartQty < availableStock) {
                                            handleUpdateCartQuantity(dish.id, inCartQty + 1);
                                          }
                                        }}
                                        className={`p-1.5 rounded-lg transition-colors ${
                                          inCartQty >= availableStock
                                            ? 'opacity-30 text-gray-500 cursor-not-allowed'
                                            : 'hover:bg-white/10 text-emerald-400 hover:text-white cursor-pointer'
                                        }`}
                                        title={inCartQty >= availableStock ? "Maximum available portions reached" : "Increase quantity"}
                                      >
                                        <Plus className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </section>
                </div>
              </motion.div>
            )}

            {step === 'checkout' && (
              <motion.div
                key="checkout"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <CheckoutStep 
                  onBack={() => setStep('menu')} 
                  onProceed={handleAddressConfirm} 
                />
              </motion.div>
            )}

            {step === 'payment' && (
              <motion.div
                key="payment"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <PaymentStep 
                  totalPrice={cartItems.length > 0 ? totalCartPrice : totalPrice}
                  userAddress={userAddress}
                  dishName={cartItems.length === 1 ? cartItems[0].name : (selectedDish?.name)}
                  quantity={cartItems.length === 1 ? cartItems[0].quantity : quantity}
                  cartItems={cartItems.length > 0 ? cartItems : (selectedDish ? [{ ...selectedDish, quantity }] : [])}
                  onBack={() => setStep('checkout')} 
                  onConfirm={handlePaymentConfirm} 
                />
              </motion.div>
            )}

            {step === 'success' && (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
              >
                <SuccessStep 
                  onReset={resetApp} 
                  orderStatus={orderStatus} 
                  parcelId={currentParcelId}
                  customerAddress={userAddress?.address}
                  paymentInfo={lastPaymentInfo}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Floating Bottom Cart Bar for Multi-Dish Selection */}
      <AnimatePresence>
        {step === 'menu' && totalCartItemsCount > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94%] max-w-lg bg-neutral-900/95 backdrop-blur-2xl border border-red-500/40 rounded-2xl sm:rounded-full p-2.5 sm:px-5 sm:py-3 shadow-2xl shadow-red-950/80 flex items-center justify-between gap-3 text-white"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="relative p-2 rounded-xl bg-red-600 text-white shrink-0 shadow-md shadow-red-950/60">
                <ShoppingBag className="w-5 h-5" />
                <span className="absolute -top-1.5 -right-1.5 bg-white text-red-600 font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow">
                  {totalCartItemsCount}
                </span>
              </div>
              <div className="min-w-0">
                <div className="text-xs font-black text-white truncate">
                  {cartItems.length} {cartItems.length === 1 ? 'Dish' : 'Dishes'} ({totalCartItemsCount} {totalCartItemsCount === 1 ? 'item' : 'items'})
                </div>
                <div className="text-[11px] font-bold text-red-400">
                  ₹{totalCartPrice.toFixed(2)} • {cartItems.length} Express {cartItems.length === 1 ? 'Parcel' : 'Parcels'}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-all cursor-pointer"
              >
                View Bag
              </button>
              <button
                type="button"
                onClick={() => {
                  handleProceedToCheckout();
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-xs font-black flex items-center gap-1.5 shadow-lg shadow-red-900/50 active:scale-95 transition-all cursor-pointer"
              >
                <span>Order All Parcels</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        dish={selectedDish}
        quantity={quantity}
        onUpdateQuantity={setQuantity}
        cartItems={cartItems}
        onUpdateCartQuantity={handleUpdateCartQuantity}
        onRemoveFromCart={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onProceedToCheckout={handleProceedToCheckout}
        orders={orders}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onSelectDishForNewOrder={() => {
          setIsCartOpen(false);
        }}
        onPurgeExpired={async () => {
          await purgeExpiredRecordsFromFirestore();
          const valid = purgeExpiredLocalStorageOrders();
          setOrders(valid);
        }}
      />

      <AdminSyncGatewayModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        onOpenInternalAdmin={() => {
          setIsSyncModalOpen(false);
          setStep('admin');
        }}
      />

      {/* Floating Contact Us Button */}
      <button
        type="button"
        onClick={() => setIsContactOpen(true)}
        className="fixed bottom-6 right-6 z-40 bg-black/40 backdrop-blur-xl text-white p-3.5 sm:px-5 sm:py-3.5 rounded-full shadow-2xl shadow-black/50 flex items-center gap-2 font-bold text-xs uppercase tracking-wider border border-white/25 hover:bg-black/70 hover:border-white/50 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
        title="Contact Us"
      >
        <PhoneCall className="w-5 h-5 text-red-400 group-hover:scale-110 transition-transform shrink-0" />
        <span className="hidden sm:inline">Contact Us</span>
      </button>

      <ContactModal
        isOpen={isContactOpen}
        onClose={() => setIsContactOpen(false)}
      />
    </div>
  );
}
