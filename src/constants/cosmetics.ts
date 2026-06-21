import {
  CosmeticCategory,
  CosmeticItem,
  CosmeticVisual,
  FitnessClassId,
  PersonalRecordType
} from '@/types/domain';

export const COSMETIC_CATEGORIES: CosmeticCategory[] = [
  'head',
  'shirt',
  'pants',
  'shoes',
  'accessory',
  'frame',
  'aura'
];

export const CATEGORY_LABELS: Record<CosmeticCategory, string> = {
  head: 'Head',
  shirt: 'Tops',
  pants: 'Bottoms',
  shoes: 'Shoes',
  accessory: 'Wrist & Gear',
  frame: 'Frames',
  aura: 'Auras'
};

export const STARTER_EQUIPMENT = {
  head: 'starter-band',
  shirt: 'starter-training-top',
  pants: 'starter-track-pants',
  shoes: 'rookie-gym-shoes',
  accessory: null,
  frame: null,
  aura: null
} as const;

const visual = (
  component: CosmeticVisual['thumbnailComponent'],
  silhouette: string,
  pattern: CosmeticVisual['pattern']
): CosmeticVisual => ({
  thumbnailComponent: component,
  overlayComponent: component,
  silhouette,
  pattern
});

const starter = (
  item: Omit<CosmeticItem, 'availability' | 'unlockSource'>
): CosmeticItem => ({
  ...item,
  availability: 'permanent',
  unlockSource: { type: 'starter', label: 'Starter wardrobe' }
});

const shop = (
  item: Omit<CosmeticItem, 'unlockSource'>
): CosmeticItem => ({
  ...item,
  unlockSource: { type: 'shop', label: 'Gold Shop' }
});

const achievement = (
  item: Omit<CosmeticItem, 'availability' | 'unlockSource' | 'price'>,
  achievementId: string,
  label: string
): CosmeticItem => ({
  ...item,
  price: 0,
  availability: 'earned',
  unlockSource: { type: 'achievement', id: achievementId, label }
});

const record = (
  item: Omit<CosmeticItem, 'availability' | 'unlockSource' | 'price'>,
  recordType: PersonalRecordType,
  label: string
): CosmeticItem => ({
  ...item,
  price: 0,
  availability: 'earned',
  unlockSource: { type: 'personal_record', id: recordType, label }
});

const fitnessClass = (
  item: Omit<CosmeticItem, 'availability' | 'unlockSource' | 'price'>,
  fitnessClassId: FitnessClassId,
  label: string
): CosmeticItem => ({
  ...item,
  price: 0,
  availability: 'earned',
  unlockSource: { type: 'fitness_class', id: fitnessClassId, label }
});

const skillNode = (
  item: Omit<CosmeticItem, 'availability' | 'unlockSource' | 'price'>,
  nodeId: string,
  label: string
): CosmeticItem => ({
  ...item,
  price: 0,
  availability: 'earned',
  unlockSource: { type: 'skill_node', id: nodeId, label }
});

export const COSMETICS: CosmeticItem[] = [
  starter({
    id: 'starter-band', name: 'Starter Training Band', category: 'head', shopSection: 'Accessories',
    rarity: 'common', price: 0, unlockLevel: 1,
    colors: { primary: '#35F6FF', secondary: '#16365A', accent: '#FFFFFF' },
    description: 'A woven cyan band with a slim reflective center stitch.',
    visual: visual('headwear', 'band', 'stripe')
  }),
  starter({
    id: 'starter-training-top', name: 'Starter Training Top', category: 'shirt', shopSection: 'Shirts',
    rarity: 'common', price: 0, unlockLevel: 1,
    colors: { primary: '#12284A', secondary: '#35F6FF', accent: '#FFFFFF' },
    description: 'A fitted navy training tee with breathable cyan shoulder panels.',
    visual: visual('top', 'tee', 'panel')
  }),
  starter({
    id: 'starter-track-pants', name: 'Starter Track Pants', category: 'pants', shopSection: 'Pants',
    rarity: 'common', price: 0, unlockLevel: 1,
    colors: { primary: '#16233F', secondary: '#35F6FF', accent: '#7F94AC' },
    description: 'Tapered navy track pants with narrow reflective leg stripes.',
    visual: visual('bottom', 'joggers', 'stripe')
  }),
  starter({
    id: 'rookie-gym-shoes', name: 'Rookie Gym Shoes', category: 'shoes', shopSection: 'Shoes',
    rarity: 'common', price: 0, unlockLevel: 1,
    colors: { primary: '#A9F7FF', secondary: '#0B1628', accent: '#35F6FF' },
    description: 'Lightweight trainers with dark heel cups and cyan flex soles.',
    visual: visual('footwear', 'trainer', 'panel')
  }),

  shop({
    id: 'starter-sneakers', name: 'Cyan Court Sneakers', category: 'shoes', shopSection: 'Shoes',
    rarity: 'common', price: 150, unlockLevel: 1, availability: 'permanent',
    colors: { primary: '#35F6FF', secondary: '#FFFFFF', accent: '#0B1628' },
    description: 'Low court sneakers with crisp white uppers and cyan cupsoles.',
    visual: visual('footwear', 'court', 'stripe')
  }),
  shop({
    id: 'neon-runner-shirt', name: 'Neon Runner Jersey', category: 'shirt', shopSection: 'Shirts',
    rarity: 'rare', price: 250, unlockLevel: 2, availability: 'permanent',
    colors: { primary: '#35F6FF', secondary: '#0E2747', accent: '#8F5CFF' },
    description: 'A race-cut jersey with angular cyan panels and violet piping.',
    visual: visual('top', 'jersey', 'chevron')
  }),
  shop({
    id: 'shadow-training-pants', name: 'Shadow Training Pants', category: 'pants', shopSection: 'Pants',
    rarity: 'rare', price: 300, unlockLevel: 3, availability: 'permanent',
    colors: { primary: '#10152A', secondary: '#8F5CFF', accent: '#35F6FF' },
    description: 'Relaxed training pants with violet knee panels and cyan ankle tabs.',
    visual: visual('bottom', 'track', 'panel')
  }),
  shop({
    id: 'cyan-headband', name: 'Cyan Split Headband', category: 'head', shopSection: 'Accessories',
    rarity: 'common', price: 100, unlockLevel: 1, availability: 'permanent',
    colors: { primary: '#35F6FF', secondary: '#CFFFFF', accent: '#8F5CFF' },
    description: 'A split-layer performance band with a violet knot detail.',
    visual: visual('headwear', 'split-band', 'stripe')
  }),
  shop({
    id: 'purple-aura-frame', name: 'Violet Circuit Frame', category: 'frame', shopSection: 'Frames',
    rarity: 'epic', price: 500, unlockLevel: 5, availability: 'permanent',
    colors: { primary: '#8F5CFF', secondary: '#35F6FF', accent: '#FFB84D' },
    description: 'A violet profile frame crossed by four restrained cyan circuit nodes.',
    visual: visual('frame', 'circuit', 'pulse')
  }),
  shop({
    id: 'midnight-training-tee', name: 'Midnight Training Tee', category: 'shirt', shopSection: 'Shirts',
    rarity: 'common', price: 180, unlockLevel: 1, availability: 'permanent',
    colors: { primary: '#121A31', secondary: '#35F6FF', accent: '#A8B7CB' },
    description: 'A soft midnight tee with a silver chest seam and cyan sleeve hems.',
    visual: visual('top', 'tee', 'stripe')
  }),
  shop({
    id: 'aurora-sprint-top', name: 'Aurora Sprint Top', category: 'shirt', shopSection: 'Shirts',
    rarity: 'epic', price: 420, unlockLevel: 4, availability: 'permanent',
    colors: { primary: '#8F5CFF', secondary: '#35F6FF', accent: '#47F39A' },
    description: 'A sleeveless sprint top with layered violet, cyan, and mint panels.',
    visual: visual('top', 'singlet', 'chevron')
  }),
  shop({
    id: 'velocity-joggers', name: 'Velocity Taper Joggers', category: 'pants', shopSection: 'Pants',
    rarity: 'rare', price: 280, unlockLevel: 2, availability: 'permanent',
    colors: { primary: '#16365A', secondary: '#35F6FF', accent: '#FFFFFF' },
    description: 'Technical joggers with white hip panels and cyan tapered rails.',
    visual: visual('bottom', 'joggers', 'chevron')
  }),
  shop({
    id: 'apex-compression-tights', name: 'Apex Compression Tights', category: 'pants', shopSection: 'Rare',
    rarity: 'epic', price: 460, unlockLevel: 5, availability: 'permanent',
    colors: { primary: '#090D1C', secondary: '#FFB84D', accent: '#8F5CFF' },
    description: 'Full-length compression tights with gold calf arcs and violet seams.',
    visual: visual('bottom', 'leggings', 'streak')
  }),
  shop({
    id: 'cyan-dash-runners', name: 'Cyan Dash Runners', category: 'shoes', shopSection: 'Shoes',
    rarity: 'rare', price: 260, unlockLevel: 2, availability: 'permanent',
    colors: { primary: '#35F6FF', secondary: '#10213B', accent: '#FFFFFF' },
    description: 'Responsive runners with split cyan midsoles and white speed tabs.',
    visual: visual('footwear', 'runner', 'chevron')
  }),
  shop({
    id: 'stormtrail-shoes', name: 'Stormtrail Shoes', category: 'shoes', shopSection: 'Shoes',
    rarity: 'epic', price: 390, unlockLevel: 4, availability: 'permanent',
    colors: { primary: '#8F5CFF', secondary: '#0B1628', accent: '#35F6FF' },
    description: 'Trail shoes with violet heel guards, dark lugs, and cyan toe shields.',
    visual: visual('footwear', 'trail', 'panel')
  }),
  shop({
    id: 'pulse-wristband', name: 'Pulse Sensor Band', category: 'accessory', shopSection: 'Accessories',
    rarity: 'common', price: 120, unlockLevel: 1, availability: 'permanent',
    colors: { primary: '#47F39A', secondary: '#0B1628', accent: '#35F6FF' },
    description: 'A mint wrist sensor with a tiny cyan pulse display.',
    visual: visual('accessory', 'wristband', 'pulse')
  }),
  shop({
    id: 'recovery-towel', name: 'Recovery Shoulder Towel', category: 'accessory', shopSection: 'Accessories',
    rarity: 'rare', price: 220, unlockLevel: 2, availability: 'permanent',
    colors: { primary: '#FFFFFF', secondary: '#35F6FF', accent: '#8F5CFF' },
    description: 'A folded white towel with cyan edging and a violet recovery mark.',
    visual: visual('accessory', 'towel', 'stripe')
  }),
  shop({
    id: 'gold-streak-frame', name: 'Gold Streak Frame', category: 'frame', shopSection: 'Frames',
    rarity: 'legendary', price: 720, unlockLevel: 7, availability: 'permanent',
    colors: { primary: '#FFD66E', secondary: '#FFB84D', accent: '#35F6FF' },
    description: 'A slim gold frame with asymmetric speed streaks and cyan corner pins.',
    visual: visual('frame', 'streak', 'streak')
  }),
  shop({
    id: 'frost-pulse-frame', name: 'Frost Pulse Frame', category: 'frame', shopSection: 'Frames',
    rarity: 'epic', price: 540, unlockLevel: 5, availability: 'permanent',
    colors: { primary: '#A9F7FF', secondary: '#35F6FF', accent: '#8F5CFF' },
    description: 'An icy double-line frame with four calm violet pulse points.',
    visual: visual('frame', 'frost', 'frost')
  }),
  shop({
    id: 'midnight-run-cap', name: 'Midnight Run Cap', category: 'head', shopSection: 'Accessories',
    rarity: 'common', price: 170, unlockLevel: 2, availability: 'permanent',
    colors: { primary: '#101A31', secondary: '#62738A', accent: '#35F6FF' },
    description: 'A low-profile running cap with a silver brim and cyan rear tab.',
    visual: visual('headwear', 'cap', 'panel')
  }),
  shop({
    id: 'recovery-training-shorts', name: 'Recovery Training Shorts', category: 'pants', shopSection: 'Pants',
    rarity: 'common', price: 190, unlockLevel: 1, availability: 'permanent',
    colors: { primary: '#18304A', secondary: '#47F39A', accent: '#A8B7CB' },
    description: 'Relaxed training shorts with mint side vents and a silver waistband.',
    visual: visual('bottom', 'shorts', 'panel')
  }),
  shop({
    id: 'tempo-training-watch', name: 'Tempo Training Watch', category: 'accessory', shopSection: 'Accessories',
    rarity: 'rare', price: 310, unlockLevel: 3, availability: 'permanent',
    colors: { primary: '#35F6FF', secondary: '#07111F', accent: '#FFFFFF' },
    description: 'A dark training watch with a cyan face and twin side controls.',
    visual: visual('accessory', 'watch', 'pulse')
  }),

  shop({
    id: 'circuit-windbreaker', name: 'Circuit Windbreaker', category: 'shirt', shopSection: 'Featured',
    rarity: 'rare', price: 360, unlockLevel: 3, availability: 'featured',
    colors: { primary: '#0E2747', secondary: '#35F6FF', accent: '#FFFFFF' },
    description: 'A cropped running shell with cyan circuit seams and a white storm flap.',
    visual: visual('top', 'jacket', 'panel')
  }),
  shop({
    id: 'velocity-visor', name: 'Velocity Visor', category: 'head', shopSection: 'Featured',
    rarity: 'rare', price: 290, unlockLevel: 3, availability: 'featured',
    colors: { primary: '#35F6FF', secondary: '#10213B', accent: '#8F5CFF' },
    description: 'A narrow cyan visor with a dark brow band and violet side clips.',
    visual: visual('headwear', 'visor', 'streak')
  }),
  shop({
    id: 'comet-race-shoes', name: 'Comet Race Shoes', category: 'shoes', shopSection: 'Featured',
    rarity: 'epic', price: 520, unlockLevel: 5, availability: 'featured',
    colors: { primary: '#FFFFFF', secondary: '#8F5CFF', accent: '#35F6FF' },
    description: 'Featherweight race shoes with violet plates and cyan comet tails.',
    visual: visual('footwear', 'racer', 'streak')
  }),
  shop({
    id: 'kinetic-arm-sleeve', name: 'Kinetic Arm Sleeve', category: 'accessory', shopSection: 'Featured',
    rarity: 'epic', price: 410, unlockLevel: 4, availability: 'featured',
    colors: { primary: '#8F5CFF', secondary: '#111B31', accent: '#47F39A' },
    description: 'A fitted violet arm sleeve with a mint kinetic tracking line.',
    visual: visual('accessory', 'sleeve', 'chevron')
  }),
  shop({
    id: 'prism-profile-frame', name: 'Prism Profile Frame', category: 'frame', shopSection: 'Featured',
    rarity: 'legendary', price: 840, unlockLevel: 8, availability: 'featured',
    colors: { primary: '#FFD66E', secondary: '#8F5CFF', accent: '#35F6FF' },
    description: 'A geometric gold frame with alternating violet and cyan inner facets.',
    visual: visual('frame', 'prism', 'chevron')
  }),
  shop({
    id: 'cyan-focus-aura', name: 'Cyan Focus Aura', category: 'aura', shopSection: 'Auras',
    rarity: 'epic', price: 620, unlockLevel: 6, availability: 'featured',
    colors: { primary: '#35F6FF', secondary: '#0C6D7A', accent: '#FFFFFF' },
    description: 'A restrained cyan focus ring with slow vertical energy rails.',
    visual: visual('aura', 'focus-ring', 'pulse')
  }),

  shop({
    id: 'frostline-jacket', name: 'Frostline Running Jacket', category: 'shirt', shopSection: 'Rare',
    rarity: 'epic', price: 560, unlockLevel: 5, availability: 'seasonal',
    colors: { primary: '#D9FBFF', secondary: '#35F6FF', accent: '#62738A' },
    description: 'A pale winter shell with frosted shoulders and segmented cyan zips.',
    visual: visual('top', 'winter-jacket', 'frost')
  }),
  shop({
    id: 'frostline-leggings', name: 'Frostline Thermal Leggings', category: 'pants', shopSection: 'Rare',
    rarity: 'epic', price: 490, unlockLevel: 5, availability: 'seasonal',
    colors: { primary: '#152640', secondary: '#A9F7FF', accent: '#FFFFFF' },
    description: 'Thermal leggings with pale knee shields and icy calf tracers.',
    visual: visual('bottom', 'thermal-leggings', 'frost')
  }),
  shop({
    id: 'aurora-ponytail', name: 'Aurora Training Ponytail', category: 'head', shopSection: 'Rare',
    rarity: 'epic', price: 480, unlockLevel: 5, availability: 'seasonal',
    colors: { primary: '#3A285E', secondary: '#8F5CFF', accent: '#35F6FF' },
    description: 'A high sporty ponytail tied with a cyan clasp and violet layered ends.',
    visual: visual('headwear', 'ponytail', 'streak')
  }),
  shop({
    id: 'solstice-trail-shoes', name: 'Solstice Trail Shoes', category: 'shoes', shopSection: 'Rare',
    rarity: 'legendary', price: 760, unlockLevel: 7, availability: 'seasonal',
    colors: { primary: '#FFB84D', secondary: '#351B31', accent: '#FFD66E' },
    description: 'Warm trail shoes with gold rock plates and deep sunset heel guards.',
    visual: visual('footwear', 'trail', 'streak')
  }),
  shop({
    id: 'equinox-wrist-wrap', name: 'Equinox Wrist Wrap', category: 'accessory', shopSection: 'Rare',
    rarity: 'rare', price: 330, unlockLevel: 4, availability: 'seasonal',
    colors: { primary: '#47F39A', secondary: '#8F5CFF', accent: '#0B1628' },
    description: 'A layered mint wrist wrap crossed by a single violet balance stripe.',
    visual: visual('accessory', 'wrap', 'stripe')
  }),
  shop({
    id: 'winter-breath-aura', name: 'Winter Breath Aura', category: 'aura', shopSection: 'Auras',
    rarity: 'legendary', price: 900, unlockLevel: 9, availability: 'seasonal',
    colors: { primary: '#A9F7FF', secondary: '#62738A', accent: '#FFFFFF' },
    description: 'A quiet frost halo with thin silver arcs and a soft white center glow.',
    visual: visual('aura', 'halo', 'frost')
  }),

  achievement({
    id: 'five-k-finish-frame', name: 'First 5K Finish Frame', category: 'frame', shopSection: 'Frames',
    rarity: 'rare', unlockLevel: 1,
    colors: { primary: '#35F6FF', secondary: '#47F39A', accent: '#FFFFFF' },
    description: 'A cyan finish-line frame with five mint distance ticks.',
    visual: visual('frame', 'finish-line', 'stripe')
  }, 'first_5_km', 'Complete your first 5 km activity'),
  achievement({
    id: 'seven-day-pulse-aura', name: 'Seven Day Pulse Aura', category: 'aura', shopSection: 'Auras',
    rarity: 'epic', unlockLevel: 1,
    colors: { primary: '#47F39A', secondary: '#35F6FF', accent: '#FFFFFF' },
    description: 'Seven restrained mint pulse marks orbiting a slim cyan training ring.',
    visual: visual('aura', 'seven-pulse', 'pulse')
  }, 'seven_day_streak', 'Reach a 7-day activity streak'),
  achievement({
    id: 'committed-25-jacket', name: 'Committed Athlete Jacket', category: 'shirt', shopSection: 'Rare',
    rarity: 'epic', unlockLevel: 1,
    colors: { primary: '#17213B', secondary: '#8F5CFF', accent: '#FFD66E' },
    description: 'A structured navy jacket with 25 subtle gold stitch marks and violet trim.',
    visual: visual('top', 'varsity-jacket', 'panel')
  }, 'twenty_five_activities', 'Complete 25 activities'),
  achievement({
    id: 'level-ten-crown-band', name: 'Level Ten Crown Band', category: 'head', shopSection: 'Rare',
    rarity: 'legendary', unlockLevel: 10,
    colors: { primary: '#FFD66E', secondary: '#FFB84D', accent: '#35F6FF' },
    description: 'A sleek gold training band with three low crown points and a cyan clasp.',
    visual: visual('headwear', 'crown-band', 'chevron')
  }, 'character_level_10', 'Reach character Level 10'),
  record({
    id: 'pace-record-wristband', name: 'Pace Record Wristband', category: 'accessory', shopSection: 'Rare',
    rarity: 'epic', unlockLevel: 1,
    colors: { primary: '#8F5CFF', secondary: '#35F6FF', accent: '#FFFFFF' },
    description: 'A violet pace band with a cyan split marker and white record notch.',
    visual: visual('accessory', 'record-band', 'streak')
  }, 'fastest_5_km', 'Set a fastest 5 km personal record'),
  record({
    id: 'distance-record-aura', name: 'Distance Record Aura', category: 'aura', shopSection: 'Auras',
    rarity: 'legendary', unlockLevel: 1,
    colors: { primary: '#FFD66E', secondary: '#35F6FF', accent: '#8F5CFF' },
    description: 'A broad gold distance arc grounded by two cyan route markers.',
    visual: visual('aura', 'distance-arc', 'streak')
  }, 'longest_distance', 'Set a longest-distance personal record'),
  fitnessClass({
    id: 'runner-route-band', name: 'Runner Route Band', category: 'head', shopSection: 'Accessories',
    rarity: 'rare', unlockLevel: 1,
    colors: { primary: '#35F6FF', secondary: '#10213B', accent: '#FFFFFF' },
    description: 'A streamlined training band traced with a compact cyan route line.',
    visual: visual('headwear', 'route-band', 'streak')
  }, 'runner', 'Choose the Runner class'),
  fitnessClass({
    id: 'lifter-power-wrap', name: 'Lifter Power Wrap', category: 'accessory', shopSection: 'Accessories',
    rarity: 'rare', unlockLevel: 1,
    colors: { primary: '#FFB84D', secondary: '#251A17', accent: '#FFFFFF' },
    description: 'A layered wrist wrap with warm reinforced trim and a clean grip mark.',
    visual: visual('accessory', 'power-wrap', 'stripe')
  }, 'lifter', 'Choose the Lifter class'),
  fitnessClass({
    id: 'explorer-trail-frame', name: 'Explorer Trail Frame', category: 'frame', shopSection: 'Frames',
    rarity: 'rare', unlockLevel: 1,
    colors: { primary: '#47F39A', secondary: '#17352D', accent: '#35F6FF' },
    description: 'A mint route frame marked by subtle trail corners and a cyan waypoint.',
    visual: visual('frame', 'trail-route', 'chevron')
  }, 'explorer', 'Choose the Explorer class'),
  fitnessClass({
    id: 'hybrid-spectrum-aura', name: 'Hybrid Spectrum Aura', category: 'aura', shopSection: 'Auras',
    rarity: 'epic', unlockLevel: 1,
    colors: { primary: '#8F5CFF', secondary: '#35F6FF', accent: '#47F39A' },
    description: 'A restrained three-tone training arc representing balanced physical progress.',
    visual: visual('aura', 'spectrum-arc', 'pulse')
  }, 'hybrid_athlete', 'Choose the Hybrid Athlete class'),
  skillNode({
    id: 'skill-long-route-badge', name: 'Long Route Badge', category: 'accessory', shopSection: 'Accessories',
    rarity: 'rare', unlockLevel: 5,
    colors: { primary: '#35F6FF', secondary: '#173C54', accent: '#FFFFFF' },
    description: 'A compact route badge with layered distance markers and a reflective edge.',
    visual: visual('accessory', 'route-badge', 'chevron')
  }, 'endurance_long_route_badge', 'Unlock Long Route Badge in the Skill Tree'),
  skillNode({
    id: 'skill-training-outfit', name: 'Technical Training Top', category: 'shirt', shopSection: 'Shirts',
    rarity: 'epic', unlockLevel: 5,
    colors: { primary: '#17213B', secondary: '#FFB84D', accent: '#35F6FF' },
    description: 'A structured strength top with reinforced warm trim and cyan performance seams.',
    visual: visual('top', 'training-jacket', 'panel')
  }, 'strength_training_outfit', 'Unlock Training Outfit in the Skill Tree'),
  skillNode({
    id: 'skill-streak-frame', name: 'Disciplined Streak Frame', category: 'frame', shopSection: 'Frames',
    rarity: 'epic', unlockLevel: 5,
    colors: { primary: '#47F39A', secondary: '#35F6FF', accent: '#8F5CFF' },
    description: 'A precise mint frame with seven compact rhythm marks and cyan corners.',
    visual: visual('frame', 'discipline-frame', 'stripe')
  }, 'consistency_streak_frame', 'Unlock Streak Frame in the Skill Tree')
];

export const SHOP_COSMETICS = COSMETICS.filter(
  (item) => item.unlockSource.type === 'shop' && item.price > 0
);

export const EARNED_COSMETICS = COSMETICS.filter((item) => item.availability === 'earned');

export const getCosmeticById = (itemId?: string | null) =>
  itemId ? COSMETICS.find((item) => item.id === itemId) ?? null : null;

export const getStarterForCategory = (category: CosmeticCategory) =>
  getCosmeticById(STARTER_EQUIPMENT[category]);

export const visibleCosmeticsForCategory = (category: CosmeticCategory) =>
  COSMETICS.filter((item) => item.category === category);
