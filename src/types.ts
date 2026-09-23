/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Dish {
  id: string;
  name: string;
  price: number;
  image: string;
  description: string;
  category: string;
  available?: boolean;
}

export interface CartItem extends Dish {
  quantity: number;
}

export interface UserAddress {
  id: string;
  name: string;
  phone: string;
  address: string;
}

export type AppStep = 'menu' | 'checkout' | 'payment' | 'success' | 'admin';

export type OrderStatus = 
  | 'idle' 
  | 'ordered' 
  | 'preparing' 
  | 'en_route' 
  | 'delivered'
  | 'Pending'
  | 'Received'
  | 'Processing'
  | 'Out For_delivery'
  | 'Delivered'
  | 'pending'
  | 'received'
  | 'processing'
  | 'out_for_delivery';

export type PipelineStage = 'Pending' | 'Received' | 'Processing' | 'Out For_delivery' | 'Delivered';

export interface Order {
  id: string;
  userId: string;
  dishId: string;
  dishName: string;
  dishImage?: string;
  quantity: number;
  totalPrice: number;
  status: OrderStatus;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  paymentMethod?: 'cod' | 'qr' | 'razorpay';
  paymentId?: string;
  paymentStatus?: 'paid' | 'pending' | 'failed';
  createdAt: any;
  updatedAt: any;
  // Enhanced Parcel & Dispatch synchronization
  parcelId?: string;
  trackingNumber?: string;
  parcelType?: string;
  parcelWeight?: string;
  parcelStatus?: string;
  destinationLocation?: string;
  deliveryNotes?: string;
  syncedToFirebase?: boolean;
  syncedAt?: any;
  externalAdminUrl?: string;
  batchId?: string;
  batchCount?: number;
  batchTotal?: number;
}

export interface ParcelInfo {
  id: string;
  parcelId: string;
  orderId: string;
  userId: string;
  recipientName: string;
  recipientPhone: string;
  destination: string;
  parcelType: string;
  parcelWeight: string;
  parcelStatus: 'booked' | 'preparing' | 'dispatched' | 'in_transit' | 'delivered';
  itemsSummary: string;
  totalValue: number;
  pickupLocation: string;
  estimatedDeliveryMinutes: number;
  syncedToFirebase: boolean;
  createdAt: any;
  updatedAt: any;
  externalAdminUrl?: string;
}

export type AdminTab = 'overview' | 'orders' | 'menu' | 'inventory' | 'gateway';

export interface InventoryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minThreshold: number;
  supplier: string;
  lastUpdated: string;
}
