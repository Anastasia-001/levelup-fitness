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
  timestamp: number;
};

export type ActivityInput = {
  type: ActivityType;
  durationSeconds: number;
  distanceMeters?: number;
  route?: RoutePoint[];
  sets?: number;
  reps?: number;
  weightKg?: number;
  photoUrl?: string;
  photoPath?: string;
};

export type Activity = ActivityInput & {
  id: string;
  userId: string;
  expEarned: number;
  statExp: Record<StatKey, number>;
  startedAt: string;
  completedAt: string;
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
          started_at: string;
          completed_at: string;
          duration_seconds: number;
          distance_meters: number | null;
          route: RoutePoint[] | null;
          sets: number | null;
          reps: number | null;
          weight_kg: number | null;
          photo_url: string | null;
          photo_path: string | null;
          exp_earned: number;
          stat_exp: Record<StatKey, number>;
        };
        Insert: {
          user_id: string;
          type: ActivityType;
          started_at: string;
          completed_at: string;
          duration_seconds: number;
          distance_meters?: number | null;
          route?: RoutePoint[] | null;
          sets?: number | null;
          reps?: number | null;
          weight_kg?: number | null;
          photo_url?: string | null;
          photo_path?: string | null;
          exp_earned: number;
          stat_exp: Record<StatKey, number>;
        };
        Update: {
          type?: ActivityType;
          started_at?: string;
          completed_at?: string;
          duration_seconds?: number;
          distance_meters?: number | null;
          route?: RoutePoint[] | null;
          sets?: number | null;
          reps?: number | null;
          weight_kg?: number | null;
          photo_url?: string | null;
          photo_path?: string | null;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      unit_preference: UnitPreference;
      activity_type: ActivityType;
      mission_type: MissionType;
    };
    CompositeTypes: Record<string, never>;
  };
};
