import { create } from 'zustand';
import {
  Activity,
  Character,
  EquippedCosmetics,
  Mission,
  OwnedCosmetic,
  PersonalRecord,
  Profile,
  ProgressionStreaks,
  UserAchievement
} from '@/types/domain';

type AppState = {
  profile: Profile | null;
  character: Character | null;
  activities: Activity[];
  missions: Mission[];
  ownedCosmetics: OwnedCosmetic[];
  equippedCosmetics: EquippedCosmetics | null;
  progressionStreaks: ProgressionStreaks | null;
  achievements: UserAchievement[];
  personalRecords: PersonalRecord[];
  setProfile: (profile: Profile | null) => void;
  setCharacter: (character: Character | null) => void;
  setActivities: (activities: Activity[]) => void;
  setMissions: (missions: Mission[]) => void;
  setOwnedCosmetics: (ownedCosmetics: OwnedCosmetic[]) => void;
  setEquippedCosmetics: (equippedCosmetics: EquippedCosmetics | null) => void;
  setProgressionStreaks: (progressionStreaks: ProgressionStreaks | null) => void;
  setAchievements: (achievements: UserAchievement[]) => void;
  setPersonalRecords: (personalRecords: PersonalRecord[]) => void;
  addOwnedCosmetic: (ownedCosmetic: OwnedCosmetic) => void;
  addActivity: (activity: Activity) => void;
  updateActivity: (activity: Activity) => void;
  reset: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  character: null,
  activities: [],
  missions: [],
  ownedCosmetics: [],
  equippedCosmetics: null,
  progressionStreaks: null,
  achievements: [],
  personalRecords: [],
  setProfile: (profile) => set({ profile }),
  setCharacter: (character) => set({ character }),
  setActivities: (activities) => set({ activities }),
  setMissions: (missions) => set({ missions }),
  setOwnedCosmetics: (ownedCosmetics) => set({ ownedCosmetics }),
  setEquippedCosmetics: (equippedCosmetics) => set({ equippedCosmetics }),
  setProgressionStreaks: (progressionStreaks) => set({ progressionStreaks }),
  setAchievements: (achievements) => set({ achievements }),
  setPersonalRecords: (personalRecords) => set({ personalRecords }),
  addOwnedCosmetic: (ownedCosmetic) =>
    set((state) => ({ ownedCosmetics: [...state.ownedCosmetics, ownedCosmetic] })),
  addActivity: (activity) => set((state) => ({ activities: [activity, ...state.activities] })),
  updateActivity: (activity) =>
    set((state) => ({
      activities: state.activities.map((current) => (current.id === activity.id ? activity : current))
    })),
  reset: () =>
    set({
      profile: null,
      character: null,
      activities: [],
      missions: [],
      ownedCosmetics: [],
      equippedCosmetics: null,
      progressionStreaks: null,
      achievements: [],
      personalRecords: []
    })
}));
