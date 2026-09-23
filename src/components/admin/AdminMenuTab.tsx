/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  XCircle, 
  Utensils, 
  RotateCcw,
  Sparkles,
  DollarSign,
  X,
  Minus,
  Boxes,
  Layers,
  AlertTriangle
} from 'lucide-react';
import { Dish } from '../../types';

interface AdminMenuTabProps {
  dishes: Dish[];
  onUpdateDish: (updatedDish: Dish) => void;
  onAddDish: (newDish: Dish) => void;
  onDeleteDish: (dishId: string) => void;
  onToggleDishAvailability: (dishId: string) => void;
  onResetDishes: () => void;
  onUpdateDishQuantity?: (dishId: string, quantity: number) => void;
}

const PRESET_IMAGES = [
  { label: 'French Fries', url: '/images/frenchh.png' },
  { label: 'Veg Chow Mein', url: '/images/chow.png' },
  { label: 'Egg Chow Mein', url: '/images/eggchowminn.png' },
  { label: 'Creamy Pasta', url: '/images/pastaa.png' },
  { label: 'Paneer Chilli', url: '/images/paneerchili.png' },
  { label: 'Steamed Momos', url: '/images/momos.png' },
  { label: 'Fried Momos', url: '/images/fried.png' },
  { label: 'Baby Corn Chilli', url: '/images/babycornchili.png' },
  { label: 'Mushroom Chilli', url: '/images/masroomchili.png' },
  { label: 'Veg Manchurian', url: '/images/menchurian.png' },
  { label: 'Veg Roll', url: '/images/vegrol.png' },
  { label: 'Egg Roll', url: '/images/eggrol.png' },
];

const CATEGORIES = ['Starters', 'Chinese', 'Italian', 'Rolls', 'Beverages', 'Desserts', 'Main Course'];

export default function AdminMenuTab({
  dishes,
  onUpdateDish,
  onAddDish,
  onDeleteDish,
  onToggleDishAvailability,
  onResetDishes,
  onUpdateDishQuantity,
}: AdminMenuTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const allCategories = ['All', ...Array.from(new Set([...CATEGORIES, ...dishes.map((d) => d.category).filter(Boolean)]))];
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [deletingDishId, setDeletingDishId] = useState<string | null>(null);

  // Form states for Add / Edit
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState<number>(50);
  const [formCategory, setFormCategory] = useState('Starters');
  const [formDescription, setFormDescription] = useState('');
  const [formImage, setFormImage] = useState('/images/frenchh.png');
  const [formAvailable, setFormAvailable] = useState(true);
  const [formQuantityAvailable, setFormQuantityAvailable] = useState<number>(20);

  // Direct stock modifier handler for fast live editing
  const handleDirectStockChange = (dish: Dish, newStock: number) => {
    const safeStock = Math.max(0, Math.floor(newStock));
    const isNowAvailable = safeStock > 0;
    
    if (onUpdateDishQuantity) {
      onUpdateDishQuantity(dish.id, safeStock);
    } else {
      const updated: Dish = {
        ...dish,
        quantityAvailable: safeStock,
        available: isNowAvailable,
      };
      onUpdateDish(updated);
    }
  };

  const openAddModal = () => {
    setFormName('');
    setFormPrice(50);
    setFormCategory('Starters');
    setFormDescription('');
    setFormImage('/images/frenchh.png');
    setFormAvailable(true);
    setFormQuantityAvailable(20);
    setIsAddModalOpen(true);
  };

  const openEditModal = (dish: Dish) => {
    setEditingDish(dish);
    setFormName(dish.name);
    setFormPrice(dish.price);
    setFormCategory(dish.category || 'Starters');
    setFormDescription(dish.description);
    setFormImage(dish.image);
    setFormAvailable(dish.available !== false && (dish.quantityAvailable === undefined || dish.quantityAvailable > 0));
    setFormQuantityAvailable(dish.quantityAvailable ?? (dish.available === false ? 0 : 20));
  };

  const handleSaveAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    const stock = Math.max(0, Math.floor(Number(formQuantityAvailable) || 0));
    const newDish: Dish = {
      id: `dish-${Date.now()}`,
      name: formName.trim(),
      price: Number(formPrice) || 0,
      category: formCategory,
      description: formDescription.trim() || 'Freshly prepared specialty dish.',
      image: formImage.trim() || '/images/frenchh.png',
      available: formAvailable && stock > 0,
      quantityAvailable: stock,
    };

    onAddDish(newDish);
    setIsAddModalOpen(false);
  };

  const handleSaveEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!editingDish || !formName.trim()) return;

    const stock = Math.max(0, Math.floor(Number(formQuantityAvailable) || 0));
    const updated: Dish = {
      ...editingDish,
      name: formName.trim(),
      price: Number(formPrice) || 0,
      category: formCategory,
      description: formDescription.trim(),
      image: formImage.trim() || editingDish.image,
      available: formAvailable && stock > 0,
      quantityAvailable: stock,
    };

    onUpdateDish(updated);
    setEditingDish(null);
  };

  const filteredDishes = dishes.filter((dish) => {
    const matchesCategory = selectedCategory === 'All' ? true : dish.category === selectedCategory;
    const matchesSearch = 
      dish.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dish.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      dish.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
          <input
            type="text"
            placeholder="Search menu items by name, category or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-6 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-500/50 transition-all font-medium"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            type="button"
            onClick={onResetDishes}
            className="px-4 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 text-xs font-bold transition-all flex items-center gap-2 cursor-pointer"
            title="Reset menu to default items"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={openAddModal}
            className="px-5 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-red-900/40 cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Dish</span>
          </button>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4">
        {allCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-black tracking-wide transition-all cursor-pointer ${
              selectedCategory === cat
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/30'
                : 'bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Dishes Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredDishes.map((dish, dishIdx) => {
            const isAvailable = dish.available !== false;
            return (
              <motion.div
                key={`admin-dish-${dish.id}-${dishIdx}`}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={`rounded-3xl border transition-all overflow-hidden flex flex-col justify-between ${
                  isAvailable 
                    ? 'bg-white/5 border-white/10 hover:border-white/20' 
                    : 'bg-neutral-900/50 border-red-500/20 opacity-80'
                }`}
              >
                <div>
                  {/* Image & Quick Badge */}
                  <div className="relative aspect-[16/10] overflow-hidden bg-neutral-900">
                    <img
                      src={dish.image}
                      alt={dish.name}
                      className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
                        !isAvailable ? 'grayscale-[50%]' : ''
                      }`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/images/frenchh.png';
                      }}
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/60 backdrop-blur-md text-white border border-white/20">
                        {dish.category || 'General'}
                      </span>
                    </div>
                    <div className="absolute top-4 right-4">
                      <button
                        type="button"
                        onClick={() => onToggleDishAvailability(dish.id)}
                        className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-lg backdrop-blur-md cursor-pointer transition-all ${
                          isAvailable
                            ? 'bg-emerald-600/90 hover:bg-emerald-600 text-white'
                            : 'bg-red-600/90 hover:bg-red-600 text-white ring-2 ring-red-400/50'
                        }`}
                        title="Click to toggle availability"
                      >
                        {isAvailable ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" />
                            <span>In Stock</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" />
                            <span>Sold Out</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-xl font-black text-white tracking-tight leading-snug">
                        {dish.name}
                      </h4>
                      <span className="text-xl font-black text-red-400 whitespace-nowrap">
                        ₹{dish.price.toFixed(2)}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed font-medium">
                      {dish.description}
                    </p>
                  </div>

                  {/* Quantity Available / Stock Controller */}
                  <div className="mx-6 mb-4 p-3.5 rounded-2xl bg-black/40 border border-white/10 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold">
                        <Boxes className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-gray-300">Quantity Available:</span>
                      </div>
                      <div>
                        {dish.quantityAvailable === 0 || !isAvailable ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600/30 text-red-400 border border-red-500/30">
                            Sold Out (0)
                          </span>
                        ) : (dish.quantityAvailable ?? 20) <= 5 ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Low ({dish.quantityAvailable} left)
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            In Stock ({dish.quantityAvailable ?? 20})
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Quick Stepper + Direct Editable Number Input */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center flex-1 bg-white/5 border border-white/10 rounded-xl overflow-hidden focus-within:border-red-500/50">
                        <button
                          type="button"
                          onClick={() => {
                            const current = dish.quantityAvailable ?? (isAvailable ? 20 : 0);
                            handleDirectStockChange(dish, Math.max(0, current - 1));
                          }}
                          className="px-3 py-1.5 hover:bg-white/10 text-red-400 hover:text-white transition-colors cursor-pointer"
                          title="Decrease quantity by 1"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        <input
                          type="number"
                          min="0"
                          value={dish.quantityAvailable !== undefined ? dish.quantityAvailable : (isAvailable ? 20 : 0)}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            handleDirectStockChange(dish, isNaN(val) ? 0 : Math.max(0, val));
                          }}
                          className="w-full text-center bg-transparent text-sm font-black text-white focus:outline-none py-1.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          title="Click to manually edit available portions (Live customer sync)"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const current = dish.quantityAvailable ?? (isAvailable ? 20 : 0);
                            handleDirectStockChange(dish, current + 1);
                          }}
                          className="px-3 py-1.5 hover:bg-white/10 text-emerald-400 hover:text-white transition-colors cursor-pointer"
                          title="Increase quantity by 1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Quick Preset Buttons */}
                      <button
                        type="button"
                        onClick={() => handleDirectStockChange(dish, 0)}
                        className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-red-500/20 text-[11px] font-black text-gray-400 hover:text-red-400 border border-white/5 transition-colors cursor-pointer"
                        title="Set to 0 (Mark Out of Stock)"
                      >
                        0 (Out)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const current = dish.quantityAvailable ?? 0;
                          handleDirectStockChange(dish, current + 10);
                        }}
                        className="px-2 py-1.5 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-[11px] font-black text-gray-400 hover:text-emerald-400 border border-white/5 transition-colors cursor-pointer"
                        title="Add 10 portions to stock"
                      >
                        +10
                      </button>
                    </div>
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="p-6 pt-0 flex items-center justify-between border-t border-white/5 mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => onToggleDishAvailability(dish.id)}
                      className="text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                    >
                      {isAvailable ? 'Mark Sold Out' : 'Mark Available'}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(dish)}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white transition-all cursor-pointer"
                      title="Edit dish"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeletingDishId(dish.id)}
                      className="p-2.5 rounded-xl bg-red-600/10 hover:bg-red-600/25 text-red-400 hover:text-red-300 transition-all cursor-pointer"
                      title="Delete dish"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredDishes.length === 0 && (
        <div className="p-16 text-center rounded-3xl bg-white/5 border border-white/10">
          <Utensils className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <h4 className="text-lg font-black text-white mb-1">No Menu Dishes Found</h4>
          <p className="text-gray-400 text-xs max-w-sm mx-auto font-medium mb-5">
            No dishes matching your search or category filter.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase rounded-xl inline-flex items-center gap-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Dish</span>
          </button>
        </div>
      )}

      {/* ADD / EDIT DISH MODAL */}
      <AnimatePresence>
        {(isAddModalOpen || editingDish) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-xl bg-neutral-900/95 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl relative my-8"
            >
              <div className="flex items-center justify-between pb-4 mb-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-600/20 text-red-400 flex items-center justify-center">
                    <Utensils className="w-5 h-5" />
                  </div>
                  <h3 className="text-xl font-black text-white">
                    {editingDish ? 'Update Menu Item' : 'Add New Cafe Dish'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddModalOpen(false);
                    setEditingDish(null);
                  }}
                  className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={editingDish ? handleSaveEdit : handleSaveAdd} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Dish Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Crispy Honey Chilli Potatoes"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/60 font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Price (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">₹</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={formPrice}
                        onChange={(e) => setFormPrice(Number(e.target.value))}
                        className="w-full bg-white/5 border border-white/15 rounded-2xl pl-8 pr-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/60 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                      Category *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-neutral-800 border border-white/15 rounded-2xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500/60 font-medium"
                    >
                      {allCategories.filter((c) => c !== 'All').map((cat) => (
                        <option key={cat} value={cat} className="bg-neutral-900 text-white">
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe flavor notes, ingredients, preparation..."
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-2xl p-4 text-white text-sm focus:outline-none focus:border-red-500/60 font-medium"
                  />
                </div>

                {/* Preset Image Selector */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Dish Image
                  </label>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                    {PRESET_IMAGES.map((preset) => (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setFormImage(preset.url)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                          formImage === preset.url ? 'border-red-500 scale-105 shadow-md shadow-red-900/50' : 'border-white/10 opacity-60 hover:opacity-100'
                        }`}
                        title={preset.label}
                      >
                        <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    placeholder="Or enter custom image URL (e.g. /images/... or https://...)"
                    value={formImage}
                    onChange={(e) => setFormImage(e.target.value)}
                    className="w-full bg-white/5 border border-white/15 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/60 font-mono"
                  />
                </div>

                {/* Quantity Available Field in Form */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white text-xs font-bold flex items-center gap-1.5">
                        <Boxes className="w-3.5 h-3.5 text-red-400" />
                        Quantity Available (Portions in Kitchen) *
                      </p>
                      <p className="text-gray-400 text-[11px]">
                        Live count visible to customers. Set to 0 to mark as Sold Out.
                      </p>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Live Sync
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        required
                        value={formQuantityAvailable}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setFormQuantityAvailable(val);
                          if (val === 0) setFormAvailable(false);
                          else if (!formAvailable) setFormAvailable(true);
                        }}
                        className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-red-500/60 font-bold"
                      />
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setFormQuantityAvailable(0);
                          setFormAvailable(false);
                        }}
                        className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-red-500/20 text-xs font-bold text-gray-300 hover:text-red-400 border border-white/10 transition-colors cursor-pointer"
                        title="Set out of stock"
                      >
                        0 (Out)
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormQuantityAvailable((prev) => prev + 10);
                          setFormAvailable(true);
                        }}
                        className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-xs font-bold text-gray-300 hover:text-emerald-400 border border-white/10 transition-colors cursor-pointer"
                        title="Add 10"
                      >
                        +10
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setFormQuantityAvailable((prev) => prev + 25);
                          setFormAvailable(true);
                        }}
                        className="px-2.5 py-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 text-xs font-bold text-gray-300 hover:text-emerald-400 border border-white/10 transition-colors cursor-pointer"
                        title="Add 25"
                      >
                        +25
                      </button>
                    </div>
                  </div>
                </div>

                {/* Availability Toggle in Form */}
                <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div>
                    <p className="text-white text-xs font-bold">In-Stock Availability</p>
                    <p className="text-gray-400 text-[11px]">Allow customers to immediately order this item</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = !formAvailable;
                      setFormAvailable(next);
                      if (!next) setFormQuantityAvailable(0);
                      else if (formQuantityAvailable === 0) setFormQuantityAvailable(20);
                    }}
                    className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                      formAvailable
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-red-600 text-white shadow-md'
                    }`}
                  >
                    {formAvailable ? 'Available' : 'Sold Out'}
                  </button>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddModalOpen(false);
                      setEditingDish(null);
                    }}
                    className="px-5 py-3 rounded-2xl text-xs font-bold text-gray-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-xs font-black uppercase tracking-wider rounded-2xl shadow-lg shadow-red-900/40 cursor-pointer transition-all active:scale-95"
                  >
                    {editingDish ? 'Save Changes' : 'Create Dish'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deletingDishId && (
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
              <h3 className="text-xl font-black text-white mb-2">Delete Menu Item?</h3>
              <p className="text-gray-400 text-xs font-medium mb-6">
                Are you sure you want to remove this dish from the menu catalog? Customers will no longer be able to view or order it.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setDeletingDishId(null)}
                  className="px-5 py-2.5 rounded-xl bg-white/10 text-white text-xs font-bold hover:bg-white/15 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteDish(deletingDishId);
                    setDeletingDishId(null);
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
