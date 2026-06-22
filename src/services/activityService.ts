import { supabase } from '@/lib/supabase';
import { fallbackActivityTitle, mapActivity, mapActivityRewardSummary, mapMission } from '@/services/mappers';
import { getCharacter } from '@/services/profileService';
import {
  Activity,
  ActivityInput,
  ActivityRewardSummary,
  ActivityType,
  Character,
  Database,
  Mission,
  RoutePoint
} from '@/types/domain';
import { calculateActivityExp } from '@/utils/exp';
import { todayKey } from '@/utils/format';
import { localDateKey, localWeekStartKey } from '@/utils/progression';
import { validateActivityInput } from '@/utils/manualWorkout';

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
  rewardSummary: ActivityRewardSummary | null;
  sideEffectError?: string;
};

const ACTIVITY_SCHEMA_DRIFT_COLUMNS = [
  'title',
  'photo_url',
  'photo_path',
  'route',
  'local_date',
  'local_week_start',
  'personal_record_ids',
  'client_session_id'
] as const satisfies readonly (keyof ActivityInsert)[];

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
  validateActivityInput(input);
  const { expEarned, statExp } = calculateActivityExp(input);
  const completedAt = input.completedAt ?? new Date().toISOString();
  const startedAt =
    input.startedAt ??
    new Date(new Date(completedAt).getTime() - input.durationSeconds * 1000).toISOString();
  const localCompletedAt = new Date(completedAt);
  const payload: ActivityInsert = {
    user_id: userId,
    client_session_id: input.clientSessionId ?? null,
    type: input.type,
    title: input.title?.trim() || fallbackActivityTitle(input.type),
    started_at: startedAt,
    completed_at: completedAt,
    local_date: input.localDate ?? localDateKey(localCompletedAt),
    local_week_start: input.localWeekStart ?? localWeekStartKey(localCompletedAt),
    duration_seconds: input.durationSeconds,
    distance_meters: input.distanceMeters ?? null,
    route: normalizeRoute(input.route),
    sets: input.sets ?? null,
    reps: input.reps ?? null,
    weight_kg: input.weightKg ?? null,
    photo_url: input.photoUrl ?? null,
    photo_path: input.photoPath ?? null,
    personal_record_ids: input.personalRecordIds ?? [],
    exp_earned: expEarned,
    stat_exp: statExp
  };

  const data = await insertActivity(payload);
  const activity = mapActivity(data);
  return processSavedActivityRewards(userId, activity);
};

const processSavedActivityRewards = async (
  userId: string,
  activity: Activity
): Promise<SaveActivityResult> => {
  const { data, error } = await supabase.rpc('process_activity_rewards', {
    p_activity_id: activity.id
  });

  if (error) {
    if (isMissingFunctionError(error, 'process_activity_rewards')) {
      const message = 'Server reward validation is not installed. Run the latest Supabase migration before processing rewards.';
      logActivitySaveError('missing-process-activity-rewards', { activity_id: activity.id, user_id: userId }, error);
      return {
        activity,
        character: null,
        missions: [],
        expEarned: 0,
        bonusExp: 0,
        rewardSummary: null,
        sideEffectError: message
      };
    }

    logActivitySaveError('process-activity-rewards', { activity_id: activity.id, user_id: userId }, error);
    return {
      activity,
      character: null,
      missions: [],
      expEarned: 0,
      bonusExp: 0,
      rewardSummary: null,
      sideEffectError: errorMessage(error)
    };
  }

  const rpcRewardSummary = mapActivityRewardSummary(data) ?? null;
  let rewardedActivity: Activity = {
    ...activity,
    rewardProcessedAt: rpcRewardSummary?.processedAt ?? new Date().toISOString(),
    rewardSummary: rpcRewardSummary
  };
  try {
    const { data: refreshedRow, error: refreshError } = await supabase
      .from('activities')
      .select('*')
      .eq('id', activity.id)
      .single();
    if (refreshError) throw refreshError;
    rewardedActivity = mapActivity(refreshedRow);
  } catch (caught) {
    logActivitySaveError('refresh-rewarded-activity', { activity_id: activity.id }, caught);
  }
  const rewardSummary = rewardedActivity.rewardSummary ?? rpcRewardSummary;
  let character: Character | null = null;
  let missions: Mission[] = [];
  let sideEffectError: string | undefined;
  try {
    [character, missions] = await Promise.all([
      getCharacter(userId),
      listMissionsForActivity(userId, rewardedActivity)
    ]);
  } catch (caught) {
    sideEffectError = errorMessage(caught);
    logActivitySaveError('refresh-after-activity-rewards', { activity_id: activity.id }, caught);
  }

  return {
    activity: rewardedActivity,
    character,
    missions,
    expEarned: rewardSummary?.characterExp ?? 0,
    bonusExp: rewardSummary?.missionBonusExp ?? 0,
    rewardSummary,
    sideEffectError
  };
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

    if (nextPayload.client_session_id && isDuplicateKeyError(error)) {
      const { data: existing, error: existingError } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', nextPayload.user_id)
        .eq('client_session_id', nextPayload.client_session_id)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existing) {
        if (__DEV__) {
          console.warn('[LevelUp] Reused existing activity for duplicate manual session', {
            activityId: existing.id,
            clientSessionId: nextPayload.client_session_id
          });
        }
        return existing;
      }
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

const listMissionsForActivity = async (userId: string, activity: Activity) => {
  const missionDate = activity.localDate ?? todayKey();
  const { data, error } = await supabase
    .from('missions')
    .select('*')
    .eq('user_id', userId)
    .eq('mission_date', missionDate)
    .order('id', { ascending: true });

  if (error) throw error;
  return data.map(mapMission);
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

export const updateActivityRewardMilestones = async (
  activity: Activity,
  values: {
    achievementsUnlocked: ActivityRewardSummary['achievementsUnlocked'];
    personalRecords: ActivityRewardSummary['personalRecords'];
    replacePersonalRecords?: boolean;
  }
) => {
  if (!activity.rewardSummary) return activity;

  const achievements = new Map(
    [...activity.rewardSummary.achievementsUnlocked, ...values.achievementsUnlocked].map((achievement) => [
      achievement.id,
      achievement
    ])
  );
  const records = new Map(
    [
      ...(values.replacePersonalRecords ? [] : activity.rewardSummary.personalRecords),
      ...values.personalRecords
    ].map((record) => [
      `${record.recordType}:${record.sportKey}`,
      record
    ])
  );
  const achievementsUnlocked = [...achievements.values()];
  const rewardSummary: ActivityRewardSummary = {
    ...activity.rewardSummary,
    achievementsUnlocked,
    personalRecords: [...records.values()],
    goldCoins:
      activity.rewardSummary.characterExp +
      (activity.rewardSummary.missionGoldCoins ?? 0) +
      achievementsUnlocked.reduce((total, achievement) => total + achievement.rewardCoins, 0)
  };

  const { data, error } = await supabase
    .from('activities')
    .update({ reward_summary: rewardSummary })
    .eq('id', activity.id)
    .select()
    .single();

  if (error) {
    logActivitySaveError('update-activity-reward-summary', { activity_id: activity.id }, error);
    throw error;
  }

  return mapActivity(data);
};

export const processPendingActivityRewards = async (userId: string) => {
  const { data, error } = await supabase
    .from('activities')
    .select('id')
    .eq('user_id', userId)
    .is('reward_processed_at', null)
    .order('completed_at', { ascending: true });

  if (error) {
    if (isMissingColumnError(error, ['reward_processed_at'])) return;
    throw error;
  }

  for (const activity of data) {
    const { error: rewardError } = await supabase.rpc('process_activity_rewards', {
      p_activity_id: activity.id
    });
    if (rewardError) throw rewardError;
  }
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
      speed: point.speed ?? null,
      segmentId: point.segmentId ?? 0,
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
    (column) =>
      !removedColumns.has(column) &&
      isMissingColumnError(error, [column]) &&
      !(column === 'client_session_id' && payload.client_session_id)
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

const isMissingFunctionError = (error: unknown, functionName: string) => {
  const errorText = JSON.stringify(serializeError(error)).toLowerCase();
  return (
    errorText.includes(functionName.toLowerCase()) &&
    (errorText.includes('pgrst202') || errorText.includes('schema cache') || errorText.includes('function'))
  );
};

const isDuplicateKeyError = (error: unknown) => {
  const serialized = serializeError(error);
  return serialized.code === '23505' || /duplicate key|unique constraint/i.test(String(serialized.message));
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
  console.warn('[LevelUp] Activity save warning', {
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
