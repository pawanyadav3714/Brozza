/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Minus, ArrowRight, ShoppingBag, Clock, CheckCircle2, 
  Copy, ShieldCheck, Sparkles, AlertCircle, RefreshCw, ChevronRight,
  Package, Wallet, QrCode, Trash2
} from 'lucide-react';
import { Dish, Order, PipelineStage, CartItem } from '../types';
import ParcelPipelineTracker, { normalizePipelineStage } from './ParcelPipelineTracker';
import { useFirebase } from './FirebaseProvider';
import { 
  RETENTION_PERIOD_MS, 
  isRecordExpired, 
  purgeExpiredRecordsFromFirestore 
} from '../lib/retentionPolicy';

function getOrderPaymentBadge(order: Order) {
  const method = order.paymentMethod?.toLowerCase() || 
    (order.deliveryNotes?.toLowerCase().includes('cod') ? 'cod' : 
     order.deliveryNotes?.toLowerCase().includes('razorpay') || order.deliveryNotes?.toLowerCase().includes('qr') ? 'upi' : 
     order.paymentStatus === 'paid' ? 'upi' : 'cod');

  const isUpi = method === 'razorpay' || method === 'qr' || method === 'upi';

  if (isUpi) {
    return (
      <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 shadow-sm">
        <QrCode className="w-3 h-3 text-emerald-400 shrink-0" />
        <span>UPI</span>
      </span>
    );
  }

  return (
    <span className="px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-black uppercase tracking-wider bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center gap-1.5 shadow-sm">
      <Wallet className="w-3 h-3 text-amber-400 shrink-0" />
      <span>COD</span>
    </span>
  );
}

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  dish?: Dish | null;
  quantity?: number;
  onUpdateQuantity?: (q: number) => void;
  cartItems?: CartItem[];
  onUpdateCartQuantity?: (dishId: string, q: number) => void;
  onRemoveFromCart?: (dishId: string) => void;
  onClearCart?: () => void;
  onProceedToCheckout: () => void;
  orders?: Order[];
  onUpdateOrderStatus?: (orderId: string, newStage: PipelineStage) => Promise<void> | void;
  onSelectDishForNewOrder?: () => void;
  onPurgeExpired?: () => Promise<void> | void;
}

export default function CartModal({
  isOpen,
  onClose,
  dish,
  quantity = 1,
  onUpdateQuantity,
  cartItems = [],
  onUpdateCartQuantity,
  onRemoveFromCart,
  onClearCart,
  onProceedToCheckout,
  orders = [],
  onUpdateOrderStatus,
  onSelectDishForNewOrder,
  onPurgeExpired
}: CartModalProps) {
  const { user } = useFirebase();

  const effectiveItems: CartItem[] = (cartItems && cartItems.length > 0)
    ? cartItems
    : dish
    ? [{ ...dish, quantity: quantity || 1 }]
    : [];

  const totalCartCount = effectiveItems.reduce((acc, item) => acc + item.quantity, 0);
  const totalCartPrice = effectiveItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const hasSoldOutItems = effectiveItems.some(item => item.available === false);

  const [activeTab, setActiveTab] = useState<'cart' | 'orders' | 'drafts'>('cart');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [purgeNotice, setPurgeNotice] = useState<string | null>(null);

  useEffect(() => {
    if (effectiveItems.length > 0) {
      setActiveTab('cart');
    } else {
      setActiveTab('orders');
    }
  }, [isOpen, effectiveItems.length]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleStageClick = async (orderId: string, newStage: PipelineStage) => {
    if (!onUpdateOrderStatus) return;
    setUpdatingOrderId(orderId);
    try {
      await onUpdateOrderStatus(orderId, newStage);
    } catch (err) {
      console.error('Failed to update stage:', err);
    } finally {
      setTimeout(() => setUpdatingOrderId(null), 300);
    }
  };

  const handleManualPurge = async () => {
    setIsPurging(true);
    try {
      const res = await purgeExpiredRecordsFromFirestore();
      if (onPurgeExpired) {
        await onPurgeExpired();
      }
      setPurgeNotice(`Cleared expired data: ${res.deletedOrders} orders & ${res.deletedParcels} parcels removed.`);
      setTimeout(() => setPurgeNotice(null), 4000);
    } catch (err) {
      setPurgeNotice('Purge complete.');
      setTimeout(() => setPurgeNotice(null), 3000);
    } finally {
      setIsPurging(false);
    }
  };

  const activeOrdersCount = orders.filter(
    (o) => normalizePipelineStage(o.status) !== 'Delivered'
  ).length;

  // 2-Day Draft Retention Policy (48 Hours)
  const draftOrders = orders.filter((order) => {
    const stage = normalizePipelineStage(order.status);
    // Draft stores Received or Delivered parcels
    if (stage !== 'Received' && stage !== 'Delivered') return false;

    // 2-day retention check
    return !isRecordExpired(order, RETENTION_PERIOD_MS);
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
          />

          {/* Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full max-w-xl bg-neutral-950/95 backdrop-blur-3xl z-50 shadow-2xl flex flex-col border-l border-white/10 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 sm:p-6 flex items-center justify-between border-b border-white/10 bg-black/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex flex-col items-center shrink-0">
                  <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shadow-lg shadow-red-900/30 border border-white/20 bg-neutral-900">
                    <img 
                      src="/images/unscriptedBanner.jpg" 
                      alt="Banner Icon" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h3 className="text-[10px] font-semibold text-gray-400 tracking-wider mt-0.5">developer</h3>
                </div>
                <div className="min-w-0">
                  <h2 className="text-lg sm:text-2xl font-black text-white tracking-tight truncate">
                    Orders & Bag
                  </h2>
                  <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5 truncate">
                    <Sparkles className="w-3 h-3 text-red-400 shrink-0" />
                    <span className="truncate">{user?.email || 'Guest User'}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-2xl transition-colors text-gray-400 hover:text-white cursor-pointer shrink-0"
                title="Close drawer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation Tabs (Mobile-responsive scrollable container) */}
            {/* Tabs Header */}
            <div className="px-3 sm:px-5 pt-3 pb-2 border-b border-white/10 bg-neutral-900/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
              <button
                type="button"
                onClick={() => setActiveTab('cart')}
                className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'cart'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <ShoppingBag className="w-4 h-4 shrink-0" />
                <span>Bag & Parcels</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'cart' ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-300'
                }`}>
                  {totalCartCount}
                </span>
                {totalCartCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'orders'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Package className="w-4 h-4 shrink-0" />
                <span>All Orders</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-300'
                }`}>
                  {orders.length}
                </span>
                {activeOrdersCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                )}
              </button>

              <button
                id="cart-tab-drafts"
                type="button"
                onClick={() => setActiveTab('drafts')}
                className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 border ${
                  activeTab === 'drafts'
                    ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-white border-amber-400/40 shadow-lg shadow-amber-950/60 ring-1 ring-amber-400/30'
                    : 'text-amber-400/90 hover:text-amber-300 hover:bg-amber-500/10 border-amber-500/20'
                }`}
                title="Drafts and parcels auto-purge after 2 days"
              >
                <Clock className="w-4 h-4 shrink-0 text-amber-300" />
                <span>Drafts (2d)</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'drafts' ? 'bg-black/40 text-amber-200 border border-amber-300/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {draftOrders.length}
                </span>
              </button>
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 space-y-6">
              {activeTab === 'orders' ? (
                /* Orders List with Pipeline trackers */
                <div className="space-y-6">
                  {orders.length === 0 ? (
                    <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-black text-white">No Orders Placed Yet</h3>
                      <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                        Explore our handcrafted cafe menu and pick your favorite food or beverage to see live parcel fulfillment in action.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onSelectDishForNewOrder) onSelectDishForNewOrder();
                        }}
                        className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-950/50 cursor-pointer"
                      >
                        Browse Menu Now
                      </button>
                    </div>
                  ) : (
                    orders.map((order, idx) => {
                      const stage = normalizePipelineStage(order.status);
                      const isPending = stage === 'Pending';
                      const isDelivered = stage === 'Delivered';
                      const isAcceptedOrProgress = stage === 'Received' || stage === 'Processing' || stage === 'Out For_delivery';

                      return (
                        <motion.div
                          key={`modal-order-${order.id || 'ord'}-${idx}`}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-3xl bg-neutral-900/80 border border-white/10 p-4 sm:p-6 space-y-4 shadow-xl hover:border-white/20 transition-all relative overflow-hidden"
                        >
                          {/* Order Header / Small Status Bar */}
                          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-xs font-bold text-gray-400 shrink-0">
                                #{order.id.slice(-6).toUpperCase()}
                              </span>
                              <span className="text-gray-600 text-xs shrink-0">•</span>
                              <span className="text-gray-400 text-xs flex items-center gap-1 font-medium truncate">
                                <Clock className="w-3 h-3 text-gray-500 shrink-0" />
                                {order.createdAt?.seconds 
                                  ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : 'Active'}
                              </span>
                            </div>

                            {/* Payment Method Badge (COD or UPI) */}
                            <div className="shrink-0">
                              {getOrderPaymentBadge(order)}
                            </div>
                          </div>

                          {/* Product Summary Row */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {order.dishImage && (
                                <img
                                  src={order.dishImage}
                                  alt={order.dishName}
                                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-white/10 shrink-0 shadow-md"
                                />
                              )}
                              <div className="min-w-0">
                                <h4 className="text-white font-black text-sm sm:text-base truncate tracking-tight">
                                  {order.dishName}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                  <span>Qty: <strong className="text-white font-bold">{order.quantity}</strong></span>
                                  <span className="text-gray-600">•</span>
                                  <span className="text-red-400 font-bold">₹{(order.totalPrice || 0).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            {/* Parcel ID Badge */}
                            {order.parcelId && (
                              <div className="shrink-0 flex items-center gap-1.5 bg-black/40 border border-white/10 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-xl text-xs">
                                <span className="font-mono text-gray-300 text-[10px] hidden sm:inline">
                                  {order.parcelId}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleCopy(order.parcelId!, order.id)}
                                  className="p-1 text-gray-400 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
                                  title="Copy Parcel ID"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                {copiedId === order.id && (
                                  <span className="text-[10px] text-green-400 font-bold">Copied!</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Order Fulfillment Pipeline Tracker (Responsive mobile view) */}
                          <ParcelPipelineTracker
                            currentStatus={order.status}
                            readOnly={true}
                          />
                        </motion.div>
                      );
                    })
                  )}
                </div>
              ) : activeTab === 'drafts' ? (
                /* Drafts Tab (Received & Delivered parcels, 2-day retention) */
                <div className="space-y-6">
                  {purgeNotice && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{purgeNotice}</span>
                    </motion.div>
                  )}

                  {draftOrders.length === 0 ? (
                    <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                        <Clock className="w-8 h-8 text-amber-400/60" />
                      </div>
                      <h3 className="text-lg font-black text-white">No Draft Parcels Found</h3>
                      <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                        Parcels that have reached the Received or Delivered stage will appear in this draft archive for up to 2 days before being automatically purged from the database and storage.
                      </p>
                    </div>
                  ) : (
                    draftOrders.map((order, idx) => {
                      const stage = normalizePipelineStage(order.status);
                      const isDelivered = stage === 'Delivered';

                      return (
                        <motion.div
                          key={`modal-draft-${order.id || 'draft'}-${idx}`}
                          layout
                          initial={{ opacity: 0, y: 15 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-3xl bg-neutral-900/80 border border-amber-500/20 p-4 sm:p-6 space-y-4 shadow-xl relative overflow-hidden"
                        >
                          {/* Order Header */}
                          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-xs font-bold text-amber-400/90 shrink-0">
                                DRAFT #{order.id.slice(-6).toUpperCase()}
                              </span>
                              <span className="text-gray-600 text-xs shrink-0">•</span>
                              <span className="text-gray-400 text-xs flex items-center gap-1 font-medium truncate">
                                <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                                {order.createdAt?.seconds 
                                  ? new Date(order.createdAt.seconds * 1000).toLocaleDateString([], { month: 'short', day: 'numeric' })
                                  : 'Recent'}
                              </span>
                            </div>

                            <div className="shrink-0 flex items-center gap-1.5">
                              {getOrderPaymentBadge(order)}
                              {isDelivered ? (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-600/80 text-white flex items-center gap-1">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-white shrink-0" />
                                  Archived
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 flex items-center gap-1">
                                  Received
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Product Summary Row */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              {order.dishImage && (
                                <img
                                  src={order.dishImage}
                                  alt={order.dishName}
                                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-white/10 shrink-0 shadow-md"
                                />
                              )}
                              <div className="min-w-0">
                                <h4 className="text-white font-black text-sm sm:text-base truncate tracking-tight">
                                  {order.dishName}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                  <span>Qty: <strong className="text-white font-bold">{order.quantity}</strong></span>
                                  <span className="text-gray-600">•</span>
                                  <span className="text-amber-400 font-bold">₹{(order.totalPrice || 0).toFixed(2)}</span>
                                </div>
                              </div>
                            </div>

                            {order.parcelId && (
                              <div className="shrink-0 flex items-center gap-1.5 bg-black/40 border border-white/10 px-2 py-1 rounded-xl text-xs">
                                <span className="font-mono text-gray-300 text-[10px]">
                                  {order.parcelId}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Compact Pipeline Tracker */}
                          <ParcelPipelineTracker
                            currentStatus={order.status}
                            readOnly={true}
                          />
                        </motion.div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* Item Selection in Bag / Multi-item Cart */
                <div className="space-y-6">
                  {effectiveItems.length === 0 ? (
                    <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                        <ShoppingBag className="w-8 h-8" />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-white">Your Bag is Empty</h4>
                        <p className="text-xs text-gray-400 mt-1 max-w-xs mx-auto">
                          Select multiple handcrafted dishes from the menu to order all parcels together at once!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          if (onSelectDishForNewOrder) onSelectDishForNewOrder();
                        }}
                        className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                      >
                        Browse Menu & Add Dishes
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Cart Header */}
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-black uppercase tracking-wider text-white">
                            Selected Dishes ({effectiveItems.length} {effectiveItems.length === 1 ? 'Parcel' : 'Parcels'})
                          </h4>
                          <p className="text-[11px] text-gray-400">
                            {totalCartCount} total {totalCartCount === 1 ? 'item' : 'items'} ready for express delivery
                          </p>
                        </div>
                        {onClearCart && (
                          <button
                            type="button"
                            onClick={onClearCart}
                            className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-red-500/20 text-gray-400 hover:text-red-400 border border-white/10 text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Clear Bag</span>
                          </button>
                        )}
                      </div>

                      {/* Items List */}
                      <div className="space-y-3">
                        {effectiveItems.map((item, idx) => (
                          <div 
                            key={`cart-item-${item.id}-${idx}`}
                            className="p-3.5 rounded-2xl bg-neutral-900/90 border border-white/10 hover:border-white/20 transition-all flex items-center justify-between gap-3 shadow-lg"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={item.image}
                                alt={item.name}
                                className="w-16 h-16 rounded-xl object-cover shrink-0 border border-white/10"
                              />
                              <div className="min-w-0">
                                <span className="text-[10px] font-black text-red-400 uppercase tracking-widest block truncate">
                                  {item.category || 'Specialty'}
                                </span>
                                <h4 className="text-white font-black text-sm tracking-tight truncate">
                                  {item.name}
                                </h4>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-xs font-bold text-gray-400">
                                    ₹{item.price.toFixed(2)} each
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-gray-300 font-medium">
                                    Qty: {item.quantity}
                                  </span>
                                  {item.quantityAvailable !== undefined && (
                                    <span className={`text-[10px] font-bold ${
                                      item.quantityAvailable <= 5 ? 'text-amber-400' : 'text-emerald-400'
                                    }`}>
                                      ({item.quantityAvailable} available)
                                    </span>
                                  )}
                                </div>
                                {(item.available === false || item.quantityAvailable === 0) && (
                                  <span className="text-[10px] font-bold text-red-400 flex items-center gap-1 mt-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Sold out / unavailable in kitchen
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <div className="text-sm sm:text-base font-black text-red-400">
                                ₹{(item.price * item.quantity).toFixed(2)}
                              </div>
                              
                              <div className="flex items-center gap-1.5 bg-black/60 rounded-xl p-1 border border-white/10">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (item.quantity <= 1) {
                                      if (onRemoveFromCart) onRemoveFromCart(item.id);
                                      else if (onUpdateQuantity) onUpdateQuantity(0);
                                    } else {
                                      if (onUpdateCartQuantity) onUpdateCartQuantity(item.id, item.quantity - 1);
                                      else if (onUpdateQuantity) onUpdateQuantity(item.quantity - 1);
                                    }
                                  }}
                                  className="p-1 hover:bg-white/10 rounded-lg text-red-400 hover:text-white transition-colors cursor-pointer"
                                  title={item.quantity <= 1 ? "Remove item" : "Decrease quantity"}
                                >
                                  {item.quantity <= 1 ? <Trash2 className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                </button>
                                <span className="w-5 text-center font-black text-xs text-white">
                                  {item.quantity}
                                </span>
                                <button
                                  type="button"
                                  disabled={item.quantityAvailable !== undefined && item.quantity >= item.quantityAvailable}
                                  onClick={() => {
                                    if (item.quantityAvailable !== undefined && item.quantity >= item.quantityAvailable) return;
                                    if (onUpdateCartQuantity) onUpdateCartQuantity(item.id, item.quantity + 1);
                                    else if (onUpdateQuantity) onUpdateQuantity(item.quantity + 1);
                                  }}
                                  className={`p-1 rounded-lg transition-colors ${
                                    item.quantityAvailable !== undefined && item.quantity >= item.quantityAvailable
                                      ? 'opacity-30 text-gray-500 cursor-not-allowed'
                                      : 'hover:bg-white/10 text-emerald-400 hover:text-white cursor-pointer'
                                  }`}
                                  title={item.quantityAvailable !== undefined && item.quantity >= item.quantityAvailable ? "Maximum available quantity reached" : "Increase quantity"}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bill / Express Parcel Manifest breakdown */}
                      <div className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Items Total ({totalCartCount} portions)</span>
                          <span className="font-bold text-white">₹{totalCartPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Express Parcels</span>
                          <span className="font-bold text-emerald-400">{effectiveItems.length} Food Express {effectiveItems.length === 1 ? 'Parcel' : 'Parcels'}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-gray-400">Express Delivery & Fresh Packaging</span>
                          <span className="font-bold text-emerald-400 uppercase text-[10px] tracking-wider">FREE</span>
                        </div>
                        <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
                          <span className="text-sm font-bold text-gray-200">Grand Total</span>
                          <span className="text-xl font-black text-red-500">₹{totalCartPrice.toFixed(2)}</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {activeTab === 'cart' && effectiveItems.length > 0 && (
              <div className="p-4 bg-black/60 border-t border-white/10 backdrop-blur-xl">
                {hasSoldOutItems ? (
                  <div className="w-full bg-neutral-800 text-gray-300 py-2.5 px-3 rounded-xl font-bold text-center text-xs border border-red-500/30">
                    <span className="text-red-400 font-black uppercase tracking-wider block mb-0.5">Sold Out Dish in Bag</span>
                    Please remove any unavailable dishes to place your order.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onProceedToCheckout}
                    className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white py-3.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-red-950/50 active:scale-95 transition-all cursor-pointer"
                  >
                    <span>Order All {effectiveItems.length} {effectiveItems.length === 1 ? 'Parcel' : 'Parcels'} (₹{totalCartPrice.toFixed(2)})</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
