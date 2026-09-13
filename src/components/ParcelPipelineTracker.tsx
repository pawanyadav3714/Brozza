/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Loader2, Clock, Truck, Package, Flame } from 'lucide-react';
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

const STAGE_ICONS: Record<PipelineStage, React.ReactNode> = {
  'Pending': <Clock className="w-3 h-3" />,
  'Received': <Package className="w-3 h-3" />,
  'Processing': <Flame className="w-3 h-3" />,
  'Out For_delivery': <Truck className="w-3 h-3" />,
  'Delivered': <CheckCircle2 className="w-3 h-3" />,
};

export default function ParcelPipelineTracker({
  currentStatus,
  onUpdateStage,
  isUpdating = false,
  readOnly = true,
}: ParcelPipelineTrackerProps) {
  const activeStage = normalizePipelineStage(currentStatus);
  const activeIndex = PIPELINE_STAGES.indexOf(activeStage);

  return (
    <div className="rounded-xl bg-[#090e1c] border border-blue-900/25 p-3.5 sm:p-4 shadow-xl relative overflow-hidden">
      {/* Background ambient gradient glow */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-600/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] font-mono font-bold tracking-wider text-gray-200 uppercase flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
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

      {/* Sequential Steps Container: Vertical on mobile for crystal clear sequential order, horizontal on sm+ */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-1.5 relative">
        {PIPELINE_STAGES.map((stage, idx) => {
          const isActive = activeStage === stage;
          const isPassed = idx < activeIndex;
          const isPendingStage = stage === 'Pending';
          const isDeliveredStage = stage === 'Delivered';
          const isAcceptedOrProgressStage =
            stage === 'Received' || stage === 'Processing' || stage === 'Out For_delivery';

          let stateClasses = '';
          if (isActive) {
            if (isPendingStage) {
              stateClasses = 'bg-gradient-to-r from-red-600 via-rose-600 to-red-600 text-white font-bold shadow-md shadow-red-600/40 animate-pulse ring-1 ring-red-400/85 border border-red-300';
            } else if (isAcceptedOrProgressStage) {
              stateClasses = 'bg-gradient-to-r from-emerald-600 via-green-500 to-emerald-600 text-white font-bold shadow-md shadow-emerald-500/40 animate-pulse ring-1 ring-emerald-400/85 border border-emerald-300';
            } else if (isDeliveredStage) {
              stateClasses = 'bg-emerald-600 text-white font-bold border border-emerald-400 shadow-sm shadow-emerald-950/60';
            }
          } else if (isPassed) {
            stateClasses = 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/50 font-medium opacity-90';
          } else {
            stateClasses = 'bg-white/[0.03] text-gray-400 border border-white/[0.08] font-medium';
          }

          const isClickable = !readOnly && !isUpdating;
          const displayName = stage === 'Out For_delivery' ? 'Out For Delivery' : stage;

          return (
            <motion.button
              key={stage}
              type="button"
              disabled={!isClickable}
              whileTap={isClickable ? { scale: 0.97 } : undefined}
              onClick={() => isClickable && onUpdateStage && onUpdateStage(stage)}
              className={`relative flex-1 px-3 py-2 sm:py-2.5 rounded-lg text-[11px] tracking-wide transition-all flex items-center sm:flex-col justify-start sm:justify-center gap-2 sm:gap-1.5 select-none ${
                isClickable ? 'cursor-pointer hover:border-white/25 hover:bg-white/[0.06]' : 'cursor-default pointer-events-none'
              } ${stateClasses}`}
              title={readOnly ? `Current pipeline stage: ${displayName}` : `Set order status to ${displayName}`}
            >
              {/* Step number badge & icon */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono font-bold ${
                  isActive ? 'bg-white text-black' : isPassed ? 'bg-emerald-500 text-black' : 'bg-white/10 text-gray-300'
                }`}>
                  {idx + 1}
                </span>
                <span className="shrink-0 opacity-90">
                  {STAGE_ICONS[stage]}
                </span>
              </div>

              <span className="truncate text-left sm:text-center font-medium">
                {displayName}
              </span>

              {isUpdating && isActive && (
                <Loader2 className="w-3 h-3 animate-spin ml-auto sm:ml-0" />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
