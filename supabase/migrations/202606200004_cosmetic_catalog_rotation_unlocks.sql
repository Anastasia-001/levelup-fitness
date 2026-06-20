alter table public.owned_cosmetics
  add column if not exists acquisition_source text not null default 'shop',
  add column if not exists source_ref text;

alter table public.owned_cosmetics
  drop constraint if exists owned_cosmetics_acquisition_source_check;

alter table public.owned_cosmetics
  add constraint owned_cosmetics_acquisition_source_check
  check (acquisition_source in ('shop', 'achievement', 'personal_record', 'starter'));

alter table public.equipped_cosmetics
  add column if not exists aura_item_id text;

create table if not exists public.cosmetic_unlock_catalog (
  item_id text primary key,
  source_type text not null check (source_type in ('achievement', 'personal_record')),
  source_id text not null,
  requirement_label text not null
);

insert into public.cosmetic_unlock_catalog (item_id, source_type, source_id, requirement_label)
values
  ('five-k-finish-frame', 'achievement', 'first_5_km', 'Complete your first 5 km activity'),
  ('seven-day-pulse-aura', 'achievement', 'seven_day_streak', 'Reach a 7-day activity streak'),
  ('committed-25-jacket', 'achievement', 'twenty_five_activities', 'Complete 25 activities'),
  ('level-ten-crown-band', 'achievement', 'character_level_10', 'Reach character Level 10'),
  ('pace-record-wristband', 'personal_record', 'fastest_5_km', 'Set a fastest 5 km personal record'),
  ('distance-record-aura', 'personal_record', 'longest_distance', 'Set a longest-distance personal record')
on conflict (item_id) do update set
  source_type = excluded.source_type,
  source_id = excluded.source_id,
  requirement_label = excluded.requirement_label;

alter table public.cosmetic_unlock_catalog enable row level security;

drop policy if exists "Authenticated users can read cosmetic unlock catalog" on public.cosmetic_unlock_catalog;
create policy "Authenticated users can read cosmetic unlock catalog"
  on public.cosmetic_unlock_catalog for select
  to authenticated
  using (true);

create or replace function public.sync_earned_cosmetics()
returns setof public.owned_cosmetics
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  return query
  with eligible as (
    select unlocks.*
    from public.cosmetic_unlock_catalog unlocks
    where (
      unlocks.source_type = 'achievement'
      and exists (
        select 1
        from public.user_achievements achievements
        where achievements.user_id = v_user_id
          and achievements.achievement_id = unlocks.source_id
      )
    ) or (
      unlocks.source_type = 'personal_record'
      and exists (
        select 1
        from public.personal_records records
        where records.user_id = v_user_id
          and records.record_type = unlocks.source_id
      )
    )
  ), inserted as (
    insert into public.owned_cosmetics (
      user_id,
      item_id,
      acquired_at,
      acquisition_source,
      source_ref
    )
    select
      v_user_id,
      eligible.item_id,
      now(),
      eligible.source_type,
      eligible.source_id
    from eligible
    on conflict (user_id, item_id) do nothing
    returning *
  )
  select * from inserted order by acquired_at, item_id;
end;
$$;

revoke all on function public.sync_earned_cosmetics() from public;
grant execute on function public.sync_earned_cosmetics() to authenticated;
