/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, Plus, Minus, ArrowRight, ShoppingBag, Clock, CheckCircle2, 
  Copy, ShieldCheck, Sparkles, AlertCircle, RefreshCw, ChevronRight,
  Package
} from 'lucide-react';
import { Dish, Order, PipelineStage } from '../types';
import ParcelPipelineTracker, { normalizePipelineStage } from './ParcelPipelineTracker';

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
  // Determine active tab: if user clicked "Add to Cart" or has selected dish, tab can be 'selection',
  // otherwise default to 'orders' tab to show all order statuses.
  const [activeTab, setActiveTab] = useState<'orders' | 'selection'>('orders');
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
            <div className="p-5 sm:p-6 flex items-center justify-between border-b border-white/10 bg-black/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center shadow-lg shadow-red-900/30 text-white border border-white/20">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    Orders & Bag
                  </h2>
                  <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-red-400" />
                    <span>Real-time Parcel Tracking & Dispatch</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-2xl transition-colors text-gray-400 hover:text-white cursor-pointer"
                title="Close drawer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Navigation Tabs (if dish is also selected) */}
            <div className="px-5 pt-3 pb-2 border-b border-white/10 bg-neutral-900/50 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  activeTab === 'orders'
                    ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Package className="w-4 h-4" />
                <span>All Orders</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-white/10 text-gray-300'
                }`}>
                  {orders.length}
                </span>
                {activeOrdersCount > 0 && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              {dish && (
                <button
                  type="button"
                  onClick={() => setActiveTab('selection')}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === 'selection'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-900/40'
                      : 'text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <ShoppingBag className="w-4 h-4" />
                  <span>Item in Bag</span>
                  <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                </button>
              )}
            </div>

            {/* Body Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
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
                          className="rounded-3xl bg-neutral-900/80 border border-white/10 p-5 sm:p-6 space-y-4 shadow-xl hover:border-white/20 transition-all relative overflow-hidden"
                        >
                          {/* Order Header / Small Status Bar */}
                          <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-3.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-gray-400">
                                #{order.id.slice(-6).toUpperCase()}
                              </span>
                              <span className="text-gray-600 text-xs">•</span>
                              <span className="text-gray-400 text-xs flex items-center gap-1 font-medium">
                                <Clock className="w-3 h-3 text-gray-500" />
                                {order.createdAt?.seconds 
                                  ? new Date(order.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                  : 'Active'}
                              </span>
                            </div>

                            {/* Small Status Badge with Dynamic Color & Blinking */}
                            <div>
                              {isPending && (
                                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-500/20 border border-red-500/40 text-red-300 flex items-center gap-1.5 shadow-sm">
                                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.9)]" />
                                  Pending
                                </span>
                              )}

                              {isAcceptedOrProgress && (
                                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-1.5 shadow-sm">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                                  {stage === 'Received' ? 'Accepted' : stage}
                                </span>
                              )}

                              {isDelivered && (
                                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-600 border border-emerald-400 text-white flex items-center gap-1.5 shadow-md">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                  Delivered
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Product Summary Row */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5 min-w-0">
                              {order.dishImage && (
                                <img
                                  src={order.dishImage}
                                  alt={order.dishName}
                                  className="w-14 h-14 rounded-2xl object-cover border border-white/10 shrink-0 shadow-md"
                                />
                              )}
                              <div className="min-w-0">
                                <h4 className="text-white font-black text-base truncate tracking-tight">
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
                              <div className="shrink-0 flex items-center gap-1.5 bg-black/40 border border-white/10 px-2.5 py-1.5 rounded-xl text-xs">
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

                          {/* Order Fulfillment Pipeline Tracker (Read-only for customers, updated by admin) */}
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

                    <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                      <div className="flex items-center justify-between mb-6">
                        <span className="font-bold text-gray-300 text-sm">Quantity</span>
                        <div className="flex items-center gap-5 bg-black/50 rounded-2xl p-1.5 border border-white/10">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(Math.max(1, quantity - 1))}
                            className="p-2.5 hover:bg-white/10 rounded-xl text-red-500 transition-colors cursor-pointer"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-8 text-center font-black text-lg text-white">{quantity}</span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(quantity + 1)}
                            className="p-2.5 hover:bg-white/10 rounded-xl text-red-500 transition-colors cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between py-1 text-sm">
                          <span className="text-gray-400">Unit Price</span>
                          <span className="font-bold text-white">₹{dish.price.toFixed(2)}</span>
                        </div>
                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                          <span className="text-base font-bold text-gray-200">Total</span>
                          <span className="text-3xl font-black text-red-500">₹{(dish.price * quantity).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            {activeTab === 'selection' && dish && (
              <div className="p-5 sm:p-6 bg-black/40 border-t border-white/10">
                {dish.available === false ? (
                  <div className="w-full bg-neutral-800 text-gray-400 py-3.5 px-4 rounded-2xl font-bold text-center text-sm border border-red-500/30">
                    <span className="text-red-400 font-black uppercase tracking-wider block mb-1">Currently Sold Out</span>
                    This dish is temporarily unavailable.
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onProceedToCheckout}
                    className="w-full bg-red-600 text-white py-4 sm:py-4.5 rounded-2xl font-black text-base sm:text-lg flex items-center justify-center gap-3 hover:bg-red-700 transition-all shadow-xl shadow-red-900/40 active:scale-95 cursor-pointer"
                  >
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-5 h-5" />
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
