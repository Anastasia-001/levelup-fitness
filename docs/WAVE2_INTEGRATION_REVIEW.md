# Wave 2 Integration Review

Reviewed: 2026-06-21

## Verification

- `npm run typecheck`: passed
- `npm run lint`: passed
- `npx expo install --check`: dependencies match the installed Expo SDK
- `npx expo export --platform web`: passed
- Expo Router web bundle: generated without route or compile errors
- Native GPS, background location configuration, route maps, post-activity media, and activity persistence were left intact

## Progression Safety

- Activity rewards are guarded by `activities.reward_processed_at` and row locking in `process_activity_rewards`.
- Achievement unlocks use the `(user_id, achievement_id)` primary key and conflict-safe inserts.
- Personal records use a unique `(user_id, record_type, sport_key)` identity.
- Level-up presentations use `(user_id, level)` and persist `viewed_at`.
- Mission rerolls are keyed by user, local date, and reroll index; the server enforces the daily allowance.
- Earned cosmetics and purchases use `(user_id, item_id)`, preventing duplicate ownership.
- Skill points are derived from fixed level milestones. `unlock_skill_node` locks the progress row, validates level and prerequisites, and spends points atomically.
- Poses, evolution stage, fitness class, and skill nodes are persisted per authenticated user.

## RLS Review

- Profiles, characters, activities, missions, inventory, and equipment are restricted to `auth.uid()`.
- Streaks, achievements, personal records, level celebrations, mission rerolls, character presentation, skill progress, and unlocked skill nodes are readable only by their owner.
- Achievement, cosmetic-unlock, and skill-tree catalogs are read-only for authenticated users.
- Progression writes that award rewards or spend skill points use security-definer RPCs with an authenticated user check.
- No service-role credential is present in the client or repository.

## Migrations

Apply these additive migrations in filename order for an existing Supabase project:

1. `202605270001_cosmetics_inventory.sql`
2. `202605280001_me_settings_activity_photos.sql`
3. `202606160001_add_activity_titles.sql`
4. `202606190001_progression_milestones.sql`
5. `202606200001_post_activity_reward_summary.sql`
6. `202606200002_level_up_celebrations.sql`
7. `202606200003_mission_difficulties_rerolls.sql`
8. `202606200004_cosmetic_catalog_rotation_unlocks.sql`
9. `202606210001_character_poses_evolution.sql`
10. `202606210002_fitness_classes.sql`
11. `202606210003_mission_skill_tree.sql`
12. `202606210004_fix_progression_rpc_ambiguity.sql`

All Wave 2 migrations are additive. They preserve existing activities, progression, inventory, and equipped cosmetics.

## Device Smoke Checklist

The final native smoke pass should use a small iPhone simulator or physical development build:

- Open every bottom tab and confirm navigation remains stable.
- Reopen a post-activity summary and confirm rewards do not change.
- Change title, photo, and sport and confirm the existing activity is updated.
- Purchase an item once and confirm gold and ownership persist.
- Select a class, pose, and cosmetic, restart, and confirm each persists.
- Spend a skill point, then attempt the same node again and confirm it remains unlocked without another spend.
- Use mission rerolls across a local-day boundary and confirm the allowance resets.
