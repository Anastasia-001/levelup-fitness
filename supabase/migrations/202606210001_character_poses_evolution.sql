create table if not exists public.character_presentations (
  user_id uuid primary key references auth.users(id) on delete cascade,
  equipped_pose text not null default 'neutral' check (equipped_pose in (
    'neutral', 'ready_to_run', 'stretch', 'post_workout_victory', 'recovery', 'confident'
  )),
  highest_evolution_stage text not null default 'starter' check (highest_evolution_stage in (
    'starter', 'trainee', 'athlete', 'elite'
  )),
  updated_at timestamptz not null default now()
);

alter table public.character_presentations enable row level security;

drop policy if exists "Users can read their character presentation" on public.character_presentations;
create policy "Users can read their character presentation"
  on public.character_presentations for select
  using (auth.uid() = user_id);

create or replace function public.evolution_stage_for_level(p_level integer)
returns text
language sql
immutable
as $$
  select case
    when p_level >= 20 then 'elite'
    when p_level >= 10 then 'athlete'
    when p_level >= 5 then 'trainee'
    else 'starter'
  end;
$$;

create or replace function public.evolution_stage_rank(p_stage text)
returns integer
language sql
immutable
as $$
  select case p_stage
    when 'elite' then 4
    when 'athlete' then 3
    when 'trainee' then 2
    else 1
  end;
$$;

insert into public.character_presentations (user_id, highest_evolution_stage)
select characters.user_id, public.evolution_stage_for_level(characters.level)
from public.characters characters
on conflict (user_id) do update set
  highest_evolution_stage = case
    when public.evolution_stage_rank(excluded.highest_evolution_stage) >
         public.evolution_stage_rank(public.character_presentations.highest_evolution_stage)
      then excluded.highest_evolution_stage
    else public.character_presentations.highest_evolution_stage
  end,
  updated_at = now();

create or replace function public.sync_character_presentation()
returns public.character_presentations
language plpgsql
security definer
set search_path = public
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
      when public.evolution_stage_rank(v_stage) >
           public.evolution_stage_rank(public.character_presentations.highest_evolution_stage)
        then v_stage
      else public.character_presentations.highest_evolution_stage
    end,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.set_character_pose(p_pose text)
returns public.character_presentations
language plpgsql
security definer
set search_path = public
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
    when 'ready_to_run' then exists (
      select 1 from public.activities
      where user_id = v_user_id and type in ('run', 'walk', 'bike', 'hike')
    )
    when 'stretch' then exists (
      select 1 from public.missions
      where user_id = v_user_id and completed_at is not null and template_id like '%recovery%'
    )
    when 'post_workout_victory' then v_level >= 5
    when 'recovery' then exists (
      select 1 from public.progression_streaks
      where user_id = v_user_id and longest_activity_day_streak >= 7
    )
    when 'confident' then v_level >= 10
    else false
  end;

  if not v_allowed then raise exception 'Pose requirement is not complete'; end if;

  update public.character_presentations
  set equipped_pose = p_pose, updated_at = now()
  where user_id = v_user_id
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.sync_character_evolution_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stage text := public.evolution_stage_for_level(new.level);
begin
  insert into public.character_presentations (user_id, highest_evolution_stage)
  values (new.user_id, v_stage)
  on conflict (user_id) do update set
    highest_evolution_stage = case
      when public.evolution_stage_rank(v_stage) >
           public.evolution_stage_rank(public.character_presentations.highest_evolution_stage)
        then v_stage
      else public.character_presentations.highest_evolution_stage
    end,
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists characters_sync_evolution_stage on public.characters;
create trigger characters_sync_evolution_stage
after insert or update of level on public.characters
for each row execute function public.sync_character_evolution_trigger();

revoke all on function public.evolution_stage_for_level(integer) from public;
revoke all on function public.evolution_stage_rank(text) from public;
revoke all on function public.sync_character_presentation() from public;
revoke all on function public.set_character_pose(text) from public;
revoke all on function public.sync_character_evolution_trigger() from public;
grant execute on function public.sync_character_presentation() to authenticated;
grant execute on function public.set_character_pose(text) to authenticated;
