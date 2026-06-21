create table if not exists public.skill_tree_catalog (
  id text primary key,
  branch text not null check (branch in ('endurance', 'speed', 'strength', 'consistency')),
  name text not null,
  description text not null,
  point_cost integer not null default 1 check (point_cost > 0),
  required_level integer not null check (required_level > 0),
  prerequisite_node_id text references public.skill_tree_catalog(id) on delete restrict,
  effect_key text not null unique
);

create table if not exists public.skill_tree_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  points_earned integer not null default 0 check (points_earned >= 0),
  points_spent integer not null default 0 check (points_spent >= 0 and points_spent <= points_earned),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_skill_nodes (
  user_id uuid not null references auth.users(id) on delete cascade,
  node_id text not null references public.skill_tree_catalog(id) on delete restrict,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, node_id)
);

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
  ('consistency_weekly_summary', 'consistency', 'Weekly Summary Upgrade', 'Adds richer weekly consistency summaries.', 1, 7, 'consistency_streak_frame', 'weekly_summary')
on conflict (id) do update set
  branch = excluded.branch,
  name = excluded.name,
  description = excluded.description,
  point_cost = excluded.point_cost,
  required_level = excluded.required_level,
  prerequisite_node_id = excluded.prerequisite_node_id,
  effect_key = excluded.effect_key;

alter table public.skill_tree_catalog enable row level security;
alter table public.skill_tree_progress enable row level security;
alter table public.user_skill_nodes enable row level security;

create policy "Authenticated users can read skill catalog" on public.skill_tree_catalog
  for select to authenticated using (true);
create policy "Users can read their skill progress" on public.skill_tree_progress
  for select using (auth.uid() = user_id);
create policy "Users can read their unlocked skills" on public.user_skill_nodes
  for select using (auth.uid() = user_id);

alter table public.owned_cosmetics drop constraint if exists owned_cosmetics_acquisition_source_check;
alter table public.owned_cosmetics add constraint owned_cosmetics_acquisition_source_check
  check (acquisition_source in ('shop', 'achievement', 'personal_record', 'fitness_class', 'skill_tree', 'starter'));

create or replace function public.skill_points_for_level(p_level integer)
returns integer language sql immutable as $$
  select (case when p_level >= 3 then 1 else 0 end)
    + (case when p_level >= 5 then 1 else 0 end)
    + (case when p_level >= 7 then 1 else 0 end)
    + (case when p_level >= 10 then 1 else 0 end)
    + (case when p_level >= 12 then 1 else 0 end)
    + (case when p_level >= 15 then 1 else 0 end)
    + (case when p_level >= 18 then 1 else 0 end)
    + (case when p_level >= 20 then 1 else 0 end)
    + (case when p_level >= 25 then 1 else 0 end)
    + (case when p_level >= 30 then 1 else 0 end);
$$;

create or replace function public.sync_skill_tree_progress()
returns public.skill_tree_progress
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_level integer;
  v_points integer;
  v_result public.skill_tree_progress;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  select level into v_level from public.characters where user_id = v_user_id;
  if v_level is null then raise exception 'Character not found'; end if;
  v_points := public.skill_points_for_level(v_level);

  insert into public.skill_tree_progress (user_id, points_earned, points_spent)
  values (v_user_id, v_points, 0)
  on conflict (user_id) do update set
    points_earned = greatest(public.skill_tree_progress.points_earned, excluded.points_earned),
    updated_at = now()
  returning * into v_result;
  return v_result;
end;
$$;

create or replace function public.unlock_skill_node(p_node_id text)
returns public.skill_tree_progress
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_level integer;
  v_node public.skill_tree_catalog;
  v_progress public.skill_tree_progress;
  v_cosmetic_id text;
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;
  perform public.sync_skill_tree_progress();
  select * into v_node from public.skill_tree_catalog where id = p_node_id;
  if not found then raise exception 'Skill node not found'; end if;

  select level into v_level from public.characters where user_id = v_user_id;
  select * into v_progress from public.skill_tree_progress where user_id = v_user_id for update;
  if exists (select 1 from public.user_skill_nodes where user_id = v_user_id and node_id = p_node_id) then
    raise exception 'Skill node already unlocked';
  end if;
  if v_level < v_node.required_level then raise exception 'Required character level not reached'; end if;
  if v_node.prerequisite_node_id is not null and not exists (
    select 1 from public.user_skill_nodes where user_id = v_user_id and node_id = v_node.prerequisite_node_id
  ) then raise exception 'Prerequisite node is locked'; end if;
  if v_progress.points_earned - v_progress.points_spent < v_node.point_cost then
    raise exception 'Not enough skill points';
  end if;

  insert into public.user_skill_nodes (user_id, node_id) values (v_user_id, p_node_id);
  update public.skill_tree_progress
  set points_spent = points_spent + v_node.point_cost, updated_at = now()
  where user_id = v_user_id returning * into v_progress;

  v_cosmetic_id := case p_node_id
    when 'endurance_long_route_badge' then 'skill-long-route-badge'
    when 'strength_training_outfit' then 'skill-training-outfit'
    when 'consistency_streak_frame' then 'skill-streak-frame'
    else null
  end;
  if v_cosmetic_id is not null then
    insert into public.owned_cosmetics (user_id, item_id, acquisition_source, source_ref)
    values (v_user_id, v_cosmetic_id, 'skill_tree', p_node_id)
    on conflict (user_id, item_id) do nothing;
  end if;
  return v_progress;
end;
$$;

alter table public.mission_daily_rerolls add column if not exists reroll_index integer not null default 1;
alter table public.mission_daily_rerolls drop constraint if exists mission_daily_rerolls_pkey;
alter table public.mission_daily_rerolls add primary key (user_id, mission_date, reroll_index);

create or replace function public.reroll_daily_mission(p_mission_id uuid, p_replacement jsonb)
returns public.missions
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_mission public.missions;
  v_result public.missions;
  v_uses integer;
  v_allowance integer;
  v_template_id text;
  v_type public.mission_type;
  v_title text;
  v_difficulty public.mission_difficulty;
  v_target numeric;
  v_reward_exp integer;
  v_reward_coins integer;
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
  if v_template_id is null or v_title is null or v_target is null or v_target <= 0 then raise exception 'Invalid replacement mission'; end if;
  if v_template_id = v_mission.template_id then raise exception 'Replacement must be different'; end if;
  if v_difficulty <> v_mission.difficulty then raise exception 'Replacement difficulty must match'; end if;

  insert into public.mission_daily_rerolls (user_id, mission_date, mission_id, original_mission, replacement_template_id, reroll_index)
  values (v_user_id, v_mission.mission_date, v_mission.id, to_jsonb(v_mission), v_template_id, v_uses + 1);

  update public.missions set
    template_id = v_template_id, type = v_type, title = v_title, difficulty = v_difficulty,
    target_value = v_target, progress = 0, reward_exp = v_reward_exp, reward_coins = v_reward_coins,
    optional_unlock_id = nullif(p_replacement ->> 'optional_unlock_id', ''),
    optional_unlock_name = nullif(p_replacement ->> 'optional_unlock_name', ''), completed_at = null
  where id = v_mission.id returning * into v_result;
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
  if p_pose not in ('neutral', 'ready_to_run', 'stretch', 'post_workout_victory', 'recovery', 'confident') then raise exception 'Unknown character pose'; end if;
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

revoke all on function public.skill_points_for_level(integer) from public;
revoke all on function public.sync_skill_tree_progress() from public;
revoke all on function public.unlock_skill_node(text) from public;
grant execute on function public.sync_skill_tree_progress() to authenticated;
grant execute on function public.unlock_skill_node(text) to authenticated;
