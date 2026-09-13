/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Dish, InventoryItem } from './types';

export const DISHES: Dish[] = [
  {
    id: '1',
    name: 'French Fries',
    price: 30,
    image: '/images/unscriptedBanner.jpg',
    description: 'Crispy golden fries served hot and fresh.',
    category: 'Starters'
  },
  {
    id: '2',
    name: 'Veg Chow Mein',
    price: 45,
    image: '/images/chow.png',
    description: 'Stir-fried noodles with fresh vegetables and aromatic spices.',
    category: 'Chinese'
  },
  {
    id: '3',
    name: 'Egg Chow Mein',
    price: 55,
    image: '/images/eggchowminn.png',
    description: 'Delicious stir-fried noodles with scrambled eggs and seasonal veggies.',
    category: 'Chinese'
  },
  {
    id: '4',
    name: 'Creamy Pasta',
    price: 65,
    image: '/images/pastaa.png',
    description: 'Italian pasta cooked in a rich, creamy sauce with exotic herbs.',
    category: 'Italian'
  },
  {
    id: '5',
    name: 'Paneer Chilli',
    price: 80,
    image: '/images/paneerchili.png',
    description: 'Spicy cottage cheese chunks tossed with bell peppers and onions.',
    category: 'Chinese'
  },
  {
    id: '6',
    name: 'Steamed Veg Momos',
    price: 40,
    image: '/images/momos.png',
    description: 'Soft and succulent dumplings filled with garden-fresh vegetables.',
    category: 'Chinese'
  },
  {
    id: '7',
    name: 'Fried Veg Momos',
    price: 45,
    image: '/images/fried.png',
    description: 'Crispy fried dumplings served with a hot and spicy red chutney.',
    category: 'Chinese'
  },
  {
    id: '8',
    name: 'Baby Corn Chilli',
    price: 70,
    image: '/images/babycornchili.png',
    description: 'Tender baby corn tossed in a spicy and tangy Manchurian sauce.',
    category: 'Chinese'
  },
  {
    id: '9',
    name: 'Mushroom Chilli',
    price: 75,
    image: '/images/masroomchili.png',
    description: 'Fresh mushrooms stir-fried with onions, capsicum, and oriental spices.',
    category: 'Chinese'
  },
  {
    id: '10',
    name: 'Veg Manchurian',
    price: 65,
    image: '/images/menchurian.png',
    description: 'Golden vegetable balls tossed in a flavorful soy-based ginger sauce.',
    category: 'Chinese'
  },
  {
    id: '11',
    name: 'Veg Roll',
    price: 35,
    image: '/images/vegrol.png',
    description: 'Freshly sautéed vegetables wrapped in a soft, flaky paratha.',
    category: 'Rolls'
  },
  {
    id: '12',
    name: 'Egg Roll',
    price: 40,
    image: '/images/eggrol.png',
    description: 'A classic street food favorite with fluffy egg and zesty red onions.',
    category: 'Rolls'
  },
  {
    id: '13',
    name: 'Paneer Roll',
    price: 50,
    image: '/images/paneerchili.png',
    description: 'Juicy paneer chunks wrapped with crunchy veggies and sauces.',
    category: 'Rolls'
  },
  {
    id: '14',
    name: 'Cold Coffee with Ice Cream',
    price: 90,
    image: '/images/coldcoffe.png',
    description: 'Blended chilled coffee topped with rich vanilla ice cream.',
    category: 'Beverages'
  },
  {
    id: '15',
    name: 'Veg Fried Rice',
    price: 60,
    image: '/images/chow.png',
    description: 'Fragrant basmati rice wok-tossed with fresh garden vegetables.',
    category: 'Chinese'
  },
  {
    id: '16',
    name: 'Schezwan Noodles',
    price: 70,
    image: '/images/eggchowminn.png',
    description: 'Fiery wok-tossed noodles in pungent Schezwan chili garlic sauce.',
    category: 'Chinese'
  },
  {
    id: '17',
    name: 'Cheesy Garlic Bread',
    price: 85,
    image: '/images/pastaa.png',
    description: 'Toasted artisanal bread loaded with melted mozzarella and herbs.',
    category: 'Italian'
  },
  {
    id: '18',
    name: 'Unscripted Special Banner Item',
    price: 120,
    image: '/images/unscriptedBanner.jpg',
    description: 'Featured house special creation displayed via unscripted banner.',
    category: 'Specials'
  }
];

export const INITIAL_INVENTORY: InventoryItem[] = [
  {
    id: 'inv-1',
    name: 'Artisanal Dark Roast Coffee Beans',
    category: 'Beverages',
    quantity: 18.5,
    unit: 'kg',
    minThreshold: 5.0,
    supplier: 'Blue Tokai Estate Co.',
    lastUpdated: 'Today'
  },
  {
    id: 'inv-2',
    name: 'Fresh Dairy Paneer (Cottage Cheese)',
    category: 'Dairy',
    quantity: 6.2,
    unit: 'kg',
    minThreshold: 4.0,
    supplier: 'Amul Dairy Palamu Hub',
    lastUpdated: 'Today'
  },
  {
    id: 'inv-3',
    name: 'Crispy Cut Potato Fries Stock',
    category: 'Frozen',
    quantity: 24.0,
    unit: 'kg',
    minThreshold: 8.0,
    supplier: 'McCain Food Logistics',
    lastUpdated: 'Yesterday'
  },
  {
    id: 'inv-4',
    name: 'Hakka Egg Noodles (Bulk Pack)',
    category: 'Dry Goods',
    quantity: 14,
    unit: 'packs',
    minThreshold: 5,
    supplier: 'Ching’s Secret Supply',
    lastUpdated: '2 days ago'
  },
  {
    id: 'inv-5',
    name: 'Handcrafted Momos Wrappers',
    category: 'Frozen',
    quantity: 8,
    unit: 'packs',
    minThreshold: 10,
    supplier: 'Himalayan Kitchen Prep',
    lastUpdated: 'Today'
  },
  {
    id: 'inv-6',
    name: 'Refined Sunflower Cooking Oil',
    category: 'Oils',
    quantity: 32,
    unit: 'L',
    minThreshold: 12,
    supplier: 'Fortune Agro Direct',
    lastUpdated: '3 days ago'
  },
  {
    id: 'inv-7',
    name: 'Full Cream Milk Cans',
    category: 'Dairy',
    quantity: 4.5,
    unit: 'L',
    minThreshold: 6.0,
    supplier: 'Medha Dairy Local Booth',
    lastUpdated: 'Today'
  },
  {
    id: 'inv-8',
    name: 'Baby Corn Chunks (Tinned)',
    category: 'Produce',
    quantity: 11,
    unit: 'cans',
    minThreshold: 4,
    supplier: 'Nature Best Fresh Supplies',
    lastUpdated: 'Yesterday'
  },
  {
    id: 'inv-9',
    name: 'Button Mushrooms Fresh Pack',
    category: 'Produce',
    quantity: 3.5,
    unit: 'kg',
    minThreshold: 3.0,
    supplier: 'Green Valley Organic Farms',
    lastUpdated: 'Today'
  },
  {
    id: 'inv-10',
    name: 'Eco-Friendly Takeaway Meal Bowls',
    category: 'Packaging',
    quantity: 180,
    unit: 'pcs',
    minThreshold: 50,
    supplier: 'EcoPack India Ltd.',
    lastUpdated: 'Today'
  },
  {
    id: 'inv-11',
    name: 'Signature Barozza Coffee Cups & Lids',
    category: 'Packaging',
    quantity: 42,
    unit: 'pcs',
    minThreshold: 50,
    supplier: 'PrintCraft Disposables',
    lastUpdated: 'Today'
  },
  {
    id: 'inv-12',
    name: 'Spicy Schezwan & Manchurian Sauce Mix',
    category: 'Condiments',
    quantity: 7.5,
    unit: 'kg',
    minThreshold: 3.0,
    supplier: 'MasterChef Asian Flavors',
    lastUpdated: '4 days ago'
  }
];
