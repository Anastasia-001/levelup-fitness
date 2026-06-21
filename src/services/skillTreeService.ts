import { supabase } from '@/lib/supabase';
import { SkillTreeProgress } from '@/types/domain';

const mapProgress = (
  row: { user_id: string; points_earned: number; points_spent: number; updated_at: string },
  unlockedNodeIds: string[]
): SkillTreeProgress => ({
  userId: row.user_id,
  pointsEarned: row.points_earned,
  pointsSpent: row.points_spent,
  availablePoints: Math.max(0, row.points_earned - row.points_spent),
  unlockedNodeIds,
  updatedAt: row.updated_at
});

const listUnlockedNodeIds = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_skill_nodes')
    .select('node_id')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: true });
  if (error) throw error;
  return data.map((row) => row.node_id);
};

export const syncSkillTreeProgress = async (userId: string) => {
  const { data, error } = await supabase.rpc('sync_skill_tree_progress', {});
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Skill tree progress could not be loaded.');
  return mapProgress(row, await listUnlockedNodeIds(userId));
};

export const unlockSkillNode = async (userId: string, nodeId: string) => {
  const { data, error } = await supabase.rpc('unlock_skill_node', { p_node_id: nodeId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Skill node could not be unlocked.');
  return mapProgress(row, await listUnlockedNodeIds(userId));
};
