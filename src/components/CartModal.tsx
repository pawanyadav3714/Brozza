/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Minus, ArrowRight, ShoppingBag, Clock, CheckCircle2, 
  Copy, ShieldCheck, Sparkles, AlertCircle, RefreshCw, ChevronRight,
  Package, Wallet, QrCode
} from 'lucide-react';
import { Dish, Order, PipelineStage } from '../types';
import ParcelPipelineTracker, { normalizePipelineStage } from './ParcelPipelineTracker';
import { useFirebase } from './FirebaseProvider';

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
  dish: Dish | null;
  quantity: number;
  onUpdateQuantity: (q: number) => void;
  onProceedToCheckout: () => void;
  orders?: Order[];
  onUpdateOrderStatus?: (orderId: string, newStage: PipelineStage) => Promise<void> | void;
  onSelectDishForNewOrder?: () => void;
}

export default function CartModal({
  isOpen,
  onClose,
  dish,
  quantity,
  onUpdateQuantity,
  onProceedToCheckout,
  orders = [],
  onUpdateOrderStatus,
  onSelectDishForNewOrder
}: CartModalProps) {
  const { user } = useFirebase();
  const [activeTab, setActiveTab] = useState<'orders' | 'drafts' | 'selection'>('orders');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (dish) {
      setActiveTab('selection');
    } else {
      setActiveTab('orders');
    }
  }, [dish, isOpen]);

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

  const activeOrdersCount = orders.filter(
    (o) => normalizePipelineStage(o.status) !== 'Delivered'
  ).length;

  // 7-Day Draft Recycling Logic
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  const draftOrders = orders.filter((order) => {
    const stage = normalizePipelineStage(order.status);
    // Draft stores Received or Delivered parcels
    if (stage !== 'Received' && stage !== 'Delivered') return false;

    // 7-day recycling check
    const orderTime = order.createdAt?.seconds ? order.createdAt.seconds * 1000 : now;
    const age = now - orderTime;
    return age <= SEVEN_DAYS_MS;
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
            <div className="px-3 sm:px-5 pt-3 pb-2 border-b border-white/10 bg-neutral-900/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
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
                type="button"
                onClick={() => setActiveTab('drafts')}
                className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'drafts'
                    ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/40'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Clock className="w-4 h-4 shrink-0" />
                <span>Drafts (7d)</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'drafts' ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-300'
                }`}>
                  {draftOrders.length}
                </span>
              </button>

              {dish && (
                <button
                  type="button"
                  onClick={() => setActiveTab('selection')}
                  className={`py-2 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                    activeTab === 'selection'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4 shrink-0" />
                  <span>Item in Bag</span>
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
                </button>
              )}
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
                    orders.map((order) => {
                      const stage = normalizePipelineStage(order.status);
                      const isPending = stage === 'Pending';
                      const isDelivered = stage === 'Delivered';
                      const isAcceptedOrProgress = stage === 'Received' || stage === 'Processing' || stage === 'Out For_delivery';

                      return (
                        <motion.div
                          key={order.id}
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
                /* Drafts Tab (Received & Delivered parcels, 7-day retention) */
                <div className="space-y-6">
                  <div className="bg-amber-950/20 border border-amber-500/30 rounded-2xl p-3.5 sm:p-4 text-xs text-amber-300/90 flex items-start gap-2.5">
                    <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="leading-relaxed">
                      <span className="font-bold text-white block mb-0.5">Draft Archive (7-Day Auto-Recycle):</span> 
                      Stored here are all received and delivered parcels. Automatically recycled and purged after 7 days.
                    </div>
                  </div>

                  {draftOrders.length === 0 ? (
                    <div className="text-center py-16 px-4 rounded-3xl bg-white/[0.02] border border-white/5 space-y-4">
                      <div className="w-16 h-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto text-gray-400">
                        <Clock className="w-8 h-8" />
                      </div>
                      <h3 className="text-lg font-black text-white">No Draft Parcels Found</h3>
                      <p className="text-gray-400 text-sm max-w-sm mx-auto leading-relaxed">
                        Parcels that have reached the Received or Delivered stage will appear in this draft archive for up to 7 days.
                      </p>
                    </div>
                  ) : (
                    draftOrders.map((order) => {
                      const stage = normalizePipelineStage(order.status);
                      const isDelivered = stage === 'Delivered';

                      return (
                        <motion.div
                          key={order.id}
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
                /* Item Selection in Bag */
                dish && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4">
                      <img
                        src={dish.image}
                        alt={dish.name}
                        className="w-full aspect-video rounded-3xl object-cover shadow-2xl border border-white/10"
                      />
                      <div>
                        <span className="text-xs font-black text-red-500 uppercase tracking-widest">{dish.category}</span>
                        <h3 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">{dish.name}</h3>
                        <p className="text-gray-400 mt-2 text-sm font-medium leading-relaxed">{dish.description}</p>
                      </div>
                    </div>

                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                      <div className="flex items-center justify-between mb-4">
                        <span className="font-bold text-gray-300 text-xs">Quantity</span>
                        <div className="flex items-center gap-3 bg-black/50 rounded-xl p-1 border border-white/10">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(Math.max(1, quantity - 1))}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-red-500 transition-colors cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center font-black text-sm text-white">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(quantity + 1)}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-red-500 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between py-1 text-xs">
                          <span className="text-gray-400">Unit Price</span>
                          <span className="font-bold text-white">₹{dish.price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-2.5 border-t border-white/10">
                          <span className="text-sm font-bold text-gray-200">Total</span>
                          <span className="text-xl font-black text-red-500">₹{(dish.price * quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            {activeTab === 'selection' && dish && (
              <div className="p-4 bg-black/40 border-t border-white/10">
                {dish.available === false ? (
                  <div className="w-full bg-neutral-800 text-gray-400 py-2.5 px-3 rounded-xl font-bold text-center text-xs border border-red-500/30">
                    <span className="text-red-400 font-black uppercase tracking-wider block mb-0.5">Currently Sold Out</span>
                    This dish is temporarily unavailable.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onProceedToCheckout}
                    className="w-full bg-red-600 text-white py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-900/40 active:scale-95 cursor-pointer"
                  >
                    <span>Proceed to Order</span>
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
