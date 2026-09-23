/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  Utensils,
  BookOpen,
  X,
  Sparkles,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCcw
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
  const [isMenuImageOpen, setIsMenuImageOpen] = useState(false);
  const [imageZoom, setImageZoom] = useState(1);
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
              <span className="text-[10px] font-bold text-gray-300 tracking-wide -mt-0.5 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5 text-red-500 shrink-0" />
                <span>GEC Palamu</span>
              </span>
            )}
          </div>
        </div>

        {/* Responsive Menu Button at exact midpoint of header */}
        <div className="flex items-center justify-center">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsMenuImageOpen(true)}
            className={`flex items-center gap-2 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full border text-white shadow-lg shadow-black/40 backdrop-blur-xl transition-all cursor-pointer group select-none ${
              isMenuImageOpen
                ? 'bg-red-600/30 border-red-500/60 ring-2 ring-red-500/40 text-red-300'
                : 'bg-white/10 hover:bg-white/15 border-white/20 hover:border-red-500/50 hover:shadow-red-950/40'
            }`}
            title="View Cafe Menu Card"
            aria-label="Open Cafe Menu Card"
          >
            <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-transform shadow-sm ${
              isMenuImageOpen 
                ? 'bg-red-500 text-white rotate-12 shadow-red-900/60' 
                : 'bg-red-600/90 text-white group-hover:rotate-12 shadow-red-900/50'
            }`}>
              <Utensils className="w-3 h-3" />
            </div>
            <span className="text-xs sm:text-sm font-black tracking-wide group-hover:text-red-400 transition-colors">
              Menu
            </span>
          </motion.button>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Top-Right Profile Icon & Glassmorphism Popover */}
          <div className="relative" ref={profileRef}>
            {user ? (
              <button
                type="button"
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-11 h-11 rounded-2xl bg-white/10 backdrop-blur-xl text-white font-black text-sm tracking-wider flex items-center justify-center shadow-lg border border-white/25 hover:bg-white/20 hover:border-white/45 hover:scale-105 active:scale-95 transition-all cursor-pointer select-none"
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

      {/* Menu Card Image Lightbox Modal with Top-to-Bottom Transition */}
      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {isMenuImageOpen && (
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-6 overflow-hidden">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                onClick={() => {
                  setIsMenuImageOpen(false);
                  setImageZoom(1);
                }}
                className="fixed inset-0 bg-black/90 backdrop-blur-2xl"
              />

              {/* Modal Card Content: Transitions top-to-bottom on open, shifts up/out on close */}
              <motion.div
                initial={{ opacity: 0, y: -120, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -120, scale: 0.92 }}
                transition={{ 
                  type: 'spring',
                  damping: 26,
                  stiffness: 280,
                  mass: 0.9
                }}
                className="relative z-10 w-full max-w-4xl max-h-[94vh] flex flex-col bg-neutral-950/95 border border-white/20 rounded-3xl shadow-2xl shadow-black overflow-hidden ring-1 ring-white/10"
              >
                {/* Header Bar */}
                <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-white/10 bg-neutral-900/90 backdrop-blur-md shrink-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br from-red-600 to-red-700 flex items-center justify-center text-white shadow-md shadow-red-900/40 shrink-0 border border-white/10">
                      <Utensils className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-black text-white tracking-tight truncate">
                        The Barozza Cafe Menu Card
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Zoom Controls */}
                    <div className="flex items-center bg-white/5 border border-white/10 rounded-xl p-0.5">
                      <button
                        type="button"
                        onClick={() => setImageZoom((prev) => Math.max(0.75, prev - 0.25))}
                        className="p-1.5 sm:p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                        title="Zoom Out"
                        aria-label="Zoom Out"
                      >
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageZoom(1)}
                        className="px-2 py-1 text-[11px] font-mono font-bold text-gray-300 hover:text-white transition-colors cursor-pointer"
                        title="Reset Zoom to 100%"
                      >
                        {Math.round(imageZoom * 100)}%
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageZoom((prev) => Math.min(3, prev + 0.25))}
                        className="p-1.5 sm:p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                        title="Zoom In"
                        aria-label="Zoom In"
                      >
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setIsMenuImageOpen(false);
                        setImageZoom(1);
                      }}
                      className="p-2 sm:p-2.5 rounded-xl bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 transition-all cursor-pointer active:scale-95"
                      title="Close Menu (Shift & Transition Up)"
                      aria-label="Close Menu"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Crystal Clear Image Container with Zoom & Scroll/Drag Support */}
                <div className="relative flex-1 min-h-[320px] sm:min-h-[500px] max-h-[78vh] overflow-auto p-2 sm:p-4 flex items-center justify-center bg-black/90 select-none">
                  <div 
                    className="relative rounded-2xl shadow-2xl border border-white/10 bg-neutral-900 flex items-center justify-center transition-transform duration-150 ease-out"
                    style={{ transform: `scale(${imageZoom})`, transformOrigin: 'center center' }}
                  >
                    <img
                      src="/images/menu.png"
                      alt="The Barozza Cafe Menu Card"
                      className="w-auto h-auto max-h-[74vh] max-w-full object-contain rounded-2xl select-none"
                      loading="eager"
                      decoding="sync"
                    />
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </header>
  );
}
