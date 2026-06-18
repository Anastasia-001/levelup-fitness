import type { ActivityType } from '@/types/domain';

export const GPS_MIN_TIME_MS = 1000;
export const GPS_MIN_DISTANCE_METERS = 2;
export const GPS_MAX_ACCURACY_METERS = 35;
export const GPS_LONG_TRACKING_GAP_MS = 45_000;
export const GPS_DUPLICATE_TIME_WINDOW_MS = 8000;
export const GPS_BACKGROUND_MAX_QUEUED_POINTS = 6000;

export const GPS_MAX_REASONABLE_SPEED_BY_SPORT: Record<ActivityType, number> = {
  walk: 2.8,
  hike: 4.2,
  run: 7.5,
  bike: 22,
  gym_workout: 4,
  pushups: 4,
  swimming: 4,
  other_workout: 4
};
