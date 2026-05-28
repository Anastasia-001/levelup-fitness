import { useCallback, useState } from 'react';
import { listActivities } from '@/services/activityService';
import { getInventory } from '@/services/cosmeticService';
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
  const setOwnedCosmetics = useAppStore((state) => state.setOwnedCosmetics);
  const setEquippedCosmetics = useAppStore((state) => state.setEquippedCosmetics);

  const bootstrap = useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);
      try {
        const [profile, character, activities, missions, inventory] = await Promise.all([
          getProfile(userId),
          getCharacter(userId),
          listActivities(userId),
          getTodayMissions(userId),
          getInventory(userId)
        ]);

        setProfile(profile);
        setCharacter(character);
        setActivities(activities);
        setMissions(missions);
        setOwnedCosmetics(inventory.ownedCosmetics);
        setEquippedCosmetics(inventory.equippedCosmetics);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load your profile.');
      } finally {
        setLoading(false);
      }
    },
    [setActivities, setCharacter, setEquippedCosmetics, setMissions, setOwnedCosmetics, setProfile]
  );

  return { bootstrap, loading, error };
};
