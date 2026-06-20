import { ACTIVITY_LABELS } from '@/constants/activities';
import {
  Activity,
  Mission,
  MissionDifficulty,
  MissionTemplate,
  MissionType
} from '@/types/domain';
import { localDateKey } from '@/utils/progression';

export type MissionGenerationContext = {
  userLevel: number;
  recentActivities: Activity[];
  missionDate?: string;
};

const REWARD_RANGES: Record<
  MissionDifficulty,
  { exp: [number, number]; coins: [number, number] }
> = {
  easy: { exp: [20, 35], coins: [5, 12] },
  medium: { exp: [45, 75], coins: [15, 30] },
  hard: { exp: [90, 150], coins: [40, 75] },
  boss: { exp: [180, 300], coins: [100, 175] }
};

export const generateDailyMissionTemplates = (context: MissionGenerationContext) => {
  const pool = buildMissionPool(context);
  const seed = dateSeed(context.missionDate ?? localDateKey());
  const advancedDifficulty = chooseAdvancedDifficulty(context, seed);
  const selected: MissionTemplate[] = [];
  const usedTypes = new Set<MissionType>();

  [
    'easy' as MissionDifficulty,
    'medium' as MissionDifficulty,
    advancedDifficulty
  ].forEach((difficulty, index) => {
    const candidates = pool.filter(
      (mission) => mission.difficulty === difficulty && !usedTypes.has(mission.type)
    );
    const fallback = pool.filter((mission) => !usedTypes.has(mission.type));
    const options = candidates.length ? candidates : fallback;
    const mission = options[(seed + index * 3) % options.length];
    selected.push(mission);
    usedTypes.add(mission.type);
  });

  return selected;
};

export const buildDailyMissions = (
  userId: string,
  missionDate: string,
  context: MissionGenerationContext
): Omit<Mission, 'id'>[] =>
  generateDailyMissionTemplates({ ...context, missionDate }).map((template) => ({
    ...template,
    userId,
    missionDate,
    progress: 0,
    completedAt: null
  }));

export const buildRerollTemplate = (
  mission: Mission,
  existingMissions: Mission[],
  context: MissionGenerationContext
) => {
  const pool = buildMissionPool(context);
  const otherTypes = new Set(
    existingMissions.filter((candidate) => candidate.id !== mission.id).map((candidate) => candidate.type)
  );
  const sameDifficulty = pool.filter(
    (candidate) =>
      candidate.difficulty === mission.difficulty &&
      candidate.templateId !== mission.templateId &&
      !otherTypes.has(candidate.type)
  );
  const sameTypeFallback = pool.filter(
    (candidate) =>
      candidate.difficulty === mission.difficulty &&
      candidate.templateId !== mission.templateId &&
      candidate.type === mission.type
  );
  const options = sameDifficulty.length ? sameDifficulty : sameTypeFallback;
  if (!options.length) return null;

  const seed = dateSeed(context.missionDate ?? mission.missionDate) + mission.templateId.length;
  return options[seed % options.length];
};

export const progressMissionWithActivity = (mission: Mission, activity: Activity): Mission => {
  if (mission.completedAt) return mission;
  let progress = mission.progress;

  if (mission.type === 'complete_activity') progress += 1;
  if (mission.type === 'distance_walk_run' && ['walk', 'run'].includes(activity.type)) {
    progress += activity.distanceMeters ?? 0;
  }
  if (mission.type === 'pushups' && activity.type === 'pushups') {
    progress += activity.reps ?? 0;
  }
  if (mission.type === 'workout_duration') progress += activity.durationSeconds;

  return {
    ...mission,
    progress: Math.min(progress, mission.targetValue),
    completedAt: progress >= mission.targetValue ? new Date().toISOString() : null
  };
};

export const missionActivitySummary = (activity: Activity) =>
  `${ACTIVITY_LABELS[activity.type]} saved for ${new Date(activity.completedAt).toLocaleDateString()}`;

const buildMissionPool = (context: MissionGenerationContext): MissionTemplate[] => {
  const recent = context.recentActivities;
  const averageDistance = average(
    recent
      .filter((activity) => ['walk', 'run'].includes(activity.type))
      .map((activity) => activity.distanceMeters ?? 0)
      .filter((value) => value > 0)
  );
  const averageDuration = average(recent.map((activity) => activity.durationSeconds).filter((value) => value > 0));
  const averagePushups = average(
    recent.filter((activity) => activity.type === 'pushups').map((activity) => activity.reps ?? 0).filter((value) => value > 0)
  );

  const distanceTargets = {
    easy: rounded(clamp(averageDistance ? averageDistance * 0.65 : 1250, 500, 2500), 250),
    medium: rounded(clamp(averageDistance ? averageDistance * 1.05 : 2000, 750, 4000), 250),
    hard: rounded(clamp(averageDistance ? averageDistance * 1.15 : 4000, 3000, 6000), 250),
    boss: rounded(clamp(averageDistance ? averageDistance * 1.15 : 6000, 5000, 8000), 250)
  };
  const durationTargets = {
    easy: rounded(clamp(averageDuration ? averageDuration * 0.6 : 600, 300, 1200), 300),
    medium: rounded(clamp(averageDuration ? averageDuration * 1.05 : 1200, 600, 1800), 300),
    hard: rounded(clamp(averageDuration ? averageDuration * 1.1 : 2100, 1800, 2700), 300),
    boss: rounded(clamp(averageDuration ? averageDuration * 1.15 : 3000, 2700, 3600), 300)
  };
  const pushupTargets = {
    easy: rounded(clamp(averagePushups ? averagePushups * 0.65 : 10, 5, 20), 5),
    medium: rounded(clamp(averagePushups ? averagePushups * 1.05 : 20, 10, 30), 5),
    hard: rounded(clamp(averagePushups ? averagePushups * 1.1 : 30, 25, 45), 5),
    boss: rounded(clamp(averagePushups ? averagePushups * 1.15 : 40, 35, 60), 5)
  };

  return (['easy', 'medium', 'hard', 'boss'] as MissionDifficulty[]).flatMap((difficulty) => {
    const optionalUnlock = difficulty === 'boss'
      ? { optionalUnlockId: 'boss-quest-clear', optionalUnlockName: 'Boss Quest Clear badge' }
      : {};
    const activityTarget = difficulty === 'easy' ? 1 : difficulty === 'medium' ? 1 : difficulty === 'hard' ? 2 : 3;
    const templates = [
      createTemplate(
        `${difficulty}-activity-rhythm`,
        'complete_activity',
        activityTarget === 1 ? 'Complete one activity today' : `Complete ${activityTarget} activities today`,
        activityTarget,
        difficulty,
        0.35,
        optionalUnlock,
        context.userLevel
      ),
      createTemplate(
        `${difficulty}-distance`,
        'distance_walk_run',
        `Walk or run ${(distanceTargets[difficulty] / 1000).toFixed(distanceTargets[difficulty] % 1000 ? 2 : 0)} km`,
        distanceTargets[difficulty],
        difficulty,
        0.7,
        optionalUnlock,
        context.userLevel
      ),
      createTemplate(
        `${difficulty}-pushups`,
        'pushups',
        `Complete ${pushupTargets[difficulty]} pushups`,
        pushupTargets[difficulty],
        difficulty,
        0.65,
        optionalUnlock,
        context.userLevel
      ),
      createTemplate(
        `${difficulty}-duration`,
        'workout_duration',
        `Complete ${Math.round(durationTargets[difficulty] / 60)} active minutes`,
        durationTargets[difficulty],
        difficulty,
        difficulty === 'easy' ? 0.25 : 0.6,
        optionalUnlock,
        context.userLevel
      )
    ];

    return templates.filter((template) => {
      if (difficulty === 'easy' || difficulty === 'medium') return true;
      if (template.type === 'complete_activity') return recent.length >= (difficulty === 'boss' ? 8 : 4);
      if (template.type === 'distance_walk_run') return averageDistance >= (difficulty === 'boss' ? 5000 : 2500);
      if (template.type === 'workout_duration') return averageDuration >= (difficulty === 'boss' ? 2400 : 1500);
      if (template.type === 'pushups') return averagePushups >= (difficulty === 'boss' ? 35 : 25);
      return false;
    });
  });
};

const createTemplate = (
  templateId: string,
  type: MissionType,
  title: string,
  targetValue: number,
  difficulty: MissionDifficulty,
  intensity: number,
  optionalUnlock: Pick<MissionTemplate, 'optionalUnlockId' | 'optionalUnlockName'>,
  userLevel: number
): MissionTemplate => {
  const rewards = rewardsForDifficulty(difficulty, intensity, userLevel);
  return {
    templateId,
    type,
    title,
    difficulty,
    targetValue,
    rewardExp: rewards.exp,
    rewardCoins: rewards.coins,
    optionalUnlockId: optionalUnlock.optionalUnlockId ?? null,
    optionalUnlockName: optionalUnlock.optionalUnlockName ?? null
  };
};

const rewardsForDifficulty = (difficulty: MissionDifficulty, intensity: number, userLevel: number) => {
  const range = REWARD_RANGES[difficulty];
  const levelAdjustment = Math.min(0.12, Math.max(0, userLevel - 1) * 0.01);
  const ratio = clamp(intensity + levelAdjustment, 0, 1);
  return {
    exp: Math.round(range.exp[0] + (range.exp[1] - range.exp[0]) * ratio),
    coins: Math.round(range.coins[0] + (range.coins[1] - range.coins[0]) * ratio)
  };
};

const chooseAdvancedDifficulty = (context: MissionGenerationContext, seed: number): MissionDifficulty => {
  const recent = context.recentActivities;
  const distanceAverage = average(
    recent
      .filter((activity) => ['walk', 'run'].includes(activity.type))
      .map((activity) => activity.distanceMeters ?? 0)
      .filter((value) => value > 0)
  );
  const durationAverage = average(recent.map((activity) => activity.durationSeconds).filter((value) => value > 0));
  const pushupAverage = average(recent.filter((activity) => activity.type === 'pushups').map((activity) => activity.reps ?? 0));
  const bossReady =
    context.userLevel >= 8 &&
    recent.length >= 8 &&
    (distanceAverage >= 5000 || durationAverage >= 2400 || pushupAverage >= 35);
  const hardReady =
    context.userLevel >= 4 &&
    recent.length >= 4 &&
    (distanceAverage >= 2500 || durationAverage >= 1500 || pushupAverage >= 25);

  if (bossReady && seed % 7 === 0) return 'boss';
  if (hardReady) return 'hard';
  return 'medium';
};

const average = (values: number[]) =>
  values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;

const rounded = (value: number, step: number) => Math.max(step, Math.round(value / step) * step);
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));
const dateSeed = (date: string) => date.replace(/\D/g, '').split('').reduce((sum, digit) => sum + Number(digit), 0);
