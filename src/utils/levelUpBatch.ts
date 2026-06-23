import type { LevelUpCelebration } from '@/types/domain';

export type LevelUpBatch = {
  celebration: LevelUpCelebration;
  firstLevel: number;
  finalLevel: number;
};

export const normalizePendingLevelUps = (celebrations: LevelUpCelebration[]) => {
  const byLevel = new Map<number, LevelUpCelebration>();

  celebrations.forEach((celebration) => {
    if (celebration.viewedAt) return;
    if (!Number.isFinite(celebration.level) || !Number.isFinite(celebration.previousLevel)) return;
    if (celebration.level <= celebration.previousLevel) return;

    const current = byLevel.get(celebration.level);
    if (!current || celebration.previousLevel < current.previousLevel) {
      byLevel.set(celebration.level, celebration);
    }
  });

  return [...byLevel.values()].sort((left, right) =>
    left.level - right.level || left.previousLevel - right.previousLevel
  );
};

export const buildLevelUpBatch = (celebrations: LevelUpCelebration[]): LevelUpBatch | null => {
  const normalized = normalizePendingLevelUps(celebrations);
  if (!normalized.length) return null;

  const first = normalized[0];
  const last = normalized[normalized.length - 1];
  return {
    firstLevel: first.level,
    finalLevel: last.level,
    celebration: {
      userId: first.userId,
      previousLevel: Math.min(...normalized.map((item) => item.previousLevel)),
      level: last.level,
      queuedAt: first.queuedAt,
      viewedAt: null
    }
  };
};
