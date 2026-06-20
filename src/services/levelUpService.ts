import { supabase } from '@/lib/supabase';
import { LevelUpCelebration } from '@/types/domain';

export const listPendingLevelUps = async (userId: string) => {
  const { data, error } = await supabase
    .from('level_up_celebrations')
    .select('*')
    .eq('user_id', userId)
    .is('viewed_at', null)
    .order('level', { ascending: true });

  if (error) throw error;
  return data.map(mapLevelUpCelebration);
};

export const markLevelUpViewed = async (level: number) => {
  const { data, error } = await supabase.rpc('mark_level_up_viewed', {
    p_level: level
  });

  if (error) throw error;
  return mapLevelUpCelebration(Array.isArray(data) ? data[0] : data);
};

const mapLevelUpCelebration = (row: {
  user_id: string;
  level: number;
  previous_level: number;
  queued_at: string;
  viewed_at: string | null;
}): LevelUpCelebration => ({
  userId: row.user_id,
  level: row.level,
  previousLevel: row.previous_level,
  queuedAt: row.queued_at,
  viewedAt: row.viewed_at
});
