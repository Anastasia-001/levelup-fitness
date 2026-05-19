import { ACTIVITY_STAT_WEIGHTS } from '@/constants/activities';
import { ActivityInput, ActivityType, Character, StatKey } from '@/types/domain';

const STAT_KEYS: StatKey[] = ['endurance', 'speed', 'strength', 'consistency'];

const activityBaseExp: Record<ActivityType, number> = {
  run: 18,
  walk: 12,
  bike: 16,
  hike: 20,
  gym_workout: 18,
  pushups: 8,
  swimming: 20,
  other_workout: 14
};

export const expForLevel = (level: number) => 100 + (level - 1) * 50;

export const levelFromTotalExp = (totalExp: number) => {
  let level = 1;
  let remaining = totalExp;

  while (remaining >= expForLevel(level)) {
    remaining -= expForLevel(level);
    level += 1;
  }

  return { level, currentLevelExp: remaining, nextLevelExp: expForLevel(level) };
};

export const calculateActivityExp = (activity: ActivityInput) => {
  const durationMinutes = activity.durationSeconds / 60;
  const distanceKm = (activity.distanceMeters ?? 0) / 1000;
  const reps = activity.reps ?? 0;
  const sets = activity.sets ?? 0;
  const weightBonus = Math.min(30, (activity.weightKg ?? 0) / 4);

  let exp =
    activityBaseExp[activity.type] +
    durationMinutes * 1.5 +
    distanceKm * 12 +
    reps * 0.35 +
    sets * 2 +
    weightBonus;

  if (activity.type === 'pushups') {
    exp += reps * 0.65;
  }

  const expEarned = Math.max(5, Math.round(exp));
  const statExp = STAT_KEYS.reduce(
    (acc, key) => ({ ...acc, [key]: 0 }),
    {} as Record<StatKey, number>
  );

  const weights = ACTIVITY_STAT_WEIGHTS[activity.type];
  Object.entries(weights).forEach(([stat, weight]) => {
    statExp[stat as StatKey] = Math.round(expEarned * (weight ?? 0));
  });

  return { expEarned, statExp };
};

export const applyExpToCharacter = (
  character: Character,
  expEarned: number,
  statExp: Record<StatKey, number>
): Character => {
  const totalExp = character.totalExp + expEarned;
  const { level } = levelFromTotalExp(totalExp);

  return {
    ...character,
    level,
    totalExp,
    enduranceExp: character.enduranceExp + statExp.endurance,
    speedExp: character.speedExp + statExp.speed,
    strengthExp: character.strengthExp + statExp.strength,
    consistencyExp: character.consistencyExp + statExp.consistency,
    updatedAt: new Date().toISOString()
  };
};

export const statLevel = (statExp: number) => Math.floor(statExp / 100) + 1;
