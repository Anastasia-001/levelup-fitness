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
    rarity: 'common',
    price: 0,
    unlockLevel: 1,
    colors: { primary: '#35F6FF', secondary: '#16365A', accent: '#FFFFFF' },
    description: 'A simple cyan headband for first-day training.'
  },
  {
    id: 'starter-training-top',
    name: 'Starter Training Top',
    category: 'shirt',
    shopSection: 'Shirts',
    rarity: 'common',
    price: 0,
    unlockLevel: 1,
    colors: { primary: '#12284A', secondary: '#35F6FF', accent: '#FFFFFF' },
    description: 'Clean level-1 athletic wear.'
  },
  {
    id: 'starter-track-pants',
    name: 'Starter Track Pants',
    category: 'pants',
    shopSection: 'Pants',
    rarity: 'common',
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
    rarity: 'common',
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
    rarity: 'common',
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
    rarity: 'rare',
    price: 250,
    unlockLevel: 2,
    colors: { primary: '#35F6FF', secondary: '#0E2747', accent: '#8F5CFF' },
    description: 'A luminous runner top with angular cyan trim.'
  },
  {
    id: 'shadow-training-pants',
    name: 'Shadow Training Pants',
    category: 'pants',
    shopSection: 'Pants',
    rarity: 'rare',
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
    rarity: 'common',
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
    rarity: 'epic',
    price: 500,
    unlockLevel: 5,
    colors: { primary: '#8F5CFF', secondary: '#35F6FF', accent: '#FFB84D' },
    description: 'A violet profile frame for dedicated daily training.'
  },
  {
    id: 'midnight-training-tee',
    name: 'Midnight Training Tee',
    category: 'shirt',
    shopSection: 'Shirts',
    rarity: 'common',
    price: 180,
    unlockLevel: 1,
    colors: { primary: '#121A31', secondary: '#35F6FF', accent: '#A8B7CB' },
    description: 'A quiet navy tee with glowing shoulder trim.'
  },
  {
    id: 'aurora-sprint-top',
    name: 'Aurora Sprint Top',
    category: 'shirt',
    shopSection: 'Featured',
    rarity: 'epic',
    price: 420,
    unlockLevel: 4,
    colors: { primary: '#8F5CFF', secondary: '#35F6FF', accent: '#47F39A' },
    description: 'A vivid top for runners chasing weekly streaks.'
  },
  {
    id: 'velocity-joggers',
    name: 'Velocity Joggers',
    category: 'pants',
    shopSection: 'Pants',
    rarity: 'rare',
    price: 280,
    unlockLevel: 2,
    colors: { primary: '#16365A', secondary: '#35F6FF', accent: '#FFFFFF' },
    description: 'Streamlined joggers with cyan taper lines.'
  },
  {
    id: 'apex-compression-tights',
    name: 'Apex Compression Tights',
    category: 'pants',
    shopSection: 'Rare',
    rarity: 'epic',
    price: 460,
    unlockLevel: 5,
    colors: { primary: '#090D1C', secondary: '#FFB84D', accent: '#8F5CFF' },
    description: 'Premium training tights with gold accent seams.'
  },
  {
    id: 'cyan-dash-runners',
    name: 'Cyan Dash Runners',
    category: 'shoes',
    shopSection: 'Shoes',
    rarity: 'rare',
    price: 260,
    unlockLevel: 2,
    colors: { primary: '#35F6FF', secondary: '#10213B', accent: '#FFFFFF' },
    description: 'Sharp runners built for clean daily mileage.'
  },
  {
    id: 'stormtrail-shoes',
    name: 'Stormtrail Shoes',
    category: 'shoes',
    shopSection: 'Shoes',
    rarity: 'epic',
    price: 390,
    unlockLevel: 4,
    colors: { primary: '#8F5CFF', secondary: '#0B1628', accent: '#35F6FF' },
    description: 'Trail-ready shoes with violet heel guards.'
  },
  {
    id: 'pulse-wristband',
    name: 'Pulse Wristband',
    category: 'accessory',
    shopSection: 'Accessories',
    rarity: 'common',
    price: 120,
    unlockLevel: 1,
    colors: { primary: '#47F39A', secondary: '#0B1628', accent: '#35F6FF' },
    description: 'A small green pulse charm for the right arm.'
  },
  {
    id: 'recovery-towel',
    name: 'Recovery Towel',
    category: 'accessory',
    shopSection: 'Accessories',
    rarity: 'rare',
    price: 220,
    unlockLevel: 2,
    colors: { primary: '#FFFFFF', secondary: '#35F6FF', accent: '#8F5CFF' },
    description: 'A clean post-workout towel accessory.'
  },
  {
    id: 'gold-streak-frame',
    name: 'Gold Streak Frame',
    category: 'frame',
    shopSection: 'Frames',
    rarity: 'legendary',
    price: 720,
    unlockLevel: 7,
    colors: { primary: '#FFD66E', secondary: '#FFB84D', accent: '#35F6FF' },
    description: 'A warm frame for athletes with real consistency.'
  },
  {
    id: 'frost-pulse-frame',
    name: 'Frost Pulse Frame',
    category: 'frame',
    shopSection: 'Frames',
    rarity: 'epic',
    price: 540,
    unlockLevel: 5,
    colors: { primary: '#A9F7FF', secondary: '#35F6FF', accent: '#8F5CFF' },
    description: 'An icy neon frame with a calm training aura.'
  }
];

export const SHOP_COSMETICS = COSMETICS.filter((item) => item.price > 0);

export const getCosmeticById = (itemId?: string | null) =>
  itemId ? COSMETICS.find((item) => item.id === itemId) ?? null : null;

export const getStarterForCategory = (category: CosmeticCategory) =>
  getCosmeticById(STARTER_EQUIPMENT[category]);

export const visibleCosmeticsForCategory = (category: CosmeticCategory) =>
  COSMETICS.filter((item) => item.category === category);
