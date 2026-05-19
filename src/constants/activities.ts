import { ActivityType, GpsActivityType, ManualActivityType, StatKey } from '@/types/domain';

export const GPS_ACTIVITY_TYPES: GpsActivityType[] = ['run', 'walk', 'bike', 'hike'];
export const MANUAL_ACTIVITY_TYPES: ManualActivityType[] = [
  'gym_workout',
  'pushups',
  'swimming',
  'other_workout'
];

export const ACTIVITY_LABELS: Record<ActivityType, string> = {
  run: 'Run',
  walk: 'Walk',
  bike: 'Bike',
  hike: 'Hike',
  gym_workout: 'Gym workout',
  pushups: 'Pushups',
  swimming: 'Swimming',
  other_workout: 'Other workout'
};

export const ACTIVITY_STAT_WEIGHTS: Record<ActivityType, Partial<Record<StatKey, number>>> = {
  run: { endurance: 0.45, speed: 0.35, consistency: 0.2 },
  walk: { endurance: 0.45, consistency: 0.4, speed: 0.15 },
  bike: { endurance: 0.55, speed: 0.3, consistency: 0.15 },
  hike: { endurance: 0.55, strength: 0.2, consistency: 0.25 },
  gym_workout: { strength: 0.65, endurance: 0.15, consistency: 0.2 },
  pushups: { strength: 0.7, consistency: 0.3 },
  swimming: { endurance: 0.55, strength: 0.25, consistency: 0.2 },
  other_workout: { consistency: 0.45, endurance: 0.3, strength: 0.25 }
};

export const isGpsActivity = (type: ActivityType): type is GpsActivityType =>
  GPS_ACTIVITY_TYPES.includes(type as GpsActivityType);
