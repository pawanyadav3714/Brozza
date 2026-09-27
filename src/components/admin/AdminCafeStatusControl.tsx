/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Power, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Radio, 
  Coffee,
  Zap,
  Info
} from 'lucide-react';
import { CafeStatus } from '../../types';

interface AdminCafeStatusControlProps {
  cafeStatus: CafeStatus;
  onToggleStatus: (isOpen: boolean, closureReason?: string, reopenTime?: string) => Promise<void> | void;
  compact?: boolean;
}

export default function AdminCafeStatusControl({
  cafeStatus,
  onToggleStatus,
  compact = false,
}: AdminCafeStatusControlProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetAction, setTargetAction] = useState<'open' | 'close'>('close');
  const [reopenPreset, setReopenPreset] = useState<string>('Today 4:00 PM');
  const [customReopenTime, setCustomReopenTime] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');
  const [isUpdating, setIsUpdating] = useState(false);

  const isOpen = cafeStatus.isOpen;

  const handleQuickToggle = async () => {
    if (isOpen) {
      // Opening prompt or direct close
      setTargetAction('close');
      setIsModalOpen(true);
    } else {
      // Instant reopen
      setIsUpdating(true);
      await onToggleStatus(true, '', '');
      setIsUpdating(false);
    }
  };

  const handleConfirmAction = async () => {
    setIsUpdating(true);
    const finalReopenTime = customReopenTime.trim() || reopenPreset;
    const finalReason = customReason.trim() || 
      (targetAction === 'close' 
        ? (finalReopenTime ? `Cafe is temporarily closed. Reopening at ${finalReopenTime}.` : 'The Barozza Cafe is currently closed. Ordering will resume shortly.') 
        : '');

    await onToggleStatus(targetAction === 'open', finalReason, targetAction === 'close' ? finalReopenTime : '');
    setIsUpdating(false);
    setIsModalOpen(false);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleQuickToggle}
          disabled={isUpdating}
          className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 ${
            isOpen
              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/50'
              : 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/50 animate-pulse'
          }`}
          title={isOpen ? 'Click to Close Cafe' : 'Click to Open Cafe'}
        >
          <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-400' : 'bg-red-500 animate-ping'}`} />
          <span>{isOpen ? 'Cafe Open' : 'Cafe Closed'}</span>
          <Power className="w-3.5 h-3.5 ml-0.5" />
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={`p-5 sm:p-6 rounded-3xl backdrop-blur-xl border transition-all relative overflow-hidden shadow-2xl ${
        isOpen
          ? 'bg-gradient-to-r from-emerald-950/40 via-neutral-900/90 to-emerald-950/20 border-emerald-500/40 shadow-emerald-950/30'
          : 'bg-gradient-to-r from-red-950/50 via-neutral-900/90 to-rose-950/30 border-red-500/50 shadow-red-950/40'
      }`}>
        {/* Ambient glow */}
        <div className={`absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl pointer-events-none ${
          isOpen ? 'bg-emerald-500/10' : 'bg-red-600/15'
        }`} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          {/* Status Details */}
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 shadow-xl border ${
              isOpen
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-emerald-950/50'
                : 'bg-red-600/20 text-red-400 border-red-500/40 shadow-red-950/50 animate-pulse'
            }`}>
              <Coffee className="w-7 h-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="text-xs font-black uppercase tracking-widest text-gray-400">
                  Live Cafe Operational Switch
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 border ${
                  isOpen
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                    : 'bg-red-500/20 text-red-300 border-red-500/50'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-emerald-400' : 'bg-red-400 animate-ping'}`} />
                  {isOpen ? 'Store Live & Accepting Orders' : 'Store Closed • Orders Paused'}
                </span>
                <span className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Instant 0ms Sync
                </span>
              </div>

              <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
                {isOpen ? 'The Barozza Cafe is OPEN' : 'The Barozza Cafe is CLOSED'}
              </h3>

              <p className="text-gray-300 text-xs sm:text-sm mt-1 max-w-xl font-medium">
                {isOpen ? (
                  'Customers can browse dishes, add meals to bag, and place live delivery orders on their dashboard with zero delay.'
                ) : (
                  <span>
                    <strong className="text-red-300 font-bold">Notice: </strong>
                    {cafeStatus.closureReason || 'Cafe ordering is paused for customers.'}
                    {cafeStatus.reopenTime && (
                      <span className="text-white ml-1">
                        (Expected Reopening: <strong className="text-amber-400">{cafeStatus.reopenTime}</strong>)
                      </span>
                    )}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Action Switch Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {isOpen ? (
              <button
                type="button"
                onClick={() => {
                  setTargetAction('close');
                  setIsModalOpen(true);
                }}
                disabled={isUpdating}
                className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-red-950/60 border border-red-400/40 transition-all cursor-pointer group"
              >
                <Power className="w-4 h-4 transition-transform group-hover:rotate-90 duration-300" />
                <span>Close Cafe Immediately</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={isUpdating}
                  className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-emerald-950/60 border border-emerald-400/40 transition-all cursor-pointer"
                >
                  <Power className="w-4 h-4" />
                  <span>Open Cafe Now</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTargetAction('close');
                    setIsModalOpen(true);
                  }}
                  className="px-3.5 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-gray-300 font-bold text-xs border border-white/15 transition-all cursor-pointer"
                  title="Edit closure notice or reopen time"
                >
                  Edit Note
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reopen Time & Custom Note Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg rounded-3xl bg-neutral-900 border border-white/20 p-6 sm:p-7 shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center border border-red-500/30">
                    <Power className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-white">Close The Barozza Cafe</h4>
                    <p className="text-xs text-gray-400">Instantly disables orders on customer dashboard</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-left">
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-300 mb-2">
                    Expected Reopen Time (Quick Presets)
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      'In 30 Mins',
                      'In 1 Hour',
                      'Today 4:00 PM',
                      'Tomorrow 9:00 AM'
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setReopenPreset(preset);
                          setCustomReopenTime('');
                        }}
                        className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                          reopenPreset === preset && !customReopenTime
                            ? 'bg-red-600 border-red-500 text-white shadow-lg shadow-red-950/50'
                            : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Or Enter Custom Reopen Time (e.g., &quot;Sun, 11:30 AM&quot;)
                  </label>
                  <input
                    type="text"
                    value={customReopenTime}
                    onChange={(e) => setCustomReopenTime(e.target.value)}
                    placeholder="e.g. 11:30 AM, Tomorrow Evening..."
                    className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-white/20 text-white text-xs placeholder-gray-500 focus:outline-hidden focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 mb-1">
                    Custom Closure Message for Customers (Optional)
                  </label>
                  <textarea
                    rows={2}
                    value={customReason}
                    onChange={(e) => setCustomReason(e.target.value)}
                    placeholder="currently cafe is closed. so I'm sorry boss ! . it will open shortly..."
                    className="w-full px-4 py-2 rounded-xl bg-black/60 border border-white/20 text-white text-xs placeholder-gray-500 focus:outline-hidden focus:border-red-500 resize-none"
                  />
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                  <Zap className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    Zero delay: Customer dashboards across all tabs and devices will immediately show the &quot;Cafe Closed&quot; status.
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 mt-6 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAction}
                  disabled={isUpdating}
                  className="px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider shadow-xl shadow-red-950/60 border border-red-400/40 transition-all cursor-pointer"
                >
                  {isUpdating ? 'Updating Live...' : 'Confirm & Close Cafe'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
