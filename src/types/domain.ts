export type StatKey = 'endurance' | 'speed' | 'strength' | 'consistency';

export type GpsActivityType = 'run' | 'walk' | 'bike' | 'hike';
export type ManualActivityType = 'gym_workout' | 'pushups' | 'swimming' | 'other_workout';
export type ActivityType = GpsActivityType | ManualActivityType;

export type UnitPreference = 'metric' | 'imperial';
export type CosmeticCategory = 'head' | 'shirt' | 'pants' | 'shoes' | 'accessory' | 'frame' | 'aura';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';
export type CharacterPoseId =
  | 'neutral'
  | 'ready_to_run'
  | 'stretch'
  | 'post_workout_victory'
  | 'recovery'
  | 'confident';
export type EvolutionStageId = 'starter' | 'trainee' | 'athlete' | 'elite';
export type CosmeticAvailability = 'permanent' | 'featured' | 'seasonal' | 'earned';
export type CosmeticUnlockSource =
  | { type: 'starter'; label: string }
  | { type: 'shop'; label: string }
  | { type: 'achievement'; id: string; label: string }
  | { type: 'personal_record'; id: PersonalRecordType; label: string };

export type CosmeticVisual = {
  thumbnailComponent: 'headwear' | 'top' | 'bottom' | 'footwear' | 'accessory' | 'frame' | 'aura';
  overlayComponent: 'headwear' | 'top' | 'bottom' | 'footwear' | 'accessory' | 'frame' | 'aura';
  silhouette: string;
  pattern: 'solid' | 'stripe' | 'panel' | 'chevron' | 'pulse' | 'streak' | 'frost';
};

export type RoutePoint = {
  latitude: number;
  longitude: number;
  altitude?: number | null;
  accuracy?: number | null;
  speed?: number | null;
  segmentId?: number;
  timestamp: number;
};

export type ActivityInput = {
  type: ActivityType;
  title?: string;
  startedAt?: string;
  completedAt?: string;
  localDate?: string;
  localWeekStart?: string;
  durationSeconds: number;
  distanceMeters?: number;
  route?: RoutePoint[];
  sets?: number;
  reps?: number;
  weightKg?: number;
  photoUrl?: string;
  photoPath?: string;
  personalRecordIds?: string[];
};

export type ActivityRewardSummary = {
  characterExp: number;
  activityExp: number;
  missionBonusExp: number;
  statExp: Record<StatKey, number>;
  goldCoins: number;
  missionGoldCoins?: number;
  missionsCompleted: {
    id: string;
    title: string;
    rewardExp: number;
    rewardCoins?: number;
    optionalUnlockId?: string | null;
    optionalUnlockName?: string | null;
  }[];
  achievementsUnlocked: { id: string; title: string; rewardCoins: number }[];
  personalRecords: { recordType: PersonalRecordType; sportKey: ActivityType | 'all' }[];
  levelBefore?: number | null;
  levelAfter?: number | null;
  processedAt: string;
  legacy?: boolean;
};

export type Activity = ActivityInput & {
  id: string;
  userId: string;
  title: string;
  expEarned: number;
  statExp: Record<StatKey, number>;
  startedAt: string;
  completedAt: string;
  rewardProcessedAt?: string | null;
  rewardSummary?: ActivityRewardSummary | null;
};

export type Character = {
  id: string;
  userId: string;
  level: number;
  totalExp: number;
  coins: number;
  enduranceExp: number;
  speedExp: number;
  strengthExp: number;
  consistencyExp: number;
  updatedAt: string;
};

export type CosmeticItem = {
  id: string;
  name: string;
  category: CosmeticCategory;
  shopSection: 'Featured' | 'Shirts' | 'Pants' | 'Shoes' | 'Accessories' | 'Frames' | 'Auras' | 'Rare';
  rarity: Rarity;
  price: number;
  unlockLevel?: number;
  availability: CosmeticAvailability;
  unlockSource: CosmeticUnlockSource;
  visual: CosmeticVisual;
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
  };
  description: string;
};

export type OwnedCosmetic = {
  userId: string;
  itemId: string;
  acquiredAt: string;
  acquisitionSource: 'shop' | 'achievement' | 'personal_record' | 'starter';
  sourceRef?: string | null;
};

export type CharacterPresentation = {
  userId: string;
  equippedPose: CharacterPoseId;
  highestEvolutionStage: EvolutionStageId;
  updatedAt: string;
};

export type CharacterPoseDefinition = {
  id: CharacterPoseId;
  name: string;
  description: string;
  unlockLabel: string;
  icon: string;
};

export type EvolutionStageDefinition = {
  id: EvolutionStageId;
  name: string;
  minimumLevel: number;
  sceneColor: string;
  trimColor: string;
  postureScale: number;
};

export type EquippedCosmetics = {
  userId: string;
  headItemId: string | null;
  shirtItemId: string | null;
  pantsItemId: string | null;
  shoesItemId: string | null;
  accessoryItemId: string | null;
  frameItemId: string | null;
  auraItemId: string | null;
  updatedAt: string;
};

export type Profile = {
  id: string;
  username: string;
  location: string | null;
  unitPreference: UnitPreference;
  privacyControlsEnabled: boolean;
  healthDataEnabled: boolean;
  emailNotificationsEnabled: boolean;
  pushNotificationsEnabled: boolean;
  createdAt: string;
};

export type MissionType =
  | 'complete_activity'
  | 'distance_walk_run'
  | 'pushups'
  | 'workout_duration';

export type MissionDifficulty = 'easy' | 'medium' | 'hard' | 'boss';

export type Mission = {
  id: string;
  userId: string;
  missionDate: string;
  templateId: string;
  type: MissionType;
  title: string;
  difficulty: MissionDifficulty;
  targetValue: number;
  progress: number;
  rewardExp: number;
  rewardCoins: number;
  optionalUnlockId?: string | null;
  optionalUnlockName?: string | null;
  completedAt?: string | null;
};

export type MissionTemplate = Omit<Mission, 'id' | 'userId' | 'missionDate' | 'progress' | 'completedAt'>;

export type AchievementCategory = 'activity' | 'mission' | 'distance' | 'consistency' | 'record' | 'character';

export type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  icon: string;
  unlockCondition: string;
  rewardExp: number;
  rewardCoins: number;
  claimRequired: boolean;
};

export type UserAchievement = {
  userId: string;
  achievementId: string;
  unlockedAt: string;
  claimedAt?: string | null;
};

export type ProgressionStreaks = {
  userId: string;
  currentActivityDayStreak: number;
  longestActivityDayStreak: number;
  currentWeeklyConsistencyStreak: number;
  longestWeeklyConsistencyStreak: number;
  weeklyTarget: number;
  lastActivityDate?: string | null;
  lastQualifiedWeekStart?: string | null;
  updatedAt: string;
};

export type LevelUpCelebration = {
  userId: string;
  previousLevel: number;
  level: number;
  queuedAt: string;
  viewedAt?: string | null;
};

export type PersonalRecordType =
  | 'fastest_1_km'
  | 'fastest_5_km'
  | 'longest_distance'
  | 'longest_duration'
  | 'fastest_average_pace'
  | 'most_activities_week'
  | 'highest_activity_exp';

export type PersonalRecord = {
  id: string;
  userId: string;
  recordType: PersonalRecordType;
  sportKey: ActivityType | 'all';
  value: number;
  activityId?: string | null;
  periodStart?: string | null;
  achievedAt: string;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          location: string | null;
          unit_preference: UnitPreference;
          privacy_controls_enabled: boolean;
          health_data_enabled: boolean;
          email_notifications_enabled: boolean;
          push_notifications_enabled: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          username: string;
          location?: string | null;
          unit_preference?: UnitPreference;
          privacy_controls_enabled?: boolean;
          health_data_enabled?: boolean;
          email_notifications_enabled?: boolean;
          push_notifications_enabled?: boolean;
        };
        Update: {
          username?: string;
          location?: string | null;
          unit_preference?: UnitPreference;
          privacy_controls_enabled?: boolean;
          health_data_enabled?: boolean;
          email_notifications_enabled?: boolean;
          push_notifications_enabled?: boolean;
        };
        Relationships: [];
      };
      characters: {
        Row: {
          id: string;
          user_id: string;
          level: number;
          total_exp: number;
          coins: number;
          endurance_exp: number;
          speed_exp: number;
          strength_exp: number;
          consistency_exp: number;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          level?: number;
          total_exp?: number;
          coins?: number;
          endurance_exp?: number;
          speed_exp?: number;
          strength_exp?: number;
          consistency_exp?: number;
        };
        Update: {
          user_id?: string;
          level?: number;
          total_exp?: number;
          coins?: number;
          endurance_exp?: number;
          speed_exp?: number;
          strength_exp?: number;
          consistency_exp?: number;
        };
        Relationships: [];
      };
      activities: {
        Row: {
          id: string;
          user_id: string;
          type: ActivityType;
          title: string;
          started_at: string;
          completed_at: string;
          local_date: string | null;
          local_week_start: string | null;
          duration_seconds: number;
          distance_meters: number | null;
          route: RoutePoint[] | null;
          sets: number | null;
          reps: number | null;
          weight_kg: number | null;
          photo_url: string | null;
          photo_path: string | null;
          personal_record_ids: string[];
          reward_processed_at: string | null;
          reward_summary: ActivityRewardSummary | null;
          exp_earned: number;
          stat_exp: Record<StatKey, number>;
        };
        Insert: {
          user_id: string;
          type: ActivityType;
          title: string;
          started_at: string;
          completed_at: string;
          local_date?: string | null;
          local_week_start?: string | null;
          duration_seconds: number;
          distance_meters?: number | null;
          route?: RoutePoint[] | null;
          sets?: number | null;
          reps?: number | null;
          weight_kg?: number | null;
          photo_url?: string | null;
          photo_path?: string | null;
          personal_record_ids?: string[];
          reward_processed_at?: string | null;
          reward_summary?: ActivityRewardSummary | null;
          exp_earned: number;
          stat_exp: Record<StatKey, number>;
        };
        Update: {
          type?: ActivityType;
          title?: string;
          started_at?: string;
          completed_at?: string;
          local_date?: string | null;
          local_week_start?: string | null;
          duration_seconds?: number;
          distance_meters?: number | null;
          route?: RoutePoint[] | null;
          sets?: number | null;
          reps?: number | null;
          weight_kg?: number | null;
          photo_url?: string | null;
          photo_path?: string | null;
          personal_record_ids?: string[];
          reward_processed_at?: string | null;
          reward_summary?: ActivityRewardSummary | null;
          exp_earned?: number;
          stat_exp?: Record<StatKey, number>;
        };
        Relationships: [];
      };
      missions: {
        Row: {
          id: string;
          user_id: string;
          mission_date: string;
          template_id: string;
          type: MissionType;
          title: string;
          difficulty: MissionDifficulty;
          target_value: number;
          progress: number;
          reward_exp: number;
          reward_coins: number;
          optional_unlock_id: string | null;
          optional_unlock_name: string | null;
          completed_at: string | null;
        };
        Insert: {
          user_id: string;
          mission_date: string;
          template_id: string;
          type: MissionType;
          title: string;
          difficulty: MissionDifficulty;
          target_value: number;
          progress?: number;
          reward_exp: number;
          reward_coins: number;
          optional_unlock_id?: string | null;
          optional_unlock_name?: string | null;
          completed_at?: string | null;
        };
        Update: {
          type?: MissionType;
          template_id?: string;
          title?: string;
          difficulty?: MissionDifficulty;
          target_value?: number;
          progress?: number;
          reward_exp?: number;
          reward_coins?: number;
          optional_unlock_id?: string | null;
          optional_unlock_name?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      owned_cosmetics: {
        Row: {
          user_id: string;
          item_id: string;
          acquired_at: string;
          acquisition_source: 'shop' | 'achievement' | 'personal_record' | 'starter';
          source_ref: string | null;
        };
        Insert: {
          user_id: string;
          item_id: string;
          acquired_at?: string;
          acquisition_source?: 'shop' | 'achievement' | 'personal_record' | 'starter';
          source_ref?: string | null;
        };
        Update: {
          item_id?: string;
          acquisition_source?: 'shop' | 'achievement' | 'personal_record' | 'starter';
          source_ref?: string | null;
        };
        Relationships: [];
      };
      equipped_cosmetics: {
        Row: {
          user_id: string;
          head_item_id: string | null;
          shirt_item_id: string | null;
          pants_item_id: string | null;
          shoes_item_id: string | null;
          accessory_item_id: string | null;
          frame_item_id: string | null;
          aura_item_id: string | null;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          head_item_id?: string | null;
          shirt_item_id?: string | null;
          pants_item_id?: string | null;
          shoes_item_id?: string | null;
          accessory_item_id?: string | null;
          frame_item_id?: string | null;
          aura_item_id?: string | null;
        };
        Update: {
          head_item_id?: string | null;
          shirt_item_id?: string | null;
          pants_item_id?: string | null;
          shoes_item_id?: string | null;
          accessory_item_id?: string | null;
          frame_item_id?: string | null;
          aura_item_id?: string | null;
        };
        Relationships: [];
      };
      character_presentations: {
        Row: {
          user_id: string;
          equipped_pose: CharacterPoseId;
          highest_evolution_stage: EvolutionStageId;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          equipped_pose?: CharacterPoseId;
          highest_evolution_stage?: EvolutionStageId;
        };
        Update: {
          equipped_pose?: CharacterPoseId;
          highest_evolution_stage?: EvolutionStageId;
        };
        Relationships: [];
      };
      progression_streaks: {
        Row: {
          user_id: string;
          current_activity_day_streak: number;
          longest_activity_day_streak: number;
          current_weekly_consistency_streak: number;
          longest_weekly_consistency_streak: number;
          weekly_target: number;
          last_activity_date: string | null;
          last_qualified_week_start: string | null;
          updated_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      achievement_catalog: {
        Row: {
          id: string;
          title: string;
          description: string;
          category: AchievementCategory;
          icon: string;
          condition_key: string;
          condition_target: number;
          reward_exp: number;
          reward_coins: number;
          claim_required: boolean;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      user_achievements: {
        Row: {
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
          claimed_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      personal_records: {
        Row: {
          id: string;
          user_id: string;
          record_type: PersonalRecordType;
          sport_key: ActivityType | 'all';
          value: number;
          activity_id: string | null;
          period_start: string | null;
          achieved_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      level_up_celebrations: {
        Row: {
          user_id: string;
          level: number;
          previous_level: number;
          queued_at: string;
          viewed_at: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      mission_daily_rerolls: {
        Row: {
          user_id: string;
          mission_date: string;
          mission_id: string;
          original_mission: unknown;
          replacement_template_id: string;
          used_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      user_mission_unlocks: {
        Row: {
          user_id: string;
          unlock_id: string;
          unlock_name: string;
          mission_id: string | null;
          unlocked_at: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      cosmetic_unlock_catalog: {
        Row: {
          item_id: string;
          source_type: 'achievement' | 'personal_record';
          source_id: string;
          requirement_label: string;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      refresh_progression_streaks: {
        Args: { p_local_today: string };
        Returns: Database['public']['Tables']['progression_streaks']['Row'];
      };
      unlock_achievements: {
        Args: { p_achievement_ids: string[] };
        Returns: Pick<Database['public']['Tables']['user_achievements']['Row'], 'achievement_id' | 'unlocked_at' | 'claimed_at'>[];
      };
      upsert_personal_records: {
        Args: { p_activity_id: string; p_candidates: unknown };
        Returns: Database['public']['Tables']['personal_records']['Row'][];
      };
      rebuild_personal_records: {
        Args: { p_activity_groups: unknown };
        Returns: Database['public']['Tables']['personal_records']['Row'][];
      };
      process_activity_rewards: {
        Args: { p_activity_id: string };
        Returns: ActivityRewardSummary;
      };
      mark_level_up_viewed: {
        Args: { p_level: number };
        Returns: Database['public']['Tables']['level_up_celebrations']['Row'];
      };
      reroll_daily_mission: {
        Args: { p_mission_id: string; p_replacement: unknown };
        Returns: Database['public']['Tables']['missions']['Row'];
      };
      sync_earned_cosmetics: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['owned_cosmetics']['Row'][];
      };
      sync_character_presentation: {
        Args: Record<string, never>;
        Returns: Database['public']['Tables']['character_presentations']['Row'];
      };
      set_character_pose: {
        Args: { p_pose: CharacterPoseId };
        Returns: Database['public']['Tables']['character_presentations']['Row'];
      };
    };
    Enums: {
      unit_preference: UnitPreference;
      activity_type: ActivityType;
      mission_type: MissionType;
      mission_difficulty: MissionDifficulty;
    };
    CompositeTypes: Record<string, never>;
  };
};
