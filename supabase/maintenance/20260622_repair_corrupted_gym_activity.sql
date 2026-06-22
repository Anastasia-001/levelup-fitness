-- TARGETED ONE-TIME MAINTENANCE SCRIPT. THIS IS NOT A MIGRATION.
--
-- Safety defaults:
--   1. Replace both UUID placeholders below with IDs reviewed from the audit.
--   2. Leave apply_changes = false for the first run (dry run).
--   3. Review every BEFORE/AFTER result and NOTICE.
--   4. To apply, set apply_changes = true AND replace the final ROLLBACK with COMMIT.
--
-- The corrupt activity is removed because its real duration cannot be reconstructed from
-- database evidence. Only rewards demonstrably attributable to that activity are reversed.

begin;

create temporary table repair_params (
  target_user_id uuid not null,
  target_activity_id uuid not null,
  apply_changes boolean not null
) on commit drop;

insert into repair_params (target_user_id, target_activity_id, apply_changes)
values (
  '00000000-0000-0000-0000-000000000000'::uuid, -- TARGET_USER_ID
  '00000000-0000-0000-0000-000000000000'::uuid, -- TARGET_ACTIVITY_ID
  false                                             -- DRY RUN; change to true only after review
);

do $$
declare
  v_params repair_params;
  v_activity public.activities;
  v_character_count integer;
  v_suspicious_count integer;
begin
  select * into strict v_params from repair_params;

  if v_params.target_user_id = '00000000-0000-0000-0000-000000000000'::uuid
    or v_params.target_activity_id = '00000000-0000-0000-0000-000000000000'::uuid then
    raise exception 'Replace TARGET_USER_ID and TARGET_ACTIVITY_ID with reviewed audit values';
  end if;

  select * into v_activity
  from public.activities as activity
  where activity.id = v_params.target_activity_id;

  if not found then
    raise exception 'Target activity was not found. It may already have been repaired; no changes were made.';
  end if;

  if v_activity.user_id <> v_params.target_user_id then
    raise exception 'Target activity does not belong to TARGET_USER_ID';
  end if;

  if not (
    (v_activity.type in ('gym_workout', 'pushups', 'other_workout') and v_activity.duration_seconds > 43200)
    or v_activity.duration_seconds > 604800
    or v_activity.exp_earned > 10000
    or coalesce((v_activity.reward_summary ->> 'characterExp')::numeric, 0) > 10000
    or coalesce((v_activity.reward_summary ->> 'goldCoins')::numeric, 0) > 10000
  ) then
    raise exception 'Target activity does not satisfy the suspicious-activity guard';
  end if;

  select count(*) into v_suspicious_count
  from public.activities as activity
  where activity.user_id = v_params.target_user_id
    and (
      (activity.type in ('gym_workout', 'pushups', 'other_workout') and activity.duration_seconds > 43200)
      or activity.duration_seconds > 604800
      or activity.exp_earned > 10000
      or coalesce((activity.reward_summary ->> 'characterExp')::numeric, 0) > 10000
      or coalesce((activity.reward_summary ->> 'goldCoins')::numeric, 0) > 10000
    );

  if v_suspicious_count <> 1 then
    raise exception 'Expected exactly one suspicious activity for this user, found %. Stop and review the audit.', v_suspicious_count;
  end if;

  select count(*) into v_character_count
  from public.characters as character
  where character.user_id = v_params.target_user_id;

  if v_character_count <> 1 then
    raise exception 'Expected exactly one character owned by TARGET_USER_ID, found %', v_character_count;
  end if;

  if v_activity.reward_processed_at is null or v_activity.reward_summary is null then
    raise exception 'The target activity has no complete reward ledger; exact reversal is unsafe';
  end if;
end;
$$;

create temporary table repair_before on commit drop as
select
  to_jsonb(activity) as activity,
  to_jsonb(character) as character,
  to_jsonb(streaks) as streaks,
  to_jsonb(presentation) as presentation,
  to_jsonb(skill_progress) as skill_progress,
  (
    select coalesce(jsonb_agg(to_jsonb(record) order by record.record_type, record.sport_key), '[]'::jsonb)
    from public.personal_records as record
    where record.user_id = params.target_user_id
  ) as personal_records,
  (
    select coalesce(jsonb_agg(to_jsonb(achievement) order by achievement.unlocked_at), '[]'::jsonb)
    from public.user_achievements as achievement
    where achievement.user_id = params.target_user_id
  ) as achievements,
  (
    select coalesce(jsonb_agg(to_jsonb(celebration) order by celebration.level), '[]'::jsonb)
    from public.level_up_celebrations as celebration
    where celebration.user_id = params.target_user_id
  ) as level_up_celebrations
from repair_params as params
join public.activities as activity on activity.id = params.target_activity_id
join public.characters as character on character.user_id = params.target_user_id
left join public.progression_streaks as streaks on streaks.user_id = params.target_user_id
left join public.character_presentations as presentation on presentation.user_id = params.target_user_id
left join public.skill_tree_progress as skill_progress on skill_progress.user_id = params.target_user_id;

select 'BEFORE - REVIEW THIS SNAPSHOT' as repair_stage, before_state.*
from repair_before as before_state;

create temporary table mission_recalculation on commit drop as
with target as (
  select activity.*
  from public.activities as activity
  join repair_params as params on params.target_activity_id = activity.id
), mission_base as (
  select
    mission.id,
    mission.user_id,
    mission.type,
    mission.target_value,
    mission.progress as prior_progress,
    mission.completed_at as prior_completed_at,
    mission.reward_exp,
    mission.reward_coins,
    mission.optional_unlock_id,
    exists (
      select 1
      from target
      cross join lateral jsonb_array_elements(
        coalesce(target.reward_summary -> 'missionsCompleted', '[]'::jsonb)
      ) as summary_item
      where summary_item ->> 'id' = mission.id::text
    ) as listed_in_target_reward,
    case mission.type
      when 'complete_activity' then (
        select count(*)::numeric
        from public.activities as activity
        where activity.user_id = mission.user_id
          and coalesce(activity.local_date, activity.completed_at::date) = mission.mission_date
          and activity.id <> (select id from target)
      )
      when 'distance_walk_run' then (
        select coalesce(sum(activity.distance_meters), 0)
        from public.activities as activity
        where activity.user_id = mission.user_id
          and coalesce(activity.local_date, activity.completed_at::date) = mission.mission_date
          and activity.id <> (select id from target)
          and activity.type in ('walk', 'run')
      )
      when 'pushups' then (
        select coalesce(sum(activity.reps), 0)::numeric
        from public.activities as activity
        where activity.user_id = mission.user_id
          and coalesce(activity.local_date, activity.completed_at::date) = mission.mission_date
          and activity.id <> (select id from target)
          and activity.type = 'pushups'
      )
      when 'workout_duration' then (
        select coalesce(sum(activity.duration_seconds), 0)::numeric
        from public.activities as activity
        where activity.user_id = mission.user_id
          and coalesce(activity.local_date, activity.completed_at::date) = mission.mission_date
          and activity.id <> (select id from target)
      )
      else 0::numeric
    end as rebuilt_progress
  from public.missions as mission
  cross join target
  where mission.user_id = target.user_id
    and mission.mission_date = coalesce(target.local_date, target.completed_at::date)
)
select
  mission_base.*,
  least(mission_base.target_value, mission_base.rebuilt_progress) as bounded_progress,
  mission_base.listed_in_target_reward
    and mission_base.rebuilt_progress < mission_base.target_value as invalidated_by_repair
from mission_base;

create temporary table rebuilt_personal_records on commit drop as
with valid_activities as (
  select activity.*
  from public.activities as activity
  join repair_params as params on params.target_user_id = activity.user_id
  where activity.id <> params.target_activity_id
), simple_candidates as (
  select 'longest_duration'::text as record_type, activity.type::text as sport_key,
    activity.duration_seconds::numeric as value, activity.id as activity_id,
    null::date as period_start, activity.completed_at as achieved_at
  from valid_activities as activity where activity.duration_seconds > 0
  union all
  select 'highest_activity_exp', activity.type::text, activity.exp_earned::numeric,
    activity.id, null::date, activity.completed_at
  from valid_activities as activity where activity.exp_earned > 0
  union all
  select 'longest_distance', activity.type::text, activity.distance_meters,
    activity.id, null::date, activity.completed_at
  from valid_activities as activity
  where activity.type in ('run', 'walk', 'bike', 'hike') and activity.distance_meters > 0
  union all
  select 'fastest_average_pace', activity.type::text,
    activity.duration_seconds / (activity.distance_meters / 1000.0),
    activity.id, null::date, activity.completed_at
  from valid_activities as activity
  where activity.type in ('run', 'walk', 'bike', 'hike')
    and activity.distance_meters >= 200
    and activity.duration_seconds > 0
    and activity.distance_meters / activity.duration_seconds > 0.2
    and activity.distance_meters / activity.duration_seconds <= case activity.type
      when 'walk' then 2.8 when 'hike' then 4.2 when 'run' then 7.5 when 'bike' then 22 else 4 end
), weekly_candidates as (
  select
    'most_activities_week'::text as record_type,
    'all'::text as sport_key,
    count(*)::numeric as value,
    (array_agg(activity.id order by activity.completed_at desc))[1] as activity_id,
    coalesce(activity.local_week_start, date_trunc('week', activity.completed_at)::date) as period_start,
    max(activity.completed_at) as achieved_at
  from valid_activities as activity
  group by coalesce(activity.local_week_start, date_trunc('week', activity.completed_at)::date)
), route_points as (
  select
    activity.id as activity_id,
    activity.type::text as sport_key,
    activity.completed_at,
    point.ordinality::integer as point_index,
    coalesce(nullif(point.value ->> 'segmentId', '')::integer, 0) as segment_id,
    nullif(point.value ->> 'latitude', '')::double precision as latitude,
    nullif(point.value ->> 'longitude', '')::double precision as longitude,
    nullif(point.value ->> 'timestamp', '')::double precision as timestamp_ms
  from valid_activities as activity
  cross join lateral jsonb_array_elements(coalesce(activity.route, '[]'::jsonb)) with ordinality as point(value, ordinality)
  where activity.type in ('run', 'walk', 'bike', 'hike')
    and jsonb_typeof(activity.route) = 'array'
    and point.value ? 'latitude'
    and point.value ? 'longitude'
    and point.value ? 'timestamp'
), route_steps as (
  select
    route_point.*,
    lag(route_point.latitude) over route_window as previous_latitude,
    lag(route_point.longitude) over route_window as previous_longitude,
    lag(route_point.timestamp_ms) over route_window as previous_timestamp_ms
  from route_points as route_point
  window route_window as (
    partition by route_point.activity_id, route_point.segment_id order by route_point.point_index
  )
), cumulative_route as (
  select
    route_step.*,
    sum(
      case
        when route_step.previous_latitude is null or route_step.timestamp_ms <= route_step.previous_timestamp_ms then 0
        else 6371000.0 * 2.0 * asin(sqrt(least(1.0, greatest(0.0,
          power(sin(radians(route_step.latitude - route_step.previous_latitude) / 2.0), 2)
          + cos(radians(route_step.previous_latitude)) * cos(radians(route_step.latitude))
          * power(sin(radians(route_step.longitude - route_step.previous_longitude) / 2.0), 2)
        ))))
      end
    ) over (
      partition by route_step.activity_id, route_step.segment_id order by route_step.point_index
      rows between unbounded preceding and current row
    ) as cumulative_meters
  from route_steps as route_step
), route_targets as (
  select 1000.0::double precision as target_meters, 'fastest_1_km'::text as record_type
  union all select 5000.0, 'fastest_5_km'
), route_candidates as (
  select
    target.record_type,
    ending.sport_key,
    ((ending.timestamp_ms - starting.timestamp_ms) / 1000.0)
      * (target.target_meters / nullif(ending.cumulative_meters - starting.cumulative_meters, 0)) as value,
    ending.activity_id,
    null::date as period_start,
    ending.completed_at as achieved_at
  from cumulative_route as ending
  join cumulative_route as starting
    on starting.activity_id = ending.activity_id
    and starting.segment_id = ending.segment_id
    and starting.point_index < ending.point_index
  cross join route_targets as target
  where ending.cumulative_meters - starting.cumulative_meters >= target.target_meters
    and ending.timestamp_ms > starting.timestamp_ms
), all_candidates as (
  select * from simple_candidates
  union all select * from weekly_candidates
  union all select * from route_candidates where value > 0
), ranked_candidates as (
  select
    candidate.*,
    row_number() over (
      partition by candidate.record_type, candidate.sport_key
      order by
        case when candidate.record_type in ('fastest_1_km', 'fastest_5_km', 'fastest_average_pace') then candidate.value end asc nulls last,
        case when candidate.record_type not in ('fastest_1_km', 'fastest_5_km', 'fastest_average_pace') then candidate.value end desc nulls last,
        candidate.period_start desc nulls last,
        candidate.achieved_at desc
    ) as candidate_rank
  from all_candidates as candidate
)
select record_type, sport_key, value, activity_id, period_start, achieved_at
from ranked_candidates
where candidate_rank = 1;

create temporary table rebuilt_streaks on commit drop as
with params_and_target as (
  select params.*, activity.completed_at, coalesce(streaks.weekly_target, 3) as weekly_target
  from repair_params as params
  join public.activities as activity on activity.id = params.target_activity_id
  left join public.progression_streaks as streaks on streaks.user_id = params.target_user_id
), valid_activities as (
  select activity.*
  from public.activities as activity
  join params_and_target as params on params.target_user_id = activity.user_id
  where activity.id <> params.target_activity_id
), activity_days as (
  select distinct coalesce(activity.local_date, activity.completed_at::date) as activity_day
  from valid_activities as activity
), day_islands as (
  select activity_day,
    activity_day - row_number() over (order by activity_day)::integer as island_key
  from activity_days
), day_runs as (
  select min(activity_day) as first_day, max(activity_day) as last_day, count(*)::integer as run_length
  from day_islands group by island_key
), activity_weeks as (
  select coalesce(activity.local_week_start, date_trunc('week', activity.completed_at)::date) as week_start,
    count(*)::integer as activity_count
  from valid_activities as activity
  group by coalesce(activity.local_week_start, date_trunc('week', activity.completed_at)::date)
), qualified_weeks as (
  select activity_weeks.week_start
  from activity_weeks cross join params_and_target as params
  where activity_weeks.activity_count >= params.weekly_target
), week_islands as (
  select week_start,
    week_start - (row_number() over (order by week_start)::integer * 7) as island_key
  from qualified_weeks
), week_runs as (
  select min(week_start) as first_week, max(week_start) as last_week, count(*)::integer as run_length
  from week_islands group by island_key
), calendar_context as (
  select
    current_date as local_today,
    current_date - (extract(isodow from current_date)::integer - 1) as current_week_start
)
select
  params.target_user_id as user_id,
  case
    when latest_day.last_day in (calendar.local_today, calendar.local_today - 1) then latest_day.run_length
    else 0
  end as current_activity_day_streak,
  coalesce((select max(run_length) from day_runs), 0) as longest_activity_day_streak,
  case
    when latest_week.last_week in (calendar.current_week_start, calendar.current_week_start - 7) then latest_week.run_length
    else 0
  end as current_weekly_consistency_streak,
  coalesce((select max(run_length) from week_runs), 0) as longest_weekly_consistency_streak,
  params.weekly_target,
  latest_day.last_day as last_activity_date,
  latest_week.last_week as last_qualified_week_start
from params_and_target as params
cross join calendar_context as calendar
left join lateral (select * from day_runs order by last_day desc limit 1) as latest_day on true
left join lateral (select * from week_runs order by last_week desc limit 1) as latest_week on true;

create temporary table removed_achievement_ids (
  achievement_id text primary key,
  reward_coins integer not null
) on commit drop;

create temporary table removed_skill_node_ids (
  node_id text primary key
) on commit drop;

create temporary table removed_cosmetic_ids (
  item_id text primary key
) on commit drop;

do $$
declare
  v_params repair_params;
  v_activity public.activities;
  v_character public.characters;
  v_activity_exp integer;
  v_invalid_mission_exp integer;
  v_valid_mission_exp integer;
  v_invalid_mission_gold integer;
  v_activity_endurance integer;
  v_activity_speed integer;
  v_activity_strength integer;
  v_activity_consistency integer;
  v_summary_consistency integer;
  v_consistency_to_reverse integer;
  v_exp_to_reverse integer;
  v_gold_to_reverse integer;
  v_corrected_total_exp integer;
  v_corrected_level integer;
  v_skill_points integer;
  v_skill_spent integer;
  v_deleted_nodes integer;
  v_invalid_achievement_coins integer;
begin
  select * into strict v_params from repair_params;
  select * into strict v_activity from public.activities as activity
    where activity.id = v_params.target_activity_id for update;
  select * into strict v_character from public.characters as character
    where character.user_id = v_params.target_user_id for update;

  select
    coalesce(sum(recalculation.reward_exp) filter (where recalculation.invalidated_by_repair), 0),
    coalesce(sum(recalculation.reward_exp) filter (
      where recalculation.listed_in_target_reward and not recalculation.invalidated_by_repair
    ), 0),
    coalesce(sum(recalculation.reward_coins) filter (where recalculation.invalidated_by_repair), 0)
  into v_invalid_mission_exp, v_valid_mission_exp, v_invalid_mission_gold
  from mission_recalculation as recalculation;

  v_activity_exp := coalesce((v_activity.reward_summary ->> 'activityExp')::integer, v_activity.exp_earned);
  v_activity_endurance := coalesce((v_activity.stat_exp ->> 'endurance')::integer, 0);
  v_activity_speed := coalesce((v_activity.stat_exp ->> 'speed')::integer, 0);
  v_activity_strength := coalesce((v_activity.stat_exp ->> 'strength')::integer, 0);
  v_activity_consistency := coalesce((v_activity.stat_exp ->> 'consistency')::integer, 0);
  v_summary_consistency := coalesce((v_activity.reward_summary -> 'statExp' ->> 'consistency')::integer, v_activity_consistency);
  v_consistency_to_reverse := greatest(
    v_activity_consistency,
    v_summary_consistency - round(v_valid_mission_exp * 0.35)::integer
  );
  v_exp_to_reverse := v_activity_exp + v_invalid_mission_exp;
  v_gold_to_reverse := v_activity_exp + v_invalid_mission_exp + v_invalid_mission_gold;
  v_corrected_total_exp := v_character.total_exp - v_exp_to_reverse;

  if v_corrected_total_exp < 0
    or v_character.coins - v_gold_to_reverse < 0
    or v_character.endurance_exp - v_activity_endurance < 0
    or v_character.speed_exp - v_activity_speed < 0
    or v_character.strength_exp - v_activity_strength < 0
    or v_character.consistency_exp - v_consistency_to_reverse < 0 then
    raise exception 'Calculated core reward reversal would produce a negative value. Stop and review the audit.';
  end if;

  v_corrected_level := public.level_for_total_exp(v_corrected_total_exp);

  raise notice 'Repair plan: activity EXP %, invalid mission EXP %, invalid mission gold %, corrected level %',
    v_activity_exp, v_invalid_mission_exp, v_invalid_mission_gold, v_corrected_level;

  if not v_params.apply_changes then
    raise notice 'DRY RUN ONLY: no persistent rows were changed. Set apply_changes=true and COMMIT only after review.';
    return;
  end if;

  update public.missions as mission
  set
    progress = recalculation.bounded_progress,
    completed_at = case
      when recalculation.invalidated_by_repair then null
      else mission.completed_at
    end
  from mission_recalculation as recalculation
  where mission.id = recalculation.id;

  delete from public.user_mission_unlocks as mission_unlock
  using mission_recalculation as recalculation
  where recalculation.invalidated_by_repair
    and recalculation.optional_unlock_id is not null
    and mission_unlock.user_id = v_params.target_user_id
    and mission_unlock.unlock_id = recalculation.optional_unlock_id
    and mission_unlock.mission_id = recalculation.id;

  update public.characters as character
  set
    total_exp = v_corrected_total_exp,
    level = v_corrected_level,
    coins = character.coins - v_gold_to_reverse,
    endurance_exp = character.endurance_exp - v_activity_endurance,
    speed_exp = character.speed_exp - v_activity_speed,
    strength_exp = character.strength_exp - v_activity_strength,
    consistency_exp = character.consistency_exp - v_consistency_to_reverse
  where character.user_id = v_params.target_user_id;

  delete from public.level_up_celebrations as celebration
  where celebration.user_id = v_params.target_user_id
    and celebration.level > v_corrected_level
    and celebration.queued_at >= v_activity.reward_processed_at;

  delete from public.activities as activity
  where activity.id = v_params.target_activity_id
    and activity.user_id = v_params.target_user_id;

  delete from public.personal_records as record
  where record.user_id = v_params.target_user_id;

  insert into public.personal_records (
    user_id, record_type, sport_key, value, activity_id, period_start, achieved_at
  )
  select
    v_params.target_user_id,
    rebuilt.record_type,
    rebuilt.sport_key,
    rebuilt.value,
    rebuilt.activity_id,
    rebuilt.period_start,
    rebuilt.achieved_at
  from rebuilt_personal_records as rebuilt;

  update public.activities as activity
  set personal_record_ids = coalesce(record_keys.keys, '{}'::text[])
  from (
    select
      valid_activity.id,
      array_agg(record.record_type || ':' || record.sport_key order by record.record_type, record.sport_key)
        filter (where record.id is not null) as keys
    from public.activities as valid_activity
    left join public.personal_records as record on record.activity_id = valid_activity.id
    where valid_activity.user_id = v_params.target_user_id
    group by valid_activity.id
  ) as record_keys
  where activity.id = record_keys.id;

  insert into public.progression_streaks (
    user_id,
    current_activity_day_streak,
    longest_activity_day_streak,
    current_weekly_consistency_streak,
    longest_weekly_consistency_streak,
    weekly_target,
    last_activity_date,
    last_qualified_week_start,
    updated_at
  )
  select
    rebuilt.user_id,
    rebuilt.current_activity_day_streak,
    rebuilt.longest_activity_day_streak,
    rebuilt.current_weekly_consistency_streak,
    rebuilt.longest_weekly_consistency_streak,
    rebuilt.weekly_target,
    rebuilt.last_activity_date,
    rebuilt.last_qualified_week_start,
    now()
  from rebuilt_streaks as rebuilt
  on conflict (user_id) do update set
    current_activity_day_streak = excluded.current_activity_day_streak,
    longest_activity_day_streak = excluded.longest_activity_day_streak,
    current_weekly_consistency_streak = excluded.current_weekly_consistency_streak,
    longest_weekly_consistency_streak = excluded.longest_weekly_consistency_streak,
    weekly_target = excluded.weekly_target,
    last_activity_date = excluded.last_activity_date,
    last_qualified_week_start = excluded.last_qualified_week_start,
    updated_at = excluded.updated_at;

  insert into removed_achievement_ids (achievement_id, reward_coins)
  select user_achievement.achievement_id, catalog.reward_coins
  from public.user_achievements as user_achievement
  join public.achievement_catalog as catalog on catalog.id = user_achievement.achievement_id
  where user_achievement.user_id = v_params.target_user_id
    and exists (
      select 1
      from jsonb_array_elements(coalesce(v_activity.reward_summary -> 'achievementsUnlocked', '[]'::jsonb)) as summary_item
      where summary_item ->> 'id' = user_achievement.achievement_id
    )
    and not case catalog.condition_key
      when 'total_activities' then (
        select count(*) >= catalog.condition_target from public.activities as activity
        where activity.user_id = v_params.target_user_id
      )
      when 'gps_activities' then (
        select count(*) >= catalog.condition_target from public.activities as activity
        where activity.user_id = v_params.target_user_id and activity.type in ('run', 'walk', 'bike', 'hike')
      )
      when 'completed_missions' then (
        select count(*) >= catalog.condition_target from public.missions as mission
        where mission.user_id = v_params.target_user_id and mission.completed_at is not null
      )
      when 'max_distance_meters' then (
        select coalesce(max(activity.distance_meters), 0) >= catalog.condition_target
        from public.activities as activity where activity.user_id = v_params.target_user_id
      )
      when 'longest_day_streak' then (
        select coalesce(streak.longest_activity_day_streak, 0) >= catalog.condition_target
        from public.progression_streaks as streak where streak.user_id = v_params.target_user_id
      )
      when 'longest_week_streak' then (
        select coalesce(streak.longest_weekly_consistency_streak, 0) >= catalog.condition_target
        from public.progression_streaks as streak where streak.user_id = v_params.target_user_id
      )
      when 'personal_records' then (
        select count(*) >= catalog.condition_target from public.personal_records as record
        where record.user_id = v_params.target_user_id
      )
      when 'character_level' then v_corrected_level >= catalog.condition_target
      else true
    end;

  select coalesce(sum(removed.reward_coins), 0)
  into v_invalid_achievement_coins
  from removed_achievement_ids as removed;

  if (
    select character.coins from public.characters as character
    where character.user_id = v_params.target_user_id
  ) - v_invalid_achievement_coins < 0 then
    raise exception 'Achievement reward reversal would produce negative coins. Transaction will roll back.';
  end if;

  update public.characters as character
  set coins = character.coins - v_invalid_achievement_coins
  where character.user_id = v_params.target_user_id;

  delete from public.user_achievements as achievement
  using removed_achievement_ids as removed
  where achievement.user_id = v_params.target_user_id
    and achievement.achievement_id = removed.achievement_id;

  insert into removed_skill_node_ids (node_id)
  select node.node_id
  from public.user_skill_nodes as node
  join public.skill_tree_catalog as catalog on catalog.id = node.node_id
  where node.user_id = v_params.target_user_id
    and node.unlocked_at >= v_activity.reward_processed_at
    and catalog.required_level > v_corrected_level
  on conflict do nothing;

  loop
    insert into removed_skill_node_ids (node_id)
    select node.node_id
    from public.user_skill_nodes as node
    join public.skill_tree_catalog as catalog on catalog.id = node.node_id
    where node.user_id = v_params.target_user_id
      and node.unlocked_at >= v_activity.reward_processed_at
      and catalog.prerequisite_node_id in (select removed.node_id from removed_skill_node_ids as removed)
    on conflict do nothing;
    get diagnostics v_deleted_nodes = row_count;
    exit when v_deleted_nodes = 0;
  end loop;

  delete from public.user_skill_nodes as node
  using removed_skill_node_ids as removed
  where node.user_id = v_params.target_user_id and node.node_id = removed.node_id;

  v_skill_points := public.skill_points_for_level(v_corrected_level);
  select coalesce(sum(catalog.point_cost), 0)
  into v_skill_spent
  from public.user_skill_nodes as node
  join public.skill_tree_catalog as catalog on catalog.id = node.node_id
  where node.user_id = v_params.target_user_id;

  if v_skill_spent > v_skill_points then
    raise exception 'Remaining skill nodes cost % points but corrected level grants only %. Transaction will roll back.',
      v_skill_spent, v_skill_points;
  end if;

  insert into public.skill_tree_progress (user_id, points_earned, points_spent, updated_at)
  values (v_params.target_user_id, v_skill_points, v_skill_spent, now())
  on conflict (user_id) do update set
    points_earned = excluded.points_earned,
    points_spent = excluded.points_spent,
    updated_at = excluded.updated_at;

  insert into removed_cosmetic_ids (item_id)
  select owned.item_id
  from public.owned_cosmetics as owned
  where owned.user_id = v_params.target_user_id
    and (
      (owned.acquisition_source = 'achievement'
        and owned.source_ref in (select removed.achievement_id from removed_achievement_ids as removed))
      or (owned.acquisition_source = 'personal_record'
        and not exists (
          select 1 from public.personal_records as record
          where record.user_id = v_params.target_user_id and record.record_type = owned.source_ref
        ))
      or (owned.acquisition_source = 'skill_tree'
        and owned.source_ref in (select removed.node_id from removed_skill_node_ids as removed))
    )
  on conflict do nothing;

  update public.equipped_cosmetics as equipped
  set
    head_item_id = case when equipped.head_item_id in (select item_id from removed_cosmetic_ids) then null else equipped.head_item_id end,
    shirt_item_id = case when equipped.shirt_item_id in (select item_id from removed_cosmetic_ids) then null else equipped.shirt_item_id end,
    pants_item_id = case when equipped.pants_item_id in (select item_id from removed_cosmetic_ids) then null else equipped.pants_item_id end,
    shoes_item_id = case when equipped.shoes_item_id in (select item_id from removed_cosmetic_ids) then null else equipped.shoes_item_id end,
    accessory_item_id = case when equipped.accessory_item_id in (select item_id from removed_cosmetic_ids) then null else equipped.accessory_item_id end,
    frame_item_id = case when equipped.frame_item_id in (select item_id from removed_cosmetic_ids) then null else equipped.frame_item_id end,
    aura_item_id = case when equipped.aura_item_id in (select item_id from removed_cosmetic_ids) then null else equipped.aura_item_id end
  where equipped.user_id = v_params.target_user_id;

  delete from public.owned_cosmetics as owned
  using removed_cosmetic_ids as removed
  where owned.user_id = v_params.target_user_id and owned.item_id = removed.item_id;

  update public.character_presentations as presentation
  set
    highest_evolution_stage = public.evolution_stage_for_level(v_corrected_level),
    equipped_pose = case
      when presentation.equipped_pose = 'confident' and v_corrected_level < 10 then 'neutral'
      when presentation.equipped_pose = 'post_workout_victory' and v_corrected_level < 5 then 'neutral'
      else presentation.equipped_pose
    end,
    updated_at = now()
  where presentation.user_id = v_params.target_user_id;

  raise notice 'Applied targeted repair. Removed achievement coins: %. Removed activity: %.',
    v_invalid_achievement_coins, v_params.target_activity_id;
end;
$$;

select
  'MISSION RECONSTRUCTION' as repair_stage,
  recalculation.*
from mission_recalculation as recalculation
order by recalculation.id;

select
  'PERSONAL RECORD RECONSTRUCTION' as repair_stage,
  rebuilt.*
from rebuilt_personal_records as rebuilt
order by rebuilt.record_type, rebuilt.sport_key;

select
  'AFTER - VERIFY BEFORE COMMIT' as repair_stage,
  params.apply_changes,
  params.target_user_id,
  params.target_activity_id,
  not exists (
    select 1 from public.activities as activity where activity.id = params.target_activity_id
  ) as corrupt_activity_removed,
  to_jsonb(character) as character,
  to_jsonb(streaks) as streaks,
  to_jsonb(presentation) as presentation,
  to_jsonb(skill_progress) as skill_progress,
  coalesce((select jsonb_agg(to_jsonb(record) order by record.record_type, record.sport_key)
    from public.personal_records as record where record.user_id = params.target_user_id), '[]'::jsonb) as personal_records,
  coalesce((select jsonb_agg(to_jsonb(achievement) order by achievement.unlocked_at)
    from public.user_achievements as achievement where achievement.user_id = params.target_user_id), '[]'::jsonb) as achievements,
  coalesce((select jsonb_agg(to_jsonb(celebration) order by celebration.level)
    from public.level_up_celebrations as celebration where celebration.user_id = params.target_user_id), '[]'::jsonb) as level_up_celebrations,
  coalesce((select jsonb_agg(to_jsonb(owned) order by owned.acquired_at)
    from public.owned_cosmetics as owned where owned.user_id = params.target_user_id), '[]'::jsonb) as owned_cosmetics,
  to_jsonb(equipped) as equipped_cosmetics
from repair_params as params
join public.characters as character on character.user_id = params.target_user_id
left join public.progression_streaks as streaks on streaks.user_id = params.target_user_id
left join public.character_presentations as presentation on presentation.user_id = params.target_user_id
left join public.skill_tree_progress as skill_progress on skill_progress.user_id = params.target_user_id
left join public.equipped_cosmetics as equipped on equipped.user_id = params.target_user_id;

-- DEFAULT SAFETY ENDING: all dry-run or test changes are discarded.
rollback;

-- APPLY ONLY AFTER REVIEW:
-- 1. Change apply_changes above to true.
-- 2. Replace the ROLLBACK above with COMMIT.
-- 3. Run the complete script once and verify the final result set.
-- COMMIT;

