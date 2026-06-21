import { SkillBranch, SkillNodeDefinition } from '@/types/domain';

export const SKILL_POINT_LEVELS = [3, 5, 7, 10, 12, 15, 18, 20, 25, 30] as const;

export const SKILL_BRANCHES: { id: SkillBranch; name: string; icon: string; color: string }[] = [
  { id: 'endurance', name: 'Endurance', icon: 'pulse-outline', color: '#35F6FF' },
  { id: 'speed', name: 'Speed', icon: 'speedometer-outline', color: '#8F5CFF' },
  { id: 'strength', name: 'Strength', icon: 'barbell-outline', color: '#FFB84D' },
  { id: 'consistency', name: 'Consistency', icon: 'calendar-outline', color: '#47F39A' }
];

export const SKILL_NODES: SkillNodeDefinition[] = [
  { id: 'endurance_distance_tracker', branch: 'endurance', name: 'Distance Tracker', description: 'Adds richer distance progress detail to route goals.', pointCost: 1, requiredLevel: 3, prerequisiteNodeId: null, effectKey: 'distance_progress_detail', icon: 'analytics-outline' },
  { id: 'endurance_long_route_badge', branch: 'endurance', name: 'Long Route Badge', description: 'Unlocks an endurance route cosmetic.', pointCost: 1, requiredLevel: 5, prerequisiteNodeId: 'endurance_distance_tracker', effectKey: 'long_route_cosmetic', icon: 'map-outline' },
  { id: 'endurance_recovery_missions', branch: 'endurance', name: 'Recovery Mission Access', description: 'Adds recovery-friendly mission variety.', pointCost: 1, requiredLevel: 7, prerequisiteNodeId: 'endurance_long_route_badge', effectKey: 'recovery_missions', icon: 'leaf-outline' },
  { id: 'speed_pace_insights', branch: 'speed', name: 'Pace Insights', description: 'Adds more pace comparison context.', pointCost: 1, requiredLevel: 3, prerequisiteNodeId: null, effectKey: 'pace_insights', icon: 'timer-outline' },
  { id: 'speed_sprint_pose', branch: 'speed', name: 'Sprint Pose', description: 'Unlocks the Ready to Run character pose.', pointCost: 1, requiredLevel: 5, prerequisiteNodeId: 'speed_pace_insights', effectKey: 'sprint_pose', icon: 'body-outline' },
  { id: 'speed_split_records', branch: 'speed', name: 'Split Records', description: 'Enables split-record presentation when route data supports it.', pointCost: 1, requiredLevel: 7, prerequisiteNodeId: 'speed_sprint_pose', effectKey: 'split_records', icon: 'git-compare-outline' },
  { id: 'strength_mission_variety', branch: 'strength', name: 'Strength Mission Variety', description: 'Adds more gym and bodyweight mission suggestions.', pointCost: 1, requiredLevel: 3, prerequisiteNodeId: null, effectKey: 'strength_missions', icon: 'fitness-outline' },
  { id: 'strength_training_outfit', branch: 'strength', name: 'Training Outfit', description: 'Unlocks a technical strength-training top.', pointCost: 1, requiredLevel: 5, prerequisiteNodeId: 'strength_mission_variety', effectKey: 'training_outfit', icon: 'shirt-outline' },
  { id: 'strength_set_rep_records', branch: 'strength', name: 'Set / Rep Records', description: 'Prepares strength activities for set and repetition records.', pointCost: 1, requiredLevel: 7, prerequisiteNodeId: 'strength_training_outfit', effectKey: 'set_rep_records', icon: 'trophy-outline' },
  { id: 'consistency_reroll_token', branch: 'consistency', name: 'Extra Reroll Token', description: 'Adds one extra daily mission reroll.', pointCost: 1, requiredLevel: 3, prerequisiteNodeId: null, effectKey: 'extra_reroll', icon: 'refresh-outline' },
  { id: 'consistency_streak_frame', branch: 'consistency', name: 'Streak Frame', description: 'Unlocks a disciplined streak profile frame.', pointCost: 1, requiredLevel: 5, prerequisiteNodeId: 'consistency_reroll_token', effectKey: 'streak_frame', icon: 'ribbon-outline' },
  { id: 'consistency_weekly_summary', branch: 'consistency', name: 'Weekly Summary Upgrade', description: 'Adds richer weekly consistency summaries.', pointCost: 1, requiredLevel: 7, prerequisiteNodeId: 'consistency_streak_frame', effectKey: 'weekly_summary', icon: 'calendar-number-outline' }
];

export const skillPointsForLevel = (level: number) => SKILL_POINT_LEVELS.filter((milestone) => level >= milestone).length;
