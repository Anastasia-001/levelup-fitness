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

  with inserted_achievements as (
    insert into public.user_achievements as newly_unlocked (
      user_id,
      achievement_id,
      unlocked_at,
      claimed_at
    )
    select
      v_user_id,
      catalog.id,
      now(),
      case when catalog.claim_required then null else now() end
    from public.achievement_catalog as catalog
    where catalog.id = any(coalesce(p_achievement_ids, array[]::text[]))
      and public.achievement_condition_met(
        v_user_id,
        catalog.condition_key,
        catalog.condition_target
      )
    on conflict on constraint user_achievements_pkey do nothing
    returning newly_unlocked.achievement_id
  )
  select coalesce(
    array_agg(inserted_achievements.achievement_id),
    array[]::text[]
  )
  into v_new_ids
  from inserted_achievements;

  if cardinality(v_new_ids) > 0 then
    select coalesce(sum(catalog.reward_coins), 0)
    into v_reward_coins
    from public.achievement_catalog as catalog
    where catalog.id = any(v_new_ids)
      and catalog.claim_required = false;

    if v_reward_coins > 0 then
      update public.characters as character
      set coins = character.coins + v_reward_coins
      where character.user_id = v_user_id;
    end if;
  end if;

  return query
  select
    unlocked.achievement_id,
    unlocked.unlocked_at,
    unlocked.claimed_at
  from public.user_achievements as unlocked
  where unlocked.user_id = v_user_id
    and unlocked.achievement_id = any(v_new_ids)
  order by unlocked.unlocked_at;
end;
$$;

revoke all on function public.unlock_achievements(text[]) from public;
grant execute on function public.unlock_achievements(text[]) to authenticated;
