export type StatKey = 'endurance' | 'speed' | 'strength' | 'consistency';

export type GpsActivityType = 'run' | 'walk' | 'bike' | 'hike';
export type ManualActivityType = 'gym_workout' | 'pushups' | 'swimming' | 'other_workout';
export type ActivityType = GpsActivityType | ManualActivityType;

export type UnitPreference = 'metric' | 'imperial';
export type CosmeticCategory = 'head' | 'shirt' | 'pants' | 'shoes' | 'accessory' | 'frame';
export type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

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
  missionsCompleted: { id: string; title: string; rewardExp: number }[];
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
  shopSection: 'Featured' | 'Shirts' | 'Pants' | 'Shoes' | 'Accessories' | 'Frames' | 'Rare';
  rarity: Rarity;
  price: number;
  unlockLevel?: number;
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
};

export type EquippedCosmetics = {
  userId: string;
  headItemId: string | null;
  shirtItemId: string | null;
  pantsItemId: string | null;
  shoesItemId: string | null;
  accessoryItemId: string | null;
  frameItemId: string | null;
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

export type Mission = {
  id: string;
  userId: string;
  missionDate: string;
  type: MissionType;
  title: string;
  targetValue: number;
  progress: number;
  rewardExp: number;
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
          type: MissionType;
          title: string;
          target_value: number;
          progress: number;
          reward_exp: number;
          completed_at: string | null;
        };
        Insert: {
          user_id: string;
          mission_date: string;
          type: MissionType;
          title: string;
          target_value: number;
          progress?: number;
          reward_exp: number;
          completed_at?: string | null;
        };
        Update: {
          type?: MissionType;
          title?: string;
          target_value?: number;
          progress?: number;
          reward_exp?: number;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      owned_cosmetics: {
        Row: {
          user_id: string;
          item_id: string;
          acquired_at: string;
        };
        Insert: {
          user_id: string;
          item_id: string;
          acquired_at?: string;
        };
        Update: {
          item_id?: string;
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
        };
        Update: {
          head_item_id?: string | null;
          shirt_item_id?: string | null;
          pants_item_id?: string | null;
          shoes_item_id?: string | null;
          accessory_item_id?: string | null;
          frame_item_id?: string | null;
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
    };
    Enums: {
      unit_preference: UnitPreference;
      activity_type: ActivityType;
      mission_type: MissionType;
    };
    CompositeTypes: Record<string, never>;
  };
};
