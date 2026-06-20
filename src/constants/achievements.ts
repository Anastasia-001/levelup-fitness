import { AchievementDefinition } from '@/types/domain';

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'first_activity',
    title: 'First Step',
    description: 'Complete your first activity.',
    category: 'activity',
    icon: 'flash-outline',
    unlockCondition: 'Complete 1 activity',
    rewardExp: 0,
    rewardCoins: 25,
    claimRequired: false
  },
  {
    id: 'first_gps_activity',
    title: 'Route Initiated',
    description: 'Complete your first GPS activity.',
    category: 'activity',
    icon: 'navigate-outline',
    unlockCondition: 'Complete 1 GPS activity',
    rewardExp: 0,
    rewardCoins: 30,
    claimRequired: false
  },
  {
    id: 'first_mission',
    title: 'Quest Complete',
    description: 'Complete your first daily mission.',
    category: 'mission',
    icon: 'checkmark-circle-outline',
    unlockCondition: 'Complete 1 mission',
    rewardExp: 0,
    rewardCoins: 25,
    claimRequired: false
  },
  {
    id: 'first_1_km',
    title: 'First Kilometer',
    description: 'Complete an activity of at least 1 km.',
    category: 'distance',
    icon: 'trail-sign-outline',
    unlockCondition: 'Complete 1 km',
    rewardExp: 0,
    rewardCoins: 30,
    claimRequired: false
  },
  {
    id: 'first_5_km',
    title: 'Five Kilometer Drive',
    description: 'Complete an activity of at least 5 km.',
    category: 'distance',
    icon: 'map-outline',
    unlockCondition: 'Complete 5 km',
    rewardExp: 0,
    rewardCoins: 50,
    claimRequired: false
  },
  {
    id: 'ten_activities',
    title: 'Training Habit',
    description: 'Complete 10 total activities.',
    category: 'activity',
    icon: 'calendar-outline',
    unlockCondition: 'Complete 10 activities',
    rewardExp: 0,
    rewardCoins: 50,
    claimRequired: false
  },
  {
    id: 'twenty_five_activities',
    title: 'Committed Athlete',
    description: 'Complete 25 total activities.',
    category: 'activity',
    icon: 'ribbon-outline',
    unlockCondition: 'Complete 25 activities',
    rewardExp: 0,
    rewardCoins: 100,
    claimRequired: false
  },
  {
    id: 'fifty_activities',
    title: 'LevelUp Regular',
    description: 'Complete 50 total activities.',
    category: 'activity',
    icon: 'medal-outline',
    unlockCondition: 'Complete 50 activities',
    rewardExp: 0,
    rewardCoins: 200,
    claimRequired: false
  },
  {
    id: 'seven_day_streak',
    title: 'Seven Day Charge',
    description: 'Record activities on seven consecutive days.',
    category: 'consistency',
    icon: 'flame-outline',
    unlockCondition: 'Reach a 7-day streak',
    rewardExp: 0,
    rewardCoins: 100,
    claimRequired: false
  },
  {
    id: 'four_week_consistency',
    title: 'Monthly Rhythm',
    description: 'Hit your weekly activity target for four consecutive weeks.',
    category: 'consistency',
    icon: 'repeat-outline',
    unlockCondition: 'Reach a 4-week consistency streak',
    rewardExp: 0,
    rewardCoins: 150,
    claimRequired: false
  },
  {
    id: 'first_personal_record',
    title: 'New Personal Best',
    description: 'Set your first personal record.',
    category: 'record',
    icon: 'trophy-outline',
    unlockCondition: 'Set 1 personal record',
    rewardExp: 0,
    rewardCoins: 40,
    claimRequired: false
  },
  {
    id: 'character_level_5',
    title: 'Level Five',
    description: 'Reach character level 5.',
    category: 'character',
    icon: 'star-outline',
    unlockCondition: 'Reach Level 5',
    rewardExp: 0,
    rewardCoins: 100,
    claimRequired: false
  },
  {
    id: 'character_level_10',
    title: 'Level Ten',
    description: 'Reach character level 10.',
    category: 'character',
    icon: 'sparkles-outline',
    unlockCondition: 'Reach Level 10',
    rewardExp: 0,
    rewardCoins: 250,
    claimRequired: false
  }
];

export const ACHIEVEMENT_IDS = ACHIEVEMENTS.map((achievement) => achievement.id);

export const getAchievementById = (id: string) =>
  ACHIEVEMENTS.find((achievement) => achievement.id === id);
