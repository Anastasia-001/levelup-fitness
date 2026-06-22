import { create } from 'zustand';
import {
  Activity,
  Character,
  CharacterPresentation,
  EquippedCosmetics,
  LevelUpCelebration,
  Mission,
  OwnedCosmetic,
  PersonalRecord,
  Profile,
  ProgressionStreaks,
  SkillTreeProgress,
  UserAchievement
} from '@/types/domain';

export type LoadState = 'idle' | 'loading' | 'ready' | 'error';

export type AccountBootstrapState = {
  userId: string | null;
  loading: boolean;
  error: string | null;
  profileState: LoadState;
  profileError: string | null;
};

type AppState = {
  profile: Profile | null;
  character: Character | null;
  characterPresentation: CharacterPresentation | null;
  activities: Activity[];
  missions: Mission[];
  ownedCosmetics: OwnedCosmetic[];
  equippedCosmetics: EquippedCosmetics | null;
  progressionStreaks: ProgressionStreaks | null;
  achievements: UserAchievement[];
  personalRecords: PersonalRecord[];
  pendingLevelUps: LevelUpCelebration[];
  skillTreeProgress: SkillTreeProgress | null;
  accountBootstrap: AccountBootstrapState;
  setProfile: (profile: Profile | null) => void;
  setCharacter: (character: Character | null) => void;
  setCharacterPresentation: (presentation: CharacterPresentation | null) => void;
  setActivities: (activities: Activity[]) => void;
  setMissions: (missions: Mission[]) => void;
  setOwnedCosmetics: (ownedCosmetics: OwnedCosmetic[]) => void;
  setEquippedCosmetics: (equippedCosmetics: EquippedCosmetics | null) => void;
  setProgressionStreaks: (progressionStreaks: ProgressionStreaks | null) => void;
  setAchievements: (achievements: UserAchievement[]) => void;
  setPersonalRecords: (personalRecords: PersonalRecord[]) => void;
  setPendingLevelUps: (pendingLevelUps: LevelUpCelebration[]) => void;
  setSkillTreeProgress: (skillTreeProgress: SkillTreeProgress | null) => void;
  setAccountBootstrap: (values: Partial<AccountBootstrapState>) => void;
  removePendingLevelUp: (level: number) => void;
  addOwnedCosmetic: (ownedCosmetic: OwnedCosmetic) => void;
  addActivity: (activity: Activity) => void;
  updateActivity: (activity: Activity) => void;
  reset: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  character: null,
  characterPresentation: null,
  activities: [],
  missions: [],
  ownedCosmetics: [],
  equippedCosmetics: null,
  progressionStreaks: null,
  achievements: [],
  personalRecords: [],
  pendingLevelUps: [],
  skillTreeProgress: null,
  accountBootstrap: {
    userId: null,
    loading: false,
    error: null,
    profileState: 'idle',
    profileError: null
  },
  setProfile: (profile) => set({ profile }),
  setCharacter: (character) => set({ character }),
  setCharacterPresentation: (characterPresentation) => set({ characterPresentation }),
  setActivities: (activities) => set({ activities }),
  setMissions: (missions) => set({ missions }),
  setOwnedCosmetics: (ownedCosmetics) => set({ ownedCosmetics }),
  setEquippedCosmetics: (equippedCosmetics) => set({ equippedCosmetics }),
  setProgressionStreaks: (progressionStreaks) => set({ progressionStreaks }),
  setAchievements: (achievements) => set({ achievements }),
  setPersonalRecords: (personalRecords) => set({ personalRecords }),
  setPendingLevelUps: (pendingLevelUps) =>
    set({ pendingLevelUps: [...pendingLevelUps].sort((left, right) => left.level - right.level) }),
  setSkillTreeProgress: (skillTreeProgress) => set({ skillTreeProgress }),
  setAccountBootstrap: (values) =>
    set((state) => ({ accountBootstrap: { ...state.accountBootstrap, ...values } })),
  removePendingLevelUp: (level) =>
    set((state) => ({ pendingLevelUps: state.pendingLevelUps.filter((item) => item.level !== level) })),
  addOwnedCosmetic: (ownedCosmetic) =>
    set((state) => ({
      ownedCosmetics: state.ownedCosmetics.some((item) => item.itemId === ownedCosmetic.itemId)
        ? state.ownedCosmetics
        : [...state.ownedCosmetics, ownedCosmetic]
    })),
  addActivity: (activity) => set((state) => ({ activities: [activity, ...state.activities] })),
  updateActivity: (activity) =>
    set((state) => ({
      activities: state.activities.map((current) => (current.id === activity.id ? activity : current))
    })),
  reset: () =>
    set({
      profile: null,
      character: null,
      characterPresentation: null,
      activities: [],
      missions: [],
      ownedCosmetics: [],
      equippedCosmetics: null,
      progressionStreaks: null,
      achievements: [],
      personalRecords: [],
      pendingLevelUps: [],
      skillTreeProgress: null,
      accountBootstrap: {
        userId: null,
        loading: false,
        error: null,
        profileState: 'idle',
        profileError: null
      }
    })
}));
