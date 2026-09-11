/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Dish } from '../types';

interface DishSlideshowProps {
  dishes: Dish[];
}

export default function DishSlideshow({ dishes }: DishSlideshowProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % dishes.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [dishes.length]);

  return (
    <div className="fixed inset-0 z-0">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5 }}
          className="absolute inset-0"
        >
          <img
            src={dishes[index].image}
            alt={dishes[index].name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-b from-black/60 via-transparent to-black/80" />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
