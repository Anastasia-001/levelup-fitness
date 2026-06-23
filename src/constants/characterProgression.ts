import type {
  CharacterPoseDefinition,
  CharacterPoseId,
  EvolutionStageDefinition,
  EvolutionStageId
} from '@/types/domain';

export const CHARACTER_POSES: CharacterPoseDefinition[] = [
  {
    id: 'neutral',
    name: 'Neutral',
    description: 'A calm stance for everyday training.',
    unlockLabel: 'Available from the start',
    icon: 'body-outline'
  },
  {
    id: 'ready_to_run',
    name: 'Ready to Run',
    description: 'A forward-set stance for the next route.',
    unlockLabel: 'Complete your first GPS activity',
    icon: 'walk-outline'
  },
  {
    id: 'stretch',
    name: 'Stretch',
    description: 'A relaxed mobility-focused presentation.',
    unlockLabel: 'Complete a recovery mission',
    icon: 'fitness-outline'
  },
  {
    id: 'post_workout_victory',
    name: 'Post-Workout Victory',
    description: 'A positive finish without combat framing.',
    unlockLabel: 'Reach Level 5',
    icon: 'sparkles-outline'
  },
  {
    id: 'recovery',
    name: 'Recovery',
    description: 'A composed cooldown stance.',
    unlockLabel: 'Reach a 7-day activity streak',
    icon: 'leaf-outline'
  },
  {
    id: 'confident',
    name: 'Confident',
    description: 'A steady posture earned through progression.',
    unlockLabel: 'Reach Level 10',
    icon: 'star-outline'
  }
];

export const EVOLUTION_STAGES: EvolutionStageDefinition[] = [
  { id: 'starter', name: 'Starter', minimumLevel: 1, sceneColor: '#35F6FF', trimColor: '#35F6FF', postureScale: 1 },
  { id: 'trainee', name: 'Trainee', minimumLevel: 5, sceneColor: '#8F5CFF', trimColor: '#A8B7CB', postureScale: 1.01 },
  { id: 'athlete', name: 'Athlete', minimumLevel: 10, sceneColor: '#47F39A', trimColor: '#35F6FF', postureScale: 1.02 },
  { id: 'elite', name: 'Elite', minimumLevel: 20, sceneColor: '#FFD66E', trimColor: '#FFD66E', postureScale: 1.025 }
];

export const getEvolutionStageForLevel = (level: number) =>
  [...EVOLUTION_STAGES]
    .reverse()
    .find((stage) => level >= stage.minimumLevel) ?? EVOLUTION_STAGES[0];

export const getEvolutionStage = (id?: EvolutionStageId | null) =>
  EVOLUTION_STAGES.find((stage) => stage.id === id) ?? EVOLUTION_STAGES[0];

export const resolveEvolutionStage = (level?: number | null, requestedId?: string | null) => {
  const requestedStage = EVOLUTION_STAGES.find((stage) => stage.id === requestedId);
  const safeLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level ?? 1)) : 1;
  const resolvedStage = level === undefined || level === null
    ? requestedStage ?? EVOLUTION_STAGES[0]
    : getEvolutionStageForLevel(safeLevel);
  const highestStage = EVOLUTION_STAGES[EVOLUTION_STAGES.length - 1];
  const fallbackReason = requestedId && !requestedStage
    ? 'unsupported-evolution-stage'
    : safeLevel > highestStage.minimumLevel && resolvedStage.id === highestStage.id
      ? 'level-clamped-to-highest-supported-stage'
      : requestedStage && requestedStage.id !== resolvedStage.id
        ? 'stored-stage-does-not-match-current-level'
        : null;

  return {
    requestedStage: requestedId ?? 'starter',
    resolvedStage,
    fallbackReason
  };
};

export const getPoseDefinition = (id?: CharacterPoseId | null) =>
  CHARACTER_POSES.find((pose) => pose.id === id) ?? CHARACTER_POSES[0];
