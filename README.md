# LevelUp Fitness

LevelUp Fitness is a simple Strava-like fitness RPG mobile app built with Expo React Native, TypeScript, Expo Router, Supabase, react-native-maps, expo-location, and Zustand.

## Features

- Email/password signup and login with Supabase
- Username profile and metric/imperial unit preference
- Five tabs: Record, Activities, Character, Missions, Profile
- GPS recording for Run, Walk, Bike, and Hike
- Manual logging for Gym workout, Pushups, Swimming, and Other workout
- Activity EXP, stat EXP, level progression, and daily mission bonus EXP
- Three generated daily missions with automatic completion when activities are saved
- Dark futuristic game-like mobile UI

## Install

1. Install dependencies:

```bash
npm install
```

2. Copy the environment example:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

3. Fill in `.env` with your Supabase project values:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Supabase Setup

1. Create a Supabase project.
2. Open the Supabase SQL editor.
3. Paste and run `supabase/schema.sql`.
4. In Authentication settings, enable Email provider.
5. For local testing, you can disable email confirmation or confirm users manually in the Supabase dashboard.

The schema creates:

- `profiles`
- `characters`
- `activities`
- `missions`
- Row Level Security policies so each user can only access their own data

## Run Locally

Start Expo:

```bash
npm run start
```

Then open the app with Expo Go on a physical device. GPS tracking works best on a real phone with location permissions enabled.

You can also run platform targets:

```bash
npm run ios
npm run android
```

## Test The App

1. Sign up with email, password, and username.
2. Open the Record tab.
3. Save a manual workout first, such as Pushups with 20 reps, to verify EXP and mission completion.
4. Start a GPS activity on a physical device, allow location access, move around, pause/resume, then stop and save.
5. Check Activities for newest-first history.
6. Check Character for total EXP, level progress, and stat levels.
7. Check Missions for daily progress and completed rewards.
8. Update username or unit preference in Profile, then save.
9. Logout and login again to verify persisted Supabase data.

## Project Structure

```text
app/
  (auth)/        login and signup screens
  (tabs)/        five main app tabs
src/
  components/    reusable UI primitives
  constants/     theme and activity metadata
  hooks/         auth/bootstrap hooks
  lib/           Supabase client
  services/      Supabase data operations
  store/         Zustand app store
  types/         domain and database types
  utils/         EXP, mission, geo, and formatting helpers
supabase/
  schema.sql     database schema and RLS policies
```

## Notes

- Do not commit `.env`.
- No secrets are hardcoded.
- There are no social features, payments, AI chat, leaderboards, integrations, guilds, or non-physical skill systems.
