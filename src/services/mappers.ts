import { Activity, Character, Mission, Profile } from '@/types/domain';

export const mapProfile = (row: {
  id: string;
  username: string;
  unit_preference: Profile['unitPreference'];
  created_at: string;
}): Profile => ({
  id: row.id,
  username: row.username,
  unitPreference: row.unit_preference,
  createdAt: row.created_at
});

export const mapCharacter = (row: {
  id: string;
  user_id: string;
  level: number;
  total_exp: number;
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
  started_at: string;
  completed_at: string;
  duration_seconds: number;
  distance_meters: number | null;
  route: Activity['route'] | null;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
  exp_earned: number;
  stat_exp: Activity['statExp'];
}): Activity => ({
  id: row.id,
  userId: row.user_id,
  type: row.type,
  startedAt: row.started_at,
  completedAt: row.completed_at,
  durationSeconds: row.duration_seconds,
  distanceMeters: row.distance_meters ?? undefined,
  route: row.route ?? undefined,
  sets: row.sets ?? undefined,
  reps: row.reps ?? undefined,
  weightKg: row.weight_kg ?? undefined,
  expEarned: row.exp_earned,
  statExp: row.stat_exp
});

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
