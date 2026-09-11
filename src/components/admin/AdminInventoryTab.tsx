/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  RotateCcw, 
  ArrowUp, 
  ArrowDown, 
  X, 
  Building2,
  Calendar
} from 'lucide-react';
import { InventoryItem } from '../../types';

interface AdminInventoryTabProps {
  inventory: InventoryItem[];
  onUpdateItem: (item: InventoryItem) => void;
  onAddItem: (item: InventoryItem) => void;
  onDeleteItem: (itemId: string) => void;
  onAdjustStock: (itemId: string, delta: number) => void;
  onResetInventory?: () => void;
}

const CATEGORIES = ['All', 'Dairy', 'Produce', 'Frozen', 'Dry Goods', 'Beverages', 'Oils', 'Packaging', 'Condiments'];
const UNITS = ['kg', 'L', 'packs', 'pcs', 'cans', 'boxes'];

export default function AdminInventoryTab({
  inventory,
  onUpdateItem,
  onAddItem,
  onDeleteItem,
  onAdjustStock,
  onResetInventory,
}: AdminInventoryTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'healthy' | 'critical'>('all');

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('Produce');
  const [formQuantity, setFormQuantity] = useState<number>(10);
  const [formUnit, setFormUnit] = useState('kg');
  const [formMinThreshold, setFormMinThreshold] = useState<number>(5);
  const [formSupplier, setFormSupplier] = useState('');

  const openAddModal = () => {
    setFormName('');
    setFormCategory('Produce');
    setFormQuantity(10);
    setFormUnit('kg');
    setFormMinThreshold(5);
    setFormSupplier('');
    setIsAddModalOpen(true);
  };

  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setFormName(item.name);
    setFormCategory(item.category);
    setFormQuantity(item.quantity);
    setFormUnit(item.unit);
    setFormMinThreshold(item.minThreshold);
    setFormSupplier(item.supplier || '');
  };

  const handleSaveAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: formName.trim(),
      category: formCategory,
      quantity: Number(formQuantity) || 0,
      unit: formUnit,
      minThreshold: Number(formMinThreshold) || 1,
      supplier: formSupplier.trim() || 'Local Distributor',
      lastUpdated: 'Just now',
    };

    onAddItem(newItem);
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingItem || !formName.trim()) return;

    const updated: InventoryItem = {
      ...editingItem,
      name: formName.trim(),
      category: formCategory,
      quantity: Number(formQuantity) || 0,
      unit: formUnit,
      minThreshold: Number(formMinThreshold) || 1,
      supplier: formSupplier.trim() || editingItem.supplier,
      lastUpdated: 'Just now',
    };

    onUpdateItem(updated);
    setEditingItem(null);
  };

  const filteredItems = inventory.filter((item) => {
    const matchesCategory = selectedCategory === 'All' ? true : item.category === selectedCategory;
    const matchesSearch = 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.supplier?.toLowerCase().includes(searchTerm.toLowerCase());

    const isCritical = item.quantity <= 0;
    const isLow = item.quantity <= item.minThreshold && item.quantity > 0;
    const isHealthy = item.quantity > item.minThreshold;

    let matchesStatus = true;
    if (stockStatusFilter === 'critical') matchesStatus = isCritical;
    if (stockStatusFilter === 'low') matchesStatus = isLow;
    if (stockStatusFilter === 'healthy') matchesStatus = isHealthy;

    return matchesCategory && matchesSearch && matchesStatus;
  });

  const lowStockTotal = inventory.filter((i) => i.quantity <= i.minThreshold).length;

  return (
    <div className="space-y-8">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search ingredients, supplies or suppliers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-6 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-all font-medium"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          {onResetInventory && (
            <button
              type="button"
              onClick={onResetInventory}
              className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
              title="Reset inventory to default supplies"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Stock</span>
            </button>
          )}

          <button
            type="button"
            onClick={openAddModal}
            className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-red-900/40 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock Item</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs and Status Badges */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-red-600 text-white shadow-md'
                  : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Status Quick Filters */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStockStatusFilter(stockStatusFilter === 'low' ? 'all' : 'low')}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
              stockStatusFilter === 'low'
                ? 'bg-amber-500 text-black border-amber-400'
                : 'bg-white/5 border-white/10 text-amber-400 hover:bg-amber-500/10'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Low Stock ({lowStockTotal})</span>
          </button>
        </div>
      </div>

      {/* Inventory Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item) => {
            const isCritical = item.quantity <= 0;
            const isLow = item.quantity <= item.minThreshold && item.quantity > 0;
            const isHealthy = item.quantity > item.minThreshold;

            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`p-6 rounded-3xl border transition-all flex flex-col justify-between backdrop-blur-xl ${
                  isCritical
                    ? 'bg-red-950/20 border-red-500/40'
                    : isLow
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : 'bg-white/5 border-white/10 hover:border-white/20'
                }`}
              >
                <div>
                  {/* Category & Status Badges */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 text-gray-300">
                      {item.category}
                    </span>

                    {isCritical ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600/30 text-red-400 border border-red-500/40 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Out of Stock
                      </span>
                    ) : isLow ? (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Low Stock
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        In Stock
                      </span>
                    )}
                  </div>

                  {/* Name and Current Qty */}
                  <h4 className="text-lg font-black text-white tracking-tight mb-2">
                    {item.name}
                  </h4>

                  <div className="p-4 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-between mb-4">
                    <div>
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Current Level
                      </span>
                      <p className="text-2xl font-black text-white tracking-tight">
                        {item.quantity}{' '}
                        <span className="text-sm font-bold text-gray-400">{item.unit}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">
                        Min Threshold
                      </span>
                      <p className="text-sm font-bold text-gray-300">
                        {item.minThreshold} {item.unit}
                      </p>
                    </div>
                  </div>

                  {/* Supplier Info */}
                  <div className="space-y-1 text-xs text-gray-400 font-medium mb-4">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span className="truncate">{item.supplier || 'Local Supplier'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                      <span>Updated {item.lastUpdated || 'Recently'}</span>
                    </div>
                  </div>
                </div>

                {/* Quick Restock Actions */}
                <div className="border-t border-white/5 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-gray-500">
                      Quick Adjust
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => openEditModal(item)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="Edit Item"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingItemId(item.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                        title="Delete Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAdjustStock(item.id, -5)}
                      className="py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-0.5"
                      title="Use 5 units"
                    >
                      <ArrowDown className="w-3 h-3 text-red-400" />
                      <span>-5</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustStock(item.id, -1)}
                      className="py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-0.5"
                      title="Use 1 unit"
                    >
                      <ArrowDown className="w-3 h-3 text-red-400" />
                      <span>-1</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustStock(item.id, 5)}
                      className="py-1.5 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-0.5"
                      title="Restock 5 units"
                    >
                      <ArrowUp className="w-3 h-3 text-emerald-400" />
                      <span>+5</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAdjustStock(item.id, 10)}
                      className="py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-0.5"
                      title="Restock 10 units"
                    >
                      <ArrowUp className="w-3 h-3" />
                      <span>+10</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredItems.length === 0 && (
        <div className="p-16 text-center rounded-3xl bg-white/5 border border-white/10">
          <Package className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h4 className="text-lg font-black text-white mb-1">No Inventory Items Found</h4>
          <p className="text-gray-400 text-xs max-w-sm mx-auto font-medium mb-5">
            No ingredients or supplies matching your search or filters.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase rounded-xl inline-flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock Item</span>
          </button>
        </div>
      )}

      {/* ADD / EDIT MODAL */}
      <AnimatePresence>
        {(isAddModalOpen || editingItem) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-lg bg-neutral-900 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8"
            >
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-white">
                    {editingItem ? 'Edit Stock Item' : 'New Stock Item'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingItem(null);
                  }}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={editingItem ? handleSaveEdit : handleSaveAdd} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Ingredient / Item Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fresh Paneer Block"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/60 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Category *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-neutral-800 border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/60 font-medium"
                    >
                      {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                        <option key={cat} value={cat} className="bg-neutral-900 text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Unit of Measure *
                    </label>
                    <select
                      value={formUnit}
                      onChange={(e) => setFormUnit(e.target.value)}
                      className="w-full bg-neutral-800 border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/60 font-medium"
                    >
                      {UNITS.map((u) => (
                        <option key={u} value={u} className="bg-neutral-900 text-white">
                          {u}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Current Quantity *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={formQuantity}
                      onChange={(e) => setFormQuantity(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/60 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Low Stock Threshold *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      required
                      value={formMinThreshold}
                      onChange={(e) => setFormMinThreshold(Number(e.target.value))}
                      className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/60 font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Distributor / Supplier Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Amul Dairy Logistics Hub"
                    value={formSupplier}
                    onChange={(e) => setFormSupplier(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/60 font-medium"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingItem(null);
                    }}
                    className="px-5 py-3 rounded-2xl text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-red-900/40 cursor-pointer transition-all active:scale-95"
                  >
                    {editingItem ? 'Save Updates' : 'Add Item'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE MODAL */}
      <AnimatePresence>
        {deletingItemId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-neutral-900 border border-white/15 rounded-3xl p-6 shadow-2xl text-center"
            >
              <div className="w-12 h-12 rounded-2xl bg-red-600/20 text-red-500 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-white mb-2">Delete Inventory Item?</h3>
              <p className="text-gray-400 text-xs font-medium mb-6">
                Are you sure you want to remove this item from the cafe inventory register?
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingItemId(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteItem(deletingItemId);
                    setDeletingItemId(null);
                  }}
                  className="px-5 py-2.5 rounded-xl bg-red-600 text-white text-xs font-black uppercase tracking-wider hover:bg-red-500 transition-colors shadow-lg shadow-red-900/40 cursor-pointer"
                >
                  Confirm Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
