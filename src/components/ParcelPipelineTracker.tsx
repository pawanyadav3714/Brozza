/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { PipelineStage } from '../types';

interface ParcelPipelineTrackerProps {
  currentStatus: string;
  onUpdateStage?: (newStage: PipelineStage) => void | Promise<void>;
  isUpdating?: boolean;
  readOnly?: boolean;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  'Pending',
  'Received',
  'Processing',
  'Out For_delivery',
  'Delivered',
];

export function normalizePipelineStage(status?: string): PipelineStage {
  if (!status) return 'Pending';
  const s = status.trim().toLowerCase().replace(/\s+/g, '_');
  if (s === 'pending' || s === 'ordered' || s === 'idle') return 'Pending';
  if (s === 'received' || s === 'accepted' || s === 'confirmed') return 'Received';
  if (s === 'processing' || s === 'preparing' || s === 'cooking') return 'Processing';
  if (s === 'out_for_delivery' || s === 'out for_delivery' || s === 'en_route' || s === 'dispatched' || s === 'in_transit') {
    return 'Out For_delivery';
  }
  if (s === 'delivered' || s === 'completed') return 'Delivered';
  return 'Pending';
}

export default function ParcelPipelineTracker({
  currentStatus,
  onUpdateStage,
  isUpdating = false,
  readOnly = true,
}: ParcelPipelineTrackerProps) {
  const activeStage = normalizePipelineStage(currentStatus);

  return (
    <div className="rounded-xl bg-[#090e1c] border border-blue-900/25 p-3 sm:p-3.5 shadow-xl relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute -top-10 -right-10 w-28 h-28 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-wider text-gray-300 uppercase">
            Order Fulfillment Pipeline
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] text-gray-400">
            {readOnly ? 'Live admin sync' : 'Click stage to update'}
          </span>
        </div>
      </div>

      {/* Pipeline Stage Buttons Row - Slightly smaller, professional styling */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
        {PIPELINE_STAGES.map((stage) => {
          const isActive = activeStage === stage;
          const isDeliveredStage = stage === 'Delivered';
          const isPendingStage = stage === 'Pending';
          const isAcceptedOrProgressStage =
            stage === 'Received' || stage === 'Processing' || stage === 'Out For_delivery';

          let activeStyle = '';
          if (isActive) {
            if (isPendingStage) {
              // Dynamic RED BLINKING button when Pending
              activeStyle =
                'bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-bold shadow-md shadow-red-600/40 animate-pulse ring-1 ring-red-400/80 border border-red-300';
            } else if (isAcceptedOrProgressStage) {
              // Dynamic GREEN BLINKING button when accepted / received / in progress
              activeStyle =
                'bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 text-white font-bold shadow-md shadow-emerald-500/40 animate-pulse ring-1 ring-emerald-400/80 border border-emerald-300';
            } else if (isDeliveredStage) {
              // PERMANENTLY GREEN (no pulse/blinking) when delivered
              activeStyle =
                'bg-emerald-600 text-white font-bold border border-emerald-400 shadow-sm shadow-emerald-950/60';
            }
          } else {
            activeStyle =
              'bg-white/[0.03] text-gray-400 border border-white/[0.08] font-medium';
          }

          const isClickable = !readOnly && !isUpdating;

          return (
            <motion.button
              key={stage}
              type="button"
              disabled={!isClickable}
              whileTap={isClickable ? { scale: 0.96 } : undefined}
              onClick={() => isClickable && onUpdateStage && onUpdateStage(stage)}
              className={`relative px-2 sm:px-2.5 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-[11px] tracking-wide transition-all flex items-center justify-center gap-1.5 select-none ${
                isClickable ? 'cursor-pointer hover:border-white/20' : 'cursor-default pointer-events-none'
              } ${activeStyle}`}
              title={readOnly ? `Current pipeline stage: ${stage}` : `Set order status to ${stage}`}
            >
              {/* Dynamic blinking indicator dot for active stage */}
              {isActive && isPendingStage && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
              )}
              {isActive && isAcceptedOrProgressStage && (
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping shrink-0" />
              )}
              {isActive && isDeliveredStage && (
                <CheckCircle2 className="w-3 h-3 text-white shrink-0" />
              )}

              <span className="truncate">{stage}</span>

              {isUpdating && isActive && (
                <Loader2 className="w-2.5 h-2.5 animate-spin ml-1" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
