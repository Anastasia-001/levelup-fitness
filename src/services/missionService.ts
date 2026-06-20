import { supabase } from '@/lib/supabase';
import { mapActivity, mapMission } from '@/services/mappers';
import { getCharacter } from '@/services/profileService';
import { Mission } from '@/types/domain';
import {
  buildDailyMissions,
  buildRerollTemplate,
  MissionGenerationContext
} from '@/utils/missions';
import { localDateKey } from '@/utils/progression';

export const getTodayMissions = async (userId: string) => {
  const missionDate = localDateKey();
  const existing = await listMissionsForDate(userId, missionDate);
  if (existing.length > 0) return existing;

  const context = await getMissionGenerationContext(userId, missionDate);
  const payload = buildDailyMissions(userId, missionDate, context).map((mission) => ({
    user_id: mission.userId,
    mission_date: mission.missionDate,
    template_id: mission.templateId,
    type: mission.type,
    title: mission.title,
    difficulty: mission.difficulty,
    target_value: mission.targetValue,
    progress: mission.progress,
    reward_exp: mission.rewardExp,
    reward_coins: mission.rewardCoins,
    optional_unlock_id: mission.optionalUnlockId ?? null,
    optional_unlock_name: mission.optionalUnlockName ?? null,
    completed_at: null
  }));
  const { data, error } = await supabase.from('missions').insert(payload).select();

  if (error) {
    if (error.code === '23505') return listMissionsForDate(userId, missionDate);
    throw error;
  }
  return data.map(mapMission);
};

export const getDailyRerollsRemaining = async (userId: string, missionDate = localDateKey()) => {
  const { data, error } = await supabase
    .from('mission_daily_rerolls')
    .select('used_at')
    .eq('user_id', userId)
    .eq('mission_date', missionDate)
    .maybeSingle();

  if (error) throw error;
  return data ? 0 : 1;
};

export const rerollMission = async (
  userId: string,
  mission: Mission,
  existingMissions: Mission[]
) => {
  if (mission.completedAt) throw new Error('Completed missions cannot be rerolled.');
  const context = await getMissionGenerationContext(userId, mission.missionDate);
  const replacement = buildRerollTemplate(mission, existingMissions, context);
  if (!replacement) throw new Error('No safe replacement is available for this mission.');

  const { data, error } = await supabase.rpc('reroll_daily_mission', {
    p_mission_id: mission.id,
    p_replacement: {
      template_id: replacement.templateId,
      type: replacement.type,
      title: replacement.title,
      difficulty: replacement.difficulty,
      target_value: replacement.targetValue,
      reward_exp: replacement.rewardExp,
      reward_coins: replacement.rewardCoins,
      optional_unlock_id: replacement.optionalUnlockId ?? null,
      optional_unlock_name: replacement.optionalUnlockName ?? null
    }
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Mission reroll returned no replacement.');
  return mapMission(row);
};

const listMissionsForDate = async (userId: string, missionDate: string) => {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', userId)
    .eq('mission_date', missionDate)
    .order('id', { ascending: true });

  if (error) throw error;
  return data.map(mapMission);
};

const getMissionGenerationContext = async (
  userId: string,
  missionDate: string
): Promise<MissionGenerationContext> => {
  const since = new Date();
  since.setDate(since.getDate() - 28);
  const [character, activityResult] = await Promise.all([
    getCharacter(userId),
    supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_at', since.toISOString())
      .order('completed_at', { ascending: false })
  ]);

  if (activityResult.error) throw activityResult.error;
  return {
    userLevel: character.level,
    recentActivities: activityResult.data.map(mapActivity),
    missionDate
  };
};
