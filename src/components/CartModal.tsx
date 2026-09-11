/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from 'motion/react';
import { X, Plus, Minus, ArrowRight } from 'lucide-react';
import { Dish, CartItem } from '../types';

interface CartModalProps {
  isOpen: boolean;
  onClose: () => void;
  dish: Dish | null;
  quantity: number;
  onUpdateQuantity: (q: number) => void;
  onProceedToCheckout: () => void;
}

export default function CartModal({
  isOpen,
  onClose,
  dish,
  quantity,
  onUpdateQuantity,
  onProceedToCheckout
}: CartModalProps) {
  if (!dish) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-black/40 backdrop-blur-2xl z-50 shadow-2xl flex flex-col border-l border-white/10"
          >
            <div className="p-8 flex items-center justify-between border-b border-white/10">
              <h2 className="text-2xl font-black text-white tracking-tight">Your Selection</h2>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8">
              <div className="flex flex-col gap-6 mb-12">
                <img
                  src={dish.image}
                  alt={dish.name}
                  className="w-full aspect-video rounded-3xl object-cover shadow-2xl border border-white/10"
                />
                <div>
                  <span className="text-xs font-black text-red-500 uppercase tracking-widest">{dish.category}</span>
                  <h3 className="text-3xl font-black text-white mt-2 tracking-tight">{dish.name}</h3>
                  <p className="text-gray-400 mt-3 font-medium leading-relaxed">{dish.description}</p>
                </div>
              </div>

              <div className="bg-white/5 rounded-[2rem] p-8 border border-white/10">
                <div className="flex items-center justify-between mb-8">
                  <span className="font-bold text-gray-300">Quantity</span>
                  <div className="flex items-center gap-6 bg-black/40 rounded-2xl p-1.5 border border-white/10">
                    <button
                      onClick={() => onUpdateQuantity(Math.max(1, quantity - 1))}
                      className="p-3 hover:bg-white/5 rounded-xl text-red-500 transition-colors"
                    >
                      <Minus className="w-5 h-5" />
                    </button>
                    <span className="w-8 text-center font-black text-xl text-white">{quantity}</span>
                    <button
                      onClick={() => onUpdateQuantity(quantity + 1)}
                      className="p-3 hover:bg-white/5 rounded-xl text-red-500 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2">
                    <span className="text-gray-400 font-medium">Unit Price</span>
                    <span className="font-bold text-white">₹{dish.price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between pt-6 border-t border-white/10">
                    <span className="text-lg font-bold text-gray-200">Total</span>
                    <span className="text-4xl font-black text-red-500">₹{(dish.price * quantity).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-black/20 border-t border-white/10">
              {dish.available === false ? (
                <div className="w-full bg-neutral-800 text-gray-400 py-4 px-4 rounded-2xl font-bold text-center text-sm border border-red-500/30">
                  <span className="text-red-400 font-black uppercase tracking-wider block mb-1">Currently Sold Out</span>
                  This dish is temporarily unavailable from the kitchen.
                </div>
              ) : (
                <button
                  onClick={onProceedToCheckout}
                  className="w-full bg-red-600 text-white py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-3 hover:bg-red-700 transition-all shadow-xl shadow-red-900/40 active:scale-95 cursor-pointer"
                >
                  Proceed to Checkout
                  <ArrowRight className="w-6 h-6" />
                </button>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
