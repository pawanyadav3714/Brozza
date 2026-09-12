/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ShoppingBag, 
  MapPin, 
  Loader2, 
  Clock, 
  Truck, 
  CheckCircle2, 
  LogIn, 
  LogOut, 
  Mail, 
  LayoutDashboard,
  Utensils
} from 'lucide-react';
import { OrderStatus, Order } from '../types';
import { useFirebase } from './FirebaseProvider';
import { normalizePipelineStage } from './ParcelPipelineTracker';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  onBackToMenu?: () => void;
  step: string;
  orderStatus: OrderStatus;
  orders?: Order[];
}

const statusConfig = {
  idle: null,
  ordered: { icon: Clock, label: 'Ordered', color: 'bg-blue-500' },
  preparing: { icon: Loader2, label: 'Preparing', color: 'bg-amber-500', spin: true },
  en_route: { icon: Truck, label: 'En Route', color: 'bg-green-500' },
  delivered: { icon: CheckCircle2, label: 'Delivered', color: 'bg-green-600' },
};

function getInitials(displayName?: string | null, email?: string | null): string {
  if (displayName && displayName.trim()) {
    const parts = displayName.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    if (parts.length === 1) {
      return parts[0][0].toUpperCase();
    }
  }

  if (email && email.trim()) {
    const local = email.split('@')[0];
    const cleaned = local.replace(/[._\-+]/g, ' ').replace(/(\d+)/g, ' $1 ').trim();
    const parts = cleaned.split(/\s+/).filter((w: string) => !/^\d+$/.test(w));
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    if (parts.length === 1 && parts[0].length >= 2) {
      return parts[0].slice(0, 2).toUpperCase();
    }
    return local.slice(0, 2).toUpperCase();
  }

  return 'PY';
}

function getFormattedName(displayName?: string | null, email?: string | null): string {
  if (displayName && displayName.trim()) {
    return displayName.trim();
  }
  if (email && email.trim()) {
    const local = email.split('@')[0];
    const cleaned = local.replace(/[._\-+]/g, ' ').replace(/(\d+)/g, ' $1 ').trim();
    const parts = cleaned.split(/\s+/).filter((w: string) => !/^\d+$/.test(w));
    if (parts.length > 0) {
      return parts.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    return local;
  }
  return 'Customer';
}

export default function Header({ 
  cartCount, 
  onOpenCart, 
  onOpenAdmin, 
  onBackToMenu, 
  step, 
  orderStatus,
  orders = [] 
}: HeaderProps) {
  const { user, signInWithGoogle, signOutUser, isSigningIn } = useFirebase();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Derive dynamic pipeline stage for the header bag button
  const latestOrder = orders && orders.length > 0 ? orders[0] : null;
  const activePipelineStage = latestOrder 
    ? normalizePipelineStage(latestOrder.status) 
    : (orderStatus !== 'idle' ? normalizePipelineStage(orderStatus) : null);

  const isPending = activePipelineStage === 'Pending';
  const isAcceptedOrProgress = activePipelineStage === 'Received' || activePipelineStage === 'Processing' || activePipelineStage === 'Out For_delivery';
  const isDelivered = activePipelineStage === 'Delivered';
  const totalBadgeCount = cartCount > 0 ? cartCount : (orders.length > 0 ? orders.length : 0);

  const initials = getInitials(user?.displayName, user?.email);
  const formattedName = getFormattedName(user?.displayName, user?.email);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogoClick = () => {
    if (step === 'admin' && onBackToMenu) {
      onBackToMenu();
    } else if (onBackToMenu) {
      onBackToMenu();
    } else {
      onOpenAdmin();
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-black/40 backdrop-blur-xl border-b border-white/10 shadow-2xl">
      <div className="max-w-7xl mx-auto px-4 h-20 flex items-center justify-between gap-4">
        {/* Brand Logo & Home/Admin Toggle */}
        <div 
          className="flex items-center gap-3 cursor-pointer group select-none"
          onClick={handleLogoClick}
          title={step === 'admin' ? "Return to Customer Cafe Menu" : "The Barozza Cafe"}
        >
          <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center shadow-lg shadow-red-900/40 rotate-3 group-hover:rotate-6 transition-all border border-white/10">
            <ShoppingBag className="text-white w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter text-white group-hover:text-red-500 transition-colors leading-tight">
              BAROZZA
            </span>
            {step === 'admin' ? (
              <span className="text-[10px] font-black uppercase tracking-widest text-red-400 flex items-center gap-1 -mt-0.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                Admin View
              </span>
            ) : (
              <span className="text-[10px] font-bold text-gray-400 tracking-wider -mt-0.5">
                Artisanal Cafe
              </span>
            )}
          </div>
        </div>

        {/* Central Navigation Bar Links */}
        <nav className="hidden md:flex items-center text-sm font-bold">
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-300 text-xs font-medium">
            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="truncate max-w-[180px] lg:max-w-[240px]">GEC Palamu</span>
          </div>
        </nav>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Top-Right Profile Icon & Glassmorphism Popover */}
          <div className="relative" ref={profileRef}>
            {user ? (
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-red-600 via-red-500 to-amber-600 text-white font-black text-sm tracking-wider flex items-center justify-center shadow-lg shadow-red-900/30 border border-white/20 hover:scale-105 active:scale-95 transition-all cursor-pointer select-none"
                title={`${formattedName} (${user.email})`}
                aria-label="User Profile"
              >
                {initials}
              </button>
            ) : (
              <button 
                onClick={signInWithGoogle}
                disabled={isSigningIn}
                className="flex items-center gap-2 text-white bg-white/10 hover:bg-white/15 border border-white/10 cursor-pointer transition-all px-4 py-2.5 rounded-2xl text-xs font-bold disabled:opacity-50 active:scale-95"
              >
                <LogIn className="w-4 h-4 text-red-400" />
                <span>{isSigningIn ? 'Connecting...' : 'Sign In'}</span>
              </button>
            )}

            {/* Glassmorphism Profile Popup */}
            <AnimatePresence>
              {isProfileOpen && user && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -8 }}
                  transition={{ duration: 0.18, ease: 'easeOut' }}
                  className="absolute right-0 top-full mt-3 w-76 rounded-3xl bg-neutral-900/90 backdrop-blur-2xl border border-white/15 p-5 shadow-2xl shadow-black/80 z-50 overflow-hidden"
                >
                  {/* Glowing ambient background hint */}
                  <div className="absolute -top-12 -right-12 w-28 h-28 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex items-center gap-3.5 mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 text-white font-black text-lg tracking-wider flex items-center justify-center shadow-lg shadow-red-900/30 shrink-0 border border-white/20">
                        {initials}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-white font-black text-base truncate tracking-tight">
                          {formattedName}
                        </h4>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 truncate mt-0.5">
                          <Mail className="w-3 h-3 text-red-400 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-3">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsProfileOpen(false);
                          await signOutUser();
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl bg-red-600/10 hover:bg-red-600/20 border border-red-500/20 text-red-400 hover:text-red-300 font-bold text-sm transition-all cursor-pointer group"
                      >
                        <span>Log out</span>
                        <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cart / Order Status Bag Button */}
          <button 
            type="button"
            onClick={onOpenCart}
            className="relative p-2.5 sm:p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 flex items-center justify-center cursor-pointer active:scale-95 transition-all shadow-md"
            title="View Order Fulfillment Pipeline & Bag"
            aria-label="View Orders and Bag"
          >
            <div className="relative flex items-center justify-center">
              <ShoppingBag className="w-6 h-6 sm:w-6.5 sm:h-6.5 text-white stroke-[1.8]" />
              
              {/* Dynamic Status Dot on Bag Icon */}
              {isPending && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,1)] border border-neutral-900" />
              )}
              {isAcceptedOrProgress && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(52,211,153,1)] border border-neutral-900" />
              )}
              {isDelivered && (
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,1)] border border-neutral-900" />
              )}

              {/* Badge count when no active stage or multiple items */}
              {!activePipelineStage && totalBadgeCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-600 text-white text-[10px] font-black flex items-center justify-center rounded-full shadow-lg border border-neutral-900">
                  {totalBadgeCount}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
