/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Phone, Clock, MessageCircle, User, Code, Mail } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ContactModal({ isOpen, onClose }: ContactModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-md z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-neutral-950/95 backdrop-blur-3xl z-50 rounded-3xl border border-white/15 p-6 sm:p-8 shadow-2xl overflow-hidden"
          >
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-red-600/20 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-red-600 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-red-900/40">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-white tracking-tight">Contact & Info</h3>
                  <p className="text-xs text-gray-400">Owner profile and developer details</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* TOP: Owner Profile */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                  <User className="w-4 h-4" />
                  <span>Owner Profile</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                      <User className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Name</span>
                      <strong className="text-white text-sm">Rohit Sharma</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Contact</span>
                      <strong className="text-white text-sm">97980 12606</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 sm:col-span-2">
                    <div className="p-2 rounded-xl bg-red-500/20 text-red-400">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Timing</span>
                      <strong className="text-white text-sm">9:00 AM to 10:00 PM</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* BOTTOM: Developer Details */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                  <Code className="w-4 h-4" />
                  <span>Developer Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                      <Code className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Name</span>
                      <strong className="text-white text-sm">Developed by Unscripted</strong>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <span className="text-gray-400 block font-medium">Email</span>
                      <strong className="text-white text-xs truncate block max-w-[160px]">pawanyadav3714@gmail.com</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
