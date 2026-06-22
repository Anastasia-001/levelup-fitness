import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ManualWorkoutSession } from '@/utils/manualWorkout';

const storageKey = (userId: string) => `levelup:manual-workout-session:${userId}`;

export const loadManualWorkoutSession = async (userId: string) => {
  const raw = await AsyncStorage.getItem(storageKey(userId));
  if (!raw) return null;

  try {
    const session = JSON.parse(raw) as Partial<ManualWorkoutSession>;
    if (
      session.userId !== userId ||
      typeof session.sessionId !== 'string' ||
      typeof session.startedAtMs !== 'number' ||
      typeof session.pausedDurationMs !== 'number' ||
      typeof session.activityType !== 'string' ||
      typeof session.phase !== 'string'
    ) {
      throw new Error('Stored manual workout session is invalid.');
    }
    return session as ManualWorkoutSession;
  } catch (caught) {
    if (__DEV__) {
      console.warn('[LevelUp] Ignored invalid manual workout session', {
        userId,
        message: caught instanceof Error ? caught.message : String(caught)
      });
    }
    return null;
  }
};

export const persistManualWorkoutSession = async (session: ManualWorkoutSession) => {
  await AsyncStorage.setItem(storageKey(session.userId), JSON.stringify(session));
};

export const clearManualWorkoutSession = async (userId: string) => {
  await AsyncStorage.removeItem(storageKey(userId));
};
