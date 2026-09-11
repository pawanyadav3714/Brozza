/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ExternalLink, 
  Database, 
  PackageCheck, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  ShieldCheck, 
  Layers,
  Truck,
  ArrowRight,
  Sliders,
  Copy,
  Clock
} from 'lucide-react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Order } from '../types';

interface AdminSyncGatewayModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenInternalAdmin: () => void;
}

const EXTERNAL_ADMIN_URL = 'https://aistudio.google.com/apps/14528da1-7baf-4d9c-a2c5-f701aa8cea80?project=event-1b6b0&showAssistant=true&showPreview=true';

export default function AdminSyncGatewayModal({
  isOpen,
  onClose,
  onOpenInternalAdmin,
}: AdminSyncGatewayModalProps) {
  const [recentParcels, setRecentParcels] = useState<Order[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        })) as Order[];
        setRecentParcels(list);
      },
      (error) => {
        console.warn('Sync gateway orders listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
            className="relative w-full max-w-3xl bg-neutral-900/95 border border-white/15 rounded-[2.5rem] shadow-2xl overflow-hidden backdrop-blur-2xl z-10 my-8"
          >
            {/* Top Accent Gradient Bar */}
            <div className="h-2 bg-gradient-to-r from-red-600 via-amber-500 to-red-600 animate-gradient" />

            {/* Header */}
            <div className="p-6 sm:p-8 pb-4 border-b border-white/10 flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-500 shadow-lg shadow-red-950/40">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-2xl font-black text-white tracking-tight">
                      Firebase Admin & Parcel Sync Hub
                    </h3>
                    <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-black uppercase tracking-wider">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                      Live Syncing
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    All customer parcels & orders are synchronized to Firebase Firestore in real-time.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body Content */}
            <div className="p-6 sm:p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* External Admin Launch Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-red-950/40 via-neutral-900 to-black border border-red-500/30 relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl pointer-events-none" />
                
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-red-400">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Dedicated Admin Destination</span>
                    </div>
                    <h4 className="text-xl font-bold text-white">
                      External Admin Dashboard (App 14528da1)
                    </h4>
                    <p className="text-xs text-gray-300 max-w-md leading-relaxed">
                      Instead of receiving parcels solely inside this customer storefront, all orders are routed to Firebase so your administrative app receives the parcels instantly.
                    </p>
                    <div className="text-[11px] font-mono text-gray-400 break-all bg-black/50 px-3 py-1.5 rounded-xl border border-white/10 inline-block">
                      Project: <span className="text-amber-400">event-1b6b0</span> | Applet: <span className="text-red-400">14528da1-7baf...</span>
                    </div>
                  </div>

                  <a
                    href={EXTERNAL_ADMIN_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-sm uppercase tracking-wider flex items-center justify-center gap-3 transition-all shadow-lg shadow-red-900/50 hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                  >
                    <span>Open Admin App</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Real-time Sync Specs & Pipeline */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <Database className="w-3.5 h-3.5 text-blue-400" />
                    <span>Firestore Database</span>
                  </div>
                  <div className="text-xs font-mono font-bold text-white truncate" title="ai-studio-remixthebarozzac-0a0443a4-c36c-4a75-b9f6-4c49d5a7fd1d">
                    ai-studio-remixthebarozzac...
                  </div>
                  <div className="text-[10px] text-green-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Active connection
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Synced Collections</span>
                  </div>
                  <div className="text-sm font-black text-white">
                    /orders & /parcels
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Dual collection synchronization
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                    <Truck className="w-3.5 h-3.5 text-green-400" />
                    <span>Parcel Manifest</span>
                  </div>
                  <div className="text-sm font-black text-white">
                    Auto-Tracked
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Unique PRCL-BRZ IDs generated
                  </div>
                </div>
              </div>

              {/* Live Parcels Stream */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <PackageCheck className="w-4 h-4 text-red-500" />
                    <span>Recent Parcels Synced to Cloud</span>
                  </h4>
                  <button
                    type="button"
                    onClick={handleManualRefresh}
                    className="text-xs font-bold text-gray-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span>Refresh</span>
                  </button>
                </div>

                {recentParcels.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-white/5 border border-white/10 text-center text-gray-400 space-y-2">
                    <Clock className="w-8 h-8 mx-auto text-gray-500 animate-pulse" />
                    <p className="text-sm font-bold">Waiting for customer orders...</p>
                    <p className="text-xs text-gray-500">
                      Place an order on the menu and its parcel details will appear here and sync to Firebase instantly.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {recentParcels.map((parcel) => {
                      const parcelId = parcel.parcelId || `PRCL-BRZ-${parcel.id.slice(0, 6).toUpperCase()}`;
                      return (
                        <div
                          key={parcel.id}
                          className="p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-black text-red-400 bg-red-950/40 px-2 py-0.5 rounded border border-red-500/20">
                                {parcelId}
                              </span>
                              <span className="text-xs font-bold text-white">
                                {parcel.quantity}x {parcel.dishName}
                              </span>
                              <span className="text-xs text-amber-400 font-black">
                                ₹{parcel.totalPrice.toFixed(2)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 flex flex-wrap items-center gap-3">
                              <span>Recipient: <strong className="text-gray-200">{parcel.customerName}</strong></span>
                              <span>•</span>
                              <span className="truncate max-w-[200px]" title={parcel.customerAddress}>
                                {parcel.customerAddress}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center">
                            <button
                              type="button"
                              onClick={() => handleCopy(parcelId, parcel.id)}
                              className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-bold text-gray-300 hover:text-white flex items-center gap-1.5 transition-all cursor-pointer"
                              title="Copy Parcel ID"
                            >
                              <Copy className="w-3 h-3" />
                              <span>{copiedId === parcel.id ? 'Copied' : 'Copy ID'}</span>
                            </button>
                            <span className="px-2.5 py-1 rounded-xl bg-green-500/20 text-green-400 border border-green-500/30 text-[10px] font-black uppercase tracking-wider">
                              Synced ✓
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 bg-black/40 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenInternalAdmin();
                }}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sliders className="w-3.5 h-3.5 text-gray-400" />
                <span>Open Local Catalog & Inventory Tools</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 text-xs font-bold text-white transition-all cursor-pointer"
                >
                  Close
                </button>
                <a
                  href={EXTERNAL_ADMIN_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 sm:flex-none px-5 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 text-xs font-black uppercase tracking-wider text-white transition-all shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Go to Admin App</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
