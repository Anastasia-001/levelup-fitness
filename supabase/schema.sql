create extension if not exists "pgcrypto";

create type public.unit_preference as enum ('metric', 'imperial');
create type public.activity_type as enum (
  'run',
  'walk',
  'bike',
  'hike',
  'gym_workout',
  'pushups',
  'swimming',
  'other_workout'
);
create type public.mission_type as enum (
  'complete_activity',
  'distance_walk_run',
  'pushups',
  'workout_duration'
);
create type public.mission_difficulty as enum ('easy', 'medium', 'hard', 'boss');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 2 and 32),
  location text,
  unit_preference public.unit_preference not null default 'metric',
  privacy_controls_enabled boolean not null default true,
  health_data_enabled boolean not null default false,
  email_notifications_enabled boolean not null default true,
  push_notifications_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.characters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  level integer not null default 1 check (level > 0),
  total_exp integer not null default 0 check (total_exp >= 0),
  coins integer not null default 120 check (coins >= 0),
  endurance_exp integer not null default 0 check (endurance_exp >= 0),
  speed_exp integer not null default 0 check (speed_exp >= 0),
  strength_exp integer not null default 0 check (strength_exp >= 0),
  consistency_exp integer not null default 0 check (consistency_exp >= 0),
  updated_at timestamptz not null default now()
);

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_session_id text,
  type public.activity_type not null,
  title text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null default now(),
  local_date date,
  local_week_start date,
  duration_seconds integer not null check (
    duration_seconds > 0
    and (type not in ('gym_workout', 'pushups', 'swimming', 'other_workout') or duration_seconds <= 43200)
  ),
  distance_meters numeric check (
    distance_meters is null or (
      distance_meters >= 0 and distance_meters <= 1000000
      and distance_meters::text not in ('NaN', 'Infinity', '-Infinity')
    )
  ),
  route jsonb,
  sets integer check (sets is null or sets between 0 and 1000),
  reps integer check (reps is null or reps between 0 and 100000),
  weight_kg numeric check (
    weight_kg is null or (
      weight_kg >= 0 and weight_kg <= 1000
      and weight_kg::text not in ('NaN', 'Infinity', '-Infinity')
    )
  ),
  photo_url text,
  photo_path text,
  personal_record_ids text[] not null default '{}'::text[],
  reward_processed_at timestamptz,
  reward_summary jsonb,
  exp_earned integer not null check (exp_earned >= 0),
  stat_exp jsonb not null default '{"endurance":0,"speed":0,"strength":0,"consistency":0}'::jsonb
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_date date not null,
  template_id text not null,
  type public.mission_type not null,
  title text not null,
  difficulty public.mission_difficulty not null,
  target_value numeric not null check (target_value > 0),
  progress numeric not null default 0 check (progress >= 0),
  reward_exp integer not null check (reward_exp >= 0),
  reward_coins integer not null check (reward_coins >= 0),
  optional_unlock_id text,
  optional_unlock_name text,
  completed_at timestamptz,
  unique (user_id, mission_date, type),
  constraint missions_difficulty_reward_ranges check (
    (difficulty = 'easy' and reward_exp between 20 and 35 and reward_coins between 5 and 12)
    or (difficulty = 'medium' and reward_exp between 45 and 75 and reward_coins between 15 and 30)
    or (difficulty = 'hard' and reward_exp between 90 and 150 and reward_coins between 40 and 75)
    or (difficulty = 'boss' and reward_exp between 180 and 300 and reward_coins between 100 and 175)
  )
);

create table public.character_presentations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  equipped_pose text not null default 'neutral' check (equipped_pose in (
    'neutral', 'ready_to_run', 'stretch', 'post_workout_victory', 'recovery', 'confident'
  )),
  highest_evolution_stage text not null default 'starter' check (highest_evolution_stage in (
    'starter', 'trainee', 'athlete', 'elite'
  )),
  fitness_class text not null default 'hybrid_athlete' check (fitness_class in (
    'runner', 'lifter', 'explorer', 'hybrid_athlete'
  )),
  updated_at timestamptz not null default now()
);

create table public.skill_tree_catalog (
  id text primary key,
  branch text not null check (branch in ('endurance', 'speed', 'strength', 'consistency')),
  name text not null,
  description text not null,
  point_cost integer not null default 1 check (point_cost > 0),
  required_level integer not null check (required_level > 0),
  prerequisite_node_id text references public.skill_tree_catalog(id) on delete restrict,
  effect_key text not null unique
);

create table public.skill_tree_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points_earned integer not null default 0 check (points_earned >= 0),
  points_spent integer not null default 0 check (points_spent >= 0 and points_spent <= points_earned),
  updated_at timestamptz not null default now()
);

create table public.user_skill_nodes (
  user_id uuid not null references auth.users(id) on delete cascade,
  node_id text not null references public.skill_tree_catalog(id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, node_id)
);

create table public.mission_daily_rerolls (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_date date not null,
  mission_id uuid not null references public.missions(id) on delete cascade,
  original_mission jsonb not null,
  replacement_template_id text not null,
  reroll_index integer not null default 1,
  used_at timestamptz not null default now(),
  primary key (user_id, mission_date, reroll_index)
);

create table public.user_mission_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  unlock_id text not null,
  unlock_name text not null,
  mission_id uuid references public.missions(id) on delete set null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, unlock_id)
);

create table public.owned_cosmetics (
  user_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  acquired_at timestamptz not null default now(),
  acquisition_source text not null default 'shop' check (acquisition_source in ('shop', 'achievement', 'personal_record', 'fitness_class', 'skill_tree', 'starter')),
  source_ref text,
  primary key (user_id, item_id)
);

create table public.equipped_cosmetics (
  user_id uuid primary key references auth.users(id) on delete cascade,
  head_item_id text,
  shirt_item_id text,
  pants_item_id text,
  shoes_item_id text,
  accessory_item_id text,
  frame_item_id text,
  aura_item_id text,
  updated_at timestamptz not null default now()
);

create table public.progression_streaks (
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

create table public.achievement_catalog (
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

create table public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null references public.achievement_catalog(id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  claimed_at timestamptz,
  primary key (user_id, achievement_id)
);

create table public.personal_records (
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

create table public.cosmetic_unlock_catalog (
  item_id text primary key,
  source_type text not null check (source_type in ('achievement', 'personal_record', 'fitness_class')),
  source_id text not null,
  requirement_label text not null
);

create index activities_user_completed_idx on public.activities (user_id, completed_at desc);
create unique index activities_user_client_session_unique
  on public.activities (user_id, client_session_id)
  where client_session_id is not null;
create index missions_user_date_idx on public.missions (user_id, mission_date);
create index personal_records_user_idx on public.personal_records (user_id, achieved_at desc);

alter table public.profiles enable row level security;
alter table public.characters enable row level security;
alter table public.character_presentations enable row level security;
alter table public.skill_tree_catalog enable row level security;
alter table public.skill_tree_progress enable row level security;
alter table public.user_skill_nodes enable row level security;
alter table public.activities enable row level security;
alter table public.missions enable row level security;
alter table public.owned_cosmetics enable row level security;
alter table public.equipped_cosmetics enable row level security;
alter table public.progression_streaks enable row level security;
alter table public.achievement_catalog enable row level security;
alter table public.user_achievements enable row level security;
alter table public.personal_records enable row level security;
alter table public.mission_daily_rerolls enable row level security;
alter table public.user_mission_unlocks enable row level security;
alter table public.cosmetic_unlock_catalog enable row level security;

create policy "Profiles are owned by users"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Characters are owned by users"
  on public.characters for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Activities are owned by users"
  on public.activities for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Missions are owned by users"
  on public.missions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Owned cosmetics are owned by users"
  on public.owned_cosmetics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Equipped cosmetics are owned by users"
  on public.equipped_cosmetics for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can read their character presentation"
  on public.character_presentations for select
  using (auth.uid() = user_id);

create policy "Authenticated users can read skill catalog"
  on public.skill_tree_catalog for select to authenticated using (true);
create policy "Users can read their skill progress"
  on public.skill_tree_progress for select using (auth.uid() = user_id);
create policy "Users can read their unlocked skills"
  on public.user_skill_nodes for select using (auth.uid() = user_id);

create policy "Users can read their progression streaks"
  on public.progression_streaks for select
  using (auth.uid() = user_id);

create policy "Authenticated users can read achievement catalog"
  on public.achievement_catalog for select
  to authenticated
  using (true);

create policy "Users can read their achievements"
  on public.user_achievements for select
  using (auth.uid() = user_id);

create policy "Users can read their personal records"
  on public.personal_records for select
  using (auth.uid() = user_id);

create policy "Users can read their mission rerolls"
  on public.mission_daily_rerolls for select
  using (auth.uid() = user_id);

create policy "Users can read their mission unlocks"
  on public.user_mission_unlocks for select
  using (auth.uid() = user_id);

create policy "Authenticated users can read cosmetic unlock catalog"
  on public.cosmetic_unlock_catalog for select
  to authenticated
  using (true);

insert into public.skill_tree_catalog (id, branch, name, description, point_cost, required_level, prerequisite_node_id, effect_key)
values
  ('endurance_distance_tracker', 'endurance', 'Distance Tracker', 'Adds richer distance progress detail to route goals.', 1, 3, null, 'distance_progress_detail'),
  ('endurance_long_route_badge', 'endurance', 'Long Route Badge', 'Unlocks an endurance route cosmetic.', 1, 5, 'endurance_distance_tracker', 'long_route_cosmetic'),
  ('endurance_recovery_missions', 'endurance', 'Recovery Mission Access', 'Adds recovery-friendly mission variety.', 1, 7, 'endurance_long_route_badge', 'recovery_missions'),
  ('speed_pace_insights', 'speed', 'Pace Insights', 'Adds more pace comparison context.', 1, 3, null, 'pace_insights'),
  ('speed_sprint_pose', 'speed', 'Sprint Pose', 'Unlocks the Ready to Run character pose.', 1, 5, 'speed_pace_insights', 'sprint_pose'),
  ('speed_split_records', 'speed', 'Split Records', 'Enables split record presentation when route data supports it.', 1, 7, 'speed_sprint_pose', 'split_records'),
  ('strength_mission_variety', 'strength', 'Strength Mission Variety', 'Adds more gym and bodyweight mission suggestions.', 1, 3, null, 'strength_missions'),
  ('strength_training_outfit', 'strength', 'Training Outfit', 'Unlocks a technical strength-training top.', 1, 5, 'strength_mission_variety', 'training_outfit'),
  ('strength_set_rep_records', 'strength', 'Set / Rep Records', 'Prepares strength activities for set and repetition records.', 1, 7, 'strength_training_outfit', 'set_rep_records'),
  ('consistency_reroll_token', 'consistency', 'Extra Reroll Token', 'Adds one extra daily mission reroll.', 1, 3, null, 'extra_reroll'),
  ('consistency_streak_frame', 'consistency', 'Streak Frame', 'Unlocks a disciplined streak profile frame.', 1, 5, 'consistency_reroll_token', 'streak_frame'),
  ('consistency_weekly_summary', 'consistency', 'Weekly Summary Upgrade', 'Adds richer weekly consistency summaries.', 1, 7, 'consistency_streak_frame', 'weekly_summary');

insert into public.cosmetic_unlock_catalog (item_id, source_type, source_id, requirement_label)
values
  ('five-k-finish-frame', 'achievement', 'first_5_km', 'Complete your first 5 km activity'),
  ('seven-day-pulse-aura', 'achievement', 'seven_day_streak', 'Reach a 7-day activity streak'),
  ('committed-25-jacket', 'achievement', 'twenty_five_activities', 'Complete 25 activities'),
  ('level-ten-crown-band', 'achievement', 'character_level_10', 'Reach character Level 10'),
  ('pace-record-wristband', 'personal_record', 'fastest_5_km', 'Set a fastest 5 km personal record'),
  ('distance-record-aura', 'personal_record', 'longest_distance', 'Set a longest-distance personal record'),
  ('runner-route-band', 'fitness_class', 'runner', 'Choose the Runner class'),
  ('lifter-power-wrap', 'fitness_class', 'lifter', 'Choose the Lifter class'),
  ('explorer-trail-frame', 'fitness_class', 'explorer', 'Choose the Explorer class'),
  ('hybrid-spectrum-aura', 'fitness_class', 'hybrid_athlete', 'Choose the Hybrid Athlete class');

insert into storage.buckets (id, name, public)
values ('activity-photos', 'activity-photos', true)
on conflict (id) do nothing;

create policy "Activity photos are readable"
  on storage.objects for select
  using (bucket_id = 'activity-photos');

create policy "Users can upload their activity photos"
  on storage.objects for insert
  with check (
    bucket_id = 'activity-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their activity photos"
  on storage.objects for update
  using (
    bucket_id = 'activity-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'activity-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create or replace function public.touch_character_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger characters_touch_updated_at
before update on public.characters
for each row execute function public.touch_character_updated_at();

create trigger equipped_cosmetics_touch_updated_at
before update on public.equipped_cosmetics
for each row execute function public.touch_character_updated_at();

create or replace function public.evolution_stage_for_level(p_level integer)
returns text language sql immutable as $$
  select case when p_level >= 20 then 'elite' when p_level >= 10 then 'athlete'
    when p_level >= 5 then 'trainee' else 'starter' end;
$$;

create or replace function public.evolution_stage_rank(p_stage text)
returns integer language sql immutable as $$
  select case p_stage when 'elite' then 4 when 'athlete' then 3 when 'trainee' then 2 else 1 end;
$$;

create or replace function public.sync_character_presentation()
returns public.character_presentations
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_level integer;
  v_stage text;
  v_result public.character_presentations;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select level into v_level from public.characters where user_id = v_user_id;
  if v_level is null then raise exception 'Character not found'; end if;
  v_stage := public.evolution_stage_for_level(v_level);
  insert into public.character_presentations (user_id, equipped_pose, highest_evolution_stage)
  values (v_user_id, 'neutral', v_stage)
  on conflict (user_id) do update set
    highest_evolution_stage = case
      when public.evolution_stage_rank(v_stage) > public.evolution_stage_rank(public.character_presentations.highest_evolution_stage)
        then v_stage else public.character_presentations.highest_evolution_stage end,
    updated_at = now()
  returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.set_character_pose(p_pose text)
returns public.character_presentations
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_level integer;
  v_allowed boolean := false;
  v_result public.character_presentations;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_pose not in ('neutral', 'ready_to_run', 'stretch', 'post_workout_victory', 'recovery', 'confident') then
    raise exception 'Unknown character pose';
  end if;
  perform public.sync_character_presentation();
  select level into v_level from public.characters where user_id = v_user_id;
  v_allowed := case p_pose
    when 'neutral' then true
    when 'ready_to_run' then exists (select 1 from public.activities where user_id = v_user_id and type in ('run', 'walk', 'bike', 'hike'))
      or exists (select 1 from public.user_skill_nodes where user_id = v_user_id and node_id = 'speed_sprint_pose')
    when 'stretch' then exists (select 1 from public.missions where user_id = v_user_id and completed_at is not null and template_id like '%recovery%')
    when 'post_workout_victory' then v_level >= 5
    when 'recovery' then exists (select 1 from public.progression_streaks where user_id = v_user_id and longest_activity_day_streak >= 7)
    when 'confident' then v_level >= 10
    else false end;
  if not v_allowed then raise exception 'Pose requirement is not complete'; end if;
  update public.character_presentations set equipped_pose = p_pose, updated_at = now()
  where user_id = v_user_id returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.set_fitness_class(p_class text)
returns public.character_presentations
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result public.character_presentations;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  if p_class not in ('runner', 'lifter', 'explorer', 'hybrid_athlete') then
    raise exception 'Unknown fitness class';
  end if;
  perform public.sync_character_presentation();
  update public.character_presentations
  set fitness_class = p_class, updated_at = now()
  where user_id = v_user_id returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.skill_points_for_level(p_level integer)
returns integer language sql immutable as $$
  select (case when p_level >= 3 then 1 else 0 end) + (case when p_level >= 5 then 1 else 0 end)
    + (case when p_level >= 7 then 1 else 0 end) + (case when p_level >= 10 then 1 else 0 end)
    + (case when p_level >= 12 then 1 else 0 end) + (case when p_level >= 15 then 1 else 0 end)
    + (case when p_level >= 18 then 1 else 0 end) + (case when p_level >= 20 then 1 else 0 end)
    + (case when p_level >= 25 then 1 else 0 end) + (case when p_level >= 30 then 1 else 0 end);
$$;

create or replace function public.sync_skill_tree_progress()
returns public.skill_tree_progress language plpgsql security definer set search_path = public as $$
declare v_user_id uuid := auth.uid(); v_level integer; v_points integer; v_result public.skill_tree_progress;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select level into v_level from public.characters where user_id = v_user_id;
  if v_level is null then raise exception 'Character not found'; end if;
  v_points := public.skill_points_for_level(v_level);
  insert into public.skill_tree_progress (user_id, points_earned, points_spent) values (v_user_id, v_points, 0)
  on conflict (user_id) do update set points_earned = greatest(public.skill_tree_progress.points_earned, excluded.points_earned), updated_at = now()
  returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.unlock_skill_node(p_node_id text)
returns public.skill_tree_progress language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid := auth.uid(); v_level integer; v_node public.skill_tree_catalog;
  v_progress public.skill_tree_progress; v_cosmetic_id text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  perform public.sync_skill_tree_progress();
  select * into v_node from public.skill_tree_catalog where id = p_node_id;
  if not found then raise exception 'Skill node not found'; end if;
  select level into v_level from public.characters where user_id = v_user_id;
  select * into v_progress from public.skill_tree_progress where user_id = v_user_id for update;
  if exists (select 1 from public.user_skill_nodes where user_id = v_user_id and node_id = p_node_id) then raise exception 'Skill node already unlocked'; end if;
  if v_level < v_node.required_level then raise exception 'Required character level not reached'; end if;
  if v_node.prerequisite_node_id is not null and not exists (select 1 from public.user_skill_nodes where user_id = v_user_id and node_id = v_node.prerequisite_node_id) then raise exception 'Prerequisite node is locked'; end if;
  if v_progress.points_earned - v_progress.points_spent < v_node.point_cost then raise exception 'Not enough skill points'; end if;
  insert into public.user_skill_nodes (user_id, node_id) values (v_user_id, p_node_id);
  update public.skill_tree_progress set points_spent = points_spent + v_node.point_cost, updated_at = now()
  where user_id = v_user_id returning * into v_progress;
  v_cosmetic_id := case p_node_id when 'endurance_long_route_badge' then 'skill-long-route-badge'
    when 'strength_training_outfit' then 'skill-training-outfit' when 'consistency_streak_frame' then 'skill-streak-frame' else null end;
  if v_cosmetic_id is not null then
    insert into public.owned_cosmetics (user_id, item_id, acquisition_source, source_ref)
    values (v_user_id, v_cosmetic_id, 'skill_tree', p_node_id) on conflict (user_id, item_id) do nothing;
  end if;
  return v_progress;
end;
$$;

create or replace function public.sync_character_evolution_trigger()
returns trigger language plpgsql security definer set search_path = public
as $$
declare v_stage text := public.evolution_stage_for_level(new.level);
begin
  insert into public.character_presentations (user_id, highest_evolution_stage)
  values (new.user_id, v_stage)
  on conflict (user_id) do update set
    highest_evolution_stage = case
      when public.evolution_stage_rank(v_stage) > public.evolution_stage_rank(public.character_presentations.highest_evolution_stage)
        then v_stage else public.character_presentations.highest_evolution_stage end,
    updated_at = now();
  return new;
end;
$$;

create trigger characters_sync_evolution_stage
after insert or update of level on public.characters
for each row execute function public.sync_character_evolution_trigger();

revoke all on function public.evolution_stage_for_level(integer) from public;
revoke all on function public.evolution_stage_rank(text) from public;
revoke all on function public.sync_character_presentation() from public;
revoke all on function public.set_character_pose(text) from public;
revoke all on function public.set_fitness_class(text) from public;
revoke all on function public.skill_points_for_level(integer) from public;
revoke all on function public.sync_skill_tree_progress() from public;
revoke all on function public.unlock_skill_node(text) from public;
revoke all on function public.sync_character_evolution_trigger() from public;
grant execute on function public.sync_character_presentation() to authenticated;
grant execute on function public.set_character_pose(text) to authenticated;
grant execute on function public.set_fitness_class(text) to authenticated;
grant execute on function public.sync_skill_tree_progress() to authenticated;
grant execute on function public.unlock_skill_node(text) to authenticated;

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
  ('character_level_10', 'Level Ten', 'Reach character level 10.', 'character', 'sparkles-outline', 'character_level', 10, 0, 250, false);

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
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select weekly_target into v_weekly_target
  from public.progression_streaks where user_id = v_user_id;
  v_weekly_target := coalesce(v_weekly_target, 3);

  for v_day in
    select distinct coalesce(local_date, completed_at::date)
    from public.activities where user_id = v_user_id order by 1
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
      select coalesce(local_week_start, date_trunc('week', completed_at)::date) week_start, count(*) activity_count
      from public.activities where user_id = v_user_id group by 1
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
    user_id, current_activity_day_streak, longest_activity_day_streak,
    current_weekly_consistency_streak, longest_weekly_consistency_streak,
    weekly_target, last_activity_date, last_qualified_week_start, updated_at
  ) values (
    v_user_id, v_current_day, v_longest_day, v_current_week, v_longest_week,
    v_weekly_target, v_last_activity_date, v_last_qualified_week, now()
  )
  on conflict (user_id) do update set
    current_activity_day_streak = excluded.current_activity_day_streak,
    longest_activity_day_streak = greatest(progression_streaks.longest_activity_day_streak, excluded.longest_activity_day_streak),
    current_weekly_consistency_streak = excluded.current_weekly_consistency_streak,
    longest_weekly_consistency_streak = greatest(progression_streaks.longest_weekly_consistency_streak, excluded.longest_weekly_consistency_streak),
    last_activity_date = excluded.last_activity_date,
    last_qualified_week_start = excluded.last_qualified_week_start,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.achievement_condition_met(p_user_id uuid, p_condition_key text, p_target numeric)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare v_result boolean := false;
begin
  case p_condition_key
    when 'total_activities' then
      select count(*) >= p_target into v_result from public.activities where user_id = p_user_id;
    when 'gps_activities' then
      select count(*) >= p_target into v_result from public.activities
      where user_id = p_user_id and type in ('run', 'walk', 'bike', 'hike');
    when 'completed_missions' then
      select count(*) >= p_target into v_result from public.missions
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
      select count(*) >= p_target into v_result from public.personal_records where user_id = p_user_id;
    when 'character_level' then
      select coalesce(level, 0) >= p_target into v_result from public.characters where user_id = p_user_id;
    else v_result := false;
  end case;
  return coalesce(v_result, false);
end;
$$;

create or replace function public.unlock_achievements(p_achievement_ids text[])
returns table (achievement_id text, unlocked_at timestamptz, claimed_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_new_ids text[] := array[]::text[];
  v_reward_coins integer := 0;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  with inserted_achievements as (
    insert into public.user_achievements as newly_unlocked (user_id, achievement_id, unlocked_at, claimed_at)
    select v_user_id, catalog.id, now(), case when catalog.claim_required then null else now() end
    from public.achievement_catalog catalog
    where catalog.id = any(coalesce(p_achievement_ids, array[]::text[]))
      and public.achievement_condition_met(v_user_id, catalog.condition_key, catalog.condition_target)
    on conflict on constraint user_achievements_pkey do nothing
    returning newly_unlocked.achievement_id
  )
  select coalesce(array_agg(inserted_achievements.achievement_id), array[]::text[])
  into v_new_ids
  from inserted_achievements;

  if cardinality(v_new_ids) > 0 then
    select coalesce(sum(catalog.reward_coins), 0) into v_reward_coins
    from public.achievement_catalog as catalog
    where catalog.id = any(v_new_ids) and catalog.claim_required = false;
    if v_reward_coins > 0 then
      update public.characters as character
      set coins = character.coins + v_reward_coins
      where character.user_id = v_user_id;
    end if;
  end if;

  return query
  select unlocked.achievement_id, unlocked.unlocked_at, unlocked.claimed_at
  from public.user_achievements unlocked
  where unlocked.user_id = v_user_id and unlocked.achievement_id = any(v_new_ids)
  order by unlocked.unlocked_at;
end;
$$;

create or replace function public.upsert_personal_records(p_activity_id uuid, p_candidates jsonb)
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
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select type::text into v_activity_type from public.activities
  where id = p_activity_id and user_id = v_user_id;
  if v_activity_type is null then raise exception 'Activity not found'; end if;

  for v_candidate in select value from jsonb_array_elements(coalesce(p_candidates, '[]'::jsonb))
  loop
    v_record_id := null;
    v_record_type := v_candidate ->> 'record_type';
    v_sport_key := coalesce(v_candidate ->> 'sport_key', v_activity_type);
    v_value := nullif(v_candidate ->> 'value', '')::numeric;
    v_period_start := nullif(v_candidate ->> 'period_start', '')::date;

    if v_record_type is null or v_record_type not in (
      'fastest_1_km', 'fastest_5_km', 'longest_distance', 'longest_duration',
      'fastest_average_pace', 'most_activities_week', 'highest_activity_exp'
    ) or v_value is null or v_value <= 0 then continue; end if;
    if v_sport_key <> 'all' and v_sport_key <> v_activity_type then continue; end if;

    insert into public.personal_records (
      user_id, record_type, sport_key, value, activity_id, period_start, achieved_at
    ) values (
      v_user_id, v_record_type, v_sport_key, v_value, p_activity_id, v_period_start, now()
    )
    on conflict (user_id, record_type, sport_key) do update set
      value = excluded.value,
      activity_id = excluded.activity_id,
      period_start = excluded.period_start,
      achieved_at = now()
    where case
      when excluded.record_type in ('fastest_1_km', 'fastest_5_km', 'fastest_average_pace')
        then excluded.value < personal_records.value
      else excluded.value > personal_records.value
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

  return query select records.* from public.personal_records records
  where records.id = any(v_record_ids) order by records.achieved_at;
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
  if v_user_id is null then raise exception 'Authentication required'; end if;

  delete from public.personal_records where user_id = v_user_id;
  update public.activities set personal_record_ids = array[]::text[] where user_id = v_user_id;

  for v_group in select value from jsonb_array_elements(coalesce(p_activity_groups, '[]'::jsonb))
  loop
    v_activity_id := nullif(v_group ->> 'activity_id', '')::uuid;
    if v_activity_id is null then continue; end if;
    perform * from public.upsert_personal_records(
      v_activity_id,
      coalesce(v_group -> 'candidates', '[]'::jsonb)
    );
  end loop;

  return query select records.* from public.personal_records records
  where records.user_id = v_user_id order by records.achieved_at desc;
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
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select * into v_activity from public.activities
  where id = p_activity_id and user_id = v_user_id for update;
  if not found then raise exception 'Activity not found'; end if;
  if v_activity.reward_processed_at is not null then
    if v_activity.reward_summary is null then
      raise exception 'Activity has a reward marker but no reward summary; manual review is required';
    end if;
    return v_activity.reward_summary;
  end if;
  if v_activity.reward_summary is not null then
    raise exception 'Activity has a reward summary without a processing marker; manual review is required';
  end if;

  if v_activity.duration_seconds <= 0 then raise exception 'Activity duration must be greater than zero'; end if;
  if v_activity.type in ('gym_workout', 'pushups', 'swimming', 'other_workout')
    and v_activity.duration_seconds > 43200 then
    raise exception 'Manual workout duration exceeds the 12-hour safety limit';
  end if;
  if v_activity.distance_meters is not null and (
    v_activity.distance_meters < 0 or v_activity.distance_meters > 1000000
    or v_activity.distance_meters::text in ('NaN', 'Infinity', '-Infinity')
  ) then raise exception 'Activity distance is invalid'; end if;
  if v_activity.sets is not null and (v_activity.sets < 0 or v_activity.sets > 1000) then
    raise exception 'Activity sets are invalid';
  end if;
  if v_activity.reps is not null and (v_activity.reps < 0 or v_activity.reps > 100000) then
    raise exception 'Activity reps are invalid';
  end if;
  if v_activity.weight_kg is not null and (
    v_activity.weight_kg < 0 or v_activity.weight_kg > 1000
    or v_activity.weight_kg::text in ('NaN', 'Infinity', '-Infinity')
  ) then raise exception 'Activity weight is invalid'; end if;

  v_base_exp := case v_activity.type
    when 'run' then 18 when 'walk' then 12 when 'bike' then 16 when 'hike' then 20
    when 'gym_workout' then 18 when 'pushups' then 8 when 'swimming' then 20 else 14
  end;
  v_weight_bonus := least(30::numeric, coalesce(v_activity.weight_kg, 0) / 4.0);
  v_expected_activity_exp := greatest(5, round(
    v_base_exp + (v_activity.duration_seconds / 60.0) * 1.5
    + (coalesce(v_activity.distance_meters, 0) / 1000.0) * 12
    + coalesce(v_activity.reps, 0) * 0.35 + coalesce(v_activity.sets, 0) * 2
    + v_weight_bonus
    + case when v_activity.type = 'pushups' then coalesce(v_activity.reps, 0) * 0.65 else 0 end
  ))::integer;
  if v_expected_activity_exp > 100000 then raise exception 'Calculated activity reward exceeds the safety limit'; end if;

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
    'endurance', v_endurance, 'speed', v_speed, 'strength', v_strength, 'consistency', v_consistency
  );

  select * into v_character from public.characters
  where user_id = v_user_id for update;
  if not found then raise exception 'Character not found'; end if;

  v_mission_date := coalesce(v_activity.local_date, v_activity.completed_at::date);
  for v_mission in
    select * from public.missions
    where user_id = v_user_id and mission_date = v_mission_date and completed_at is null
    order by id for update
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
    update public.missions set
      progress = v_next_progress,
      completed_at = case when v_completed_now then v_processed_at else completed_at end
    where id = v_mission.id;

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

  update public.characters set
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

  update public.activities set
    exp_earned = v_expected_activity_exp,
    stat_exp = v_expected_stat_exp,
    reward_processed_at = v_processed_at,
    reward_summary = v_summary
  where id = v_activity.id;
  select activity.reward_summary into v_summary
  from public.activities as activity where activity.id = v_activity.id;
  return v_summary;
end;
$$;

revoke all on function public.level_for_total_exp(integer) from public;
revoke all on function public.process_activity_rewards(uuid) from public;
grant execute on function public.process_activity_rewards(uuid) to authenticated;

create table public.level_up_celebrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  level integer not null check (level > 1),
  previous_level integer not null check (previous_level > 0 and previous_level < level),
  queued_at timestamptz not null default now(),
  viewed_at timestamptz,
  primary key (user_id, level)
);

create index level_up_celebrations_pending_idx
  on public.level_up_celebrations (user_id, level)
  where viewed_at is null;

alter table public.level_up_celebrations enable row level security;

create policy "Users can read their level celebrations"
  on public.level_up_celebrations for select
  using (auth.uid() = user_id);

create or replace function public.queue_level_up_celebrations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.level > old.level then
    insert into public.level_up_celebrations (user_id, level, previous_level, queued_at)
    select new.user_id, reached_level, reached_level - 1, now()
    from generate_series(old.level + 1, new.level) as reached_level
    on conflict (user_id, level) do nothing;
  end if;
  return new;
end;
$$;

create trigger characters_queue_level_up_celebrations
after update of level on public.characters
for each row
when (new.level > old.level)
execute function public.queue_level_up_celebrations();

create or replace function public.mark_level_up_viewed(p_level integer)
returns public.level_up_celebrations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_result public.level_up_celebrations;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  update public.level_up_celebrations
  set viewed_at = coalesce(viewed_at, now())
  where user_id = v_user_id and level = p_level
  returning * into v_result;

  if v_result.user_id is null then raise exception 'Level celebration not found'; end if;
  return v_result;
end;
$$;

revoke all on function public.queue_level_up_celebrations() from public;
revoke all on function public.mark_level_up_viewed(integer) from public;
grant execute on function public.mark_level_up_viewed(integer) to authenticated;

create or replace function public.sync_earned_cosmetics()
returns setof public.owned_cosmetics
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  return query
  with eligible as (
    select unlocks.*
    from public.cosmetic_unlock_catalog unlocks
    where (
      unlocks.source_type = 'achievement'
      and exists (
        select 1 from public.user_achievements achievements
        where achievements.user_id = v_user_id
          and achievements.achievement_id = unlocks.source_id
      )
    ) or (
      unlocks.source_type = 'personal_record'
      and exists (
        select 1 from public.personal_records records
        where records.user_id = v_user_id
          and records.record_type = unlocks.source_id
      )
    ) or (
      unlocks.source_type = 'fitness_class'
      and exists (
        select 1 from public.character_presentations presentation
        where presentation.user_id = v_user_id
          and presentation.fitness_class = unlocks.source_id
      )
    )
  ), inserted as (
    insert into public.owned_cosmetics (
      user_id, item_id, acquired_at, acquisition_source, source_ref
    )
    select v_user_id, eligible.item_id, now(), eligible.source_type, eligible.source_id
    from eligible
    on conflict (user_id, item_id) do nothing
    returning *
  )
  select * from inserted order by acquired_at, item_id;
end;
$$;

revoke all on function public.sync_earned_cosmetics() from public;
grant execute on function public.sync_earned_cosmetics() to authenticated;

create or replace function public.reroll_daily_mission(p_mission_id uuid, p_replacement jsonb)
returns public.missions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_mission public.missions;
  v_result public.missions;
  v_template_id text;
  v_type public.mission_type;
  v_title text;
  v_difficulty public.mission_difficulty;
  v_target numeric;
  v_reward_exp integer;
  v_reward_coins integer;
  v_optional_unlock_id text;
  v_optional_unlock_name text;
  v_uses integer;
  v_allowance integer;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select * into v_mission from public.missions
  where id = p_mission_id and user_id = v_user_id for update;
  if not found then raise exception 'Mission not found'; end if;
  if v_mission.completed_at is not null then raise exception 'Completed missions cannot be rerolled'; end if;

  select count(*) into v_uses from public.mission_daily_rerolls
  where user_id = v_user_id and mission_date = v_mission.mission_date;
  v_allowance := 1 + case when exists (
    select 1 from public.user_skill_nodes
    where user_id = v_user_id and node_id = 'consistency_reroll_token'
  ) then 1 else 0 end;
  if v_uses >= v_allowance then raise exception 'Daily rerolls already used'; end if;

  v_template_id := nullif(p_replacement ->> 'template_id', '');
  v_type := (p_replacement ->> 'type')::public.mission_type;
  v_title := nullif(p_replacement ->> 'title', '');
  v_difficulty := (p_replacement ->> 'difficulty')::public.mission_difficulty;
  v_target := nullif(p_replacement ->> 'target_value', '')::numeric;
  v_reward_exp := nullif(p_replacement ->> 'reward_exp', '')::integer;
  v_reward_coins := nullif(p_replacement ->> 'reward_coins', '')::integer;
  v_optional_unlock_id := nullif(p_replacement ->> 'optional_unlock_id', '');
  v_optional_unlock_name := nullif(p_replacement ->> 'optional_unlock_name', '');

  if v_template_id is null or v_title is null or v_target is null or v_target <= 0 then
    raise exception 'Invalid replacement mission';
  end if;
  if v_template_id = v_mission.template_id then raise exception 'Replacement must be different'; end if;
  if v_difficulty <> v_mission.difficulty then raise exception 'Replacement difficulty must match'; end if;

  insert into public.mission_daily_rerolls (
    user_id, mission_date, mission_id, original_mission, replacement_template_id, reroll_index, used_at
  ) values (
    v_user_id, v_mission.mission_date, v_mission.id, to_jsonb(v_mission), v_template_id, v_uses + 1, now()
  );

  update public.missions set
    template_id = v_template_id,
    type = v_type,
    title = v_title,
    difficulty = v_difficulty,
    target_value = v_target,
    progress = 0,
    reward_exp = v_reward_exp,
    reward_coins = v_reward_coins,
    optional_unlock_id = v_optional_unlock_id,
    optional_unlock_name = v_optional_unlock_name,
    completed_at = null
  where id = v_mission.id
  returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.apply_mission_completion_rewards()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_gold integer := 0;
  v_completed_missions jsonb := '[]'::jsonb;
begin
  if old.reward_processed_at is null and new.reward_processed_at is not null then
    select
      coalesce(sum(reward_coins), 0),
      coalesce(jsonb_agg(jsonb_build_object(
        'id', id,
        'title', title,
        'rewardExp', reward_exp,
        'rewardCoins', reward_coins,
        'optionalUnlockId', optional_unlock_id,
        'optionalUnlockName', optional_unlock_name
      ) order by id), '[]'::jsonb)
    into v_mission_gold, v_completed_missions
    from public.missions
    where user_id = new.user_id and completed_at = new.reward_processed_at;

    if v_mission_gold > 0 then
      update public.characters set coins = coins + v_mission_gold where user_id = new.user_id;
    end if;

    insert into public.user_mission_unlocks (user_id, unlock_id, unlock_name, mission_id)
    select new.user_id, optional_unlock_id, optional_unlock_name, id
    from public.missions
    where user_id = new.user_id
      and completed_at = new.reward_processed_at
      and optional_unlock_id is not null
      and optional_unlock_name is not null
    on conflict (user_id, unlock_id) do nothing;

    new.reward_summary := jsonb_set(
      jsonb_set(
        jsonb_set(coalesce(new.reward_summary, '{}'::jsonb), '{missionGoldCoins}', to_jsonb(v_mission_gold), true),
        '{goldCoins}',
        to_jsonb(coalesce((new.reward_summary ->> 'goldCoins')::integer, 0) + v_mission_gold),
        true
      ),
      '{missionsCompleted}',
      v_completed_missions,
      true
    );
  end if;
  return new;
end;
$$;

create trigger activities_apply_mission_completion_rewards
before update of reward_processed_at on public.activities
for each row
when (old.reward_processed_at is null and new.reward_processed_at is not null)
execute function public.apply_mission_completion_rewards();

revoke all on function public.reroll_daily_mission(uuid, jsonb) from public;
revoke all on function public.apply_mission_completion_rewards() from public;
grant execute on function public.reroll_daily_mission(uuid, jsonb) to authenticated;
