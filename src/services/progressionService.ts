import { ACHIEVEMENT_IDS } from '@/constants/achievements';
import { supabase } from '@/lib/supabase';
import { mapPersonalRecord, mapProgressionStreaks, mapUserAchievement } from '@/services/mappers';
import { getCharacter } from '@/services/profileService';
import { Activity, PersonalRecord } from '@/types/domain';
import {
  buildBestPersonalRecordCandidateGroups,
  buildPersonalRecordCandidates,
  localDateKey,
  PersonalRecordCandidate
} from '@/utils/progression';

export const listUserAchievements = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_achievements')
    .select('*')
    .eq('user_id', userId)
    .order('unlocked_at', { ascending: false });

  if (error) throw error;
  return data.map(mapUserAchievement);
};

export const listPersonalRecords = async (userId: string) => {
  const { data, error } = await supabase
    .from('personal_records')
    .select('*')
    .eq('user_id', userId)
    .order('achieved_at', { ascending: false });

  if (error) throw error;
  return data.map(mapPersonalRecord);
};

export const refreshProgressionMilestones = async ({
  userId,
  activities,
  newActivity
}: {
  userId: string;
  activities: Activity[];
  newActivity?: Activity;
}) => {
  let newPersonalRecords: PersonalRecord[] = [];
  let activitiesChanged = false;
  const currentRecords = await listPersonalRecords(userId);

  if (newActivity) {
    newPersonalRecords = await upsertActivityPersonalRecords(
      newActivity,
      buildPersonalRecordCandidates(newActivity, activities)
    );
    activitiesChanged = newPersonalRecords.length > 0;
  } else if (currentRecords.length === 0 && activities.length > 0) {
    const backfilledRecords = await rebuildPersonalRecords(activities);
    activitiesChanged = backfilledRecords.length > 0;
  }

  const { data: streakData, error: streakError } = await supabase.rpc('refresh_progression_streaks', {
    p_local_today: localDateKey()
  });
  if (streakError) throw streakError;

  const streakRow = Array.isArray(streakData) ? streakData[0] : streakData;
  if (!streakRow) {
    throw new Error('Progression streak refresh returned no data.');
  }

  const { error: unlockError } = await supabase.rpc('unlock_achievements', {
    p_achievement_ids: ACHIEVEMENT_IDS
  });
  if (unlockError) throw unlockError;

  const [achievements, personalRecords, character] = await Promise.all([
    listUserAchievements(userId),
    listPersonalRecords(userId),
    getCharacter(userId)
  ]);

  return {
    streaks: mapProgressionStreaks(streakRow),
    achievements,
    personalRecords,
    newPersonalRecords,
    activitiesChanged,
    character
  };
};

export const rebuildPersonalRecords = async (activities: Activity[]) => {
  const groups = buildBestPersonalRecordCandidateGroups(activities).map((group) => ({
    activity_id: group.activity.id,
    candidates: group.candidates
  }));
  const { data, error } = await supabase.rpc('rebuild_personal_records', {
    p_activity_groups: groups
  });

  if (error) throw error;
  return (data ?? []).map(mapPersonalRecord);
};

const upsertActivityPersonalRecords = async (
  activity: Activity,
  candidates: PersonalRecordCandidate[]
) => {
  if (!candidates.length) return [];

  const { data, error } = await supabase.rpc('upsert_personal_records', {
    p_activity_id: activity.id,
    p_candidates: candidates
  });

  if (error) throw error;
  return (data ?? []).map(mapPersonalRecord);
};
