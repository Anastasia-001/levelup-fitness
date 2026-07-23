# LevelUp Fitness Agent Guide

## Project Purpose

LevelUp Fitness is a production-oriented Expo React Native mobile app that combines fitness activity tracking with original dark-neon RPG progression. Users record physical activities, earn EXP and coins, level a character, complete missions, buy/equip cosmetics, unlock achievements, and review private activity history.

Read `PROJECT_CONTEXT.md` before making substantial code changes.

## Technology Stack

- Expo React Native with TypeScript
- Expo Router for navigation
- Supabase Auth, Database, and Storage
- Zustand for local app state
- `react-native-maps` and `expo-location` for GPS recording and maps
- `expo-task-manager` for background GPS readiness
- `expo-image-picker` for activity photos
- EAS development builds for true background GPS testing

## Important Folders

- `app/`: Expo Router screens and route layouts.
- `app/(tabs)/`: Main tab screens: Shop, Record, Character, Missions, Me.
- `src/components/`: Reusable UI, avatar, activity, mission, shop, and skill-tree components.
- `src/services/`: Supabase-backed services and GPS/background tracking services.
- `src/store/`: Zustand store and bootstrap logic.
- `src/utils/`: EXP, mission, GPS, route, formatting, and progression utilities.
- `src/types/`: Shared TypeScript types.
- `src/theme/`: Dark neon design tokens.
- `supabase/schema.sql`: Fresh database schema reference.
- `supabase/migrations/`: Additive migrations for existing Supabase projects.
- `supabase/maintenance/`: Manual audit/repair scripts. Do not run automatically.

## Common Commands

```bash
npm install
npm run start
npm run typecheck
npm run lint
npx expo install --check
npx expo export --platform web
```

Development build commands:

```bash
npm install
npx eas login
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
npx expo start --dev-client
```

## Coding Conventions

- Preserve the existing Expo Router structure and Zustand store shape.
- Prefer existing services, components, theme tokens, and utility functions over new parallel systems.
- Keep TypeScript types, mappers, services, state, and UI in sync.
- Use stable IDs for persisted data, rendered lists, rewards, achievements, cosmetics, skill nodes, and missions.
- Keep reward processing idempotent. Never allow EXP, coins, achievements, records, missions, or level-up presentations to duplicate.
- Add database changes only through safe additive migrations. Do not rename or drop existing columns unless explicitly requested and fully migrated.
- Do not commit `.env`, secrets, tokens, signing keys, certificates, `node_modules`, `.expo`, `dist`, logs, or build artifacts.
- Do not perform broad dependency upgrades. Use `npx expo install` only when an Expo dependency change is required.
- Keep UI dark, clean, neon, RPG-inspired, original, and usable on small iPhones.

## Features To Preserve

- Supabase email/password authentication and existing user data.
- Profile loading, Me settings, autosave preferences, and logout behavior.
- GPS and manual activity recording.
- Background GPS preparation and route point persistence.
- Post-activity title, sport correction, photo upload, route preview, and RPG reward summary.
- Activity history and Me feed.
- EXP, stats, levels, coins, diamonds, missions, streaks, achievements, personal records, and level-up celebrations.
- Shop catalog, one-time purchases, owned/equipped cosmetics, rarities, rotation, and achievement unlocks.
- Character screen, wardrobe, poses, evolution stages, stat titles, fitness classes, and Skill Tree.

## Architectural Constraints

- Do not rebuild or recreate the app from scratch.
- Do not replace working systems with duplicate implementations.
- Do not change Supabase ownership IDs or reset user data during bootstrap or sync failures.
- Do not make all user data public. Keep RLS user-scoped.
- Do not add excluded product areas unless explicitly requested: social, guilds, leaderboards, PvP, payments, AI chat, Strava integration, Apple Health integration, or non-physical skills.
