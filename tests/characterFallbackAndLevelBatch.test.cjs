const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  resolveEvolutionStage
} = require('../src/constants/characterProgression.ts');
const {
  buildLevelUpBatch,
  normalizePendingLevelUps
} = require('../src/utils/levelUpBatch.ts');

const celebration = (previousLevel, level, viewedAt = null) => ({
  userId: '00000000-0000-0000-0000-000000000001',
  previousLevel,
  level,
  queuedAt: `2026-06-22T00:00:${String(level).padStart(2, '0')}Z`,
  viewedAt
});

test('evolution resolution supports Level 1, Level 5, highest stage, and Level 224', () => {
  assert.equal(resolveEvolutionStage(1, 'starter').resolvedStage.id, 'starter');
  assert.equal(resolveEvolutionStage(5, 'trainee').resolvedStage.id, 'trainee');
  assert.equal(resolveEvolutionStage(20, 'elite').resolvedStage.id, 'elite');
  const highLevel = resolveEvolutionStage(224, 'elite');
  assert.equal(highLevel.resolvedStage.id, 'elite');
  assert.equal(highLevel.fallbackReason, 'level-clamped-to-highest-supported-stage');
});

test('missing and mismatched evolution stages resolve to a supported stage', () => {
  assert.equal(resolveEvolutionStage(undefined, 'missing-stage').resolvedStage.id, 'starter');
  assert.equal(resolveEvolutionStage(5, 'missing-stage').resolvedStage.id, 'trainee');
  assert.equal(resolveEvolutionStage(5, 'elite').resolvedStage.id, 'trainee');
});

test('one level-up remains a normal single transition', () => {
  const batch = buildLevelUpBatch([celebration(4, 5)]);
  assert.equal(batch.celebration.previousLevel, 4);
  assert.equal(batch.celebration.level, 5);
  assert.equal(batch.firstLevel, 5);
  assert.equal(batch.finalLevel, 5);
});

test('five level-ups consolidate into one old-to-final transition', () => {
  const batch = buildLevelUpBatch([
    celebration(4, 5), celebration(5, 6), celebration(6, 7), celebration(7, 8), celebration(8, 9)
  ]);
  assert.equal(batch.celebration.previousLevel, 4);
  assert.equal(batch.celebration.level, 9);
});

test('219 queued level-ups consolidate without retaining a presentation per level', () => {
  const rows = Array.from({ length: 219 }, (_, index) => celebration(index + 5, index + 6));
  const batch = buildLevelUpBatch(rows);
  assert.equal(batch.celebration.previousLevel, 5);
  assert.equal(batch.celebration.level, 224);
  assert.equal(Object.keys(batch).length, 3);
});

test('viewed and duplicate rows are ignored on reopen', () => {
  const pending = normalizePendingLevelUps([
    celebration(4, 5, '2026-06-22T01:00:00Z'),
    celebration(4, 5),
    celebration(3, 5),
    celebration(5, 6, '2026-06-22T01:00:01Z')
  ]);
  assert.equal(pending.length, 1);
  assert.equal(pending[0].previousLevel, 3);
  assert.equal(buildLevelUpBatch(pending).finalLevel, 5);
  assert.equal(buildLevelUpBatch([celebration(4, 5, '2026-06-22T01:00:00Z')]), null);
});

test('renderer includes starter fallback, guarded overlays, and non-blocking warnings', () => {
  const renderer = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'components', 'AvatarPreview.tsx'),
    'utf8'
  );
  assert.match(renderer, /FALLBACK_CHARACTER_ASSET/);
  assert.match(renderer, /onLoad=/);
  assert.match(renderer, /onError=/);
  assert.match(renderer, /activeAssetReady &&/);
  assert.match(renderer, /console\.warn/);
  assert.doesNotMatch(renderer, /console\.error/);
});

test('batch migration marks a range idempotently and avoids generated rows per level', () => {
  const migration = fs.readFileSync(
    path.join(__dirname, '..', 'supabase', 'migrations', '202606220002_batch_level_up_celebrations.sql'),
    'utf8'
  );
  assert.match(migration, /mark_level_up_batch_viewed/);
  assert.match(migration, /viewed_at = coalesce/);
  assert.match(migration, /between p_first_level and p_final_level/);
  assert.doesNotMatch(migration, /generate_series/);
});
