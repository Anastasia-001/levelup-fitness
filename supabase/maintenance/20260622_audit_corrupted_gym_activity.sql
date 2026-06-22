-- READ-ONLY AUDIT. This file intentionally contains SELECT statements only.
-- Run it in the Supabase SQL Editor before reviewing the repair script.
-- Copy candidate_activity_id and candidate_user_id from the confirmed corrupt row.

with suspicious_activities as (
  select
    a.*,
    coalesce((a.reward_summary ->> 'characterExp')::numeric, a.exp_earned::numeric, 0) as recorded_character_exp,
    coalesce((a.reward_summary ->> 'goldCoins')::numeric, a.exp_earned::numeric, 0) as recorded_gold_coins,
    array_remove(array[
      case
        when a.type in ('gym_workout', 'pushups', 'swimming', 'other_workout')
          and a.duration_seconds > 43200
        then 'manual activity exceeds 12 hours'
      end,
      case when a.duration_seconds > 604800 then 'activity exceeds 7 days' end,
      case when a.exp_earned > 10000 then 'activity EXP exceeds 10,000' end,
      case
        when coalesce((a.reward_summary ->> 'characterExp')::numeric, 0) > 10000
        then 'processed character EXP exceeds 10,000'
      end,
      case
        when coalesce((a.reward_summary ->> 'goldCoins')::numeric, 0) > 10000
        then 'processed gold exceeds 10,000'
      end,
      case when a.duration_seconds <= 0 then 'non-positive duration' end,
      case when a.exp_earned < 0 then 'negative EXP' end,
      case
        when a.distance_meters is not null
          and (a.distance_meters < 0 or a.distance_meters::text in ('NaN', 'Infinity', '-Infinity'))
        then 'invalid distance'
      end,
      case
        when a.completed_at < a.started_at
        then 'completed timestamp precedes start timestamp'
      end
    ], null) as suspicious_reasons
  from public.activities as a
  where
    (a.type in ('gym_workout', 'pushups', 'swimming', 'other_workout') and a.duration_seconds > 43200)
    or a.duration_seconds > 604800
    or a.exp_earned > 10000
    or coalesce((a.reward_summary ->> 'characterExp')::numeric, 0) > 10000
    or coalesce((a.reward_summary ->> 'goldCoins')::numeric, 0) > 10000
    or a.duration_seconds <= 0
    or a.exp_earned < 0
    or (
      a.distance_meters is not null
      and (a.distance_meters < 0 or a.distance_meters::text in ('NaN', 'Infinity', '-Infinity'))
    )
    or a.completed_at < a.started_at
)
select
  suspicious.id as candidate_activity_id,
  suspicious.user_id as candidate_user_id,
  suspicious.suspicious_reasons,
  suspicious.type,
  suspicious.title,
  suspicious.started_at,
  suspicious.completed_at,
  suspicious.duration_seconds,
  round(suspicious.duration_seconds / 3600.0, 2) as duration_hours,
  suspicious.distance_meters,
  suspicious.sets,
  suspicious.reps,
  suspicious.weight_kg,
  suspicious.exp_earned,
  suspicious.stat_exp,
  suspicious.reward_processed_at,
  suspicious.reward_summary,
  suspicious.recorded_character_exp,
  suspicious.recorded_gold_coins,
  suspicious.personal_record_ids,
  to_jsonb(character_row) as current_character,
  to_jsonb(presentation_row) as current_character_presentation,
  to_jsonb(skill_progress_row) as current_skill_progress,
  coalesce(records.related_personal_records, '[]'::jsonb) as related_personal_records,
  coalesce(celebrations.related_level_up_celebrations, '[]'::jsonb) as related_level_up_celebrations,
  coalesce(achievements.related_achievements, '[]'::jsonb) as related_achievements,
  coalesce(missions.related_missions, '[]'::jsonb) as related_missions,
  coalesce(cosmetics.related_progression_cosmetics, '[]'::jsonb) as related_progression_cosmetics,
  coalesce(skills.related_skill_nodes, '[]'::jsonb) as related_skill_nodes,
  'COPY candidate_activity_id AND candidate_user_id ONLY AFTER CONFIRMING THIS IS THE CORRUPT ROW' as required_action
from suspicious_activities as suspicious
left join public.characters as character_row
  on character_row.user_id = suspicious.user_id
left join public.character_presentations as presentation_row
  on presentation_row.user_id = suspicious.user_id
left join public.skill_tree_progress as skill_progress_row
  on skill_progress_row.user_id = suspicious.user_id
left join lateral (
  select jsonb_agg(to_jsonb(pr) order by pr.record_type, pr.sport_key) as related_personal_records
  from public.personal_records as pr
  where pr.user_id = suspicious.user_id
    and (
      pr.activity_id = suspicious.id
      or pr.record_type || ':' || pr.sport_key = any(coalesce(suspicious.personal_record_ids, '{}'::text[]))
    )
) as records on true
left join lateral (
  select jsonb_agg(to_jsonb(luc) order by luc.level) as related_level_up_celebrations
  from public.level_up_celebrations as luc
  where luc.user_id = suspicious.user_id
    and (
      luc.level between
        coalesce((suspicious.reward_summary ->> 'levelBefore')::integer, luc.level) + 1
        and coalesce((suspicious.reward_summary ->> 'levelAfter')::integer, luc.level)
      or luc.queued_at >= coalesce(suspicious.reward_processed_at, suspicious.completed_at)
    )
) as celebrations on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'userAchievement', to_jsonb(ua),
      'catalog', to_jsonb(ac),
      'listedInRewardSummary', exists (
        select 1
        from jsonb_array_elements(coalesce(suspicious.reward_summary -> 'achievementsUnlocked', '[]'::jsonb)) as summary_item
        where summary_item ->> 'id' = ua.achievement_id
      )
    ) order by ua.unlocked_at, ua.achievement_id
  ) as related_achievements
  from public.user_achievements as ua
  join public.achievement_catalog as ac on ac.id = ua.achievement_id
  where ua.user_id = suspicious.user_id
    and (
      ua.unlocked_at >= coalesce(suspicious.reward_processed_at, suspicious.completed_at) - interval '5 minutes'
      or exists (
        select 1
        from jsonb_array_elements(coalesce(suspicious.reward_summary -> 'achievementsUnlocked', '[]'::jsonb)) as summary_item
        where summary_item ->> 'id' = ua.achievement_id
      )
    )
) as achievements on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object(
      'mission', to_jsonb(m),
      'listedInRewardSummary', exists (
        select 1
        from jsonb_array_elements(coalesce(suspicious.reward_summary -> 'missionsCompleted', '[]'::jsonb)) as summary_item
        where summary_item ->> 'id' = m.id::text
      )
    ) order by m.id
  ) as related_missions
  from public.missions as m
  where m.user_id = suspicious.user_id
    and (
      m.completed_at = suspicious.reward_processed_at
      or exists (
        select 1
        from jsonb_array_elements(coalesce(suspicious.reward_summary -> 'missionsCompleted', '[]'::jsonb)) as summary_item
        where summary_item ->> 'id' = m.id::text
      )
    )
) as missions on true
left join lateral (
  select jsonb_agg(to_jsonb(owned) order by owned.acquired_at, owned.item_id) as related_progression_cosmetics
  from public.owned_cosmetics as owned
  where owned.user_id = suspicious.user_id
    and owned.acquisition_source in ('achievement', 'personal_record', 'skill_tree')
    and owned.acquired_at >= coalesce(suspicious.reward_processed_at, suspicious.completed_at) - interval '5 minutes'
) as cosmetics on true
left join lateral (
  select jsonb_agg(
    jsonb_build_object('node', to_jsonb(nodes), 'catalog', to_jsonb(catalog))
    order by nodes.unlocked_at, nodes.node_id
  ) as related_skill_nodes
  from public.user_skill_nodes as nodes
  join public.skill_tree_catalog as catalog on catalog.id = nodes.node_id
  where nodes.user_id = suspicious.user_id
    and nodes.unlocked_at >= coalesce(suspicious.reward_processed_at, suspicious.completed_at) - interval '5 minutes'
) as skills on true
order by suspicious.recorded_character_exp desc, suspicious.duration_seconds desc;
