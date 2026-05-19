import { ACTIVITY_LABELS } from '@/constants/activities';
import { Activity, Mission, MissionTemplate } from '@/types/domain';
import { todayKey } from '@/utils/format';

const DAILY_TEMPLATES: MissionTemplate[] = [
  {
    type: 'complete_activity',
    title: 'Complete one activity today',
    targetValue: 1,
    rewardExp: 30
  },
  {
    type: 'distance_walk_run',
    title: 'Walk or run 2 km',
    targetValue: 2000,
    rewardExp: 45
  },
  {
    type: 'pushups',
    title: 'Do 20 pushups',
    targetValue: 20,
    rewardExp: 35
  },
  {
    type: 'workout_duration',
    title: 'Complete a 15-minute workout',
    targetValue: 900,
    rewardExp: 40
  }
];

export const generateDailyMissionTemplates = () => {
  const day = new Date().getDate();
  const rotated = DAILY_TEMPLATES.map((_, index) => DAILY_TEMPLATES[(index + day) % DAILY_TEMPLATES.length]);
  return rotated.slice(0, 3);
};

export const buildDailyMissions = (userId: string, missionDate = todayKey()): Omit<Mission, 'id'>[] =>
  generateDailyMissionTemplates().map((template) => ({
    ...template,
    userId,
    missionDate,
    progress: 0,
    completedAt: null
  }));

export const progressMissionWithActivity = (mission: Mission, activity: Activity): Mission => {
  if (mission.completedAt) {
    return mission;
  }

  let progress = mission.progress;

  if (mission.type === 'complete_activity') {
    progress += 1;
  }

  if (mission.type === 'distance_walk_run' && ['walk', 'run'].includes(activity.type)) {
    progress += activity.distanceMeters ?? 0;
  }

  if (mission.type === 'pushups' && activity.type === 'pushups') {
    progress += activity.reps ?? 0;
  }

  if (mission.type === 'workout_duration') {
    progress += activity.durationSeconds;
  }

  return {
    ...mission,
    progress: Math.min(progress, mission.targetValue),
    completedAt: progress >= mission.targetValue ? new Date().toISOString() : null
  };
};

export const missionActivitySummary = (activity: Activity) =>
  `${ACTIVITY_LABELS[activity.type]} saved for ${new Date(activity.completedAt).toLocaleDateString()}`;
