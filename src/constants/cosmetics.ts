import { CosmeticCategory, CosmeticItem } from '@/types/domain';

export const COSMETIC_CATEGORIES: CosmeticCategory[] = [
  'head',
  'shirt',
  'pants',
  'shoes',
  'accessory',
  'frame'
];

export const CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  head: 'Head',
  shirt: 'Shirt',
  pants: 'Pants',
  shoes: 'Shoes',
  accessory: 'Accessory',
  frame: 'Frame'
};

export const STARTER_EQUIPMENT = {
  head: 'starter-band',
  shirt: 'starter-training-top',
  pants: 'starter-track-pants',
  shoes: 'rookie-gym-shoes',
  accessory: null,
  frame: null
} as const;

export const COSMETICS: CosmeticItem[] = [
  {
    id: 'starter-band',
    name: 'Starter Training Band',
    category: 'head',
    shopSection: 'Accessories',
    price: 0,
    unlockLevel: 1,
    colors: { primary: '#35F6FF', secondary: '#16365A', accent: '#FFFFFF' },
    description: 'A simple cyan headband for first-day training.'
  },
  {
    id: 'starter-training-top',
    name: 'Starter Training Top',
    category: 'shirt',
    shopSection: 'Outfits',
    price: 0,
    unlockLevel: 1,
    colors: { primary: '#12284A', secondary: '#35F6FF', accent: '#FFFFFF' },
    description: 'Clean level-1 athletic wear.'
  },
  {
    id: 'starter-track-pants',
    name: 'Starter Track Pants',
    category: 'pants',
    shopSection: 'Outfits',
    price: 0,
    unlockLevel: 1,
    colors: { primary: '#16233F', secondary: '#35F6FF' },
    description: 'Lightweight navy pants for daily training.'
  },
  {
    id: 'rookie-gym-shoes',
    name: 'Rookie Gym Shoes',
    category: 'shoes',
    shopSection: 'Shoes',
    price: 0,
    unlockLevel: 1,
    colors: { primary: '#A9F7FF', secondary: '#0B1628', accent: '#35F6FF' },
    description: 'Default lightweight shoes for the first training arc.'
  },
  {
    id: 'starter-sneakers',
    name: 'Starter Sneakers',
    category: 'shoes',
    shopSection: 'Shoes',
    price: 150,
    unlockLevel: 1,
    colors: { primary: '#35F6FF', secondary: '#FFFFFF', accent: '#0B1628' },
    description: 'Bright beginner shoes with cyan soles.'
  },
  {
    id: 'neon-runner-shirt',
    name: 'Neon Runner Shirt',
    category: 'shirt',
    shopSection: 'Featured',
    price: 250,
    unlockLevel: 2,
    colors: { primary: '#35F6FF', secondary: '#0E2747', accent: '#8F5CFF' },
    description: 'A luminous runner top with angular cyan trim.'
  },
  {
    id: 'shadow-training-pants',
    name: 'Shadow Training Pants',
    category: 'pants',
    shopSection: 'Outfits',
    price: 300,
    unlockLevel: 3,
    colors: { primary: '#10152A', secondary: '#8F5CFF', accent: '#35F6FF' },
    description: 'Dark training pants with purple side panels.'
  },
  {
    id: 'cyan-headband',
    name: 'Cyan Headband',
    category: 'head',
    shopSection: 'Accessories',
    price: 100,
    unlockLevel: 1,
    colors: { primary: '#35F6FF', secondary: '#CFFFFF', accent: '#8F5CFF' },
    description: 'A crisp headband that sharpens the starter look.'
  },
  {
    id: 'purple-aura-frame',
    name: 'Purple Aura Frame',
    category: 'frame',
    shopSection: 'Featured',
    price: 500,
    unlockLevel: 5,
    colors: { primary: '#8F5CFF', secondary: '#35F6FF', accent: '#FFB84D' },
    description: 'A violet profile frame for dedicated daily training.'
  }
];

export const SHOP_COSMETICS = COSMETICS.filter((item) => item.price > 0);

export const getCosmeticById = (itemId?: string | null) =>
  itemId ? COSMETICS.find((item) => item.id === itemId) ?? null : null;

export const getStarterForCategory = (category: CosmeticCategory) =>
  getCosmeticById(STARTER_EQUIPMENT[category]);

export const visibleCosmeticsForCategory = (category: CosmeticCategory) =>
  COSMETICS.filter((item) => item.category === category);
