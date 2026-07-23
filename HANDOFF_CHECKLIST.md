# LevelUp Fitness Handoff Checklist

Use this when moving the project to a new laptop.

## What Git Contains

Git should contain the source code, Expo config, EAS config, assets committed under `assets/`, Supabase schema/migrations/maintenance SQL files, and project documentation.

The current GitHub repository is:

```text
https://github.com/Anastasia-001/levelup-fitness.git
```

## Not Stored In Git

These must be recreated, reconnected, or copied manually where applicable:

- `.env` with local environment values.
- `node_modules/`.
- `.expo/`.
- `dist/` or `web-build/`.
- local logs and temporary files.
- local Expo/EAS login session.
- local Supabase CLI login session, if used.
- Supabase Auth users, database rows, and Storage objects.
- Supabase Storage activity photos.
- locally installed development builds on phones or simulators.
- Apple Developer signing access, certificates, provisioning profiles, or keys.
- Android signing credentials if any are stored locally outside EAS.

Known committed app asset:

- `assets/characters/levelup-starter.png`

No required untracked local asset files are currently known. If you added assets outside the repository manually, copy them separately before wiping the old machine.

## Required Environment Variables

Create a local `.env` from `.env.example` and fill in values:

```bash
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit the filled `.env`.

## Accounts and Services To Reconnect

- GitHub access to `Anastasia-001/levelup-fitness`.
- Supabase project containing the app database, Auth configuration, and Storage bucket.
- Expo/EAS account for development builds.
- Apple Developer account if you need physical iPhone development builds through Apple signing.
- Android device/emulator setup for Android development builds.

## Supabase Setup On A New Environment

For an existing Supabase project:

1. Confirm the project URL and anon key.
2. Confirm all migrations in `supabase/migrations/` have been applied in timestamp order.
3. Confirm the `activity-photos` Storage bucket and policies exist.
4. Confirm RLS is enabled and user-scoped policies are present.

For a fresh Supabase project:

1. Run `supabase/schema.sql` in the SQL Editor, or apply the migration chain in order if preferred.
2. Configure Auth email/password.
3. Confirm Storage bucket and policies.
4. Add the new URL and anon key to local `.env`.

Manual maintenance scripts:

- `supabase/maintenance/20260622_audit_corrupted_gym_activity.sql`
- `supabase/maintenance/20260622_repair_corrupted_gym_activity.sql`

These are not normal migrations. Run them only intentionally after reviewing `docs/CORRUPTED_ACTIVITY_REPAIR.md`.

## Clone And Install

```bash
git clone https://github.com/Anastasia-001/levelup-fitness.git
cd levelup-fitness
npm install
copy .env.example .env
```

On macOS/Linux:

```bash
cp .env.example .env
```

Fill `.env` with the Supabase values.

## Launch Locally

Expo Go foreground testing:

```bash
npm run start
```

Development build testing:

```bash
npx expo start --dev-client
```

## Build A Development Client

```bash
npx eas login
npx eas build --profile development --platform ios
npx eas build --profile development --platform android
```

iOS simulator development build:

```bash
npx eas build --profile development-simulator --platform ios
```

Expo Go can test foreground UI and simple foreground location. True background GPS requires a development build or native build.

## Checks Before Resuming Development

```bash
git status -sb
npm run typecheck
npm run lint
npx expo install --check
npx expo export --platform web
```

Optional project checks:

```bash
npm run test:manual
npm run test:character
```

## Manual Smoke Tests

- Login with the existing Supabase user.
- Confirm Me shows the stored username and progressed level, not fallback Rookie data.
- Open Settings from Me and verify toggles still autosave.
- Open Character and verify the base anime character appears with equipped cosmetics.
- Open Wardrobe and verify owned/equipped/locked states.
- Open Skill Tree from Character and verify branch details open.
- Open Shop and verify owned items cannot be repurchased.
- Open Missions and verify daily missions/reroll UI loads.
- Record a short foreground activity, then stop and save.
- On post-activity completion, verify route preview, title, sport correction, optional photo, reward summary, and finish/skip.
- Confirm the saved activity appears once in Me/history.
- For background GPS, use a development build, start an activity, lock the screen, move, reopen, and confirm time/route continued.

## Before Pushing New Work

```bash
git status -sb
npm run typecheck
npm run lint
npx expo install --check
```

Do not push `.env`, secrets, tokens, signing keys, certificates, `node_modules`, `.expo`, `dist`, logs, or temporary files.
