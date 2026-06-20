create table if not exists public.level_up_celebrations (
  user_id uuid not null references auth.users(id) on delete cascade,
  level integer not null check (level > 1),
  previous_level integer not null check (previous_level > 0 and previous_level < level),
  queued_at timestamptz not null default now(),
  viewed_at timestamptz,
  primary key (user_id, level)
);

create index if not exists level_up_celebrations_pending_idx
  on public.level_up_celebrations (user_id, level)
  where viewed_at is null;

alter table public.level_up_celebrations enable row level security;

drop policy if exists "Users can read their level celebrations" on public.level_up_celebrations;
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

drop trigger if exists characters_queue_level_up_celebrations on public.characters;
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
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.level_up_celebrations
  set viewed_at = coalesce(viewed_at, now())
  where user_id = v_user_id and level = p_level
  returning * into v_result;

  if v_result.user_id is null then
    raise exception 'Level celebration not found';
  end if;

  return v_result;
end;
$$;

revoke all on function public.queue_level_up_celebrations() from public;
revoke all on function public.mark_level_up_viewed(integer) from public;
grant execute on function public.mark_level_up_viewed(integer) to authenticated;
