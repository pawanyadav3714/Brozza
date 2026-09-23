/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { Plus, ShoppingBag } from 'lucide-react';
import { Dish, CartItem } from '../types';

interface DishCarouselProps {
  dishes: Dish[];
  onSelectDish: (dish: Dish) => void;
  cartItems?: CartItem[];
  onAddToCart?: (dish: Dish) => void;
}

export default function DishCarousel({ dishes, onSelectDish, cartItems = [], onAddToCart }: DishCarouselProps) {
  const [isPaused, setIsPaused] = useState(false);
  
  // Duplicate dishes for seamless looping
  const marqueeDishes = [...dishes, ...dishes];

  return (
    <section className="py-8">
      <div className="max-w-7xl mx-auto px-4 overflow-hidden">
        <h2 className="text-3xl font-black text-white mb-10 flex items-center gap-4">
          <span className="w-12 h-1 bg-red-500 rounded-full" />
          Featured Delights
        </h2>
        
        <div className="relative -mx-4">
          {/* Fade effects for edges */}
          <div className="absolute inset-y-0 left-0 w-32 bg-linear-to-r from-black to-transparent z-20 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-32 bg-linear-to-l from-black to-transparent z-20 pointer-events-none" />

          <motion.div 
            className="flex gap-8 px-4"
            animate={{ x: isPaused ? undefined : ["0%", "-50%"] }}
            transition={{ 
              duration: 25, 
              ease: "linear", 
              repeat: Infinity 
            }}
            onHoverStart={() => setIsPaused(true)}
            onHoverEnd={() => setIsPaused(false)}
          >
            {marqueeDishes.map((dish, i) => (
              <motion.div
                key={`${dish.id}-${i}`}
                whileHover={{ scale: 1.05, y: -10 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onSelectDish(dish)}
                className="flex-shrink-0 w-[300px] md:w-[450px] cursor-pointer group"
              >
                <div className="relative aspect-[16/9] overflow-hidden rounded-[2.5rem] shadow-2xl border border-white/10 transition-all duration-500 group-hover:border-red-500/50">
                  <img
                    src={dish.image}
                    alt={dish.name}
                    className={`w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 ${
                      dish.available === false ? 'grayscale-[60%]' : ''
                    }`}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />
                  <div className="absolute bottom-6 left-6 text-white flex items-center gap-2 flex-wrap">
                    <span className="px-4 py-1.5 bg-red-600/80 backdrop-blur-xl rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                      {dish.category}
                    </span>
                    {dish.available === false || dish.quantityAvailable === 0 ? (
                      <span className="px-3 py-1.5 bg-neutral-900/90 border border-red-500/40 text-red-400 backdrop-blur-xl rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                        Sold Out
                      </span>
                    ) : (dish.quantityAvailable ?? 20) <= 5 ? (
                      <span className="px-3 py-1.5 bg-amber-500/90 text-black font-black backdrop-blur-xl rounded-full text-[10px] uppercase tracking-widest shadow-lg animate-pulse">
                        Only {dish.quantityAvailable} Left!
                      </span>
                    ) : (
                      <span className="px-3 py-1.5 bg-emerald-600/80 backdrop-blur-xl rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                        {dish.quantityAvailable} Available
                      </span>
                    )}
                  </div>
                </div>
                <div className="mt-6 flex justify-between items-end px-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white group-hover:text-red-400 transition-colors">
                      {dish.name}
                    </h3>
                    <p className="text-gray-400 font-medium mt-1">{dish.description}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-black text-2xl text-red-500">₹{dish.price.toFixed(2)}</span>
                    {dish.available !== false && (dish.quantityAvailable === undefined || dish.quantityAvailable > 0) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (onAddToCart) {
                            onAddToCart(dish);
                          } else {
                            onSelectDish(dish);
                          }
                        }}
                        className="p-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/40 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 text-xs font-black"
                        title="Add to Bag"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="hidden sm:inline">Add</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
