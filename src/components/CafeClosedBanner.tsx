/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { Clock, AlertTriangle, Coffee, Sparkles } from 'lucide-react';
import { CafeStatus } from '../types';

interface CafeClosedBannerProps {
  cafeStatus: CafeStatus;
}

export default function CafeClosedBanner({ cafeStatus }: CafeClosedBannerProps) {
  if (cafeStatus.isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      className="max-w-4xl mx-auto mb-8 px-4"
    >
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-red-950/90 via-neutral-900/95 to-red-950/80 border-2 border-red-500/60 p-5 sm:p-6 shadow-2xl shadow-red-950/60 backdrop-blur-2xl">
        {/* Animated glowing backdrop ring */}
        <div className="absolute -top-12 -right-12 w-36 h-36 bg-red-600/30 rounded-full blur-3xl pointer-events-none animate-pulse" />
        <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-amber-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 border border-red-500/50 text-red-400 flex items-center justify-center shrink-0 shadow-lg shadow-red-950/60 animate-pulse">
              <Coffee className="w-6 h-6" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white shadow-md shadow-red-950/60 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                  Kitchen Closed
                </span>
                <span className="text-xs font-bold text-red-300">
                  New Orders Temporarily Paused
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
                The Barozza Cafe is Currently Closed
              </h3>

              <p className="text-gray-300 text-xs sm:text-sm mt-1 max-w-xl font-medium leading-relaxed">
                {cafeStatus.closureReason || 'We are currently taking a quick break to prep fresh ingredients. Thank you for your patience!'}
              </p>
            </div>
          </div>

          {cafeStatus.reopenTime && (
            <div className="sm:self-center shrink-0 px-4 py-2.5 rounded-2xl bg-black/60 border border-red-500/40 backdrop-blur-md flex items-center gap-2 text-amber-300 shadow-xl">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" style={{ animationDuration: '8s' }} />
              <div className="text-left">
                <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                  Expected Reopen
                </p>
                <p className="text-xs sm:text-sm font-black text-amber-300">
                  {cafeStatus.reopenTime}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
