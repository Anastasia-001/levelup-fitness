# LevelUp Fitness Project Context

Last updated: 2026-07-22.

At the time this handoff was prepared, the latest application-code commit on `main` was `4d7116b` (`Lower Character stat cards further`). This document commit may be newer, but it does not intentionally change app behavior.

## Vision

LevelUp Fitness is a mobile-first fitness RPG. The intended experience is a dark, futuristic, game-like fitness app where users record real physical activities, see routes and photos, earn EXP and gold, unlock achievements, progress a character, buy/equip cosmetics, complete daily missions, and review a private activity feed.

The app should stay original. It can be inspired by fitness apps and RPG UX patterns, but it must not copy Strava, Clash Royale, Genshin Impact, anime/game assets, UI layouts, or copyrighted artwork exactly.

The product deliberately excludes social feeds with other users, guilds, PvP, enemies, HP/battle UI, payments, AI chat, Strava integration, Apple Health integration, video verification, leaderboards, and non-physical skills.

## Current Architecture

The app is an Expo React Native TypeScript project using Expo Router.

Main navigation is in `app/(tabs)/_layout.tsx`:

1. Shop
2. Record
3. Character
4. Missions
5. Me

Authentication gating lives in `app/_layout.tsx`. The layout imports the GPS background task module and routes unauthenticated users to the auth stack. Authenticated users are routed into the tab app.

State is centralized with Zustand in `src/store/useAppStore.ts`, with bootstrap logic in `src/store/useBootstrap.ts`. Bootstrap was repaired so essential account data loads first and secondary systems cannot erase the authenticated user's profile or character if one subsystem fails.

Supabase integration is in `src/lib/supabase.ts`. It reads:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`

Auth sessions are persisted using AsyncStorage.

## Important Application Areas

- `app/(auth)/login.tsx` and `app/(auth)/signup.tsx`: email/password auth.
- `app/(tabs)/record.tsx`: map-first recording screen, sport selector, GPS/manual activity flow.
- `app/(tabs)/shop.tsx`: gold coin cosmetic shop.
- `app/(tabs)/character.tsx`: character profile, avatar scene, stats, wardrobe access, Skill Tree access.
- `app/(tabs)/missions.tsx`: daily missions and difficulty/reward/reroll UX.
- `app/(tabs)/me.tsx`: profile summary, settings modal, graph/summary, private activity feed.
- `app/skill-tree.tsx`: Skill Tree route opened from Character.
- `app/activity-history.tsx`: activity history screen.
- `src/services/activityService.ts`: activity persistence and post-save synchronization.
- `src/services/gpsTracking.ts`: foreground/background location tracking readiness.
- `src/services/progressionService.ts`: achievements, streaks, records, and progression refreshes.
- `src/services/shopService.ts`: purchase, inventory, and equipment persistence.
- `src/services/missionService.ts`: mission generation, progress, rewards, and rerolls.
- `src/components/activity/`: history cards, route previews, completion flow pieces.
- `src/components/avatar/`: anime-style avatar preview, cosmetics, poses, fallback behavior.
- `src/components/skill-tree/`: Skill Tree hub and branch detail UI.

## Completed Features

### Authentication and Profiles

- Supabase email/password signup and login.
- Persistent authenticated session.
- Profile with username, location, unit preference, privacy controls, health data toggle, email notifications, push notifications, and fitness class fields.
- Me settings modal opens from the Me screen and autosaves setting changes.
- Logout intentionally clears local session state and returns to login.
- Delete account and policy/privacy areas exist as placeholders or settings entries.

### Record and Activities

- GPS activities: Run, Walk, Bike, Hike.
- Manual activities: Gym workout, Pushups, Swimming, Other workout.
- Map-first Record screen with live stats, sport selector, custom location marker, Start/Pause/Resume/Stop controls, route polyline, and accessible bottom controls.
- Timestamp-based elapsed time with pause duration handling.
- Foreground GPS watch with high accuracy and configurable intervals.
- Background GPS readiness using Expo Location and TaskManager.
- Rich route points include latitude, longitude, timestamp, accuracy, speed, altitude, and segment IDs when available.
- GPS filtering rejects bad points, duplicates, poor accuracy, impossible jumps, and unrealistic sport-specific speeds.
- Route rendering uses accepted/smoothed points and avoids misleading impossible segments where the data supports it.
- Activity save flow persists duration, distance, pace/speed, route JSON, EXP, stat EXP, title, sport, and optional photo fields.
- Activity title can be edited after saving; empty title falls back to a sport-based title.
- Sport can be corrected after stopping without creating a duplicate activity.
- Activity photo can be taken or selected from the library, previewed locally, uploaded to Supabase Storage, and displayed later.
- Saved route maps appear on post-activity completion, Me feed/history, and activity detail views where available.
- Manual workout timer corruption was addressed with session phase handling and server-side reward validation.

### Post-Activity Flow

- Full-screen safe-area-aware completion screen.
- Title editing, sport correction, photo picker/camera, route preview, summary stats, and finish/skip actions.
- RPG reward summary includes character EXP, stat EXP, gold coins, mission completions, achievements, records, and level-up results.
- Post-save synchronization failures are non-destructive and shown as a warning with retry, instead of losing the saved activity.

### Progression

- Character EXP, stat EXP, total level, progress to next level, and four core stats:
  - Endurance
  - Speed
  - Strength
  - Consistency
- Coins and diamonds are displayed. Gold coins are currently used for shop purchases. Diamonds are not currently used as a purchase currency.
- Streaks:
  - current activity-day streak
  - longest activity-day streak
  - current weekly consistency streak
  - longest weekly consistency streak
- Achievements with stable IDs, unlock conditions, rewards, and one-time unlock behavior.
- Personal records by compatible sport, including distance, duration, pace/speed, weekly count, and highest EXP records.
- Reward processing is intended to be idempotent using database constraints and `reward_processed_at`.
- Level-up celebrations are queued and batched so very large level changes show one consolidated celebration instead of hundreds of cards.

### Missions

- Daily quest-style Missions screen with week/day selector and mission detail modal.
- Difficulty tiers: Easy, Medium, Hard, Boss.
- Difficulty-based EXP and gold rewards.
- One daily reroll for incomplete missions.
- Safer mission scaling intended to avoid extreme exercise targets and shame/penalty messaging.
- Mission rewards are guarded against duplicate claiming.

### Shop, Inventory, and Cosmetics

- Gold-only cosmetic shop.
- One-time purchases for unique cosmetics.
- Owned, equipped, locked, level-required, and achievement-earned states.
- Compact category grid and richer catalog depth.
- Categories include Featured, Shirts, Pants, Shoes, Accessories, Frames, and seasonal/permanent catalog sections.
- Rarities: Common, Rare, Epic, Legendary.
- Seasonal rotation is deterministic and should not remove already owned items.
- Achievement-earned cosmetics show unlock requirements and become equippable when earned.

### Character, Wardrobe, Poses, and Skill Tree

- Character tab shows a large original anime-inspired starter character scene, user identity, currencies, class badge, wardrobe button, Skill Tree button, and compact stat cards.
- Base character fallback guarantees `assets/characters/levelup-starter.png` renders even for unexpectedly high levels or missing pose/evolution assets.
- Wardrobe supports categories such as Head, Shirt, Pants, Shoes, Accessories, Frames, Auras, and Poses.
- Equipped cosmetics visibly affect the character presentation.
- Locked/owned/equipped states and rarity borders are preserved in wardrobe.
- Character poses and evolution stages exist and persist.
- Fitness classes exist: Runner, Lifter, Explorer, Hybrid Athlete.
- Stat titles exist for the four core stats.
- Skill Tree was moved out of Missions and into Character. The standalone route is `app/skill-tree.tsx`.
- Skill Tree hub uses a four-branch diamond: Endurance, Speed, Strength, Consistency, with central Skill Points.
- Skill nodes use prerequisites and server-side point validation.

## Partially Completed Or Prepared Features

- True background GPS tracking is prepared in code and native config, but it cannot be fully validated in Expo Go. It requires an EAS development build or native build on a physical device.
- Diamonds exist in UI and state but are not used for purchases yet.
- Some Settings entries, such as delete account, policy/privacy, and health data, may be placeholders or limited toggles depending on backend setup.
- The character system uses a local starter PNG plus layered renderer/components. It is designed so better production art can replace the current asset later.
- There are manual Supabase maintenance scripts for corrupted workout reward repair. They are not migrations and should only be run intentionally after review.
- There is no full automated E2E test suite. Verification currently relies on TypeScript, linting, Expo dependency checks, web export where supported, and manual smoke tests.

## Known Bugs and Limitations

- Expo Go can test foreground UI and simple foreground location only. It is not reliable for lock-screen/background GPS.
- Background GPS on iPhone requires a development/native build with the configured native permissions and may require Apple Developer access for physical device distribution.
- Supabase schema and migrations must be applied manually to the target Supabase project. Git does not carry database rows, Auth users, or Storage objects.
- Supabase Storage photo data is external to Git.
- If a migration has not been applied, features depending on that table/RPC can fail at runtime. Recent bootstrap and post-save sync code should prevent optional failures from erasing essential account data.
- Route accuracy still depends on device GPS quality, permission settings, OS background restrictions, and real-world testing.
- Maintenance scripts are powerful and must not be run casually.

## Supabase Structure

For a fresh database, `supabase/schema.sql` is the reference schema. For an existing database, apply migrations in `supabase/migrations/` in timestamp order.

Important tables and systems include:

- `profiles`
- `characters`
- `activities`
- `missions`
- `owned_cosmetics`
- `equipped_cosmetics`
- `character_presentations`
- `progression_streaks`
- `achievement_catalog`
- `user_achievements`
- `personal_records`
- `cosmetic_unlock_catalog`
- `level_up_celebrations`
- `mission_daily_rerolls`
- `user_mission_unlocks`
- `skill_tree_catalog`
- `skill_tree_progress`
- `user_skill_nodes`

Important RPCs/functions include:

- `process_activity_rewards(uuid)`
- `unlock_achievements(text[])`
- `refresh_progression_streaks(uuid)`
- `upsert_personal_records(uuid)`
- `rebuild_personal_records(uuid)`
- `queue_level_up_celebrations(...)`
- `mark_level_up_viewed(...)`
- `mark_level_up_batch_viewed(...)`
- `sync_earned_cosmetics(uuid)`
- `reroll_daily_mission(...)`
- `unlock_skill_node(...)`
- `sync_skill_tree_progress(uuid)`
- `set_character_pose(...)`
- `set_fitness_class(...)`

The schema enables RLS on user-owned tables and uses user-scoped policies. Do not expose service-role keys in the client.

The app expects a Supabase Storage bucket for activity photos. The schema/migrations include setup for an `activity-photos` bucket and user-scoped upload/update policies.

## Environment Variables

Required in local `.env` or equivalent Expo environment:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit secret values. The anon key is public-client scoped but should still be handled through environment configuration rather than hardcoded.

## GPS and Background Location

GPS constants and filtering are centralized in `src/constants/gps.ts` and route/GPS utilities. Foreground tracking uses Expo Location high accuracy with practical time and distance intervals. Background readiness uses `expo-task-manager` and `Location.startLocationUpdatesAsync` from `src/services/gpsTracking.ts`.

Native configuration in `app.json` includes iOS location usage descriptions, `UIBackgroundModes` with `location`, Android foreground/background location permissions, and Expo Location foreground service notification text.

Expo Go limitation:

- Expo Go can test foreground recording and UI flows.
- True background GPS must be tested in a development build or native build.

Recommended background smoke test:

1. Install a development build on a physical phone.
2. Start the dev server with `npx expo start --dev-client`.
3. Log in.
4. Start a Run/Bike/Hike/Walk activity.
5. Lock the screen.
6. Move for several minutes.
7. Reopen the app.
8. Confirm elapsed time, route points, distance, and route map continued.
9. Stop, finish, and confirm the activity appears once in Me/history.

## Design Decisions

- Dark navy/black background with neon cyan, purple, green, orange, white, and light-gray accents.
- RPG inspiration stays focused on fitness progression, not combat.
- Cards use restrained neon borders and glows.
- Shop uses gold coins only for now; diamonds are displayed but reserved.
- Rewards and unlocks must be idempotent and server-validated where possible.
- Bootstrap loads essential account data first, then optional systems, to protect existing profiles and characters from secondary errors.
- Skill Tree lives in Character rather than Missions so Missions can stay focused on daily quests.
- Activity history primarily lives in Me, with supporting history screens/components where needed.

## Rejected Approaches

- Rebuilding the app from scratch was rejected because many interconnected systems now exist.
- Copying copyrighted game/anime/fitness app UI or art was rejected. All art/UI should remain original.
- Expo Go-only background GPS testing was rejected because real lock-screen tracking requires a development/native build.
- Client-only reward trust was rejected after manual workout corruption. Server-side reward validation and idempotency are preferred.
- Duplicate progression systems were rejected. Extend the existing services, tables, and store slices instead.

## Current Priorities

Recommended development order after handoff:

1. Recreate local environment and confirm the app boots.
2. Confirm Supabase migrations are applied in the target project.
3. Smoke test existing authenticated account, profile, level, Me settings, Character, wardrobe, Shop, Missions, and Skill Tree.
4. Build and install an EAS development build for real background GPS testing.
5. Run a short foreground activity and confirm save, route preview, photo/title/sport editing, reward summary, and Me feed.
6. Run a background GPS field test against a known route.
7. Only then continue feature work.

## Testing Procedures

Run these before committing app changes:

```bash
npm run typecheck
npm run lint
npx expo install --check
npx expo export --platform web
```

Optional/manual checks:

```bash
npm run test:manual
npm run test:character
```

Manual smoke test checklist:

- Login restores the existing user.
- Me shows the real username and level, not fallback Rookie data.
- Settings opens and toggles autosave.
- Character base avatar is visible at normal and high levels.
- Wardrobe opens and equipped cosmetics remain aligned.
- Skill Tree opens from Character.
- Shop owned/equipped/locked states work and purchases deduct gold once.
- Missions load, reroll once per day, and rewards do not duplicate.
- Record starts, pauses, resumes, stops, and saves one activity.
- Post-activity flow handles route, photo, title, sport correction, rewards, and retry warning without duplicating the activity.
- Me/history display the saved activity with route/photo when present.

## EAS Development Build Requirements

The project includes `expo-dev-client` and `eas.json`.

Useful commands:

```bash
npx eas login
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
npx eas build --profile development-simulator --platform ios
npx expo start --dev-client
```

An Expo account is needed for EAS cloud builds. Physical iPhone testing may require Apple Developer access depending on the chosen installation/signing path. Android testing can usually use the generated APK from the development profile.

## Last Known Working State

- Git branch: `main`.
- Remote: `origin` points to `https://github.com/Anastasia-001/levelup-fitness.git`.
- Before this handoff documentation, the working tree was clean and synced to `origin/main`.
- Latest app-code commit before docs: `4d7116b Lower Character stat cards further`.
- No app behavior was intentionally changed during this handoff documentation task.
- Required local secrets are not stored in Git and must be recreated on the new laptop.
