alter table public.activities
  add column if not exists reward_processed_at timestamptz,
  add column if not exists reward_summary jsonb;

update public.activities
set
  reward_processed_at = coalesce(reward_processed_at, completed_at),
  reward_summary = coalesce(
    reward_summary,
    jsonb_build_object(
      'characterExp', exp_earned,
      'activityExp', exp_earned,
      'missionBonusExp', 0,
      'statExp', stat_exp,
      'goldCoins', exp_earned,
      'missionsCompleted', '[]'::jsonb,
      'achievementsUnlocked', '[]'::jsonb,
      'personalRecords', '[]'::jsonb,
      'levelBefore', null,
      'levelAfter', null,
      'processedAt', completed_at,
      'legacy', true
    )
  )
where reward_processed_at is null or reward_summary is null;

create or replace function public.level_for_total_exp(p_total_exp integer)
returns integer
language plpgsql
immutable
set search_path = public
as $$
declare
  v_level integer := 1;
  v_remaining integer := greatest(coalesce(p_total_exp, 0), 0);
  v_threshold integer := 100;
begin
  while v_remaining >= v_threshold loop
    v_remaining := v_remaining - v_threshold;
    v_level := v_level + 1;
    v_threshold := 100 + ((v_level - 1) * 50);
  end loop;
  return v_level;
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
  v_endurance integer := 0;
  v_speed integer := 0;
  v_strength integer := 0;
  v_consistency integer := 0;
  v_mission_consistency integer := 0;
  v_character_exp integer := 0;
  v_level_before integer;
  v_level_after integer;
  v_processed_at timestamptz := now();
  v_summary jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select * into v_activity
  from public.activities
  where id = p_activity_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Activity not found';
  end if;

  if v_activity.reward_processed_at is not null and v_activity.reward_summary is not null then
    return v_activity.reward_summary;
  end if;

  select * into v_character
  from public.characters
  where user_id = v_user_id
  for update;

  if not found then
    raise exception 'Character not found';
  end if;

  v_mission_date := coalesce(v_activity.local_date, v_activity.completed_at::date);

  for v_mission in
    select *
    from public.missions
    where user_id = v_user_id
      and mission_date = v_mission_date
      and completed_at is null
    order by id
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

    if v_increment <= 0 then
      continue;
    end if;

    v_next_progress := least(v_mission.target_value, v_mission.progress + v_increment);
    v_completed_now := v_next_progress >= v_mission.target_value;

    update public.missions
    set
      progress = v_next_progress,
      completed_at = case when v_completed_now then v_processed_at else completed_at end
    where id = v_mission.id;

    if v_completed_now then
      v_mission_bonus := v_mission_bonus + v_mission.reward_exp;
      v_missions_completed := v_missions_completed || jsonb_build_array(
        jsonb_build_object(
          'id', v_mission.id,
          'title', v_mission.title,
          'rewardExp', v_mission.reward_exp
        )
      );
    end if;
  end loop;

  v_endurance := coalesce((v_activity.stat_exp ->> 'endurance')::integer, 0);
  v_speed := coalesce((v_activity.stat_exp ->> 'speed')::integer, 0);
  v_strength := coalesce((v_activity.stat_exp ->> 'strength')::integer, 0);
  v_consistency := coalesce((v_activity.stat_exp ->> 'consistency')::integer, 0);
  v_mission_consistency := round(v_mission_bonus * 0.35);
  v_character_exp := v_activity.exp_earned + v_mission_bonus;
  v_level_before := v_character.level;
  v_level_after := public.level_for_total_exp(v_character.total_exp + v_character_exp);

  update public.characters
  set
    level = v_level_after,
    total_exp = total_exp + v_character_exp,
    coins = coins + v_character_exp,
    endurance_exp = endurance_exp + v_endurance,
    speed_exp = speed_exp + v_speed,
    strength_exp = strength_exp + v_strength,
    consistency_exp = consistency_exp + v_consistency + v_mission_consistency
  where id = v_character.id;

  v_summary := jsonb_build_object(
    'characterExp', v_character_exp,
    'activityExp', v_activity.exp_earned,
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

  update public.activities
  set reward_processed_at = v_processed_at, reward_summary = v_summary
  where id = v_activity.id;

  return v_summary;
end;
$$;

revoke all on function public.level_for_total_exp(integer) from public;
revoke all on function public.process_activity_rewards(uuid) from public;
grant execute on function public.process_activity_rewards(uuid) to authenticated;
