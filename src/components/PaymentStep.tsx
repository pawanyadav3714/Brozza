/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Wallet, QrCode, CheckCircle2, ArrowLeft, Loader2, LogIn } from 'lucide-react';
import { useFirebase } from './FirebaseProvider';

interface PaymentStepProps {
  onBack: () => void;
  onConfirm: () => void;
  totalPrice: number;
}

export default function PaymentStep({ onBack, onConfirm, totalPrice }: PaymentStepProps) {
  const { user, signInWithGoogle, isSigningIn } = useFirebase();
  const [method, setMethod] = useState<'cod' | 'qr' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleConfirm = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onConfirm();
    }, 2000);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-10 transition-colors font-bold"
      >
        <ArrowLeft className="w-5 h-5" />
        Back to Details
      </button>

      <div className="mb-12 text-center sm:text-left">
        <h2 className="text-5xl font-black text-white mb-4 tracking-tight">Payment</h2>
        <p className="text-gray-400 text-xl font-medium">Choose your preferred way to settle the tab.</p>
      </div>

      <div className="bg-red-600 text-white p-10 rounded-[3rem] mb-12 flex justify-between items-center overflow-hidden relative shadow-2xl shadow-red-900/20 border border-red-500">
        <div className="relative z-10">
          <p className="text-red-200 text-sm font-black uppercase tracking-widest mb-2">Total Amount</p>
          <p className="text-5xl font-black tracking-tighter">₹{totalPrice.toFixed(2)}</p>
        </div>
        <CreditCard className="w-32 h-32 text-white/10 absolute -right-6 -bottom-6 rotate-12" />
      </div>

      {!user ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 mb-12 text-center shadow-3xl"
        >
          <LogIn className="w-12 h-12 text-red-500 mx-auto mb-6" />
          <h3 className="text-2xl font-black text-white mb-4">Authentication Required</h3>
          <p className="text-gray-400 font-medium leading-relaxed mb-8">Please sign in with Google to securely place your order and track its progress.</p>
          <button
            onClick={signInWithGoogle}
            disabled={isSigningIn}
            className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-gray-200 transition-all shadow-xl disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSigningIn ? <Loader2 className="w-5 h-5 animate-spin text-black" /> : null}
            <span>{isSigningIn ? 'Connecting to Google...' : 'Sign In with Google'}</span>
          </button>
        </motion.div>
      ) : (
        <>
          <div className="space-y-4 mb-12">
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setMethod('cod')}
              className={`w-full p-8 rounded-[2.5rem] border-2 flex items-center gap-6 transition-all backdrop-blur-xl ${
                method === 'cod' ? 'border-red-500 bg-red-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className={`p-4 rounded-2xl ${method === 'cod' ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-400'}`}>
                <Wallet className="w-7 h-7" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-black text-xl text-white">Cash on Delivery</h3>
                <p className="text-sm text-gray-400 font-medium">Pay at your doorstep</p>
              </div>
              {method === 'cod' && <CheckCircle2 className="w-7 h-7 text-red-500" />}
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => setMethod('qr')}
              className={`w-full p-8 rounded-[2.5rem] border-2 flex items-center gap-6 transition-all backdrop-blur-xl ${
                method === 'qr' ? 'border-red-500 bg-red-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className={`p-4 rounded-2xl ${method === 'qr' ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-400'}`}>
                <QrCode className="w-7 h-7" />
              </div>
              <div className="text-left flex-1">
                <h3 className="font-black text-xl text-white">Digital QR Payment</h3>
                <p className="text-sm text-gray-400 font-medium">Scan and pay instantly</p>
              </div>
              {method === 'qr' && <CheckCircle2 className="w-7 h-7 text-red-500" />}
            </motion.button>
          </div>

          <AnimatePresence>
            {method === 'qr' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-10 mb-12 text-center shadow-3xl"
              >
                <p className="text-xs font-black text-gray-500 uppercase tracking-[0.3em] mb-8">Scan to Complete Payment</p>
                <div className="max-w-[220px] mx-auto aspect-square bg-white p-6 rounded-3xl flex items-center justify-center border-4 border-red-500/20 mb-8 shadow-2xl">
                  <img 
                    src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=Barozza-Cafe-Payment" 
                    alt="Payment QR Code" 
                    className="w-44 h-44"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <p className="text-gray-400 font-medium leading-relaxed">Secure transaction via BAROZZA-PAY. Use any banking or crypto app to scan.</p>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            disabled={!method || isProcessing}
            onClick={handleConfirm}
            className={`w-full py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-3 shadow-2xl transition-all active:scale-95 ${
              !method ? 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5' : 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/40'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Verifying Transaction...
              </>
            ) : (
              <>
                {method === 'cod' ? 'Finalize Order' : 'Confirm & Pay'}
                <ArrowLeft className="w-6 h-6 rotate-180" />
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
