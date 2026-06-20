import {
  Activity,
  Character,
  Mission,
  PersonalRecord,
  Profile,
  ProgressionStreaks,
  RoutePoint,
  UserAchievement
} from '@/types/domain';
import { localDateKey, localWeekStartKey } from '@/utils/progression';

export const mapProfile = (row: {
  id: string;
  username: string;
  location: string | null;
  unit_preference: Profile['unitPreference'];
  privacy_controls_enabled: boolean;
  health_data_enabled: boolean;
  email_notifications_enabled: boolean;
  push_notifications_enabled: boolean;
  created_at: string;
}): Profile => ({
  id: row.id,
  username: row.username,
  location: row.location,
  unitPreference: row.unit_preference,
  privacyControlsEnabled: row.privacy_controls_enabled,
  healthDataEnabled: row.health_data_enabled,
  emailNotificationsEnabled: row.email_notifications_enabled,
  pushNotificationsEnabled: row.push_notifications_enabled,
  createdAt: row.created_at
});

export const mapCharacter = (row: {
  id: string;
  user_id: string;
  level: number;
  total_exp: number;
  coins: number;
  endurance_exp: number;
  speed_exp: number;
  strength_exp: number;
  consistency_exp: number;
  updated_at: string;
}): Character => ({
  id: row.id,
  userId: row.user_id,
  level: row.level,
  totalExp: row.total_exp,
  coins: row.coins,
  enduranceExp: row.endurance_exp,
  speedExp: row.speed_exp,
  strengthExp: row.strength_exp,
  consistencyExp: row.consistency_exp,
  updatedAt: row.updated_at
});

export const mapActivity = (row: {
  id: string;
  user_id: string;
  type: Activity['type'];
  title: string | null;
  started_at: string;
  completed_at: string;
  local_date?: string | null;
  local_week_start?: string | null;
  duration_seconds: number;
  distance_meters: number | null;
  route: unknown;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  photo_url: string | null;
  photo_path: string | null;
  personal_record_ids?: string[] | null;
  exp_earned: number;
  stat_exp: Activity['statExp'];
}): Activity => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  title: row.title ?? fallbackActivityTitle(row.type),
  startedAt: row.started_at,
  completedAt: row.completed_at,
  localDate: row.local_date ?? localDateKey(new Date(row.completed_at)),
  localWeekStart: row.local_week_start ?? localWeekStartKey(new Date(row.completed_at)),
  durationSeconds: row.duration_seconds,
  distanceMeters: row.distance_meters ?? undefined,
  route: mapRoute(row.route),
  sets: row.sets ?? undefined,
  reps: row.reps ?? undefined,
  weightKg: row.weight_kg ?? undefined,
  photoUrl: row.photo_url ?? undefined,
  photoPath: row.photo_path ?? undefined,
  personalRecordIds: row.personal_record_ids ?? [],
  expEarned: row.exp_earned,
  statExp: row.stat_exp
});

export const fallbackActivityTitle = (type: Activity['type']) => {
  if (type === 'run') return 'Run';
  if (type === 'bike') return 'Bike ride';
  if (type === 'walk') return 'Walk';
  return 'Workout';
};

const mapRoute = (value: unknown): RoutePoint[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  const points = value
    .map((point, index) => mapRoutePoint(point, index))
    .filter((point): point is RoutePoint => Boolean(point));

  return points.length ? points : undefined;
};

const mapRoutePoint = (value: unknown, index: number): RoutePoint | null => {
  if (!value || typeof value !== 'object') return null;

  const point = value as Record<string, unknown>;
  const latitude = Number(point.latitude);
  const longitude = Number(point.longitude);
  const timestamp = Number(point.timestamp);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  return {
    latitude,
    longitude,
    altitude: nullableNumber(point.altitude),
    accuracy: nullableNumber(point.accuracy),
    speed: nullableNumber(point.speed),
    segmentId: Number.isFinite(Number(point.segmentId)) ? Number(point.segmentId) : 0,
    timestamp: Number.isFinite(timestamp) ? timestamp : index
  };
};

const nullableNumber = (value: unknown) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};

export const mapMission = (row: {
  id: string;
  user_id: string;
  mission_date: string;
  type: Mission['type'];
  title: string;
  target_value: number;
  progress: number;
  reward_exp: number;
  completed_at: string | null;
}): Mission => ({
  id: row.id,
  userId: row.user_id,
  missionDate: row.mission_date,
  type: row.type,
  title: row.title,
  targetValue: row.target_value,
  progress: row.progress,
  rewardExp: row.reward_exp,
  completedAt: row.completed_at
});

export const mapProgressionStreaks = (row: {
  user_id: string;
  current_activity_day_streak: number;
  longest_activity_day_streak: number;
  current_weekly_consistency_streak: number;
  longest_weekly_consistency_streak: number;
  weekly_target: number;
  last_activity_date: string | null;
  last_qualified_week_start: string | null;
  updated_at: string;
}): ProgressionStreaks => ({
  userId: row.user_id,
  currentActivityDayStreak: row.current_activity_day_streak,
  longestActivityDayStreak: row.longest_activity_day_streak,
  currentWeeklyConsistencyStreak: row.current_weekly_consistency_streak,
  longestWeeklyConsistencyStreak: row.longest_weekly_consistency_streak,
  weeklyTarget: row.weekly_target,
  lastActivityDate: row.last_activity_date,
  lastQualifiedWeekStart: row.last_qualified_week_start,
  updatedAt: row.updated_at
});

export const mapUserAchievement = (row: {
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  claimed_at: string | null;
}): UserAchievement => ({
  userId: row.user_id,
  achievementId: row.achievement_id,
  unlockedAt: row.unlocked_at,
  claimedAt: row.claimed_at
});

export const mapPersonalRecord = (row: {
  id: string;
  user_id: string;
  record_type: PersonalRecord['recordType'];
  sport_key: PersonalRecord['sportKey'];
  value: number;
  activity_id: string | null;
  period_start: string | null;
  achieved_at: string;
}): PersonalRecord => ({
  id: row.id,
  userId: row.user_id,
  recordType: row.record_type,
  sportKey: row.sport_key,
  value: Number(row.value),
  activityId: row.activity_id,
  periodStart: row.period_start,
  achievedAt: row.achieved_at
});
