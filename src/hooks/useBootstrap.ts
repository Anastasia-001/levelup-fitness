import { useCallback, useState } from 'react';
import { listActivities, processPendingActivityRewards } from '@/services/activityService';
import { getInventory } from '@/services/cosmeticService';
import { listPendingLevelUps } from '@/services/levelUpService';
import { getTodayMissions } from '@/services/missionService';
import { getCharacter, getProfile } from '@/services/profileService';
import { refreshProgressionMilestones } from '@/services/progressionService';
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
  const setProgressionStreaks = useAppStore((state) => state.setProgressionStreaks);
  const setAchievements = useAppStore((state) => state.setAchievements);
  const setPersonalRecords = useAppStore((state) => state.setPersonalRecords);
  const setPendingLevelUps = useAppStore((state) => state.setPendingLevelUps);

  const bootstrap = useCallback(
    async (userId: string) => {
      setLoading(true);
      setError(null);
      try {
        try {
          await processPendingActivityRewards(userId);
        } catch (caught) {
          if (__DEV__) {
            console.warn('[LevelUp] Pending activity rewards could not be processed.', caught);
          }
        }

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

        try {
          setPendingLevelUps(await listPendingLevelUps(userId));
        } catch (caught) {
          if (__DEV__) {
            console.warn('[LevelUp] Pending level celebrations could not be loaded.', caught);
          }
        }

        try {
          const progression = await refreshProgressionMilestones({ userId, activities });
          setProgressionStreaks(progression.streaks);
          setAchievements(progression.achievements);
          setPersonalRecords(progression.personalRecords);
          setCharacter(progression.character);

          if (progression.activitiesChanged) {
            setActivities(await listActivities(userId));
          }
        } catch (caught) {
          if (__DEV__) {
            console.warn('[LevelUp] Progression milestones could not be refreshed.', caught);
          }
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to load your profile.');
      } finally {
        setLoading(false);
      }
    },
    [
      setAchievements,
      setActivities,
      setCharacter,
      setEquippedCosmetics,
      setMissions,
      setOwnedCosmetics,
      setPersonalRecords,
      setPendingLevelUps,
      setProfile,
      setProgressionStreaks
    ]
  );

  return { bootstrap, loading, error };
};
