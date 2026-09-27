import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldAlert, Copy, Check, ExternalLink, UserCheck, X } from 'lucide-react';
import { useFirebase } from './FirebaseProvider';

export default function UnauthorizedDomainModal() {
  const { authError, clearAuthError, signInAsGuest } = useFirebase();
  const [copied, setCopied] = useState(false);

  if (!authError || authError.code !== 'auth/unauthorized-domain') {
    return null;
  }

  const domain = authError.domain || (typeof window !== 'undefined' ? window.location.hostname : '');

  const handleCopy = () => {
    if (!domain) return;
    navigator.clipboard.writeText(domain).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }).catch(() => {
      // Fallback copy
      const el = document.createElement('textarea');
      el.value = domain;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const handleContinueAsGuest = () => {
    signInAsGuest('Guest Customer', 'guest@barozza.cafe');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-lg bg-neutral-900 border border-amber-500/30 rounded-3xl p-6 sm:p-7 shadow-2xl overflow-hidden"
        >
          {/* Close button */}
          <button
            onClick={clearAuthError}
            className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            title="Dismiss"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-400/90 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Setup Notice
              </span>
              <h3 className="text-lg font-black text-white mt-1">Domain Authorization Required</h3>
              <p className="text-gray-400 text-xs mt-0.5 leading-relaxed">
                Google Authentication requires this domain to be authorized in your Firebase project.
              </p>
            </div>
          </div>

          {/* Domain Box */}
          <div className="bg-black/60 border border-white/10 rounded-2xl p-3.5 mb-4">
            <div className="flex items-center justify-between text-[11px] text-gray-400 font-bold mb-1.5">
              <span>Domain to Authorize:</span>
              <span className="text-emerald-400 font-mono text-[10px]">Ready to copy</span>
            </div>
            <div className="flex items-center justify-between gap-2 bg-neutral-800/80 px-3 py-2 rounded-xl border border-white/10">
              <code className="text-xs font-mono text-white truncate select-all">{domain}</code>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-black transition-all cursor-pointer shrink-0 shadow"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-black" /> : <Copy className="w-3.5 h-3.5 text-black" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* 3 Step Guide */}
          <div className="bg-white/5 rounded-2xl p-4 mb-5 space-y-2 text-xs text-gray-300 border border-white/10">
            <p className="font-bold text-white text-[11px] uppercase tracking-wider mb-1">How to enable Google Sign-In:</p>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-white/10 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
              <span>Open <strong>Firebase Console</strong> &rarr; Select project <strong>brozza-1f6be</strong></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-white/10 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
              <span>Go to <strong>Authentication</strong> &rarr; <strong>Settings</strong> &rarr; <strong>Authorized domains</strong></span>
            </div>
            <div className="flex items-start gap-2">
              <span className="w-4 h-4 rounded-full bg-white/10 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
              <span>Click <strong>Add domain</strong>, paste the copied domain, and click <strong>Save</strong></span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            <button
              type="button"
              onClick={handleContinueAsGuest}
              className="w-full sm:flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-900/40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserCheck className="w-4 h-4" />
              <span>Continue as Verified Diner</span>
            </button>
            <button
              type="button"
              onClick={clearAuthError}
              className="w-full sm:w-auto py-3 px-5 rounded-2xl bg-white/10 hover:bg-white/15 text-gray-300 hover:text-white font-bold text-xs transition-all cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
