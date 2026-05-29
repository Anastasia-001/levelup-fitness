import { supabase } from '@/lib/supabase';
import { mapActivity, mapCharacter, mapMission } from '@/services/mappers';
import { getCharacter } from '@/services/profileService';
import { Activity, ActivityInput, Character, Mission } from '@/types/domain';
import { applyExpToCharacter, calculateActivityExp, levelFromTotalExp } from '@/utils/exp';
import { progressMissionWithActivity } from '@/utils/missions';
import { todayKey } from '@/utils/format';

const persistCharacter = async (character: Character) => {
  const { data, error } = await supabase
    .from('characters')
    .update({
      level: character.level,
      total_exp: character.totalExp,
      coins: character.coins,
      endurance_exp: character.enduranceExp,
      speed_exp: character.speedExp,
      strength_exp: character.strengthExp,
      consistency_exp: character.consistencyExp
    })
    .eq('id', character.id)
    .select()
    .single();

  if (error) throw error;
  return mapCharacter(data);
};

export const listActivities = async (userId: string) => {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('user_id', userId)
    .order('completed_at', { ascending: false });

  if (error) throw error;
  return data.map(mapActivity);
};

export const saveActivity = async (userId: string, input: ActivityInput) => {
  const { expEarned, statExp } = calculateActivityExp(input);
  const completedAt = new Date().toISOString();
  const startedAt = new Date(Date.now() - input.durationSeconds * 1000).toISOString();

  const { data, error } = await supabase
    .from('activities')
    .insert({
      user_id: userId,
      type: input.type,
      started_at: startedAt,
      completed_at: completedAt,
      duration_seconds: Math.round(input.durationSeconds),
      distance_meters: input.distanceMeters ?? null,
      route: input.route ?? null,
      sets: input.sets ?? null,
      reps: input.reps ?? null,
      weight_kg: input.weightKg ?? null,
      photo_url: input.photoUrl ?? null,
      photo_path: input.photoPath ?? null,
      exp_earned: expEarned,
      stat_exp: statExp
    })
    .select()
    .single();

  if (error) throw error;

  const activity = mapActivity(data);
  const currentCharacter = await getCharacter(userId);
  const afterActivity = applyExpToCharacter(currentCharacter, expEarned, statExp);
  const { missions, bonusExp } = await completeMatchingMissions(userId, activity);
  const afterMissions = applyMissionBonus(afterActivity, bonusExp);
  const character = await persistCharacter(afterMissions);

  return { activity, character, missions, expEarned: expEarned + bonusExp, bonusExp };
};

export const updateActivityPhoto = async (
  activityId: string,
  values: { photoUrl: string; photoPath: string }
) => {
  const { data, error } = await supabase
    .from('activities')
    .update({
      photo_url: values.photoUrl,
      photo_path: values.photoPath
    })
    .eq('id', activityId)
    .select()
    .single();

  if (error) throw error;
  return mapActivity(data);
};

export const uploadActivityPhoto = async (
  userId: string,
  activityId: string,
  uri: string
) => {
  const response = await fetch(uri);
  const blob = await response.blob();
  const extension = uri.split('.').pop()?.split('?')[0] || 'jpg';
  const path = `${userId}/${activityId}-${Date.now()}.${extension}`;

  const { error } = await supabase.storage
    .from('activity-photos')
    .upload(path, blob, {
      contentType: blob.type || 'image/jpeg',
      upsert: true
    });

  if (error) throw error;

  const { data } = supabase.storage.from('activity-photos').getPublicUrl(path);
  return updateActivityPhoto(activityId, { photoUrl: data.publicUrl, photoPath: path });
};

const applyMissionBonus = (character: Character, bonusExp: number): Character => {
  if (bonusExp <= 0) {
    return character;
  }

  const totalExp = character.totalExp + bonusExp;
  return {
    ...character,
    level: levelFromTotalExp(totalExp).level,
    totalExp,
    coins: character.coins + bonusExp,
    consistencyExp: character.consistencyExp + Math.round(bonusExp * 0.35),
    updatedAt: new Date().toISOString()
  };
};

const completeMatchingMissions = async (userId: string, activity: Activity) => {
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', userId)
    .eq('mission_date', todayKey());

  if (error) throw error;

  let bonusExp = 0;
  const updatedMissions: Mission[] = [];

  for (const row of data) {
    const current = mapMission(row);
    const updated = progressMissionWithActivity(current, activity);

    if (
      updated.progress !== current.progress ||
      updated.completedAt !== current.completedAt
    ) {
      const completedNow = !current.completedAt && Boolean(updated.completedAt);
      if (completedNow) {
        bonusExp += updated.rewardExp;
      }

      const { data: saved, error: updateError } = await supabase
        .from('missions')
        .update({
          progress: updated.progress,
          completed_at: updated.completedAt ?? null
        })
        .eq('id', updated.id)
        .select()
        .single();

      if (updateError) throw updateError;
      updatedMissions.push(mapMission(saved));
    } else {
      updatedMissions.push(current);
    }
  }

  return { missions: updatedMissions, bonusExp };
};
