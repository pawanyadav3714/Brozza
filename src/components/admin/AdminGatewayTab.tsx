/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, type FormEvent } from 'react';
import { motion } from 'motion/react';
import { 
  Key, 
  Lock, 
  Eye, 
  EyeOff, 
  Check, 
  RotateCcw, 
  ShieldCheck, 
  AlertCircle, 
  Copy, 
  Zap, 
  ExternalLink,
  Code2
} from 'lucide-react';
import { 
  getRazorpayKeyId, 
  getRazorpayKeySecret, 
  setCustomRazorpayCredentials, 
  resetCustomRazorpayCredentials,
  DEFAULT_RAZORPAY_KEY_ID,
  DEFAULT_RAZORPAY_KEY_SECRET,
  RAZORPAY_KEY_ID_PLACEHOLDER,
  RAZORPAY_KEY_SECRET_PLACEHOLDER,
  getStoredCustomCredentials
} from '../../lib/razorpay';

export default function AdminGatewayTab() {
  const initial = getStoredCustomCredentials();
  const [keyId, setKeyId] = useState(initial.hasCustom ? initial.keyId : getRazorpayKeyId());
  const [keySecret, setKeySecret] = useState(initial.hasCustom ? initial.keySecret : getRazorpayKeySecret());
  const [showSecret, setShowSecret] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const activeKeyId = keyId.trim() || DEFAULT_RAZORPAY_KEY_ID;
  const isTestMode = activeKeyId.startsWith('rzp_test');
  const isLiveMode = activeKeyId.startsWith('rzp_live');

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setCustomRazorpayCredentials(keyId, keySecret);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleReset = () => {
    resetCustomRazorpayCredentials();
    setKeyId(DEFAULT_RAZORPAY_KEY_ID);
    setKeySecret(DEFAULT_RAZORPAY_KEY_SECRET);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Status Overview */}
      <div className="p-6 rounded-3xl bg-neutral-900/90 border border-white/10 backdrop-blur-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isTestMode ? 'bg-amber-400 animate-pulse' : isLiveMode ? 'bg-emerald-400 animate-pulse' : 'bg-blue-400'}`} />
              <h2 className="text-lg font-black text-white tracking-tight">Payment API Gateway Configuration</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                isTestMode 
                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' 
                  : isLiveMode 
                  ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                  : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
              }`}>
                {isTestMode ? 'Razorpay Test Mode' : isLiveMode ? 'Razorpay Live Production' : 'Custom Gateway'}
              </span>
            </div>
            <p className="text-xs text-gray-400">
              Configure or change your Razorpay API Key ID and Key Secret credentials. Changes take effect instantly across customer checkout.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <a
              href="https://dashboard.razorpay.com/app/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-bold transition-all cursor-pointer"
            >
              <span>Razorpay Dashboard</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Main Settings Form */}
      <div className="p-6 sm:p-8 rounded-3xl bg-neutral-900/80 border border-white/10 backdrop-blur-xl space-y-6">
        <form onSubmit={handleSave} className="space-y-6">
          {/* Key ID Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="razorpay-key-id" className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Key className="w-4 h-4 text-red-500" />
                <span>Razorpay API Key ID</span>
              </label>
              <button
                type="button"
                onClick={() => copyToClipboard(keyId || DEFAULT_RAZORPAY_KEY_ID, 'keyId')}
                className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" />
                <span>{copiedField === 'keyId' ? 'Copied!' : 'Copy Key'}</span>
              </button>
            </div>
            <div className="relative">
              <input
                id="razorpay-key-id"
                type="text"
                value={keyId}
                onChange={(e) => setKeyId(e.target.value)}
                placeholder={RAZORPAY_KEY_ID_PLACEHOLDER}
                className="w-full px-4 py-3.5 rounded-2xl bg-black/60 border border-white/15 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-white font-mono text-sm placeholder:text-gray-600 transition-all outline-none"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
              <span>Placeholder format: <code className="text-red-400 font-mono">rzp_test_...</code> or <code className="text-emerald-400 font-mono">rzp_live_...</code></span>
              <span>Default: <code className="text-gray-300 font-mono">{DEFAULT_RAZORPAY_KEY_ID}</code></span>
            </div>
          </div>

          {/* Key Secret Field */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="razorpay-key-secret" className="text-xs font-black uppercase tracking-wider text-gray-300 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-500" />
                <span>Razorpay Key Secret</span>
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSecret(!showSecret)}
                  className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  {showSecret ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showSecret ? 'Hide Secret' : 'Reveal Secret'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => copyToClipboard(keySecret || DEFAULT_RAZORPAY_KEY_SECRET, 'keySecret')}
                  className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedField === 'keySecret' ? 'Copied!' : 'Copy Secret'}</span>
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                id="razorpay-key-secret"
                type={showSecret ? 'text' : 'password'}
                value={keySecret}
                onChange={(e) => setKeySecret(e.target.value)}
                placeholder={RAZORPAY_KEY_SECRET_PLACEHOLDER}
                className="w-full px-4 py-3.5 rounded-2xl bg-black/60 border border-white/15 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-white font-mono text-sm placeholder:text-gray-600 transition-all outline-none"
              />
            </div>
            <div className="flex items-center justify-between text-[11px] text-gray-400 px-1">
              <span>Used for server-side verification and webhook signature validation</span>
              <span>Default: <code className="text-gray-300 font-mono">••••••••••••••••••••••••</code></span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10">
            <button
              type="button"
              onClick={handleReset}
              className="w-full sm:w-auto px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/10 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to Default Credentials</span>
            </button>

            <button
              type="submit"
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-red-900/50 transition-all cursor-pointer"
            >
              {saveSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Saved Successfully!</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Apply & Save Credentials</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Copyable Environment File Placeholder Template */}
      <div className="p-6 rounded-3xl bg-black/60 border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-300">
            <Code2 className="w-4 h-4 text-emerald-400" />
            <span>.env / .env.example Placeholders Template</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const snippet = `VITE_RAZORPAY_KEY_ID="${keyId.trim() || 'YOUR_RAZORPAY_KEY_ID'}"\nRAZORPAY_KEY_SECRET="${keySecret.trim() || 'YOUR_RAZORPAY_KEY_SECRET'}"\nVITE_RAZORPAY_KEY_SECRET="${keySecret.trim() || 'YOUR_RAZORPAY_KEY_SECRET'}"`;
              copyToClipboard(snippet, 'envSnippet');
            }}
            className="text-[11px] text-gray-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Copy className="w-3 h-3" />
            <span>{copiedField === 'envSnippet' ? 'Copied Snippet!' : 'Copy .env Snippet'}</span>
          </button>
        </div>

        <pre className="p-4 rounded-2xl bg-neutral-950 border border-white/5 font-mono text-xs text-gray-300 overflow-x-auto select-all leading-relaxed">
{`# Client-side Razorpay API Key ID Placeholder
VITE_RAZORPAY_KEY_ID="${keyId.trim() || 'YOUR_RAZORPAY_KEY_ID'}"

# Server-side Razorpay Key Secret Placeholder
RAZORPAY_KEY_SECRET="${keySecret.trim() || 'YOUR_RAZORPAY_KEY_SECRET'}"
VITE_RAZORPAY_KEY_SECRET="${keySecret.trim() || 'YOUR_RAZORPAY_KEY_SECRET'}"`}
        </pre>
      </div>
    </div>
  );
}
