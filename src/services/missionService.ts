import { supabase } from '@/lib/supabase';
import { mapActivity, mapMission } from '@/services/mappers';
import { syncCharacterPresentation } from '@/services/characterPresentationService';
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
    throw missionSchemaError(error);
  }
  return data.map(mapMission);
};

export const getDailyRerollsRemaining = async (userId: string, missionDate = localDateKey()) => {
  const [usage, bonus] = await Promise.all([
    supabase
      .from('mission_daily_rerolls')
      .select('used_at', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('mission_date', missionDate),
    supabase
      .from('user_skill_nodes')
      .select('node_id')
      .eq('user_id', userId)
      .eq('node_id', 'consistency_reroll_token')
      .maybeSingle()
  ]);

  if (usage.error) throw usage.error;
  if (bonus.error) throw bonus.error;
  const allowance = bonus.data ? 2 : 1;
  return Math.max(0, allowance - (usage.count ?? 0));
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
  const [character, presentation, activityResult, skillNodes] = await Promise.all([
    getCharacter(userId),
    syncCharacterPresentation().catch((caught) => {
      throw wave2ContextError(
        caught,
        'character presentation',
        'supabase/migrations/202606210001_character_poses_evolution.sql'
      );
    }),
    supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_at', since.toISOString())
      .order('completed_at', { ascending: false }),
    supabase
      .from('user_skill_nodes')
      .select('node_id')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) {
          throw wave2ContextError(
            error,
            'skill-tree mission context',
            'supabase/migrations/202606210003_mission_skill_tree.sql'
          );
        }
        return data;
      })
  ]);

  if (activityResult.error) throw activityResult.error;
  return {
    userLevel: character.level,
    fitnessClass: presentation.fitnessClass,
    unlockedSkillNodeIds: skillNodes.map((row) => row.node_id),
    recentActivities: activityResult.data.map(mapActivity),
    missionDate
  };
};

const missionSchemaError = (caught: unknown) => {
  const message = databaseErrorMessage(caught);
  if (
    isMissingDatabaseObject(caught) &&
    /(template_id|difficulty|reward_coins|optional_unlock|mission_daily_rerolls)/i.test(message)
  ) {
    return createMigrationError(
      caught,
      'mission difficulty and reroll fields',
      'supabase/migrations/202606200003_mission_difficulties_rerolls.sql'
    );
  }
  return caught;
};

const wave2ContextError = (caught: unknown, subsystem: string, migration: string) => {
  if (!isMissingDatabaseObject(caught)) return caught;
  const message = databaseErrorMessage(caught);
  if (/fitness_class/i.test(message)) {
    return createMigrationError(
      caught,
      'fitness class mission context',
      'supabase/migrations/202606210002_fitness_classes.sql'
    );
  }
  return createMigrationError(caught, subsystem, migration);
};

const createMigrationError = (caught: unknown, subsystem: string, migration: string) => {
  const source = caught && typeof caught === 'object' ? caught as Record<string, unknown> : {};
  const error = new Error(
    `Mission sync cannot load ${subsystem}. Run ${migration} in Supabase, then retry. ` +
    `Database response: ${databaseErrorMessage(caught)}`
  ) as Error & Record<string, unknown>;
  error.name = 'MissionMigrationError';
  error.code = source.code;
  error.details = source.details;
  error.hint = `Apply ${migration} without deleting existing mission data.`;
  error.migration = migration;
  return error;
};

const isMissingDatabaseObject = (caught: unknown) => {
  const source = caught && typeof caught === 'object' ? caught as Record<string, unknown> : {};
  const code = String(source.code ?? '');
  const message = databaseErrorMessage(caught);
  return ['42P01', '42703', '42883', 'PGRST202', 'PGRST204', 'PGRST205'].includes(code) ||
    /does not exist|could not find|schema cache|undefined column/i.test(message);
};

const databaseErrorMessage = (caught: unknown) => {
  if (caught instanceof Error) return caught.message;
  if (caught && typeof caught === 'object' && 'message' in caught) {
    return String((caught as { message?: unknown }).message ?? 'Unknown database error');
  }
  return String(caught || 'Unknown database error');
};
