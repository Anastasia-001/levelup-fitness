alter table public.character_presentations
  add column if not exists fitness_class text not null default 'hybrid_athlete';

alter table public.character_presentations
  drop constraint if exists character_presentations_fitness_class_check;

alter table public.character_presentations
  add constraint character_presentations_fitness_class_check
  check (fitness_class in ('runner', 'lifter', 'explorer', 'hybrid_athlete'));

alter table public.owned_cosmetics
  drop constraint if exists owned_cosmetics_acquisition_source_check;

alter table public.owned_cosmetics
  add constraint owned_cosmetics_acquisition_source_check
  check (acquisition_source in ('shop', 'achievement', 'personal_record', 'fitness_class', 'starter'));

alter table public.cosmetic_unlock_catalog
  drop constraint if exists cosmetic_unlock_catalog_source_type_check;

alter table public.cosmetic_unlock_catalog
  add constraint cosmetic_unlock_catalog_source_type_check
  check (source_type in ('achievement', 'personal_record', 'fitness_class'));

insert into public.cosmetic_unlock_catalog (item_id, source_type, source_id, requirement_label)
values
  ('runner-route-band', 'fitness_class', 'runner', 'Choose the Runner class'),
  ('lifter-power-wrap', 'fitness_class', 'lifter', 'Choose the Lifter class'),
  ('explorer-trail-frame', 'fitness_class', 'explorer', 'Choose the Explorer class'),
  ('hybrid-spectrum-aura', 'fitness_class', 'hybrid_athlete', 'Choose the Hybrid Athlete class')
on conflict (item_id) do update set
  source_type = excluded.source_type,
  source_id = excluded.source_id,
  requirement_label = excluded.requirement_label;

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

create or replace function public.set_fitness_class(p_class text)
returns public.character_presentations
language plpgsql
security definer
set search_path = public
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
  where user_id = v_user_id
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.set_fitness_class(text) from public;
grant execute on function public.set_fitness_class(text) to authenticated;
