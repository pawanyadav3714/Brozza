/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, ShoppingBag, ArrowRight, Loader2, Truck, Copy, PackageCheck, ShieldCheck } from 'lucide-react';
import { OrderStatus } from '../types';

interface SuccessStepProps {
  onReset: () => void;
  orderStatus: OrderStatus;
  parcelId?: string | null;
  customerAddress?: string | null;
}

export default function SuccessStep({ 
  onReset, 
  orderStatus, 
  parcelId,
  customerAddress 
}: SuccessStepProps) {
  const [copied, setCopied] = useState(false);
  const isOrdered = ['ordered', 'preparing', 'en_route'].includes(orderStatus);
  const isPreparing = ['preparing', 'en_route'].includes(orderStatus);
  const isEnRoute = orderStatus === 'en_route';

  const displayParcelId = parcelId || 'PRCL-BRZ-LIVE';

  const handleCopyParcel = () => {
    navigator.clipboard.writeText(displayParcelId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-16 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
        className="w-28 h-28 bg-green-500/20 backdrop-blur-xl border border-green-500/30 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-green-950/50"
      >
        <CheckCircle2 className="w-14 h-14 text-green-500" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="text-4xl sm:text-5xl font-black text-white mb-4 tracking-tight"
      >
        Order Confirmed!
      </motion.h2>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-gray-300 text-lg mb-8 leading-relaxed max-w-md mx-auto"
      >
        Your meal has been booked, manifested as an express parcel, and synchronized to the admin dispatch via Firebase.
      </motion.p>

      {/* Parcel Tracking Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="p-6 rounded-3xl bg-neutral-900/90 border border-red-500/30 backdrop-blur-2xl shadow-2xl mb-8 text-left space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2.5">
            <PackageCheck className="w-5 h-5 text-red-500" />
            <span className="text-xs font-black uppercase tracking-wider text-white">
              Parcel Tracking ID
            </span>
          </div>
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-[10px] font-black uppercase tracking-widest">
            <ShieldCheck className="w-3.5 h-3.5" />
            Synced to Firebase Admin
          </span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-black/50 p-3.5 rounded-2xl border border-white/10">
          <div>
            <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Tracking Code</div>
            <div className="font-mono text-base font-black text-red-400 tracking-wider">
              {displayParcelId}
            </div>
          </div>
          <button
            type="button"
            onClick={handleCopyParcel}
            className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-black text-white flex items-center justify-center gap-2 transition-all cursor-pointer self-start sm:self-auto active:scale-95"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? 'Copied to Clipboard!' : 'Copy Code'}</span>
          </button>
        </div>

        {customerAddress && (
          <div className="text-xs text-gray-300">
            <span className="text-gray-500 font-bold uppercase tracking-wider text-[10px] block">Destination</span>
            <span className="font-medium truncate block">{customerAddress}</span>
          </div>
        )}
      </motion.div>

      {/* Live Pipeline Tracker */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] p-8 sm:p-10 mb-10 shadow-3xl"
      >
        <div className="flex items-center justify-center gap-3 text-red-500 mb-8">
          <ShoppingBag className="w-5 h-5" />
          <span className="text-xs font-black uppercase tracking-[0.3em]">Live Kitchen & Courier Tracker</span>
        </div>
        <div className="flex justify-between items-center max-w-sm mx-auto">
          {/* Ordered */}
          <div className="flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isOrdered ? 'bg-green-500 text-white shadow-lg shadow-green-900/40' : 'bg-white/10 text-gray-500 border border-white/5'}`}>
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isOrdered ? 'text-white' : 'text-gray-400'}`}>Booked</span>
          </div>
          
          <div className={`flex-1 h-1 mx-4 -mt-10 rounded-full transition-all duration-1000 ${isPreparing ? 'bg-green-500' : 'bg-white/10'}`} />
          
          {/* Preparing */}
          <div className="flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isPreparing ? 'bg-green-500 text-white shadow-lg shadow-green-900/40' : 'bg-white/10 text-gray-500 border border-white/5'}`}>
              {orderStatus === 'preparing' ? <Loader2 className="w-7 h-7 animate-spin" /> : <CheckCircle2 className="w-7 h-7" />}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isPreparing ? 'text-white' : 'text-gray-400'}`}>Kitchen Prep</span>
          </div>
          
          <div className={`flex-1 h-1 mx-4 -mt-10 rounded-full transition-all duration-1000 ${isEnRoute ? 'bg-green-500' : 'bg-white/10'}`} />
          
          {/* En Route */}
          <div className="flex flex-col items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${isEnRoute ? 'bg-green-500 text-white shadow-lg shadow-green-900/40' : 'bg-white/10 text-gray-500 border border-white/5'}`}>
              <Truck className="w-7 h-7" />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isEnRoute ? 'text-white' : 'text-gray-400'}`}>En Route</span>
          </div>
        </div>
      </motion.div>

      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        onClick={onReset}
        className="inline-flex items-center gap-3 text-red-500 font-black hover:gap-6 transition-all text-lg group cursor-pointer"
      >
        Back to The Barozza Menu
        <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
      </motion.button>
    </div>
  );
}
