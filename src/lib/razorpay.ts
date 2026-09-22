/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id?: string;
  razorpay_signature?: string;
}

export interface RazorpayOptions {
  key: string;
  amount: number; // in paise
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  notes?: Record<string, string>;
  theme?: {
    color?: string;
    backdrop_color?: string;
  };
  modal?: {
    ondismiss?: () => void;
    confirm_close?: boolean;
  };
  handler: (response: RazorpayResponse) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void;
      on: (event: string, callback: (response: any) => void) => void;
    };
  }
}

// Standard Placeholders for Razorpay Gateway
export const RAZORPAY_KEY_ID_PLACEHOLDER = 'rzp_test_YourKeyIdHere or rzp_live_YourKeyIdHere';
export const RAZORPAY_KEY_SECRET_PLACEHOLDER = 'YourRazorpayKeySecretHere';

// Default / fallback keys
export const DEFAULT_RAZORPAY_KEY_ID =
  (import.meta.env.VITE_RAZORPAY_KEY_ID as string) || 'rzp_live_TeyRNELrfR4056';
export const DEFAULT_RAZORPAY_KEY_SECRET =
  (import.meta.env.VITE_RAZORPAY_KEY_SECRET as string) || '67eRGkZC4X7ADxg3pVBWHlMn';

const STORAGE_KEY_ID = 'barozza_custom_razorpay_key_id';
const STORAGE_KEY_SECRET = 'barozza_custom_razorpay_key_secret';

export function getRazorpayKeyId(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(STORAGE_KEY_ID);
    if (custom && custom.trim()) return custom.trim();
  }
  return DEFAULT_RAZORPAY_KEY_ID;
}

export function getRazorpayKeySecret(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem(STORAGE_KEY_SECRET);
    if (custom && custom.trim()) return custom.trim();
  }
  return DEFAULT_RAZORPAY_KEY_SECRET;
}

export function setCustomRazorpayCredentials(keyId: string, keySecret: string): void {
  if (typeof window !== 'undefined') {
    if (keyId.trim()) {
      localStorage.setItem(STORAGE_KEY_ID, keyId.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_ID);
    }
    if (keySecret.trim()) {
      localStorage.setItem(STORAGE_KEY_SECRET, keySecret.trim());
    } else {
      localStorage.removeItem(STORAGE_KEY_SECRET);
    }
  }
}

export function resetCustomRazorpayCredentials(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(STORAGE_KEY_ID);
    localStorage.removeItem(STORAGE_KEY_SECRET);
  }
}

export function getStoredCustomCredentials(): { keyId: string; keySecret: string; hasCustom: boolean } {
  if (typeof window !== 'undefined') {
    const keyId = localStorage.getItem(STORAGE_KEY_ID) || '';
    const keySecret = localStorage.getItem(STORAGE_KEY_SECRET) || '';
    return {
      keyId,
      keySecret,
      hasCustom: Boolean(keyId || keySecret),
    };
  }
  return { keyId: '', keySecret: '', hasCustom: false };
}

// Deprecated export maintained for backward compatibility
export const RAZORPAY_KEY_ID = getRazorpayKeyId();
export const RAZORPAY_KEY_SECRET = getRazorpayKeySecret();

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}
