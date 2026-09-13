/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { collection, addDoc, setDoc, serverTimestamp, doc, onSnapshot, query, orderBy, limit, updateDoc } from 'firebase/firestore';
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
import { DISHES, INITIAL_INVENTORY } from './data';
import { Dish, AppStep, UserAddress, OrderStatus, InventoryItem, Order, PipelineStage } from './types';
import { normalizePipelineStage } from './components/ParcelPipelineTracker';

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
  const [userAddress, setUserAddress] = useState<UserAddress | null>(null);
  const [orderStatus, setOrderStatus] = useState<OrderStatus>('idle');
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [currentParcelId, setCurrentParcelId] = useState<string | null>(null);
  const [lastPaymentInfo, setLastPaymentInfo] = useState<{ method?: string; paymentId?: string } | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  // Real-time live orders list with persistence and fallback
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('barozza_cafe_orders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.warn('Failed to parse cached orders:', e);
      }
    }
    return DEFAULT_DEMO_ORDERS;
  });

  // Menu Catalog State with persistence
  const [dishes, setDishes] = useState<Dish[]>(() => {
    const saved = localStorage.getItem('barozza_cafe_dishes');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
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
    const toggled = { ...target, available: target.available === false ? true : false };
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

  // Real-time live orders tracking across the storefront (filtered by current user)
  useEffect(() => {
    const q = query(collection(db, 'orders'), limit(50));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs
          .filter((docSnap) => {
            if (docSnap.id === 'barozza_menu_catalog' || docSnap.data().isCatalog) return false;
            const data = docSnap.data();
            if (user && data.userId && data.userId !== user.uid) {
              return false;
            }
            return true;
          })
          .map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              ...data,
              dishImage: data.dishImage || dishes.find((d) => d.id === data.dishId)?.image || '/images/frenchh.png',
            } as Order;
          })
          .sort((a, b) => {
            const timeA = (a.createdAt as any)?.seconds || 0;
            const timeB = (b.createdAt as any)?.seconds || 0;
            return timeB - timeA;
          });

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

  const handleDishSelect = (dish: Dish) => {
    setSelectedDish(dish);
    setQuantity(1);
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
    if (!selectedDish || !userAddress || !user) return;

    // Generate unique parcel tracking identifiers
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const timeStampNum = Date.now().toString().slice(-6);
    const parcelId = `PRCL-BRZ-${timeStampNum}-${randomSuffix}`;
    const trackingNumber = `BRZTRK${timeStampNum}${randomSuffix}`;
    const weightEstimate = `${(0.42 * quantity).toFixed(2)} kg`;

    const chosenMethod = paymentInfo?.method || 'razorpay';
    const paymentId = paymentInfo?.paymentId || '';
    const paymentStatus = chosenMethod === 'cod' ? 'pending' : 'paid';
    setLastPaymentInfo({ method: chosenMethod, paymentId });

    try {
      const orderData = {
        userId: user.uid,
        dishId: selectedDish.id,
        dishName: selectedDish.name,
        dishImage: selectedDish.image,
        quantity: quantity,
        totalPrice: selectedDish.price * quantity,
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
        deliveryNotes: `Dispatched via The Barozza Express Courier Fleet (${chosenMethod.toUpperCase()})`,
        syncedToFirebase: true,
        syncedAt: serverTimestamp(),
        externalAdminUrl: 'https://brozza-admin.vercel.app/',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const docRef = await addDoc(collection(db, 'orders'), orderData);
      setCurrentOrderId(docRef.id);
      setCurrentParcelId(parcelId);

      // Prepend to local orders state immediately
      const newLocalOrder: Order = {
        id: docRef.id,
        ...orderData,
        status: 'Pending',
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        updatedAt: { seconds: Math.floor(Date.now() / 1000) },
      } as Order;
      setOrders((prev) => [newLocalOrder, ...prev]);

      // Dual-sync to dedicated 'parcels' collection for admin applet
      const parcelData = {
        parcelId: parcelId,
        orderId: docRef.id,
        userId: user.uid,
        recipientName: userAddress.name,
        recipientPhone: userAddress.phone,
        destination: userAddress.address,
        parcelType: 'Artisanal Cafe Fresh Food Express Parcel',
        parcelWeight: weightEstimate,
        parcelStatus: 'booked',
        itemsSummary: `${quantity}x ${selectedDish.name}`,
        totalValue: selectedDish.price * quantity,
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

      setStep('success');
    } catch (error) {
      console.error("Error creating order:", error);
      setCurrentParcelId(parcelId);
      // Fallback for demo if firebase isn't fully configured
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
    if (selectedFilter === 'All') return dishes;
    return dishes.filter(
      (d) => (d.category || 'General').trim().toLowerCase() === selectedFilter.trim().toLowerCase()
    );
  }, [dishes, selectedFilter]);

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
          cartCount={selectedDish ? 1 : 0} 
          onOpenCart={() => setIsCartOpen(true)}
          onOpenAdmin={() => setIsSyncModalOpen(true)}
          onBackToMenu={() => setStep('menu')}
          step={step}
          orderStatus={orderStatus}
          orders={orders}
        />

        <main className="pb-20">
          <AnimatePresence mode="wait">
            {step === 'menu' && (
              <motion.div
                key="menu"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <div className="max-w-7xl mx-auto px-4 py-16 sm:py-20">
                  <div className="flex flex-col items-center text-center gap-6 mb-16 sm:mb-20">
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
                    
                    {/* Category Filter Pills (Dynamically populated from all active dishes) */}
                    <div className="flex flex-wrap justify-center gap-2.5">
                      {availableCategories.map((filter) => (
                        <button 
                          key={filter}
                          type="button"
                          onClick={() => setSelectedFilter(filter)}
                          className={`px-5 py-2 backdrop-blur-md rounded-full text-xs font-black uppercase tracking-wider transition-all shadow-lg cursor-pointer ${
                            selectedFilter.toLowerCase() === filter.toLowerCase()
                              ? 'bg-red-600 border border-red-400 text-white shadow-red-900/50 scale-105'
                              : 'bg-white/10 border border-white/20 text-gray-300 hover:bg-red-500 hover:text-white hover:border-red-500'
                          }`}
                        >
                          {filter}
                        </button>
                      ))}
                    </div>
                  </div>

                  <DishCarousel dishes={displayedDishes} onSelectDish={handleDishSelect} />

                  <section className="mt-20">
                    <h2 className="text-3xl font-black text-white mb-10 flex items-center gap-4">
                      <span className="w-12 h-1 bg-red-500 rounded-full" />
                      Popular Near You
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                      {displayedDishes.map((dish) => {
                        const isAvailable = dish.available !== false;
                        return (
                          <motion.div
                            key={dish.id}
                            whileHover={{ y: -10, scale: 1.02 }}
                            onClick={() => handleDishSelect(dish)}
                            className={`backdrop-blur-xl rounded-[2.5rem] overflow-hidden border shadow-2xl transition-all cursor-pointer group ${
                              isAvailable
                                ? 'bg-white/5 border-white/10 hover:bg-white/10'
                                : 'bg-neutral-950/70 border-red-500/20 opacity-80'
                            }`}
                          >
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
                              <div className="absolute top-6 right-6 bg-red-500 px-4 py-1.5 rounded-full text-xs font-black text-white shadow-xl">
                                4.5 ★
                              </div>
                              <div className="absolute top-6 left-6">
                                <span className="px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                                  {dish.category || 'General'}
                                </span>
                              </div>
                              {!isAvailable && (
                                <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center">
                                  <span className="px-4 py-2 rounded-2xl bg-red-600 text-white font-black text-xs uppercase tracking-widest border border-red-400/50 shadow-2xl">
                                    Sold Out
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="p-8">
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="text-2xl font-bold text-white group-hover:text-red-400 transition-colors">{dish.name}</h3>
                                <span className="text-xl font-black text-red-500">₹{dish.price.toFixed(2)}</span>
                              </div>
                              <p className="text-gray-400 line-clamp-2 mb-6 font-medium leading-relaxed">{dish.description}</p>
                              <div className="flex items-center justify-between pt-6 border-t border-white/5">
                                <div className="flex items-center gap-2 text-xs font-bold text-gray-300 uppercase tracking-widest">
                                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                                  5-10 min
                                </div>
                                <div className="text-xs font-bold text-gray-300 uppercase tracking-widest">
                                  {isAvailable ? 'Free Delivery' : 'Unavailable'}
                                </div>
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
                  totalPrice={totalPrice}
                  userAddress={userAddress}
                  dishName={selectedDish?.name}
                  quantity={quantity}
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

      <CartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        dish={selectedDish}
        quantity={quantity}
        onUpdateQuantity={setQuantity}
        onProceedToCheckout={handleProceedToCheckout}
        orders={orders}
        onUpdateOrderStatus={handleUpdateOrderStatus}
        onSelectDishForNewOrder={() => {
          setSelectedDish(dishes[0]);
          setIsCartOpen(true);
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
    </div>
  );
}
