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
  Sparkles,
  LayoutDashboard,
  Utensils
} from 'lucide-react';
import { OrderStatus } from '../types';
import { useFirebase } from './FirebaseProvider';

interface HeaderProps {
  cartCount: number;
  onOpenCart: () => void;
  onOpenAdmin: () => void;
  onBackToMenu?: () => void;
  step: string;
  orderStatus: OrderStatus;
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

export default function Header({ cartCount, onOpenCart, onOpenAdmin, onBackToMenu, step, orderStatus }: HeaderProps) {
  const { user, signInWithGoogle, signOutUser, isSigningIn } = useFirebase();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const currentStatus = statusConfig[orderStatus];

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
        <nav className="hidden md:flex items-center gap-3 lg:gap-4 text-sm font-bold">
          <button
            type="button"
            onClick={onBackToMenu}
            className={`flex items-center gap-2 px-4 py-2 rounded-2xl transition-all cursor-pointer text-xs font-black tracking-wide ${
              step !== 'admin'
                ? 'bg-white/10 text-white border border-white/20 shadow-md'
                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Utensils className={`w-3.5 h-3.5 ${step !== 'admin' ? 'text-red-500' : 'text-gray-400'}`} />
            <span>Customer Menu</span>
          </button>

          {/* Admin Dashboard & Firebase Sync Link in Nav */}
          <button
            type="button"
            id="nav-admin-dashboard-link"
            onClick={onOpenAdmin}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl transition-all cursor-pointer text-xs font-black tracking-wide shadow-lg ${
              step === 'admin'
                ? 'bg-red-600 text-white border border-red-400/60 shadow-red-900/50 ring-2 ring-red-500/30'
                : 'bg-red-500/10 hover:bg-red-500/20 text-red-300 hover:text-white border border-red-500/30 hover:border-red-500/60 shadow-red-950/30'
            }`}
            title="Open Admin Dashboard & Firebase Parcel Sync Hub"
          >
            <LayoutDashboard className="w-3.5 h-3.5 text-red-400" />
            <span>Admin Portal</span>
            <span className="flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-green-500/20 border border-green-500/40 text-green-300 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              Firebase Sync
            </span>
          </button>

          <div className="flex items-center gap-1.5 text-gray-400 text-xs font-semibold pl-2 border-l border-white/10">
            <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
            <span className="truncate max-w-[150px] lg:max-w-[220px]">GEC Palamu</span>
          </div>
        </nav>

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Mobile Admin Dashboard Link Button */}
          <button
            type="button"
            onClick={step === 'admin' ? onBackToMenu : onOpenAdmin}
            className={`md:hidden px-3 py-2 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center gap-1.5 border shadow-md ${
              step === 'admin'
                ? 'bg-red-600 text-white border-red-400/50'
                : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-white border-red-500/30'
            }`}
            title="Admin Dashboard"
            aria-label="Admin Dashboard"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span>{step === 'admin' ? 'Menu' : 'Admin'}</span>
          </button>
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

                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-gray-300 mb-4">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Signed in</span>
                      <span className="text-gray-500">•</span>
                      <span className="truncate text-gray-400">{user.email}</span>
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

          {/* Cart / Order Status Button */}
          <button 
            onClick={onOpenCart}
            className={`relative p-3 rounded-2xl transition-all border ${orderStatus !== 'idle' ? 'bg-white/5 border-white/20 px-6 flex items-center gap-3' : 'hover:bg-white/10 border-transparent hover:border-white/10'}`}
            disabled={step !== 'menu' && orderStatus === 'idle'}
          >
            <AnimatePresence mode="wait">
              {currentStatus ? (
                <motion.div 
                  key="status"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-3"
                >
                  <div className={`w-2 h-2 rounded-full ${currentStatus.color} animate-pulse`} />
                  <span className="text-xs font-black uppercase tracking-widest text-white">
                    {currentStatus.label}
                  </span>
                  <currentStatus.icon className={`w-5 h-5 text-white ${currentStatus.spin ? 'animate-spin' : ''}`} />
                </motion.div>
              ) : (
                <motion.div
                  key="cart"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                >
                  <ShoppingBag className="w-7 h-7 text-white" />
                  {cartCount > 0 && (
                    <motion.span 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white text-xs font-black flex items-center justify-center rounded-lg shadow-lg"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>
    </header>
  );
}
