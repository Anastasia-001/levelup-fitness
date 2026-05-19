import { create } from 'zustand';
import { Activity, Character, Mission, Profile } from '@/types/domain';

type AppState = {
  profile: Profile | null;
  character: Character | null;
  activities: Activity[];
  missions: Mission[];
  setProfile: (profile: Profile | null) => void;
  setCharacter: (character: Character | null) => void;
  setActivities: (activities: Activity[]) => void;
  setMissions: (missions: Mission[]) => void;
  addActivity: (activity: Activity) => void;
  reset: () => void;
};

export const useAppStore = create<AppState>((set) => ({
  profile: null,
  character: null,
  activities: [],
  missions: [],
  setProfile: (profile) => set({ profile }),
  setCharacter: (character) => set({ character }),
  setActivities: (activities) => set({ activities }),
  setMissions: (missions) => set({ missions }),
  addActivity: (activity) => set((state) => ({ activities: [activity, ...state.activities] })),
  reset: () => set({ profile: null, character: null, activities: [], missions: [] })
}));
