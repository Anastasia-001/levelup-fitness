import { Activity, FitnessClassId, StatKey } from '@/types/domain';

export type StatTitleTier = { minimumLevel: number; title: string };

export const STAT_TITLE_TIERS: Record<StatKey, StatTitleTier[]> = {
  endurance: [
    { minimumLevel: 1, title: 'Beginner' },
    { minimumLevel: 3, title: 'Jogger' },
    { minimumLevel: 6, title: 'Distance Runner' },
    { minimumLevel: 10, title: 'Endurance Specialist' }
  ],
  speed: [
    { minimumLevel: 1, title: 'Starter' },
    { minimumLevel: 3, title: 'Quick Step' },
    { minimumLevel: 6, title: 'Sprinter' },
    { minimumLevel: 10, title: 'Pace Specialist' }
  ],
  strength: [
    { minimumLevel: 1, title: 'Beginner' },
    { minimumLevel: 3, title: 'Trainee' },
    { minimumLevel: 6, title: 'Lifter' },
    { minimumLevel: 10, title: 'Strength Specialist' }
  ],
  consistency: [
    { minimumLevel: 1, title: 'Getting Started' },
    { minimumLevel: 3, title: 'Regular' },
    { minimumLevel: 6, title: 'Disciplined' },
    { minimumLevel: 10, title: 'Unbreakable' }
  ]
};

export const FITNESS_CLASSES = [
  {
    id: 'runner' as const,
    name: 'Runner',
    icon: 'speedometer-outline',
    description: 'Route-focused training with Endurance and Speed suggestions.',
    accent: '#35F6FF'
  },
  {
    id: 'lifter' as const,
    name: 'Lifter',
    icon: 'barbell-outline',
    description: 'Gym and bodyweight suggestions with a Strength focus.',
    accent: '#FFB84D'
  },
  {
    id: 'explorer' as const,
    name: 'Explorer',
    icon: 'map-outline',
    description: 'Hiking, walking, and cycling variety with steady progression.',
    accent: '#47F39A'
  },
  {
    id: 'hybrid_athlete' as const,
    name: 'Hybrid Athlete',
    icon: 'apps-outline',
    description: 'Balanced suggestions across route, strength, and consistency work.',
    accent: '#8F5CFF'
  }
] as const;

export const getStatTitle = (stat: StatKey, level: number) => {
  const tiers = STAT_TITLE_TIERS[stat];
  const current = [...tiers].reverse().find((tier) => level >= tier.minimumLevel) ?? tiers[0];
  const next = tiers.find((tier) => tier.minimumLevel > level) ?? null;
  return { current, next };
};

export const getFitnessClass = (id?: FitnessClassId | null) =>
  FITNESS_CLASSES.find((fitnessClass) => fitnessClass.id === id) ?? FITNESS_CLASSES[3];

export const recommendFitnessClass = (activities: Activity[]): FitnessClassId => {
  if (!activities.length) return 'hybrid_athlete';
  const recent = activities.slice(0, 30);
  const scores: Record<FitnessClassId, number> = {
    runner: 0,
    lifter: 0,
    explorer: 0,
    hybrid_athlete: new Set(recent.map((activity) => activity.type)).size * 1.2
  };

  recent.forEach((activity) => {
    if (activity.type === 'run') scores.runner += 3;
    if (activity.type === 'walk') scores.runner += 1.25;
    if (activity.type === 'gym_workout') scores.lifter += 3;
    if (activity.type === 'pushups') scores.lifter += 2.5;
    if (activity.type === 'hike') scores.explorer += 3;
    if (activity.type === 'bike') scores.explorer += 2.25;
    if (activity.type === 'walk') scores.explorer += 1;
    scores.hybrid_athlete += 0.45;
  });

  return (Object.entries(scores) as [FitnessClassId, number][])
    .sort((left, right) => right[1] - left[1])[0][0];
};
