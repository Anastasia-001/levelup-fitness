import { useCallback, useState } from 'react';
import { listActivities } from '@/services/activityService';
import { getTodayMissions } from '@/services/missionService';
import { getCharacter, getProfile } from '@/services/profileService';
import { useAppStore } from '@/store/appStore';

export const useBootstrap = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setProfile = useAppStore((state) => state.setProfile);
  const setCharacter = useAppStore((state) => state.setCharacter);
  const setActivities = useAppStore((state) => state.setActivities);
  const setMissions = useAppStore((state) => state.setMissions);

  const bootstrap = useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);
      try {
        const [profile, character, activities, missions] = await Promise.all([
          getProfile(userId),
          getCharacter(userId),
          listActivities(userId),
          getTodayMissions(userId)
        ]);

        setProfile(profile);
        setCharacter(character);
        setActivities(activities);
        setMissions(missions);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load your profile.');
      } finally {
        setLoading(false);
      }
    },
    [setActivities, setCharacter, setMissions, setProfile]
  );

  return { bootstrap, loading, error };
};
