create or replace function public.queue_level_up_celebrations()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.level > old.level then
    insert into public.level_up_celebrations (
      user_id,
      level,
      previous_level,
      queued_at
    ) values (
      new.user_id,
      new.level,
      old.level,
      now()
    )
    on conflict (user_id, level) do update set
      previous_level = least(
        public.level_up_celebrations.previous_level,
        excluded.previous_level
      ),
      queued_at = least(
        public.level_up_celebrations.queued_at,
        excluded.queued_at
      );
  end if;
  return new;
end;
$$;

create or replace function public.mark_level_up_batch_viewed(
  p_first_level integer,
  p_final_level integer
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_updated_count integer := 0;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_first_level is null or p_final_level is null
    or p_first_level <= 1 or p_final_level < p_first_level then
    raise exception 'Invalid level-up batch';
  end if;

  update public.level_up_celebrations as celebration
  set viewed_at = coalesce(celebration.viewed_at, now())
  where celebration.user_id = v_user_id
    and celebration.viewed_at is null
    and celebration.level between p_first_level and p_final_level;

  get diagnostics v_updated_count = row_count;
  return v_updated_count;
end;
$$;

revoke all on function public.queue_level_up_celebrations() from public;
revoke all on function public.mark_level_up_batch_viewed(integer, integer) from public;
grant execute on function public.mark_level_up_batch_viewed(integer, integer) to authenticated;
