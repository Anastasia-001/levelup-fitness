import { supabase } from '@/lib/supabase';
import { CharacterPoseId, CharacterPresentation } from '@/types/domain';

const mapPresentation = (row: {
  user_id: string;
  equipped_pose: CharacterPoseId;
  highest_evolution_stage: CharacterPresentation['highestEvolutionStage'];
  updated_at: string;
}): CharacterPresentation => ({
  userId: row.user_id,
  equippedPose: row.equipped_pose,
  highestEvolutionStage: row.highest_evolution_stage,
  updatedAt: row.updated_at
});

export const syncCharacterPresentation = async () => {
  const { data, error } = await supabase.rpc('sync_character_presentation', {});
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Character presentation could not be loaded.');
  return mapPresentation(row);
};

export const setCharacterPose = async (pose: CharacterPoseId) => {
  const { data, error } = await supabase.rpc('set_character_pose', { p_pose: pose });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error('Character pose could not be saved.');
  return mapPresentation(row);
};
