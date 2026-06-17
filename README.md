# LevelUp Fitness

LevelUp Fitness is a simple Strava-like fitness RPG mobile app built with Expo React Native, TypeScript, Expo Router, Supabase, react-native-maps, expo-location, and Zustand.

## Features

- Email/password signup and login with Supabase
- Username profile and metric/imperial unit preference
- Five tabs: Shop, Record, Character, Missions, Me
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

Expo Go is useful for foreground GPS testing, but true locked-screen/background GPS requires a development build or native build because it uses Expo TaskManager and background location services.

You can also run platform targets:

```bash
npm run ios
npm run android
```

## Development Build For Background GPS

Expo Go can test the app UI and simple foreground location flows, but true background GPS tracking requires a development build or native build. The app uses `expo-dev-client`, `expo-location`, and `expo-task-manager` so the native background location permissions and foreground service can be included in the installed app.

Install dependencies and EAS CLI:

```bash
npm install
npm install --global eas-cli
```

Log in to Expo/EAS:

```bash
eas login
eas whoami
```

If this is your first EAS build for the project, let EAS connect the project when prompted:

```bash
eas build:configure
```

Create a development build:

```bash
eas build --platform android --profile development
eas build --platform ios --profile development
```

For iOS Simulator testing on macOS, use:

```bash
eas build --platform ios --profile development-simulator
```

After installing the development build on your device, start the dev server for that build:

```bash
npx expo start --dev-client
```

Testing background GPS:

1. Open the installed LevelUp Fitness development build.
2. Log in and start Run, Walk, Bike, or Hike.
3. Grant foreground and background location permissions.
4. Lock the screen, wait or move for several minutes, then reopen the app.
5. Stop and save the activity.
6. Verify elapsed time and route points continued while the screen was locked.

Android development builds can be installed from the EAS build link or QR code. Physical iPhone device builds through EAS require Apple Developer signing access; iOS Simulator builds require macOS and the iOS Simulator.

## Test The App

1. Sign up with email, password, and username.
2. Open the Record tab.
3. Save a manual workout first, such as Pushups with 20 reps, to verify EXP and mission completion.
4. Start a GPS activity on a physical device, allow location access, move around, pause/resume, then stop and save.
5. Check Me for newest-first activity history.
6. Check Character for total EXP, level progress, and stat levels.
7. Check Missions for daily progress and completed rewards.
8. Update username or unit preference in Me settings.
9. Logout and login again to verify persisted Supabase data.

## GPS Recording Notes

- Run, Walk, Bike, and Hike use high-accuracy foreground location while the Record screen is open.
- Development/native builds can request background location so active workouts continue while the screen is locked.
- The app calculates elapsed workout time from real start, pause, resume, and stop timestamps instead of relying only on a foreground JavaScript timer.
- Route points include latitude, longitude, timestamp, accuracy, speed, altitude, and segment IDs for route gaps.
- Very inaccurate points, duplicate points, unrealistic speed jumps, and long foreground/background gaps are filtered so they do not inflate distance.

To test foreground tracking:

1. Run `npm run start`.
2. Open the app in Expo Go on a physical device.
3. Start Run, Walk, Bike, or Hike and keep the app open.
4. Move for a few minutes, pause/resume if needed, then stop and save.

To test true background tracking:

1. Create and install a development build or native build.
2. Grant foreground and background location permissions when prompted.
3. Start a GPS activity, lock the phone, move for several minutes, unlock, then stop and save.
4. Confirm duration reflects wall-clock active time and the route does not draw one fake straight line across long gaps.

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
