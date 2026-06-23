import { supabase } from '@/lib/supabase';
import { LevelUpCelebration } from '@/types/domain';
import { normalizePendingLevelUps } from '@/utils/levelUpBatch';

export const listPendingLevelUps = async (userId: string) => {
  const [firstResult, lastResult] = await Promise.all([
    supabase
      .from('level_up_celebrations')
      .select('*')
      .eq('user_id', userId)
      .is('viewed_at', null)
      .order('level', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('level_up_celebrations')
      .select('*')
      .eq('user_id', userId)
      .is('viewed_at', null)
      .order('level', { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  if (firstResult.error) throw firstResult.error;
  if (lastResult.error) throw lastResult.error;
  return normalizePendingLevelUps(
    [firstResult.data, lastResult.data]
      .filter((row): row is NonNullable<typeof row> => Boolean(row))
      .map(mapLevelUpCelebration)
  );
};

export const markLevelUpBatchViewed = async (firstLevel: number, finalLevel: number) => {
  const { data, error } = await supabase.rpc('mark_level_up_batch_viewed', {
    p_first_level: firstLevel,
    p_final_level: finalLevel
  });

  if (error) throw error;
  return Number(data ?? 0);
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
