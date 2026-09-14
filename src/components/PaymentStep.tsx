/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CreditCard, Wallet, QrCode, CheckCircle2, ArrowLeft, Loader2, LogIn, ShieldCheck, Zap } from 'lucide-react';
import { useFirebase } from './FirebaseProvider';
import { UserAddress } from '../types';
import { RAZORPAY_KEY_ID, loadRazorpayScript } from '../lib/razorpay';

interface PaymentStepProps {
  onBack: () => void;
  onConfirm: (paymentInfo?: { method: 'cod' | 'qr' | 'razorpay'; paymentId?: string }) => void;
  totalPrice: number;
  userAddress?: UserAddress | null;
  dishName?: string;
  quantity?: number;
}

export default function PaymentStep({ onBack, onConfirm, totalPrice, userAddress, dishName, quantity = 1 }: PaymentStepProps) {
  const { user, signInWithGoogle, isSigningIn } = useFirebase();
  const [method, setMethod] = useState<'razorpay' | 'cod'>('razorpay');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const triggerRazorpayPayment = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    const isLoaded = await loadRazorpayScript();
    if (!isLoaded || !window.Razorpay) {
      setIsProcessing(false);
      setErrorMessage('Unable to initialize Razorpay Live gateway. Please check your internet connection and try again.');
      return;
    }

    try {
      const options = {
        key: RAZORPAY_KEY_ID,
        amount: Math.round(totalPrice * 100), // in paise
        currency: 'INR',
        name: 'The Barozza Cafe',
        description: dishName ? `${dishName} (x${quantity}) - Fresh Cafe Order` : 'Artisanal Cafe Order Payment',
        image: '/images/frenchh.png',
        prefill: {
          name: userAddress?.name || user?.displayName || '',
          email: user?.email || '',
          contact: userAddress?.phone || '',
        },
        theme: {
          color: '#DC2626', // Barozza crimson
          backdrop_color: 'rgba(0,0,0,0.85)',
        },
        notes: {
          address: userAddress?.address || '',
          cafe: 'The Barozza Cafe',
          environment: 'Live Production',
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
        handler: (response: { razorpay_payment_id: string; razorpay_order_id?: string; razorpay_signature?: string }) => {
          setIsProcessing(false);
          onConfirm({
            method: 'razorpay',
            paymentId: response.razorpay_payment_id,
          });
        },
      };

      const rzpInstance = new window.Razorpay(options);
      rzpInstance.on('payment.failed', function (response: any) {
        setIsProcessing(false);
        setErrorMessage(response.error?.description || 'Payment was unsuccessful. Please try again with another UPI app, card, or method.');
      });

      rzpInstance.open();
    } catch (err: any) {
      setIsProcessing(false);
      setErrorMessage(err.message || 'Payment initialization failed. Please try again.');
    }
  };

  const handleConfirm = () => {
    if (method === 'razorpay') {
      triggerRazorpayPayment();
      return;
    }

    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onConfirm({ method: 'cod' });
    }, 1200);
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-6 sm:py-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-6 transition-colors font-bold text-xs sm:text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Details
      </button>

      <div className="mb-6">
        <h2 className="text-2xl sm:text-3xl font-black text-white mb-1 tracking-tight">Payment</h2>
        <p className="text-gray-400 text-xs sm:text-sm font-medium">Choose your preferred way to settle the tab.</p>
      </div>

      <div className="bg-red-600 text-white px-6 py-5 rounded-2xl mb-6 flex justify-between items-center overflow-hidden relative shadow-xl shadow-red-900/25 border border-red-500">
        <div className="relative z-10">
          <p className="text-red-200 text-[10px] font-black uppercase tracking-widest mb-0.5">Total Amount</p>
          <p className="text-3xl font-black tracking-tighter">₹{totalPrice.toFixed(2)}</p>
        </div>
        <CreditCard className="w-20 h-20 text-white/10 absolute -right-4 -bottom-4 rotate-12" />
      </div>

      {!user ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white/5 backdrop-blur-3xl border border-white/10 rounded-2xl p-6 mb-6 text-center shadow-2xl"
        >
          <LogIn className="w-10 h-10 text-red-500 mx-auto mb-4" />
          <h3 className="text-xl font-black text-white mb-2">Authentication Required</h3>
          <p className="text-gray-400 text-xs sm:text-sm font-medium leading-relaxed mb-6">Please sign in with Google to securely place your order and track its progress.</p>
          <button
            onClick={signInWithGoogle}
            disabled={isSigningIn}
            className="w-full py-3 bg-white text-black font-black text-sm rounded-xl hover:bg-gray-200 transition-all shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isSigningIn ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : null}
            <span>{isSigningIn ? 'Connecting to Google...' : 'Sign In with Google'}</span>
          </button>
        </motion.div>
      ) : (
        <>
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2.5">
              <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
              <p className="flex-1">{errorMessage}</p>
            </div>
          )}

          <div className="space-y-3 mb-6">
            {/* UPI & Online Payment Option */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                setMethod('razorpay');
                setErrorMessage(null);
              }}
              className={`w-full p-4 sm:p-5 rounded-2xl border-2 flex items-center gap-4 transition-all backdrop-blur-xl relative overflow-hidden ${
                method === 'razorpay' ? 'border-red-500 bg-red-500/10 shadow-lg shadow-red-950/30' : 'border-white/5 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className={`p-3 rounded-xl shrink-0 ${method === 'razorpay' ? 'bg-red-600 text-white shadow-md shadow-red-900/50' : 'bg-white/10 text-gray-400'}`}>
                <QrCode className="w-5 h-5" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-0.5">
                  <h3 className="font-black text-base text-white">UPI & Online Payment</h3>
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    INSTANT UPI
                  </span>
                </div>
                <p className="text-xs text-gray-300 font-medium">GPay, PhonePe, Paytm, BHIM UPI, Cards & NetBanking</p>
              </div>
              {method === 'razorpay' && <CheckCircle2 className="w-5 h-5 text-red-500 shrink-0" />}
            </motion.button>

            {/* Cash On Delivery Option */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => {
                setMethod('cod');
                setErrorMessage(null);
              }}
              className={`w-full p-4 sm:p-5 rounded-2xl border-2 flex items-center gap-4 transition-all backdrop-blur-xl ${
                method === 'cod' ? 'border-red-500 bg-red-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'
              }`}
            >
              <div className={`p-3 rounded-xl shrink-0 ${method === 'cod' ? 'bg-red-600 text-white' : 'bg-white/10 text-gray-400'}`}>
                <Wallet className="w-5 h-5" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <h3 className="font-black text-base text-white">Cash on Delivery</h3>
                <p className="text-xs text-gray-400 font-medium">Pay at your doorstep upon parcel arrival</p>
              </div>
              {method === 'cod' && <CheckCircle2 className="w-5 h-5 text-red-500 shrink-0" />}
            </motion.button>
          </div>

          {/* Razorpay details box removed */}

          <button
            disabled={!method || isProcessing}
            onClick={handleConfirm}
            className={`w-full py-4 rounded-xl font-black text-base flex items-center justify-center gap-2.5 shadow-xl transition-all active:scale-95 cursor-pointer ${
              !method ? 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5' : 'bg-red-600 text-white hover:bg-red-700 shadow-red-900/40'
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing Gateway...
              </>
            ) : (
              <>
                {method === 'razorpay' ? (
                  `Pay ₹${totalPrice.toFixed(2)} with UPI`
                ) : (
                  'Place Order (Cash on Delivery)'
                )}
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </>
            )}
          </button>
        </>
      )}
    </div>
  );
}
