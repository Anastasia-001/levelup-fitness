const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  MANUAL_WORKOUT_MAX_DURATION_SECONDS,
  createManualWorkoutSession,
  durationSecondsFromMinutes,
  elapsedManualWorkoutSeconds,
  isStaleManualWorkoutSession,
  transitionManualWorkout,
  validateActivityInput
} = require('../src/utils/manualWorkout.ts');

const userId = '00000000-0000-0000-0000-000000000001';

test('records a 45-minute gym workout from timestamps', () => {
  const session = createManualWorkoutSession(userId, 'gym_workout', 1_000, 'session-45');
  const finishing = transitionManualWorkout(session, { type: 'FINISH', nowMs: 2_701_000 });
  assert.equal(finishing.finalDurationSeconds, 2700);
  assert.equal(transitionManualWorkout(finishing, { type: 'OPEN_DETAILS' }).phase, 'details');
});

test('paused time is counted once and background time still advances', () => {
  const started = createManualWorkoutSession(userId, 'gym_workout', 0, 'session-paused');
  const paused = transitionManualWorkout(started, { type: 'PAUSE', nowMs: 600_000 });
  assert.equal(elapsedManualWorkoutSeconds(paused, 1_200_000), 600);
  const resumed = transitionManualWorkout(paused, { type: 'RESUME', nowMs: 1_200_000 });
  const duplicateResume = transitionManualWorkout(resumed, { type: 'RESUME', nowMs: 1_300_000 });
  assert.equal(duplicateResume.pausedDurationMs, 600_000);
  assert.equal(elapsedManualWorkoutSeconds(duplicateResume, 1_800_000), 1200);
});

test('discard stops the session while keep leaves it active', () => {
  const session = createManualWorkoutSession(userId, 'pushups', 0, 'session-close');
  assert.equal(session.phase, 'recording');
  assert.equal(transitionManualWorkout(session, { type: 'CANCEL' }).phase, 'cancelled');
});

test('finish freezes duration even when save is delayed', () => {
  const started = createManualWorkoutSession(userId, 'other_workout', 0, 'session-delay');
  const finishing = transitionManualWorkout(started, { type: 'FINISH', nowMs: 900_000 });
  const details = transitionManualWorkout(finishing, { type: 'OPEN_DETAILS' });
  assert.equal(elapsedManualWorkoutSeconds(details, 9_000_000), 900);
  const saving = transitionManualWorkout(details, {
    type: 'BEGIN_SAVE',
    durationSeconds: 900,
    nowMs: 9_000_000
  });
  assert.equal(saving.finalDurationSeconds, 900);
  assert.equal(transitionManualWorkout(saving, { type: 'SAVE_SUCCEEDED' }).phase, 'completed');
});

test('stale sessions require review instead of silently rewarding', () => {
  const session = createManualWorkoutSession(userId, 'gym_workout', 0, 'session-stale');
  assert.equal(isStaleManualWorkoutSession(session, (MANUAL_WORKOUT_MAX_DURATION_SECONDS + 1) * 1000), true);
  const review = transitionManualWorkout(session, { type: 'REVIEW_DURATION' });
  assert.equal(review.phase, 'details');
  assert.equal(review.finalDurationSeconds, null);
});

test('rejects NaN, negative, scientific notation, and 11,414-hour durations', () => {
  assert.throws(() => validateActivityInput({ type: 'gym_workout', durationSeconds: Number.NaN }), /finite/);
  assert.throws(() => validateActivityInput({ type: 'gym_workout', durationSeconds: -1 }), /greater than zero/);
  assert.throws(
    () => validateActivityInput({ type: 'gym_workout', durationSeconds: 11_414 * 60 * 60 }),
    /12 hours/
  );
  assert.throws(() => durationSecondsFromMinutes('1e9'), /normal non-negative number/);
});

test('repeated save transitions cannot complete twice', () => {
  const started = createManualWorkoutSession(userId, 'gym_workout', 0, 'session-double');
  const details = transitionManualWorkout(
    transitionManualWorkout(started, { type: 'FINISH', nowMs: 60_000 }),
    { type: 'OPEN_DETAILS' }
  );
  const saving = transitionManualWorkout(details, { type: 'BEGIN_SAVE', durationSeconds: 60, nowMs: 60_000 });
  const ignoredSecondSave = transitionManualWorkout(saving, { type: 'BEGIN_SAVE', durationSeconds: 120, nowMs: 120_000 });
  assert.deepEqual(ignoredSecondSave, saving);
  const completed = transitionManualWorkout(saving, { type: 'SAVE_SUCCEEDED' });
  assert.deepEqual(transitionManualWorkout(completed, { type: 'SAVE_SUCCEEDED' }), completed);
});

test('server migration locks rewards, validates duration, and makes manual inserts idempotent', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '202606220001_prevent_manual_reward_corruption.sql'),
    'utf8'
  );
  assert.match(migration, /activities_user_client_session_unique/);
  assert.match(migration, /duration_seconds <= 43200/);
  assert.match(migration, /for update;/i);
  assert.match(migration, /if v_activity\.reward_processed_at is not null then/i);
  assert.match(migration, /return v_activity\.reward_summary;/i);
  assert.match(migration, /v_expected_activity_exp :=/i);
});
