import { Activity, Character, Mission, Profile } from '@/types/domain';

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
  duration_seconds: number;
  distance_meters: number | null;
  route: Activity['route'] | null;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  photo_url: string | null;
  photo_path: string | null;
  exp_earned: number;
  stat_exp: Activity['statExp'];
}): Activity => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  title: row.title ?? fallbackActivityTitle(row.type),
  startedAt: row.started_at,
  completedAt: row.completed_at,
  durationSeconds: row.duration_seconds,
  distanceMeters: row.distance_meters ?? undefined,
  route: row.route ?? undefined,
  sets: row.sets ?? undefined,
  reps: row.reps ?? undefined,
  weightKg: row.weight_kg ?? undefined,
  photoUrl: row.photo_url ?? undefined,
  photoPath: row.photo_path ?? undefined,
  expEarned: row.exp_earned,
  statExp: row.stat_exp
});

export const fallbackActivityTitle = (type: Activity['type']) => {
  if (type === 'run') return 'Run';
  if (type === 'bike') return 'Bike ride';
  if (type === 'walk') return 'Walk';
  return 'Workout';
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
