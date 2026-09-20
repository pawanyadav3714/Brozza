/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Clock, 
  Package, 
  RefreshCw, 
  Truck, 
  CheckCircle2, 
  Trash2, 
  User, 
  Phone, 
  MapPin, 
  Calendar,
  AlertCircle,
  Copy,
  ShieldCheck,
  ExternalLink
} from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { PIPELINE_STAGES, normalizePipelineStage } from '../ParcelPipelineTracker';

interface AdminOrdersTabProps {
  orders: Order[];
  loading: boolean;
  errorMessage: string | null;
  onUpdateStatus: (orderId: string, status: OrderStatus) => Promise<void>;
  onDeleteOrder?: (orderId: string) => Promise<void>;
}

const STUDIO_APP_URL = "https://brozza-admin.vercel.app/";

const statusMap: Record<string, { label: string; color: string; icon: any }> = {
  idle: { label: 'Idle', color: 'bg-gray-500', icon: Clock },
  ordered: { label: 'Ordered', color: 'bg-blue-600', icon: Package },
  preparing: { label: 'Preparing', color: 'bg-amber-600', icon: RefreshCw },
  en_route: { label: 'En Route', color: 'bg-indigo-600', icon: Truck },
  delivered: { label: 'Delivered', color: 'bg-emerald-600', icon: CheckCircle2 },
  Pending: { label: 'Pending', color: 'bg-red-600', icon: Clock },
  Received: { label: 'Received', color: 'bg-emerald-600', icon: Package },
  Processing: { label: 'Processing', color: 'bg-amber-600', icon: RefreshCw },
  'Out For_delivery': { label: 'Out For Delivery', color: 'bg-blue-600', icon: Truck },
  Delivered: { label: 'Delivered', color: 'bg-emerald-600', icon: CheckCircle2 },
};

export default function AdminOrdersTab({
  orders,
  loading,
  errorMessage,
  onUpdateStatus,
  onDeleteOrder,
}: AdminOrdersTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = 
      order.dishName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerPhone?.includes(searchTerm) ||
      order.id?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' ? true : order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    setUpdatingOrderId(orderId);
    try {
      await onUpdateStatus(orderId, nextStatus);
    } finally {
      setUpdatingOrderId(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Firebase Sync Notification Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-red-950/40 via-neutral-900/60 to-red-950/40 border border-red-500/30 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/30 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-black text-white">Firebase Parcel & Order Sync</h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/40 text-green-400 text-[10px] font-black uppercase tracking-wider">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-ping" />
                Live Cloud Sync
              </span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              All parcel bookings and order updates are pushed to Firebase Firestore collections (<code className="text-red-300 font-mono">orders</code> & <code className="text-red-300 font-mono">parcels</code>) for your admin portal at <span className="text-white font-mono">brozza-admin.vercel.app</span>.
            </p>
          </div>
        </div>

        <a
          href={STUDIO_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-red-950/50 shrink-0 self-stretch sm:self-auto justify-center group cursor-pointer"
        >
          <span>Open Brozza Admin</span>
          <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
        </a>
      </div>

      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search Bar */}
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search orders by dish, customer, phone or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-6 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-all font-medium"
          />
        </div>

        {/* Counter Badge */}
        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl px-5 py-3 self-start md:self-auto">
          <span className="text-xs font-black text-gray-400 uppercase tracking-wider">Filtered Orders:</span>
          <span className="text-base font-black text-white">{filteredOrders.length}</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
              : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
          }`}
        >
          All Orders ({orders.length})
        </button>
        {(['ordered', 'preparing', 'en_route', 'delivered'] as OrderStatus[]).map((status) => {
          const count = orders.filter((o) => o.status === status).length;
          const config = statusMap[status];
          return (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer flex items-center gap-2 ${
                statusFilter === status
                  ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
              }`}
            >
              <span>{config.label}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/40 text-[10px] font-black">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 text-sm font-medium">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <RefreshCw className="w-10 h-10 text-red-500 animate-spin" />
          <p className="text-gray-400 text-sm font-bold">Synchronizing real-time order logs...</p>
        </div>
      ) : (
        <div className="grid gap-5">
          <AnimatePresence mode="popLayout">
            {filteredOrders.map((order) => {
              const config = statusMap[order.status] || statusMap.idle;
              const StatusIcon = config.icon;
              const isUpdating = updatingOrderId === order.id;

              return (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-7 hover:bg-white/[0.08] transition-all relative overflow-hidden"
                >
                  <div className="flex flex-col lg:flex-row justify-between gap-6">
                    {/* Left: Dish and Order Meta */}
                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className={`px-3.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 text-white ${config.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          <span>{config.label}</span>
                        </span>
                        <span className="text-xs text-gray-400 font-bold">
                          #{order.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-gray-500 text-xs flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {order.createdAt?.seconds 
                            ? new Date(order.createdAt.seconds * 1000).toLocaleString('en-IN', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })
                            : 'Just now'}
                        </span>
                      </div>

                      <h3 className="text-2xl font-black text-white tracking-tight">
                        {order.dishName}
                      </h3>

                      <div className="flex flex-wrap items-center gap-5 text-sm font-medium">
                        <span className="text-gray-300">
                          Qty: <strong className="text-white font-black text-base">{order.quantity}</strong>
                        </span>
                        <span className="text-gray-500">•</span>
                        <span className="text-gray-300">
                          Total Price:{' '}
                          <strong className="text-red-400 font-black text-lg">
                            ₹{(order.totalPrice || 0).toFixed(2)}
                          </strong>
                        </span>
                      </div>

                      {/* Parcel Tracking Badge */}
                      {order.parcelId && (
                        <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-2xl bg-black/40 border border-white/10 text-xs mt-2">
                          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Parcel ID:</span>
                          <span className="font-mono text-red-400 font-bold">{order.parcelId}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(order.parcelId!, order.id)}
                            className="p-1 rounded-md hover:bg-white/10 text-gray-400 hover:text-white transition-colors cursor-pointer"
                            title="Copy Parcel ID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {copiedId === order.id && (
                            <span className="text-[10px] text-green-400 font-bold">Copied!</span>
                          )}
                          <span className="ml-auto flex items-center gap-1 text-[9px] font-black text-green-400 uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                            <ShieldCheck className="w-3 h-3" />
                            Firebase Synced
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Middle: Customer Details */}
                    <div className="flex-1 border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6 space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                        Delivery Recipient
                      </p>
                      <div className="flex items-center gap-2 text-white font-bold text-sm">
                        <User className="w-4 h-4 text-red-500 shrink-0" />
                        <span>{order.customerName || 'Anonymous Customer'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-400 font-medium text-xs">
                        <Phone className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        <span>{order.customerPhone || 'N/A'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-gray-400 font-medium text-xs">
                        <MapPin className="w-3.5 h-3.5 text-gray-500 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{order.customerAddress || 'No address specified'}</span>
                      </div>

                      {/* Payment Method Badge */}
                      <div className="pt-2 border-t border-white/5 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Payment:</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                          order.paymentMethod === 'razorpay'
                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                            : order.paymentMethod === 'cod'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        }`}>
                          {order.paymentMethod === 'razorpay' ? 'UPI' : order.paymentMethod === 'cod' ? 'Cash On Delivery (COD)' : order.paymentMethod === 'qr' ? 'UPI QR' : 'UPI'}
                        </span>
                        {order.paymentId && (
                          <span className="font-mono text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/10" title="Razorpay Payment ID">
                            ID: {order.paymentId}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Pipeline Advance Actions */}
                    <div className="flex flex-col justify-between items-start lg:items-end border-t lg:border-t-0 lg:border-l border-white/10 pt-4 lg:pt-0 lg:pl-6 min-w-[240px]">
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2.5">
                        Admin Pipeline Controls
                      </span>

                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 w-full">
                        {PIPELINE_STAGES.map((stage) => {
                          const isCurrent = normalizePipelineStage(order.status) === stage;
                          return (
                            <button
                              key={stage}
                              type="button"
                              disabled={isUpdating}
                              onClick={() => handleStatusChange(order.id, stage as OrderStatus)}
                              className={`px-2 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center truncate ${
                                isCurrent
                                  ? (stage === 'Pending'
                                      ? 'bg-red-600 text-white shadow-md shadow-red-900/40 ring-1 ring-red-400 animate-pulse'
                                      : stage === 'Delivered'
                                        ? 'bg-emerald-600 text-white shadow-md ring-1 ring-emerald-400'
                                        : 'bg-emerald-600 text-white shadow-md shadow-emerald-900/40 ring-1 ring-emerald-400 animate-pulse')
                                  : 'bg-white/5 hover:bg-white/15 text-gray-400 hover:text-white border border-white/5'
                              }`}
                              title={`Set status to ${stage}`}
                            >
                              {stage}
                            </button>
                          );
                        })}
                      </div>

                      {onDeleteOrder && (
                        <button
                          type="button"
                          onClick={() => onDeleteOrder(order.id)}
                          className="mt-3 text-[11px] font-bold text-gray-500 hover:text-red-400 transition-colors flex items-center gap-1.5 self-end cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Delete Order</span>
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredOrders.length === 0 && (
            <div className="p-16 text-center rounded-3xl bg-white/5 border border-white/10">
              <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
              <h4 className="text-lg font-black text-white mb-1">No Orders Found</h4>
              <p className="text-gray-400 text-xs max-w-sm mx-auto font-medium">
                {searchTerm
                  ? `No orders matching "${searchTerm}". Try a different keyword or filter.`
                  : 'There are no orders logged yet. New orders placed in the cafe will appear here in real time.'}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
