/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MapPin, Phone, User, Clock, ArrowLeft, Sparkles, CheckCircle2, LogIn, History, ArrowUpRight } from 'lucide-react';
import { UserAddress } from '../types';
import { useFirebase } from './FirebaseProvider';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';

interface CheckoutStepProps {
  onBack: () => void;
  onProceed: (address: UserAddress) => void;
}

function extractCustomerName(user: any): string {
  if (!user) return '';
  if (user.displayName && typeof user.displayName === 'string' && user.displayName.trim().length > 0) {
    return user.displayName.trim();
  }
  if (user.email && typeof user.email === 'string') {
    const raw = user.email.split('@')[0];
    const cleaned = raw.replace(/[._\-+]/g, ' ').replace(/(\d+)/g, ' $1 ').trim();
    const parts = cleaned.split(/\s+/).filter((w: string) => !/^\d+$/.test(w));
    if (parts.length > 0) {
      return parts.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    }
    return raw;
  }
  return '';
}

export default function CheckoutStep({ onBack, onProceed }: CheckoutStepProps) {
  const { user, signInWithGoogle, isSigningIn } = useFirebase();
  const [history, setHistory] = useState<UserAddress[]>([]);
  const [recentAddresses, setRecentAddresses] = useState<UserAddress[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: ''
  });
  const [isAddressAutoFilled, setIsAddressAutoFilled] = useState(false);
  const [isPhoneAutoFilled, setIsPhoneAutoFilled] = useState(false);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRecentData() {
      // 1. Read local address history
      let localItems: UserAddress[] = [];
      const saved = localStorage.getItem('address_history');
      if (saved) {
        try {
          localItems = JSON.parse(saved);
        } catch (e) {
          console.error('Error parsing address_history:', e);
        }
      }

      // 2. Fetch recent orders from Firestore if user is authenticated
      let firestoreItems: UserAddress[] = [];
      if (user?.uid) {
        try {
          const q = query(
            collection(db, 'orders'),
            where('userId', '==', user.uid)
          );
          const snap = await getDocs(q);
          const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
          
          // Sort newest to oldest
          docs.sort((a, b) => {
            const timeA = a.createdAt?.seconds || 0;
            const timeB = b.createdAt?.seconds || 0;
            return timeB - timeA;
          });

          firestoreItems = docs
            .filter(d => d.customerAddress && typeof d.customerAddress === 'string' && d.customerAddress.trim().length > 0)
            .map(d => ({
              id: d.id,
              name: d.customerName || '',
              phone: d.customerPhone || '',
              address: d.customerAddress.trim()
            }));
        } catch (err) {
          console.warn('Could not query previous orders from Firestore:', err);
        }
      }

      // 3. Deduplicate recent addresses by normalized address text
      const combined = [...firestoreItems, ...localItems];
      const seen = new Set<string>();
      const uniqueList: UserAddress[] = [];

      for (const item of combined) {
        const norm = item.address.toLowerCase().trim();
        if (norm && !seen.has(norm)) {
          seen.add(norm);
          uniqueList.push(item);
        }
      }

      if (!isMounted) return;

      setRecentAddresses(uniqueList);
      setHistory(uniqueList.slice(0, 5));

      // 4. Automatically type previous address, phone, and customer name
      const mostRecent = uniqueList[0];
      const autoName = extractCustomerName(user) || localStorage.getItem('barozza_customer_name') || mostRecent?.name || '';

      setFormData(prev => {
        const newName = prev.name ? prev.name : autoName;
        const newAddress = prev.address ? prev.address : (mostRecent?.address || '');
        const newPhone = prev.phone ? prev.phone : (mostRecent?.phone || '');

        if (!prev.address && mostRecent?.address) {
          setIsAddressAutoFilled(true);
        }
        if (!prev.phone && mostRecent?.phone) {
          setIsPhoneAutoFilled(true);
        }

        return {
          name: newName,
          phone: newPhone,
          address: newAddress
        };
      });
    }

    loadRecentData();

    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address) return;

    localStorage.setItem('barozza_customer_name', formData.name);

    const newAddress: UserAddress = {
      id: Date.now().toString(),
      ...formData
    };

    const updatedHistory = [newAddress, ...history.filter(h => h.address.toLowerCase().trim() !== newAddress.address.toLowerCase().trim())].slice(0, 5);
    localStorage.setItem('address_history', JSON.stringify(updatedHistory));
    
    onProceed(newAddress);
  };

  const selectAddress = (addr: UserAddress) => {
    setFormData(prev => ({
      ...prev,
      address: addr.address,
      phone: addr.phone || prev.phone,
      name: addr.name || prev.name
    }));
    setIsAddressAutoFilled(true);
    if (addr.phone) setIsPhoneAutoFilled(true);
    setShowAddressDropdown(false);
  };

  // Filter matching previous addresses while user types
  const matchingSuggestions = formData.address.trim().length > 1
    ? recentAddresses.filter(
        item =>
          item.address.toLowerCase().includes(formData.address.toLowerCase().trim()) &&
          item.address.toLowerCase().trim() !== formData.address.toLowerCase().trim()
      )
    : [];

  return (
    <div className="max-w-xl mx-auto px-4 py-4 sm:py-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-4 transition-colors font-bold text-xs"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Menu
      </button>

      <div className="mb-4">
        <h2 className="text-xl sm:text-2xl font-black text-white mb-0.5 tracking-tight">Delivery Details</h2>
        <p className="text-gray-400 text-xs">Confirm where your gourmet meal should be delivered.</p>
      </div>

      {history.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-red-500" />
              Recent Destinations
            </h3>
            <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              Auto-typed
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {history.map((addr) => {
              const isCurrent = formData.address.trim().toLowerCase() === addr.address.trim().toLowerCase();
              return (
                <motion.button
                  key={addr.id}
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => selectAddress(addr)}
                  className={`text-left p-2.5 rounded-xl border transition-all shadow-lg backdrop-blur-xl cursor-pointer ${
                    isCurrent 
                      ? 'border-red-500/50 bg-red-500/10 shadow-red-900/20' 
                      : 'border-white/5 bg-white/5 hover:border-red-500/30 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="p-1 bg-red-500/20 rounded-md shrink-0">
                        <User className="w-3 h-3 text-red-500" />
                      </div>
                      <span className="font-bold text-white text-xs truncate">{addr.name}</span>
                    </div>
                    {isCurrent && (
                      <span className="text-[8px] font-black uppercase tracking-wider bg-red-500 text-white px-1.5 py-0.5 rounded-full shrink-0">
                        Selected
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 mb-1.5 text-[11px] text-gray-400">
                    <Phone className="w-3 h-3 text-gray-500 shrink-0" />
                    <span className="truncate">{addr.phone}</span>
                  </div>
                  <div className="flex items-start gap-1.5 text-[11px] text-gray-300 line-clamp-2 bg-black/20 p-2 rounded-lg border border-white/5">
                    <MapPin className="w-3 h-3 mt-0.5 shrink-0 text-red-500" />
                    <span className="leading-tight truncate">{addr.address}</span>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5 bg-white/5 backdrop-blur-2xl p-5 sm:p-8 rounded-3xl border border-white/10 shadow-2xl">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg font-black text-white tracking-tight">Delivery Address</h3>
          {isAddressAutoFilled && (
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Ready
            </span>
          )}
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1 flex-wrap gap-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">
              Full Name
            </label>
            {user ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Auto-captured</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={signInWithGoogle}
                disabled={isSigningIn}
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 hover:bg-white/15 border border-white/10 text-gray-300 hover:text-white transition-all cursor-pointer disabled:opacity-50"
              >
                <LogIn className="w-3 h-3 text-red-400" />
                <span>{isSigningIn ? 'Connecting...' : 'Sign in'}</span>
              </button>
            )}
          </div>
          <div className="relative group">
            <User className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              formData.name ? 'text-red-500' : 'text-gray-500 group-focus-within:text-red-500'
            }`} />
            <input
              required
              type="text"
              placeholder="e.g. John Doe"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={`w-full pl-11 pr-10 py-3 bg-black/40 border rounded-xl text-sm text-white placeholder:text-gray-600 focus:bg-black/60 focus:ring-2 focus:ring-red-500/50 transition-all outline-hidden font-bold ${
                formData.name ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]' : 'border-white/5'
              }`}
            />
            {formData.name && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1 flex-wrap gap-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Phone Number</label>
            {isPhoneAutoFilled && formData.phone && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Auto-filled</span>
              </span>
            )}
          </div>
          <div className="relative group">
            <Phone className={`absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${
              formData.phone ? 'text-red-500' : 'text-gray-500 group-focus-within:text-red-500'
            }`} />
            <input
              required
              type="tel"
              placeholder="+1 (234) 567-890"
              value={formData.phone}
              onChange={e => {
                setIsPhoneAutoFilled(false);
                setFormData({ ...formData, phone: e.target.value });
              }}
              className={`w-full pl-11 pr-10 py-3 bg-black/40 border rounded-xl text-sm text-white placeholder:text-gray-600 focus:bg-black/60 focus:ring-2 focus:ring-red-500/50 transition-all outline-hidden font-bold ${
                formData.phone ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]' : 'border-white/5'
              }`}
            />
            {formData.phone && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between ml-1 flex-wrap gap-2">
            <label className="text-xs font-black text-gray-400 uppercase tracking-wider">Delivery Address</label>
            {isAddressAutoFilled && formData.address && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 backdrop-blur-md">
                <Sparkles className="w-3 h-3 text-emerald-400" />
                <span>Auto-filled</span>
              </span>
            )}
          </div>

          {/* Quick interactive suggestions from recent orders */}
          {recentAddresses.length > 0 && (
            <div className="bg-black/30 border border-white/10 rounded-xl p-3 space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-400 px-0.5">
                <span className="flex items-center gap-1 uppercase tracking-wider text-gray-300 font-black">
                  <History className="w-3 h-3 text-red-500" />
                  Recent Addresses
                </span>
                <span className="text-gray-500 font-medium">Tap to select</span>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {recentAddresses.map((recent, idx) => {
                  const isSelected = formData.address.trim().toLowerCase() === recent.address.trim().toLowerCase();
                  return (
                    <button
                      key={recent.id || idx}
                      type="button"
                      onClick={() => selectAddress(recent)}
                      className={`shrink-0 max-w-[240px] text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-500/20 border-red-500/50 text-white shadow-md shadow-red-900/30'
                          : 'bg-white/5 border-white/5 hover:border-white/20 text-gray-300 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1 mb-1 font-bold text-white">
                        <MapPin className="w-3 h-3 text-red-400 shrink-0" />
                        <span className="truncate">{recent.address.split(',')[0]}</span>
                        {isSelected && (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 ml-auto shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-gray-400 line-clamp-1 font-medium">{recent.address}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="relative group">
            <MapPin className={`absolute left-4 top-4 w-4 h-4 transition-colors ${
              formData.address ? 'text-red-500' : 'text-gray-500 group-focus-within:text-red-500'
            }`} />
            <textarea
              required
              rows={2}
              placeholder="Street name, Building, Apartment No."
              value={formData.address}
              onChange={e => {
                setIsAddressAutoFilled(false);
                setFormData({ ...formData, address: e.target.value });
              }}
              className={`w-full pl-11 pr-10 py-3 bg-black/40 border rounded-xl text-sm text-white placeholder:text-gray-600 focus:bg-black/60 focus:ring-2 focus:ring-red-500/50 transition-all outline-hidden resize-none font-bold ${
                formData.address ? 'border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.08)]' : 'border-white/5'
              }`}
            />
            {formData.address && (
              <div className="absolute right-4 top-4 flex items-center gap-1.5 pointer-events-none">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
            )}
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-red-600 text-white py-3.5 rounded-xl font-black text-base hover:bg-red-700 transition-all shadow-lg shadow-red-900/40 active:scale-95 cursor-pointer"
        >
          Confirm & Select Payment
        </button>
      </form>
    </div>
  );
}
