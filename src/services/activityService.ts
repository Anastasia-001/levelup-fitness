import { supabase } from '@/lib/supabase';
import { fallbackActivityTitle, mapActivity, mapCharacter, mapMission } from '@/services/mappers';
import { getCharacter } from '@/services/profileService';
import { Activity, ActivityInput, ActivityType, Character, Database, Mission, RoutePoint, StatKey } from '@/types/domain';
import { applyExpToCharacter, calculateActivityExp, levelFromTotalExp } from '@/utils/exp';
import { progressMissionWithActivity } from '@/utils/missions';
import { todayKey } from '@/utils/format';

type PickedActivityPhoto = {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
  fileName?: string | null;
};

type ActivityInsert = Database['public']['Tables']['activities']['Insert'];

type SaveActivityResult = {
  activity: Activity;
  character: Character | null;
  missions: Mission[];
  expEarned: number;
  bonusExp: number;
  sideEffectError?: string;
};

const ACTIVITY_SCHEMA_DRIFT_COLUMNS = ['title', 'photo_url', 'photo_path', 'route'] as const satisfies readonly (keyof ActivityInsert)[];

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
  const payload: ActivityInsert = {
    user_id: userId,
    type: input.type,
    title: input.title?.trim() || fallbackActivityTitle(input.type),
    started_at: startedAt,
    completed_at: completedAt,
    duration_seconds: Math.max(1, Math.round(input.durationSeconds)),
    distance_meters: input.distanceMeters ?? null,
    route: normalizeRoute(input.route),
    sets: input.sets ?? null,
    reps: input.reps ?? null,
    weight_kg: input.weightKg ?? null,
    photo_url: input.photoUrl ?? null,
    photo_path: input.photoPath ?? null,
    exp_earned: expEarned,
    stat_exp: statExp
  };

  const data = await insertActivity(payload);
  const activity = mapActivity(data);
  return applyActivitySideEffects(userId, activity, expEarned, statExp);
};

const insertActivity = async (payload: ActivityInsert) => {
  let nextPayload = payload;
  const removedColumns = new Set<keyof ActivityInsert>();

  for (let attempt = 0; attempt <= ACTIVITY_SCHEMA_DRIFT_COLUMNS.length; attempt += 1) {
    const { data, error } = await supabase
      .from('activities')
      .insert(nextPayload)
      .select()
      .single();

    if (!error) {
      if (attempt > 0 && __DEV__) {
        console.warn('[LevelUp] Activity saved with a legacy-compatible payload. Run the latest Supabase migrations to persist newer optional fields.');
      }
      return data;
    }

    logActivitySaveError(attempt === 0 ? 'insert-activity' : 'insert-activity-legacy-retry', nextPayload, error);

    const retryPayload = legacyCompatibleActivityPayload(nextPayload, error, removedColumns);
    if (!retryPayload) {
      throw error;
    }

    nextPayload = retryPayload;
  }

  throw new Error('Activity save failed after retrying schema-compatible payloads.');
};

const applyActivitySideEffects = async (
  userId: string,
  activity: Activity,
  expEarned: number,
  statExp: Record<StatKey, number>
): Promise<SaveActivityResult> => {
  let bonusExp = 0;
  let missions: Mission[] = [];
  let sideEffectError: string | undefined;

  try {
    const currentCharacter = await getCharacter(userId);
    const afterActivity = applyExpToCharacter(currentCharacter, expEarned, statExp);

    try {
      const missionResult = await completeMatchingMissions(userId, activity);
      missions = missionResult.missions;
      bonusExp = missionResult.bonusExp;
    } catch (caught) {
      sideEffectError = errorMessage(caught);
      logActivitySaveError('mission-side-effects', { activity_id: activity.id, user_id: userId }, caught);
    }

    const afterMissions = applyMissionBonus(afterActivity, bonusExp);
    const character = await persistCharacter(afterMissions);
    return { activity, character, missions, expEarned: expEarned + bonusExp, bonusExp, sideEffectError };
  } catch (caught) {
    const message = errorMessage(caught);
    logActivitySaveError('character-side-effects', {
      activity_id: activity.id,
      user_id: userId,
      exp_earned: expEarned,
      bonus_exp: bonusExp,
      stat_exp: statExp
    }, caught);
    return { activity, character: null, missions, expEarned, bonusExp, sideEffectError: sideEffectError ?? message };
  }
};

export const updateActivityTitle = async (activityId: string, title: string, fallbackActivity?: Activity) => {
  const { data, error } = await supabase
    .from('activities')
    .update({
      title
    })
    .eq('id', activityId)
    .select()
    .single();

  if (error) {
    logActivitySaveError('update-activity-title', { activity_id: activityId, title }, error);

    if (fallbackActivity && isMissingColumnError(error, ['title'])) {
      if (__DEV__) {
        console.warn('[LevelUp] Activity title was kept locally because the Supabase activities.title column is missing.');
      }
      return { ...fallbackActivity, title };
    }

    throw error;
  }

  return mapActivity(data);
};

export const updateActivityType = async (activityId: string, type: ActivityType) => {
  const { data, error } = await supabase
    .from('activities')
    .update({
      type
    })
    .eq('id', activityId)
    .select()
    .single();

  if (error) {
    logActivitySaveError('update-activity-type', { activity_id: activityId, type }, error);
    throw error;
  }

  return mapActivity(data);
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

  if (error) {
    logActivitySaveError('update-activity-photo', { activity_id: activityId, ...values }, error);

    if (isMissingColumnError(error, ['photo_url', 'photo_path'])) {
      throw new Error('Activity photo columns are missing. Run the activity photo Supabase migration and try again.');
    }

    throw error;
  }

  return mapActivity(data);
};

const normalizeRoute = (route?: RoutePoint[]) => {
  if (!route?.length) return null;

  const normalized = route
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    .map((point) => ({
      latitude: point.latitude,
      longitude: point.longitude,
      altitude: point.altitude ?? null,
      accuracy: point.accuracy ?? null,
      timestamp: point.timestamp
    }));

  return normalized.length ? normalized : null;
};

const legacyCompatibleActivityPayload = (
  payload: ActivityInsert,
  error: unknown,
  removedColumns: Set<keyof ActivityInsert>
) => {
  const columnsToRemove = ACTIVITY_SCHEMA_DRIFT_COLUMNS.filter(
    (column) => !removedColumns.has(column) && isMissingColumnError(error, [column])
  );

  if (!columnsToRemove.length) return null;

  const retryPayload: Partial<ActivityInsert> = { ...payload };
  columnsToRemove.forEach((column) => {
    delete retryPayload[column];
    removedColumns.add(column);
  });

  return retryPayload as ActivityInsert;
};

const isMissingColumnError = (error: unknown, columns: readonly string[]) => {
  const errorText = JSON.stringify(serializeError(error)).toLowerCase();
  const looksLikeMissingColumn =
    errorText.includes('could not find') ||
    errorText.includes('schema cache') ||
    errorText.includes('column') ||
    errorText.includes('42703') ||
    errorText.includes('pgrst204');

  return looksLikeMissingColumn && columns.some((column) => errorText.includes(column.toLowerCase()));
};

const errorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message ?? 'Unknown error');
  }
  return 'Unknown error';
};

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  if (!error || typeof error !== 'object') {
    return { message: String(error) };
  }

  const value = error as Record<string, unknown>;
  return {
    code: value.code,
    message: value.message,
    details: value.details,
    hint: value.hint,
    status: value.status,
    raw: value
  };
};

const logActivitySaveError = (stage: string, payload: unknown, error: unknown) => {
  if (!__DEV__) return;
  console.error('[LevelUp] Activity save error', {
    stage,
    payload,
    error: serializeError(error)
  });
};

export const uploadActivityPhoto = async (
  userId: string,
  activityId: string,
  photo: PickedActivityPhoto
) => {
  const uploadBody = photo.base64
    ? base64ToArrayBuffer(photo.base64)
    : await localUriToArrayBuffer(photo.uri);
  const contentType = photo.mimeType || contentTypeFromUri(photo.uri);
  const extension = extensionForPhoto(photo, contentType);
  const path = `${userId}/${activityId}-${Date.now()}.${extension}`;

  if (uploadBody.byteLength === 0) {
    throw new Error('The selected photo could not be read.');
  }

  const { error } = await supabase.storage
    .from('activity-photos')
    .upload(path, uploadBody, {
      contentType,
      cacheControl: '3600',
      upsert: true
    });

  if (error) throw error;

  const { data } = supabase.storage.from('activity-photos').getPublicUrl(path);
  if (!data.publicUrl) {
    throw new Error('Photo uploaded, but no public URL was returned.');
  }

  return updateActivityPhoto(activityId, { photoUrl: data.publicUrl, photoPath: path });
};

const localUriToArrayBuffer = async (uri: string) => {
  const response = await fetch(uri);
  if (!response.ok && !uri.startsWith('file:') && !uri.startsWith('content:')) {
    throw new Error('The selected photo could not be loaded.');
  }
  return response.arrayBuffer();
};

const base64ToArrayBuffer = (base64: string) => {
  const clean = base64.replace(/^data:.*;base64,/, '').replace(/\s/g, '');
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  const byteLength = Math.floor((clean.length * 3) / 4) - padding;
  const bytes = new Uint8Array(byteLength);
  let byteIndex = 0;

  for (let index = 0; index < clean.length; index += 4) {
    const first = alphabet.indexOf(clean[index]);
    const second = alphabet.indexOf(clean[index + 1]);
    const third = clean[index + 2] === '=' ? 64 : alphabet.indexOf(clean[index + 2]);
    const fourth = clean[index + 3] === '=' ? 64 : alphabet.indexOf(clean[index + 3]);

    if (first < 0 || second < 0 || third < 0 || fourth < 0) {
      throw new Error('The selected photo data is invalid.');
    }

    const chunk =
      (first << 18) |
      (second << 12) |
      ((third & 63) << 6) |
      (fourth & 63);

    if (byteIndex < byteLength) bytes[byteIndex] = (chunk >> 16) & 255;
    byteIndex += 1;
    if (byteIndex < byteLength) bytes[byteIndex] = (chunk >> 8) & 255;
    byteIndex += 1;
    if (byteIndex < byteLength) bytes[byteIndex] = chunk & 255;
    byteIndex += 1;
  }

  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
};

const contentTypeFromUri = (uri: string) => {
  const extension = extensionFromName(uri);
  if (extension === 'png') return 'image/png';
  if (extension === 'webp') return 'image/webp';
  if (extension === 'heic') return 'image/heic';
  return 'image/jpeg';
};

const extensionForPhoto = (photo: PickedActivityPhoto, contentType: string) => {
  const fromName = extensionFromName(photo.fileName) || extensionFromName(photo.uri);
  if (fromName) return fromName;
  if (contentType.includes('png')) return 'png';
  if (contentType.includes('webp')) return 'webp';
  if (contentType.includes('heic')) return 'heic';
  return 'jpg';
};

const extensionFromName = (value?: string | null) => {
  const extension = value?.split('?')[0]?.split('.').pop()?.toLowerCase();
  if (!extension || extension === value || extension.length > 5) return null;
  if (extension === 'jpeg') return 'jpg';
  return extension.replace(/[^a-z0-9]/g, '');
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
