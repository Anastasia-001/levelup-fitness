import type { ActivityInput, ManualActivityType } from '@/types/domain';

export const MANUAL_WORKOUT_MAX_DURATION_SECONDS = 12 * 60 * 60;
export const MANUAL_WORKOUT_MAX_SETS = 1000;
export const MANUAL_WORKOUT_MAX_REPS = 100_000;
export const MANUAL_WORKOUT_MAX_WEIGHT_KG = 1000;
export const ACTIVITY_MAX_DISTANCE_METERS = 1_000_000;

export type ManualWorkoutPhase =
  | 'idle'
  | 'recording'
  | 'paused'
  | 'finishing'
  | 'details'
  | 'saving'
  | 'completed'
  | 'cancelled';

export type ManualWorkoutSession = {
  sessionId: string;
  userId: string;
  activityType: ManualActivityType;
  phase: ManualWorkoutPhase;
  startedAtMs: number;
  pausedAtMs: number | null;
  pausedDurationMs: number;
  completedAtMs: number | null;
  finalDurationSeconds: number | null;
};

export type ManualWorkoutEvent =
  | { type: 'PAUSE'; nowMs: number }
  | { type: 'RESUME'; nowMs: number }
  | { type: 'FINISH'; nowMs: number }
  | { type: 'OPEN_DETAILS' }
  | { type: 'REVIEW_DURATION' }
  | { type: 'BEGIN_SAVE'; durationSeconds: number; nowMs: number }
  | { type: 'SAVE_FAILED' }
  | { type: 'SAVE_SUCCEEDED' }
  | { type: 'CANCEL' };

export const createManualWorkoutSession = (
  userId: string,
  activityType: ManualActivityType,
  nowMs = Date.now(),
  sessionId = createSessionId(nowMs)
): ManualWorkoutSession => ({
  sessionId,
  userId,
  activityType,
  phase: 'recording',
  startedAtMs: nowMs,
  pausedAtMs: null,
  pausedDurationMs: 0,
  completedAtMs: null,
  finalDurationSeconds: null
});

export const transitionManualWorkout = (
  session: ManualWorkoutSession,
  event: ManualWorkoutEvent
): ManualWorkoutSession => {
  switch (event.type) {
    case 'PAUSE':
      if (session.phase !== 'recording') return session;
      return { ...session, phase: 'paused', pausedAtMs: event.nowMs };
    case 'RESUME':
      if (session.phase !== 'paused' || session.pausedAtMs === null) return session;
      return {
        ...session,
        phase: 'recording',
        pausedDurationMs: session.pausedDurationMs + Math.max(0, event.nowMs - session.pausedAtMs),
        pausedAtMs: null
      };
    case 'FINISH': {
      if (session.phase !== 'recording' && session.phase !== 'paused') return session;
      const finalDurationSeconds = elapsedManualWorkoutSeconds(session, event.nowMs);
      return {
        ...session,
        phase: 'finishing',
        completedAtMs: event.nowMs,
        finalDurationSeconds
      };
    }
    case 'OPEN_DETAILS':
      return session.phase === 'finishing' ? { ...session, phase: 'details' } : session;
    case 'REVIEW_DURATION':
      return {
        ...session,
        phase: 'details',
        pausedAtMs: null,
        completedAtMs: session.completedAtMs ?? Date.now(),
        finalDurationSeconds: null
      };
    case 'BEGIN_SAVE':
      if (session.phase !== 'details') return session;
      return {
        ...session,
        phase: 'saving',
        completedAtMs: session.completedAtMs ?? event.nowMs,
        finalDurationSeconds: event.durationSeconds
      };
    case 'SAVE_FAILED':
      return session.phase === 'saving' ? { ...session, phase: 'details' } : session;
    case 'SAVE_SUCCEEDED':
      return session.phase === 'saving' ? { ...session, phase: 'completed' } : session;
    case 'CANCEL':
      return { ...session, phase: 'cancelled' };
    default:
      return session;
  }
};

export const elapsedManualWorkoutSeconds = (session: ManualWorkoutSession, nowMs = Date.now()) => {
  if (session.finalDurationSeconds !== null) return session.finalDurationSeconds;

  const endMs = session.pausedAtMs ?? session.completedAtMs ?? nowMs;
  return Math.max(
    0,
    Math.floor((endMs - session.startedAtMs - session.pausedDurationMs) / 1000)
  );
};

export const isStaleManualWorkoutSession = (
  session: ManualWorkoutSession,
  nowMs = Date.now()
) =>
  ['recording', 'paused'].includes(session.phase) &&
  (elapsedManualWorkoutSeconds(session, nowMs) > MANUAL_WORKOUT_MAX_DURATION_SECONDS ||
    nowMs - session.startedAtMs > MANUAL_WORKOUT_MAX_DURATION_SECONDS * 1000);

export const parseManualNumber = (
  rawValue: string,
  fieldName: string,
  options: { required?: boolean; integer?: boolean; max?: number } = {}
) => {
  const value = rawValue.trim();
  if (!value) {
    if (options.required) throw new Error(`${fieldName} is required.`);
    return undefined;
  }

  if (!/^(?:\d+\.?\d*|\.\d+)$/.test(value)) {
    throw new Error(`${fieldName} must be a normal non-negative number.`);
  }

  const numberValue = Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new Error(`${fieldName} must be finite and non-negative.`);
  }
  if (options.integer && !Number.isInteger(numberValue)) {
    throw new Error(`${fieldName} must be a whole number.`);
  }
  if (options.max !== undefined && numberValue > options.max) {
    throw new Error(`${fieldName} must not exceed ${options.max}.`);
  }
  return numberValue;
};

export const durationSecondsFromMinutes = (rawMinutes: string) => {
  const minutes = parseManualNumber(rawMinutes, 'Duration', {
    required: true,
    max: MANUAL_WORKOUT_MAX_DURATION_SECONDS / 60
  });
  const durationSeconds = Math.round((minutes ?? 0) * 60);
  validateDurationSeconds(durationSeconds, true);
  return durationSeconds;
};

export const validateActivityInput = (input: ActivityInput) => {
  const isManual = ['gym_workout', 'pushups', 'swimming', 'other_workout'].includes(input.type);
  validateDurationSeconds(input.durationSeconds, isManual);
  validateOptionalNumber(input.distanceMeters, 'Distance', ACTIVITY_MAX_DISTANCE_METERS);
  validateOptionalNumber(input.sets, 'Sets', MANUAL_WORKOUT_MAX_SETS, true);
  validateOptionalNumber(input.reps, 'Reps', MANUAL_WORKOUT_MAX_REPS, true);
  validateOptionalNumber(input.weightKg, 'Weight', MANUAL_WORKOUT_MAX_WEIGHT_KG);
};

const validateDurationSeconds = (durationSeconds: number, isManual: boolean) => {
  if (!Number.isFinite(durationSeconds) || !Number.isInteger(durationSeconds)) {
    throw new Error('Duration must be a finite whole number of seconds.');
  }
  if (durationSeconds <= 0) throw new Error('Duration must be greater than zero.');
  if (isManual && durationSeconds > MANUAL_WORKOUT_MAX_DURATION_SECONDS) {
    throw new Error('Manual workouts cannot exceed 12 hours. Review or discard this session.');
  }
};

const validateOptionalNumber = (
  value: number | undefined,
  fieldName: string,
  maximum: number,
  integer = false
) => {
  if (value === undefined) return;
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be finite and non-negative.`);
  }
  if (integer && !Number.isInteger(value)) {
    throw new Error(`${fieldName} must be a whole number.`);
  }
  if (value > maximum) throw new Error(`${fieldName} exceeds the supported maximum.`);
};

const createSessionId = (nowMs: number) =>
  `manual-${nowMs}-${Math.random().toString(36).slice(2, 10)}`;
