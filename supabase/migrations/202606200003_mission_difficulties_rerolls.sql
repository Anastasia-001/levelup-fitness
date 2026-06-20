do $$
begin
  create type public.mission_difficulty as enum ('easy', 'medium', 'hard', 'boss');
exception
  when duplicate_object then null;
end $$;

alter table public.missions
  add column if not exists template_id text,
  add column if not exists difficulty public.mission_difficulty,
  add column if not exists reward_coins integer,
  add column if not exists optional_unlock_id text,
  add column if not exists optional_unlock_name text;

update public.missions
set
  template_id = coalesce(template_id, 'legacy-' || type::text),
  difficulty = coalesce(
    difficulty,
    case
      when reward_exp <= 35 then 'easy'::public.mission_difficulty
      else 'medium'::public.mission_difficulty
    end
  ),
  reward_exp = case
    when coalesce(difficulty, case when reward_exp <= 35 then 'easy'::public.mission_difficulty else 'medium'::public.mission_difficulty end) = 'easy'
      then greatest(20, least(35, reward_exp))
    else greatest(45, least(75, reward_exp))
  end,
  reward_coins = coalesce(
    reward_coins,
    case
      when reward_exp <= 35 then 8
      else 20
    end
  );

alter table public.missions
  alter column template_id set default 'legacy',
  alter column template_id set not null,
  alter column difficulty set default 'easy',
  alter column difficulty set not null,
  alter column reward_coins set default 5,
  alter column reward_coins set not null;

alter table public.missions drop constraint if exists missions_difficulty_reward_ranges;
alter table public.missions add constraint missions_difficulty_reward_ranges check (
  (difficulty = 'easy' and reward_exp between 20 and 35 and reward_coins between 5 and 12)
  or (difficulty = 'medium' and reward_exp between 45 and 75 and reward_coins between 15 and 30)
  or (difficulty = 'hard' and reward_exp between 90 and 150 and reward_coins between 40 and 75)
  or (difficulty = 'boss' and reward_exp between 180 and 300 and reward_coins between 100 and 175)
);

create table if not exists public.mission_daily_rerolls (
  user_id uuid not null references auth.users(id) on delete cascade,
  mission_date date not null,
  mission_id uuid not null references public.missions(id) on delete cascade,
  original_mission jsonb not null,
  replacement_template_id text not null,
  used_at timestamptz not null default now(),
  primary key (user_id, mission_date)
);

create table if not exists public.user_mission_unlocks (
  user_id uuid not null references auth.users(id) on delete cascade,
  unlock_id text not null,
  unlock_name text not null,
  mission_id uuid references public.missions(id) on delete set null,
  unlocked_at timestamptz not null default now(),
  primary key (user_id, unlock_id)
);

alter table public.mission_daily_rerolls enable row level security;
alter table public.user_mission_unlocks enable row level security;

drop policy if exists "Users can read their mission rerolls" on public.mission_daily_rerolls;
create policy "Users can read their mission rerolls"
  on public.mission_daily_rerolls for select
  using (auth.uid() = user_id);

drop policy if exists "Users can read their mission unlocks" on public.user_mission_unlocks;
create policy "Users can read their mission unlocks"
  on public.user_mission_unlocks for select
  using (auth.uid() = user_id);

create or replace function public.reroll_daily_mission(
  p_mission_id uuid,
  p_replacement jsonb
)
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
begin
  if v_user_id is null then raise exception 'Authentication required'; end if;

  select * into v_mission
  from public.missions
  where id = p_mission_id and user_id = v_user_id
  for update;

  if not found then raise exception 'Mission not found'; end if;
  if v_mission.completed_at is not null then raise exception 'Completed missions cannot be rerolled'; end if;

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
    user_id,
    mission_date,
    mission_id,
    original_mission,
    replacement_template_id,
    used_at
  ) values (
    v_user_id,
    v_mission.mission_date,
    v_mission.id,
    to_jsonb(v_mission),
    v_template_id,
    now()
  );

  update public.missions
  set
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
exception
  when unique_violation then
    raise exception 'Daily reroll already used';
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
      coalesce(
        jsonb_agg(
          jsonb_build_object(
            'id', id,
            'title', title,
            'rewardExp', reward_exp,
            'rewardCoins', reward_coins,
            'optionalUnlockId', optional_unlock_id,
            'optionalUnlockName', optional_unlock_name
          ) order by id
        ),
        '[]'::jsonb
      )
    into v_mission_gold, v_completed_missions
    from public.missions
    where user_id = new.user_id
      and completed_at = new.reward_processed_at;

    if v_mission_gold > 0 then
      update public.characters
      set coins = coins + v_mission_gold
      where user_id = new.user_id;
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
        jsonb_set(
          coalesce(new.reward_summary, '{}'::jsonb),
          '{missionGoldCoins}',
          to_jsonb(v_mission_gold),
          true
        ),
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

drop trigger if exists activities_apply_mission_completion_rewards on public.activities;
create trigger activities_apply_mission_completion_rewards
before update of reward_processed_at on public.activities
for each row
when (old.reward_processed_at is null and new.reward_processed_at is not null)
execute function public.apply_mission_completion_rewards();

revoke all on function public.reroll_daily_mission(uuid, jsonb) from public;
revoke all on function public.apply_mission_completion_rewards() from public;
grant execute on function public.reroll_daily_mission(uuid, jsonb) to authenticated;
