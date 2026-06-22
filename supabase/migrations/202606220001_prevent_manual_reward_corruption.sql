alter table public.activities
  add column if not exists client_session_id text;

create unique index if not exists activities_user_client_session_unique
  on public.activities (user_id, client_session_id)
  where client_session_id is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'activities_manual_duration_max'
      and conrelid = 'public.activities'::regclass
  ) then
    alter table public.activities
      add constraint activities_manual_duration_max
      check (
        type not in ('gym_workout', 'pushups', 'swimming', 'other_workout')
        or duration_seconds <= 43200
      ) not valid;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'activities_measurements_safe'
      and conrelid = 'public.activities'::regclass
  ) then
    alter table public.activities
      add constraint activities_measurements_safe
      check (
        (distance_meters is null or (
          distance_meters >= 0
          and distance_meters <= 1000000
          and distance_meters::text not in ('NaN', 'Infinity', '-Infinity')
        ))
        and (sets is null or (sets >= 0 and sets <= 1000))
        and (reps is null or (reps >= 0 and reps <= 100000))
        and (weight_kg is null or (
          weight_kg >= 0
          and weight_kg <= 1000
          and weight_kg::text not in ('NaN', 'Infinity', '-Infinity')
        ))
      ) not valid;
  end if;
end;
$$;

create or replace function public.process_activity_rewards(p_activity_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_activity public.activities;
  v_character public.characters;
  v_mission public.missions;
  v_mission_date date;
  v_increment numeric;
  v_next_progress numeric;
  v_completed_now boolean;
  v_mission_bonus integer := 0;
  v_missions_completed jsonb := '[]'::jsonb;
  v_expected_activity_exp integer;
  v_expected_stat_exp jsonb;
  v_endurance integer := 0;
  v_speed integer := 0;
  v_strength integer := 0;
  v_consistency integer := 0;
  v_mission_consistency integer := 0;
  v_character_exp integer := 0;
  v_level_before integer;
  v_level_after integer;
  v_base_exp numeric;
  v_weight_bonus numeric;
  v_processed_at timestamptz := now();
  v_summary jsonb;
begin
  if v_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication required';
  end if;

  select activity.* into v_activity
  from public.activities as activity
  where activity.id = p_activity_id and activity.user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Activity not found';
  end if;

  if v_activity.reward_processed_at is not null then
    if v_activity.reward_summary is null then
      raise exception using
        errcode = 'P0001',
        message = 'Activity has a reward marker but no reward summary; manual review is required';
    end if;
    return v_activity.reward_summary;
  end if;

  if v_activity.reward_summary is not null then
    raise exception using
      errcode = 'P0001',
      message = 'Activity has a reward summary without a processing marker; manual review is required';
  end if;

  if v_activity.duration_seconds <= 0 then
    raise exception using errcode = '22023', message = 'Activity duration must be greater than zero';
  end if;

  if v_activity.type in ('gym_workout', 'pushups', 'swimming', 'other_workout')
    and v_activity.duration_seconds > 43200 then
    raise exception using
      errcode = '22023',
      message = 'Manual workout duration exceeds the 12-hour safety limit';
  end if;

  if v_activity.distance_meters is not null and (
    v_activity.distance_meters < 0
    or v_activity.distance_meters > 1000000
    or v_activity.distance_meters::text in ('NaN', 'Infinity', '-Infinity')
  ) then
    raise exception using errcode = '22023', message = 'Activity distance is invalid';
  end if;

  if v_activity.sets is not null and (v_activity.sets < 0 or v_activity.sets > 1000) then
    raise exception using errcode = '22023', message = 'Activity sets are invalid';
  end if;

  if v_activity.reps is not null and (v_activity.reps < 0 or v_activity.reps > 100000) then
    raise exception using errcode = '22023', message = 'Activity reps are invalid';
  end if;

  if v_activity.weight_kg is not null and (
    v_activity.weight_kg < 0
    or v_activity.weight_kg > 1000
    or v_activity.weight_kg::text in ('NaN', 'Infinity', '-Infinity')
  ) then
    raise exception using errcode = '22023', message = 'Activity weight is invalid';
  end if;

  v_base_exp := case v_activity.type
    when 'run' then 18 when 'walk' then 12 when 'bike' then 16 when 'hike' then 20
    when 'gym_workout' then 18 when 'pushups' then 8 when 'swimming' then 20 else 14
  end;
  v_weight_bonus := least(30::numeric, coalesce(v_activity.weight_kg, 0) / 4.0);
  v_expected_activity_exp := greatest(5, round(
    v_base_exp
    + (v_activity.duration_seconds / 60.0) * 1.5
    + (coalesce(v_activity.distance_meters, 0) / 1000.0) * 12
    + coalesce(v_activity.reps, 0) * 0.35
    + coalesce(v_activity.sets, 0) * 2
    + v_weight_bonus
    + case when v_activity.type = 'pushups' then coalesce(v_activity.reps, 0) * 0.65 else 0 end
  ))::integer;

  if v_expected_activity_exp > 100000 then
    raise exception using errcode = '22023', message = 'Calculated activity reward exceeds the safety limit';
  end if;

  v_endurance := round(v_expected_activity_exp * case v_activity.type
    when 'run' then 0.45 when 'walk' then 0.45 when 'bike' then 0.55 when 'hike' then 0.55
    when 'gym_workout' then 0.15 when 'swimming' then 0.55 when 'other_workout' then 0.30 else 0 end)::integer;
  v_speed := round(v_expected_activity_exp * case v_activity.type
    when 'run' then 0.35 when 'walk' then 0.15 when 'bike' then 0.30 else 0 end)::integer;
  v_strength := round(v_expected_activity_exp * case v_activity.type
    when 'hike' then 0.20 when 'gym_workout' then 0.65 when 'pushups' then 0.70
    when 'swimming' then 0.25 when 'other_workout' then 0.25 else 0 end)::integer;
  v_consistency := round(v_expected_activity_exp * case v_activity.type
    when 'run' then 0.20 when 'walk' then 0.40 when 'bike' then 0.15 when 'hike' then 0.25
    when 'gym_workout' then 0.20 when 'pushups' then 0.30 when 'swimming' then 0.20
    when 'other_workout' then 0.45 else 0 end)::integer;
  v_expected_stat_exp := jsonb_build_object(
    'endurance', v_endurance,
    'speed', v_speed,
    'strength', v_strength,
    'consistency', v_consistency
  );

  select character.* into v_character
  from public.characters as character
  where character.user_id = v_user_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Character not found';
  end if;

  v_mission_date := coalesce(v_activity.local_date, v_activity.completed_at::date);
  for v_mission in
    select mission.*
    from public.missions as mission
    where mission.user_id = v_user_id
      and mission.mission_date = v_mission_date
      and mission.completed_at is null
    order by mission.id
    for update
  loop
    v_increment := 0;
    if v_mission.type = 'complete_activity' then
      v_increment := 1;
    elsif v_mission.type = 'distance_walk_run' and v_activity.type in ('walk', 'run') then
      v_increment := coalesce(v_activity.distance_meters, 0);
    elsif v_mission.type = 'pushups' and v_activity.type = 'pushups' then
      v_increment := coalesce(v_activity.reps, 0);
    elsif v_mission.type = 'workout_duration' then
      v_increment := v_activity.duration_seconds;
    end if;

    if v_increment <= 0 then continue; end if;
    v_next_progress := least(v_mission.target_value, v_mission.progress + v_increment);
    v_completed_now := v_next_progress >= v_mission.target_value;

    update public.missions as mission
    set
      progress = v_next_progress,
      completed_at = case when v_completed_now then v_processed_at else mission.completed_at end
    where mission.id = v_mission.id;

    if v_completed_now then
      v_mission_bonus := v_mission_bonus + v_mission.reward_exp;
      v_missions_completed := v_missions_completed || jsonb_build_array(jsonb_build_object(
        'id', v_mission.id,
        'title', v_mission.title,
        'rewardExp', v_mission.reward_exp
      ));
    end if;
  end loop;

  v_mission_consistency := round(v_mission_bonus * 0.35);
  v_character_exp := v_expected_activity_exp + v_mission_bonus;
  v_level_before := v_character.level;
  v_level_after := public.level_for_total_exp(v_character.total_exp + v_character_exp);

  update public.characters as character
  set
    level = v_level_after,
    total_exp = character.total_exp + v_character_exp,
    coins = character.coins + v_character_exp,
    endurance_exp = character.endurance_exp + v_endurance,
    speed_exp = character.speed_exp + v_speed,
    strength_exp = character.strength_exp + v_strength,
    consistency_exp = character.consistency_exp + v_consistency + v_mission_consistency
  where character.id = v_character.id;

  v_summary := jsonb_build_object(
    'characterExp', v_character_exp,
    'activityExp', v_expected_activity_exp,
    'missionBonusExp', v_mission_bonus,
    'statExp', jsonb_build_object(
      'endurance', v_endurance,
      'speed', v_speed,
      'strength', v_strength,
      'consistency', v_consistency + v_mission_consistency
    ),
    'goldCoins', v_character_exp,
    'missionsCompleted', v_missions_completed,
    'achievementsUnlocked', '[]'::jsonb,
    'personalRecords', '[]'::jsonb,
    'levelBefore', v_level_before,
    'levelAfter', v_level_after,
    'processedAt', v_processed_at,
    'legacy', false
  );

  update public.activities as activity
  set
    exp_earned = v_expected_activity_exp,
    stat_exp = v_expected_stat_exp,
    reward_processed_at = v_processed_at,
    reward_summary = v_summary
  where activity.id = v_activity.id;

  select activity.reward_summary into v_summary
  from public.activities as activity
  where activity.id = v_activity.id;

  return v_summary;
end;
$$;

revoke all on function public.process_activity_rewards(uuid) from public;
grant execute on function public.process_activity_rewards(uuid) to authenticated;
