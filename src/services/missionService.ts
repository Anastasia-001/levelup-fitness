import { supabase } from '@/lib/supabase';
import { mapMission } from '@/services/mappers';
import { buildDailyMissions } from '@/utils/missions';
import { todayKey } from '@/utils/format';

export const getTodayMissions = async (userId: string) => {
  const missionDate = todayKey();
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', userId)
    .eq('mission_date', missionDate)
    .order('id', { ascending: true });

  if (error) throw error;

  if (data.length > 0) {
    return data.map(mapMission);
  }

  const { data: inserted, error: insertError } = await supabase
    .from('missions')
    .insert(
      buildDailyMissions(userId, missionDate).map((mission) => ({
        user_id: mission.userId,
        mission_date: mission.missionDate,
        type: mission.type,
        title: mission.title,
        target_value: mission.targetValue,
        progress: mission.progress,
        reward_exp: mission.rewardExp,
        completed_at: null
      }))
    )
    .select();

  if (insertError) throw insertError;
  return inserted.map(mapMission);
};
