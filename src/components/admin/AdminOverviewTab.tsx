/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion } from 'motion/react';
import { 
  DollarSign, 
  ShoppingBag, 
  Utensils, 
  AlertTriangle, 
  ExternalLink, 
  ArrowUpRight, 
  Clock, 
  ChefHat, 
  CheckCircle2, 
  TrendingUp,
  Package,
  Key
} from 'lucide-react';
import { Dish, Order, InventoryItem, AdminTab } from '../../types';

interface AdminOverviewTabProps {
  orders: Order[];
  dishes: Dish[];
  inventory: InventoryItem[];
  onSelectTab: (tab: AdminTab) => void;
}

export default function AdminOverviewTab({
  orders,
  dishes,
  inventory,
  onSelectTab,
}: AdminOverviewTabProps) {
  // Compute Key Metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.totalPrice || 0), 0);
  const activeOrders = orders.filter(o => o.status === 'ordered' || o.status === 'preparing' || o.status === 'en_route');
  const deliveredOrders = orders.filter(o => o.status === 'delivered');
  const availableDishesCount = dishes.filter(d => d.available !== false).length;
  
  const lowStockItems = inventory.filter(item => item.quantity <= item.minThreshold);
  const criticalItems = inventory.filter(item => item.quantity <= 0);

  const STUDIO_APP_URL = "https://brozza-admin.vercel.app/";

  return (
    <div className="space-y-8">
      {/* Top Banner Alert if low stock exists */}
      {lowStockItems.length > 0 && (
        <div className="p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-white font-bold text-sm">
                Supply Alert: {lowStockItems.length} ingredient{lowStockItems.length > 1 ? 's' : ''} running low
              </p>
              <p className="text-gray-400 text-xs mt-0.5">
                {lowStockItems.map(i => i.name).slice(0, 3).join(', ')}
                {lowStockItems.length > 3 ? ` and ${lowStockItems.length - 3} more` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectTab('inventory')}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl transition-all cursor-pointer whitespace-nowrap shadow-lg"
          >
            Review Inventory
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1: Revenue */}
        <motion.div 
          whileHover={{ y: -3 }}
          className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Total Revenue</span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">₹{totalRevenue.toFixed(2)}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-emerald-400">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Across {orders.length} order{orders.length === 1 ? '' : 's'}</span>
          </div>
        </motion.div>

        {/* Metric 2: Active Orders */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={() => onSelectTab('orders')}
          className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden cursor-pointer hover:border-red-500/30 transition-all group"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Live Kitchen Queue</span>
            <div className="w-10 h-10 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ChefHat className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{activeOrders.length}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-amber-400">
            <Clock className="w-3.5 h-3.5" />
            <span>{deliveredOrders.length} completed today</span>
          </div>
        </motion.div>

        {/* Metric 3: Active Dishes */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={() => onSelectTab('menu')}
          className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden cursor-pointer hover:border-blue-500/30 transition-all group"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Menu Catalog</span>
            <div className="w-10 h-10 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Utensils className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{availableDishesCount}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-gray-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
            <span>{dishes.length} total items listed</span>
          </div>
        </motion.div>

        {/* Metric 4: Inventory Health */}
        <motion.div 
          whileHover={{ y: -3 }}
          onClick={() => onSelectTab('inventory')}
          className="p-6 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl relative overflow-hidden cursor-pointer hover:border-amber-500/30 transition-all group"
        >
          <div className="flex justify-between items-start mb-4">
            <span className="text-xs font-black uppercase tracking-widest text-gray-400">Inventory Items</span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <p className="text-3xl font-black text-white tracking-tight">{inventory.length}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-gray-400">
            {lowStockItems.length > 0 ? (
              <span className="text-amber-400 font-bold">{lowStockItems.length} require restock</span>
            ) : (
              <span className="text-emerald-400 font-bold">All stock optimal</span>
            )}
          </div>
        </motion.div>
      </div>

      {/* External Admin Portal Link Callout */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-red-950/40 via-neutral-900/60 to-black/80 border border-red-500/30 backdrop-blur-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-red-400 text-xs font-black uppercase tracking-widest">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span>Dedicated Admin Portal (Vercel)</span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Brozza Admin Portal — brozza-admin.vercel.app
          </h3>
          <p className="text-gray-300 text-sm max-w-xl font-medium leading-relaxed">
            All customer orders, dispatch parcels, and kitchen updates sync to Firebase Firestore so your dedicated admin portal receives live data continuously.
          </p>
        </div>
        <a
          href={STUDIO_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-6 py-3.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs uppercase tracking-wider rounded-2xl flex items-center gap-2 shadow-lg shadow-red-900/40 transition-all hover:scale-105 active:scale-95 cursor-pointer whitespace-nowrap border border-red-400/40"
        >
          <span>Open Brozza Admin Site</span>
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {/* Quick Ops Jump Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Orders */}
        <div 
          onClick={() => onSelectTab('orders')}
          className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-red-500/40 hover:bg-white/10 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform">
              <ShoppingBag className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2 group-hover:text-red-400 transition-colors">
              Order Tracking
            </h4>
            <p className="text-gray-400 text-xs leading-relaxed font-medium mb-4">
              Real-time customer order pipeline. Transition orders from kitchen preparation to delivery in 1 click.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs font-black text-red-400 uppercase tracking-wider pt-4 border-t border-white/5">
            <span>{activeOrders.length} Active Orders</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </div>
        </div>

        {/* Card 2: Menu Items */}
        <div 
          onClick={() => onSelectTab('menu')}
          className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-blue-500/40 hover:bg-white/10 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform">
              <Utensils className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
              Menu Item Updates
            </h4>
            <p className="text-gray-400 text-xs leading-relaxed font-medium mb-4">
              Add new dishes, update pricing, change descriptions, and toggle in-stock availability instantly.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs font-black text-blue-400 uppercase tracking-wider pt-4 border-t border-white/5">
            <span>{dishes.length} Menu Dishes</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </div>
        </div>

        {/* Card 3: Inventory */}
        <div 
          onClick={() => onSelectTab('inventory')}
          className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-amber-500/40 hover:bg-white/10 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-amber-600/20 text-amber-400 flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform">
              <Package className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2 group-hover:text-amber-400 transition-colors">
              Inventory Management
            </h4>
            <p className="text-gray-400 text-xs leading-relaxed font-medium mb-4">
              Track raw ingredients, dairy, fries, packaging, and receive automatic warnings when stock falls low.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs font-black text-amber-400 uppercase tracking-wider pt-4 border-t border-white/5">
            <span>{inventory.length} Stock Supplies</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </div>
        </div>

        {/* Card 4: Payment Gateway API */}
        <div 
          onClick={() => onSelectTab('gateway')}
          className="p-6 rounded-3xl bg-white/5 border border-white/10 hover:border-emerald-500/40 hover:bg-white/10 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform">
              <Key className="w-6 h-6" />
            </div>
            <h4 className="text-xl font-bold text-white mb-2 group-hover:text-emerald-400 transition-colors">
              Payment Gateway API
            </h4>
            <p className="text-gray-400 text-xs leading-relaxed font-medium mb-4">
              Configure Razorpay API Key ID, Key Secret, test/live mode status, and credentials placeholders.
            </p>
          </div>
          <div className="flex items-center justify-between text-xs font-black text-emerald-400 uppercase tracking-wider pt-4 border-t border-white/5">
            <span>API & Credentials</span>
            <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
          </div>
        </div>
      </div>
    </div>
  );
}
