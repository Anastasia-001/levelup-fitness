import { SHOP_COSMETICS } from '@/constants/cosmetics';
import {
  Activity,
  CosmeticItem,
  FitnessClassId,
  PersonalRecord,
  ProgressionStreaks,
  UserAchievement
} from '@/types/domain';

const ROTATION_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const ROTATION_EPOCH_MS = Date.UTC(2026, 0, 5);

export type CosmeticProgressContext = {
  activities: Activity[];
  achievements: UserAchievement[];
  personalRecords: PersonalRecord[];
  streaks: ProgressionStreaks | null;
  characterLevel: number;
  fitnessClass?: FitnessClassId;
  unlockedSkillNodeIds?: string[];
};

export const getShopRotation = (now = new Date()) => {
  const elapsed = Math.max(0, now.getTime() - ROTATION_EPOCH_MS);
  const rotationIndex = Math.floor(elapsed / ROTATION_INTERVAL_MS);
  const startsAt = new Date(ROTATION_EPOCH_MS + rotationIndex * ROTATION_INTERVAL_MS);
  const endsAt = new Date(startsAt.getTime() + ROTATION_INTERVAL_MS);
  const featuredPool = SHOP_COSMETICS.filter((item) => item.availability === 'featured');
  const seasonalPool = SHOP_COSMETICS.filter((item) => item.availability === 'seasonal');

  return {
    rotationIndex,
    startsAt,
    endsAt,
    featured: rotateSelection(featuredPool, rotationIndex * 2, 3),
    seasonal: rotateSelection(seasonalPool, rotationIndex * 3 + 1, 3),
    permanent: SHOP_COSMETICS.filter((item) => item.availability === 'permanent')
  };
};

export const formatRotationRemaining = (endsAt: Date, now = new Date()) => {
  const remaining = Math.max(0, endsAt.getTime() - now.getTime());
  const days = Math.floor(remaining / (24 * 60 * 60 * 1000));
  const hours = Math.floor((remaining / (60 * 60 * 1000)) % 24);
  const minutes = Math.floor((remaining / (60 * 1000)) % 60);

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${minutes}m`;
};

export const getCosmeticUnlockProgress = (
  item: CosmeticItem,
  context: CosmeticProgressContext
) => {
  const source = item.unlockSource;
  if (source.type === 'starter' || source.type === 'shop') {
    return { current: 0, target: 0, ratio: 0, label: source.label };
  }

  if (source.type === 'personal_record') {
    const earned = context.personalRecords.some((record) => record.recordType === source.id);
    return { current: earned ? 1 : 0, target: 1, ratio: earned ? 1 : 0, label: earned ? 'Record earned' : '0 / 1 record' };
  }

  if (source.type === 'fitness_class') {
    const earned = context.fitnessClass === source.id;
    return {
      current: earned ? 1 : 0,
      target: 1,
      ratio: earned ? 1 : 0,
      label: earned ? 'Class selected' : source.label
    };
  }

  if (source.type === 'skill_node') {
    const earned = context.unlockedSkillNodeIds?.includes(source.id) ?? false;
    return { current: earned ? 1 : 0, target: 1, ratio: earned ? 1 : 0, label: earned ? 'Skill unlocked' : source.label };
  }

  const unlocked = context.achievements.some((achievement) => achievement.achievementId === source.id);
  if (unlocked) {
    return { current: 1, target: 1, ratio: 1, label: 'Requirement complete' };
  }

  const metric = achievementMetric(source.id, context);
  return {
    ...metric,
    ratio: metric.target > 0 ? Math.min(1, metric.current / metric.target) : 0,
    label: `${formatProgress(metric.current)} / ${formatProgress(metric.target)}`
  };
};

const rotateSelection = (items: CosmeticItem[], offset: number, count: number) => {
  if (!items.length) return [];
  return Array.from({ length: Math.min(count, items.length) }, (_, index) =>
    items[(offset + index) % items.length]
  );
};

const achievementMetric = (achievementId: string, context: CosmeticProgressContext) => {
  switch (achievementId) {
    case 'first_5_km':
      return {
        current: Math.max(0, ...context.activities.map((activity) => activity.distanceMeters ?? 0)),
        target: 5000
      };
    case 'seven_day_streak':
      return { current: context.streaks?.longestActivityDayStreak ?? 0, target: 7 };
    case 'twenty_five_activities':
      return { current: context.activities.length, target: 25 };
    case 'character_level_10':
      return { current: context.characterLevel, target: 10 };
    default:
      return { current: 0, target: 1 };
  }
};

const formatProgress = (value: number) => value >= 1000 ? `${(value / 1000).toFixed(value >= 10_000 ? 0 : 1)}km` : Math.round(value).toString();
