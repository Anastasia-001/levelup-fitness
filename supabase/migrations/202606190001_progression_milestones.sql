alter table public.activities
  add column if not exists local_date date,
  add column if not exists local_week_start date,
  add column if not exists personal_record_ids text[] not null default '{}'::text[];

update public.activities
set
  local_date = coalesce(local_date, completed_at::date),
  local_week_start = coalesce(local_week_start, date_trunc('week', completed_at)::date)
where local_date is null or local_week_start is null;

create table if not exists public.progression_streaks (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_activity_day_streak integer not null default 0 check (current_activity_day_streak >= 0),
  longest_activity_day_streak integer not null default 0 check (longest_activity_day_streak >= 0),
  current_weekly_consistency_streak integer not null default 0 check (current_weekly_consistency_streak >= 0),
  longest_weekly_consistency_streak integer not null default 0 check (longest_weekly_consistency_streak >= 0),
  weekly_target integer not null default 3 check (weekly_target > 0),
  last_activity_date date,
  last_qualified_week_start date,
  updated_at timestamptz not null default now()
);

create table if not exists public.achievement_catalog (
  id text primary key,
  title text not null,
  description text not null,
  category text not null,
  icon text not null,
  condition_key text not null,
  condition_target numeric not null check (condition_target >= 0),
  reward_exp integer not null default 0 check (reward_exp >= 0),
  reward_coins integer not null default 0 check (reward_coins >= 0),
  claim_required boolean not null default false
);

insert into public.achievement_catalog
  (id, title, description, category, icon, condition_key, condition_target, reward_exp, reward_coins, claim_required)
values
  ('first_activity', 'First Step', 'Complete your first activity.', 'activity', 'flash-outline', 'total_activities', 1, 0, 25, false),
  ('first_gps_activity', 'Route Initiated', 'Complete your first GPS activity.', 'activity', 'navigate-outline', 'gps_activities', 1, 0, 30, false),
  ('first_mission', 'Quest Complete', 'Complete your first daily mission.', 'mission', 'checkmark-circle-outline', 'completed_missions', 1, 0, 25, false),
  ('first_1_km', 'First Kilometer', 'Complete an activity of at least 1 km.', 'distance', 'trail-sign-outline', 'max_distance_meters', 1000, 0, 30, false),
  ('first_5_km', 'Five Kilometer Drive', 'Complete an activity of at least 5 km.', 'distance', 'map-outline', 'max_distance_meters', 5000, 0, 50, false),
  ('ten_activities', 'Training Habit', 'Complete 10 total activities.', 'activity', 'calendar-outline', 'total_activities', 10, 0, 50, false),
  ('twenty_five_activities', 'Committed Athlete', 'Complete 25 total activities.', 'activity', 'ribbon-outline', 'total_activities', 25, 0, 100, false),
  ('fifty_activities', 'LevelUp Regular', 'Complete 50 total activities.', 'activity', 'medal-outline', 'total_activities', 50, 0, 200, false),
  ('seven_day_streak', 'Seven Day Charge', 'Record activities on seven consecutive days.', 'consistency', 'flame-outline', 'longest_day_streak', 7, 0, 100, false),
  ('four_week_consistency', 'Monthly Rhythm', 'Hit your weekly activity target for four consecutive weeks.', 'consistency', 'repeat-outline', 'longest_week_streak', 4, 0, 150, false),
  ('first_personal_record', 'New Personal Best', 'Set your first personal record.', 'record', 'trophy-outline', 'personal_records', 1, 0, 40, false),
  ('character_level_5', 'Level Five', 'Reach character level 5.', 'character', 'star-outline', 'character_level', 5, 0, 100, false),
  ('character_level_10', 'Level Ten', 'Reach character level 10.', 'character', 'sparkles-outline', 'character_level', 10, 0, 250, false)
on conflict (id) do update set
  title = excluded.title,
  description = excluded.description,
  category = excluded.category,
  icon = excluded.icon,
  condition_key = excluded.condition_key,
  condition_target = excluded.condition_target,
  reward_exp = excluded.reward_exp,
  reward_coins = excluded.reward_coins,
  claim_required = excluded.claim_required;

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievement_catalog(id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  claimed_at timestamptz,
  primary key (user_id, achievement_id)
);

create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  record_type text not null check (record_type in (
    'fastest_1_km',
    'fastest_5_km',
    'longest_distance',
    'longest_duration',
    'fastest_average_pace',
    'most_activities_week',
    'highest_activity_exp'
  )),
  sport_key text not null,
  value numeric not null check (value > 0),
  activity_id uuid references public.activities(id) on delete set null,
  period_start date,
  achieved_at timestamptz not null default now(),
  unique (user_id, record_type, sport_key)
);

create index if not exists personal_records_user_idx
  on public.personal_records (user_id, achieved_at desc);

alter table public.progression_streaks enable row level security;
alter table public.achievement_catalog enable row level security;
alter table public.user_achievements enable row level security;
alter table public.personal_records enable row level security;

drop policy if exists "Users can read their progression streaks" on public.progression_streaks;
create policy "Users can read their progression streaks"
  on public.progression_streaks for select
  using (auth.uid() = user_id);

drop policy if exists "Authenticated users can read achievement catalog" on public.achievement_catalog;
create policy "Authenticated users can read achievement catalog"
  on public.achievement_catalog for select
  to authenticated
  using (true);

drop policy if exists "Users can read their achievements" on public.user_achievements;
create policy "Users can read their achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read their personal records" on public.personal_records;
create policy "Users can read their personal records"
  on public.personal_records for select
  using (auth.uid() = user_id);

create or replace function public.refresh_progression_streaks(p_local_today date)
returns public.progression_streaks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_weekly_target integer := 3;
  v_day date;
  v_previous_day date;
  v_day_run integer := 0;
  v_current_day integer := 0;
  v_longest_day integer := 0;
  v_last_activity_date date;
  v_week date;
  v_previous_week date;
  v_week_run integer := 0;
  v_current_week integer := 0;
  v_longest_week integer := 0;
  v_last_qualified_week date;
  v_current_week_start date := p_local_today - ((extract(isodow from p_local_today)::integer - 1));
  v_result public.progression_streaks;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select weekly_target
  into v_weekly_target
  from public.progression_streaks
  where user_id = v_user_id;

  v_weekly_target := coalesce(v_weekly_target, 3);

  for v_day in
    select distinct coalesce(local_date, completed_at::date)
    from public.activities
    where user_id = v_user_id
    order by 1
  loop
    if v_previous_day is null or v_day = v_previous_day + 1 then
      v_day_run := v_day_run + 1;
    else
      v_day_run := 1;
    end if;

    v_longest_day := greatest(v_longest_day, v_day_run);
    v_previous_day := v_day;
  end loop;

  v_last_activity_date := v_previous_day;
  if v_last_activity_date in (p_local_today, p_local_today - 1) then
    v_current_day := v_day_run;
  end if;

  for v_week in
    select week_start
    from (
      select
        coalesce(local_week_start, date_trunc('week', completed_at)::date) as week_start,
        count(*) as activity_count
      from public.activities
      where user_id = v_user_id
      group by 1
    ) weekly_activity
    where activity_count >= v_weekly_target
    order by week_start
  loop
    if v_previous_week is null or v_week = v_previous_week + 7 then
      v_week_run := v_week_run + 1;
    else
      v_week_run := 1;
    end if;

    v_longest_week := greatest(v_longest_week, v_week_run);
    v_previous_week := v_week;
  end loop;

  v_last_qualified_week := v_previous_week;
  if v_last_qualified_week in (v_current_week_start, v_current_week_start - 7) then
    v_current_week := v_week_run;
  end if;

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
  ) values (
    v_user_id,
    v_current_day,
    v_longest_day,
    v_current_week,
    v_longest_week,
    v_weekly_target,
    v_last_activity_date,
    v_last_qualified_week,
    now()
  )
  on conflict (user_id) do update set
    current_activity_day_streak = excluded.current_activity_day_streak,
    longest_activity_day_streak = greatest(
      public.progression_streaks.longest_activity_day_streak,
      excluded.longest_activity_day_streak
    ),
    current_weekly_consistency_streak = excluded.current_weekly_consistency_streak,
    longest_weekly_consistency_streak = greatest(
      public.progression_streaks.longest_weekly_consistency_streak,
      excluded.longest_weekly_consistency_streak
    ),
    last_activity_date = excluded.last_activity_date,
    last_qualified_week_start = excluded.last_qualified_week_start,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.achievement_condition_met(
  p_user_id uuid,
  p_condition_key text,
  p_target numeric
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_result boolean := false;
begin
  case p_condition_key
    when 'total_activities' then
      select count(*) >= p_target into v_result
      from public.activities where user_id = p_user_id;
    when 'gps_activities' then
      select count(*) >= p_target into v_result
      from public.activities
      where user_id = p_user_id and type in ('run', 'walk', 'bike', 'hike');
    when 'completed_missions' then
      select count(*) >= p_target into v_result
      from public.missions
      where user_id = p_user_id and completed_at is not null;
    when 'max_distance_meters' then
      select coalesce(max(distance_meters), 0) >= p_target into v_result
      from public.activities where user_id = p_user_id;
    when 'longest_day_streak' then
      select coalesce(longest_activity_day_streak, 0) >= p_target into v_result
      from public.progression_streaks where user_id = p_user_id;
    when 'longest_week_streak' then
      select coalesce(longest_weekly_consistency_streak, 0) >= p_target into v_result
      from public.progression_streaks where user_id = p_user_id;
    when 'personal_records' then
      select count(*) >= p_target into v_result
      from public.personal_records where user_id = p_user_id;
    when 'character_level' then
      select coalesce(level, 0) >= p_target into v_result
      from public.characters where user_id = p_user_id;
    else
      v_result := false;
  end case;

  return coalesce(v_result, false);
end;
$$;

create or replace function public.unlock_achievements(p_achievement_ids text[])
returns table (
  achievement_id text,
  unlocked_at timestamptz,
  claimed_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_new_ids text[] := array[]::text[];
  v_reward_coins integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  with inserted as (
    insert into public.user_achievements as newly_unlocked (user_id, achievement_id, unlocked_at, claimed_at)
    select
      v_user_id,
      catalog.id,
      now(),
      case when catalog.claim_required then null else now() end
    from public.achievement_catalog catalog
    where catalog.id = any(coalesce(p_achievement_ids, array[]::text[]))
      and public.achievement_condition_met(v_user_id, catalog.condition_key, catalog.condition_target)
    on conflict (user_id, achievement_id) do nothing
    returning newly_unlocked.achievement_id
  )
  select coalesce(array_agg(inserted.achievement_id), array[]::text[])
  into v_new_ids
  from inserted;

  if cardinality(v_new_ids) > 0 then
    select coalesce(sum(reward_coins), 0)
    into v_reward_coins
    from public.achievement_catalog
    where id = any(v_new_ids) and claim_required = false;

    if v_reward_coins > 0 then
      update public.characters
      set coins = coins + v_reward_coins
      where user_id = v_user_id;
    end if;
  end if;

  return query
  select unlocked.achievement_id, unlocked.unlocked_at, unlocked.claimed_at
  from public.user_achievements unlocked
  where unlocked.user_id = v_user_id
    and unlocked.achievement_id = any(v_new_ids)
  order by unlocked.unlocked_at;
end;
$$;

create or replace function public.upsert_personal_records(
  p_activity_id uuid,
  p_candidates jsonb
)
returns setof public.personal_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_activity_type text;
  v_candidate jsonb;
  v_record_type text;
  v_sport_key text;
  v_value numeric;
  v_period_start date;
  v_record_id uuid;
  v_record_ids uuid[] := array[]::uuid[];
  v_record_keys text[] := array[]::text[];
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select type::text into v_activity_type
  from public.activities
  where id = p_activity_id and user_id = v_user_id;

  if v_activity_type is null then
    raise exception 'Activity not found';
  end if;

  for v_candidate in select value from jsonb_array_elements(coalesce(p_candidates, '[]'::jsonb))
  loop
    v_record_id := null;
    v_record_type := v_candidate ->> 'record_type';
    v_sport_key := coalesce(v_candidate ->> 'sport_key', v_activity_type);
    v_value := nullif(v_candidate ->> 'value', '')::numeric;
    v_period_start := nullif(v_candidate ->> 'period_start', '')::date;

    if v_record_type is null or v_record_type not in (
      'fastest_1_km',
      'fastest_5_km',
      'longest_distance',
      'longest_duration',
      'fastest_average_pace',
      'most_activities_week',
      'highest_activity_exp'
    ) or v_value is null or v_value <= 0 then
      continue;
    end if;

    if v_sport_key <> 'all' and v_sport_key <> v_activity_type then
      continue;
    end if;

    insert into public.personal_records (
      user_id,
      record_type,
      sport_key,
      value,
      activity_id,
      period_start,
      achieved_at
    ) values (
      v_user_id,
      v_record_type,
      v_sport_key,
      v_value,
      p_activity_id,
      v_period_start,
      now()
    )
    on conflict (user_id, record_type, sport_key) do update set
      value = excluded.value,
      activity_id = excluded.activity_id,
      period_start = excluded.period_start,
      achieved_at = now()
    where case
      when excluded.record_type in ('fastest_1_km', 'fastest_5_km', 'fastest_average_pace')
        then excluded.value < public.personal_records.value
      else excluded.value > public.personal_records.value
    end
    returning id into v_record_id;

    if v_record_id is not null then
      v_record_ids := array_append(v_record_ids, v_record_id);
      v_record_keys := array_append(v_record_keys, v_record_type || ':' || v_sport_key);
    end if;
  end loop;

  if cardinality(v_record_keys) > 0 then
    update public.activities
    set personal_record_ids = (
      select array_agg(distinct record_key order by record_key)
      from unnest(coalesce(personal_record_ids, array[]::text[]) || v_record_keys) as keys(record_key)
    )
    where id = p_activity_id and user_id = v_user_id;
  end if;

  return query
  select records.*
  from public.personal_records records
  where records.id = any(v_record_ids)
  order by records.achieved_at;
end;
$$;

create or replace function public.rebuild_personal_records(p_activity_groups jsonb)
returns setof public.personal_records
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_group jsonb;
  v_activity_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  delete from public.personal_records where user_id = v_user_id;
  update public.activities
  set personal_record_ids = array[]::text[]
  where user_id = v_user_id;

  for v_group in select value from jsonb_array_elements(coalesce(p_activity_groups, '[]'::jsonb))
  loop
    v_activity_id := nullif(v_group ->> 'activity_id', '')::uuid;
    if v_activity_id is null then continue; end if;

    perform *
    from public.upsert_personal_records(
      v_activity_id,
      coalesce(v_group -> 'candidates', '[]'::jsonb)
    );
  end loop;

  return query
  select records.*
  from public.personal_records records
  where records.user_id = v_user_id
  order by records.achieved_at desc;
end;
$$;

revoke all on function public.refresh_progression_streaks(date) from public;
revoke all on function public.achievement_condition_met(uuid, text, numeric) from public;
revoke all on function public.unlock_achievements(text[]) from public;
revoke all on function public.upsert_personal_records(uuid, jsonb) from public;
revoke all on function public.rebuild_personal_records(jsonb) from public;

grant execute on function public.refresh_progression_streaks(date) to authenticated;
grant execute on function public.unlock_achievements(text[]) to authenticated;
grant execute on function public.upsert_personal_records(uuid, jsonb) to authenticated;
grant execute on function public.rebuild_personal_records(jsonb) to authenticated;
