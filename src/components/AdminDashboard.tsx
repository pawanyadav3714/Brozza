/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useFirebase } from './FirebaseProvider';
import { Order, OrderStatus, Dish, InventoryItem, AdminTab } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  LayoutDashboard, 
  ShoppingBag, 
  Utensils, 
  Package, 
  ExternalLink, 
  LogIn, 
  ShieldCheck, 
  AlertTriangle,
  Sparkles,
  Key
} from 'lucide-react';
import AdminOverviewTab from './admin/AdminOverviewTab';
import AdminOrdersTab from './admin/AdminOrdersTab';
import AdminMenuTab from './admin/AdminMenuTab';
import AdminInventoryTab from './admin/AdminInventoryTab';
import AdminGatewayTab from './admin/AdminGatewayTab';

interface AdminDashboardProps {
  onBack: () => void;
  dishes: Dish[];
  onUpdateDish: (updatedDish: Dish) => void;
  onAddDish: (newDish: Dish) => void;
  onDeleteDish: (dishId: string) => void;
  onToggleDishAvailability: (dishId: string) => void;
  onResetDishes: () => void;
  inventory: InventoryItem[];
  onUpdateInventoryItem: (item: InventoryItem) => void;
  onAddInventoryItem: (item: InventoryItem) => void;
  onDeleteInventoryItem: (itemId: string) => void;
  onAdjustInventoryStock: (itemId: string, delta: number) => void;
  onResetInventory?: () => void;
}

const STUDIO_APP_URL = "https://brozza-admin.vercel.app/";

export default function AdminDashboard({
  onBack,
  dishes,
  onUpdateDish,
  onAddDish,
  onDeleteDish,
  onToggleDishAvailability,
  onResetDishes,
  inventory,
  onUpdateInventoryItem,
  onAddInventoryItem,
  onDeleteInventoryItem,
  onAdjustInventoryStock,
  onResetInventory,
}: AdminDashboardProps) {
  const { user, signInWithGoogle, isSigningIn } = useFirebase();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Firestore real-time listener for orders
  useEffect(() => {
    setLoading(true);
    setErrorMessage(null);

    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ordersData = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Order[];
        setOrders(ordersData);
        setLoading(false);
      },
      (error) => {
        console.warn("Firestore orders subscription notice:", error);
        setErrorMessage("Notice: Could not load live cloud orders. Preview mode active.");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleUpdateOrderStatus = async (orderId: string, newStatus: OrderStatus) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await updateDoc(orderRef, {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      // Local state fallback for immediate feedback
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const orderRef = doc(db, 'orders', orderId);
      await deleteDoc(orderRef);
    } catch (error) {
      console.error("Error deleting order:", error);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    }
  };

  const activeOrdersCount = orders.filter(
    (o) => o.status === 'ordered' || o.status === 'preparing' || o.status === 'en_route'
  ).length;

  const lowStockCount = inventory.filter((i) => i.quantity <= i.minThreshold).length;

  return (
    <div className="min-h-screen bg-black/90 text-white pb-24 relative z-10">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-96 h-96 bg-amber-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-6 space-y-6">
        {/* Top Navigation & Applet Link Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer group"
            >
              <ChevronLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
              <span>Back to Cafe Menu</span>
            </button>

            <div className="hidden sm:block h-6 w-px bg-white/10" />

            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                Barozza Cafe Ops Console
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {/* Direct Link to External Admin App */}
            <a
              href={STUDIO_APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-red-600 hover:bg-red-500 text-white border border-red-400/40 text-xs font-black tracking-wide transition-all shadow-lg shadow-red-950/50 cursor-pointer group"
              title="Launch Brozza Admin Portal (brozza-admin.vercel.app)"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-green-300" />
              <span>External Admin App</span>
              <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </a>

            {!user && (
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={isSigningIn}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/10 hover:bg-white/15 text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5 text-red-400" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Multi-Page Tab Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-white/10">
          {/* Tab 1: Overview */}
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Overview</span>
          </button>

          {/* Tab 2: Orders Tracking */}
          <button
            type="button"
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'orders'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Order Pipeline</span>
            {activeOrdersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-black text-amber-300">
                {activeOrdersCount} Active
              </span>
            )}
          </button>

          {/* Tab 3: Menu Item Updates */}
          <button
            type="button"
            onClick={() => setActiveTab('menu')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'menu'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Utensils className="w-4 h-4" />
            <span>Menu Catalog</span>
            <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-black text-gray-300">
              {dishes.length}
            </span>
          </button>

          {/* Tab 4: Inventory Management */}
          <button
            type="button"
            onClick={() => setActiveTab('inventory')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'inventory'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Inventory</span>
            {lowStockCount > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/30 border border-amber-500/40 text-[10px] font-black text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-2.5 h-2.5" />
                {lowStockCount} Low
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] font-black text-gray-300">
                {inventory.length}
              </span>
            )}
          </button>

          {/* Tab 5: Payment Gateway API Settings */}
          <button
            type="button"
            onClick={() => setActiveTab('gateway')}
            className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'gateway'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Payment API</span>
          </button>
        </div>

        {/* Tab Page Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <AdminOverviewTab
                orders={orders}
                dishes={dishes}
                inventory={inventory}
                onSelectTab={setActiveTab}
              />
            )}

            {activeTab === 'orders' && (
              <AdminOrdersTab
                orders={orders}
                loading={loading}
                errorMessage={errorMessage}
                onUpdateStatus={handleUpdateOrderStatus}
                onDeleteOrder={handleDeleteOrder}
              />
            )}

            {activeTab === 'menu' && (
              <AdminMenuTab
                dishes={dishes}
                onUpdateDish={onUpdateDish}
                onAddDish={onAddDish}
                onDeleteDish={onDeleteDish}
                onToggleDishAvailability={onToggleDishAvailability}
                onResetDishes={onResetDishes}
              />
            )}

            {activeTab === 'inventory' && (
              <AdminInventoryTab
                inventory={inventory}
                onUpdateItem={onUpdateInventoryItem}
                onAddItem={onAddInventoryItem}
                onDeleteItem={onDeleteInventoryItem}
                onAdjustStock={onAdjustInventoryStock}
                onResetInventory={onResetInventory}
              />
            )}

            {activeTab === 'gateway' && (
              <AdminGatewayTab />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
