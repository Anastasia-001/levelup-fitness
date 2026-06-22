import { useCallback } from 'react';
import { listActivities, processPendingActivityRewards } from '@/services/activityService';
import { getInventory } from '@/services/cosmeticService';
import { syncCharacterPresentation } from '@/services/characterPresentationService';
import { listPendingLevelUps } from '@/services/levelUpService';
import { getTodayMissions } from '@/services/missionService';
import { getCharacter, getProfile } from '@/services/profileService';
import { refreshProgressionMilestones } from '@/services/progressionService';
import { syncSkillTreeProgress } from '@/services/skillTreeService';
import { useAppStore } from '@/store/appStore';

type BootstrapOptions = { force?: boolean };
type ActiveBootstrap = { userId: string; token: number; promise: Promise<void> };

let bootstrapToken = 0;
let activeBootstrap: ActiveBootstrap | null = null;

const errorMessage = (caught: unknown) =>
  caught instanceof Error ? caught.message : 'Unknown bootstrap error';

const logSubsystemFailure = (subsystem: string, caught: unknown) => {
  if (__DEV__) {
    console.warn(`[LevelUp bootstrap] ${subsystem} failed.`, caught);
  }
};

export const cancelBootstrap = (userId?: string) => {
  if (userId && activeBootstrap?.userId !== userId) return;
  bootstrapToken += 1;
  activeBootstrap = null;
};

export const useBootstrap = () => {
  const accountBootstrap = useAppStore((state) => state.accountBootstrap);
  const setAccountBootstrap = useAppStore((state) => state.setAccountBootstrap);
  const setProfile = useAppStore((state) => state.setProfile);
  const setCharacter = useAppStore((state) => state.setCharacter);
  const setCharacterPresentation = useAppStore((state) => state.setCharacterPresentation);
  const setActivities = useAppStore((state) => state.setActivities);
  const setMissions = useAppStore((state) => state.setMissions);
  const setOwnedCosmetics = useAppStore((state) => state.setOwnedCosmetics);
  const setEquippedCosmetics = useAppStore((state) => state.setEquippedCosmetics);
  const setProgressionStreaks = useAppStore((state) => state.setProgressionStreaks);
  const setAchievements = useAppStore((state) => state.setAchievements);
  const setPersonalRecords = useAppStore((state) => state.setPersonalRecords);
  const setPendingLevelUps = useAppStore((state) => state.setPendingLevelUps);
  const setSkillTreeProgress = useAppStore((state) => state.setSkillTreeProgress);

  const bootstrap = useCallback(
    (userId: string, options: BootstrapOptions = {}) => {
      if (!options.force && activeBootstrap?.userId === userId) {
        return activeBootstrap.promise;
      }

      const token = ++bootstrapToken;
      const isCurrent = () => bootstrapToken === token && activeBootstrap?.userId === userId;

      setAccountBootstrap({
        userId,
        loading: true,
        error: null,
        profileState: 'loading',
        profileError: null
      });

      const promise = (async () => {
        const profileTask = getProfile(userId)
          .then((profile) => {
            if (isCurrent()) {
              setProfile(profile);
              setAccountBootstrap({ profileState: 'ready', profileError: null });
            }
            return profile;
          })
          .catch((caught) => {
            if (isCurrent()) {
              setAccountBootstrap({ profileState: 'error', profileError: errorMessage(caught) });
            }
            throw caught;
          });
        const characterTask = getCharacter(userId).then((character) => {
          if (isCurrent()) setCharacter(character);
          return character;
        });
        const activitiesTask = listActivities(userId).then((activities) => {
          if (isCurrent()) setActivities(activities);
          return activities;
        });
        const inventoryTask = getInventory(userId).then((inventory) => {
          if (isCurrent()) {
            setOwnedCosmetics(inventory.ownedCosmetics);
            setEquippedCosmetics(inventory.equippedCosmetics);
          }
          return inventory;
        });

        const essentialNames = ['profile', 'character', 'activities', 'inventory'] as const;
        const essentialResults = await Promise.allSettled([
          profileTask,
          characterTask,
          activitiesTask,
          inventoryTask
        ]);
        if (!isCurrent()) return;

        const essentialFailures = essentialResults.flatMap((result, index) => {
          if (result.status === 'fulfilled') return [];
          const subsystem = essentialNames[index];
          logSubsystemFailure(subsystem, result.reason);
          return [subsystem];
        });
        const essentialError = essentialFailures.length
          ? `Could not load: ${essentialFailures.join(', ')}.`
          : null;

        let progressionActivities = essentialResults[2].status === 'fulfilled'
          ? essentialResults[2].value
          : useAppStore.getState().activities.filter((activity) => activity.userId === userId);

        try {
          await processPendingActivityRewards(userId);
          const refreshed = await Promise.allSettled([getCharacter(userId), listActivities(userId)]);
          if (!isCurrent()) return;
          if (refreshed[0].status === 'fulfilled') setCharacter(refreshed[0].value);
          else logSubsystemFailure('post-reward character refresh', refreshed[0].reason);
          if (refreshed[1].status === 'fulfilled') {
            progressionActivities = refreshed[1].value;
            setActivities(refreshed[1].value);
          } else {
            logSubsystemFailure('post-reward activity refresh', refreshed[1].reason);
          }
        } catch (caught) {
          logSubsystemFailure('pending activity rewards', caught);
        }

        if (!isCurrent()) return;

        const secondaryTasks = [
          getTodayMissions(userId).then((missions) => {
            if (isCurrent()) setMissions(missions);
          }),
          syncCharacterPresentation().then((presentation) => {
            if (isCurrent()) setCharacterPresentation(presentation);
          }),
          syncSkillTreeProgress(userId).then((progress) => {
            if (isCurrent()) setSkillTreeProgress(progress);
          }),
          listPendingLevelUps(userId).then((celebrations) => {
            if (isCurrent()) setPendingLevelUps(celebrations);
          }),
          refreshProgressionMilestones({ userId, activities: progressionActivities }).then(async (progression) => {
            if (!isCurrent()) return;
            setProgressionStreaks(progression.streaks);
            setAchievements(progression.achievements);
            setPersonalRecords(progression.personalRecords);
            setCharacter(progression.character);

            if (progression.newCosmetics.length) {
              const currentOwned = useAppStore.getState().ownedCosmetics;
              setOwnedCosmetics([
                ...currentOwned,
                ...progression.newCosmetics.filter(
                  (cosmetic) => !currentOwned.some((owned) => owned.itemId === cosmetic.itemId)
                )
              ]);
            }

            if (progression.activitiesChanged) {
              const nextActivities = await listActivities(userId);
              if (isCurrent()) setActivities(nextActivities);
            }
          })
        ];
        const secondaryNames = [
          'missions',
          'character presentation, pose, and class',
          'skill tree',
          'level-up celebrations',
          'streaks, achievements, and personal records'
        ];
        const secondaryResults = await Promise.allSettled(secondaryTasks);
        secondaryResults.forEach((result, index) => {
          if (result.status === 'rejected') {
            logSubsystemFailure(secondaryNames[index], result.reason);
          }
        });

        if (isCurrent()) {
          setAccountBootstrap({ loading: false, error: essentialError });
        }
      })().catch((caught) => {
        logSubsystemFailure('bootstrap coordinator', caught);
        if (isCurrent()) {
          const current = useAppStore.getState().accountBootstrap;
          setAccountBootstrap({
            loading: false,
            error: errorMessage(caught),
            profileState: current.profileState === 'loading' ? 'error' : current.profileState,
            profileError: current.profileState === 'loading' ? errorMessage(caught) : current.profileError
          });
        }
      }).finally(() => {
        if (activeBootstrap?.token === token) {
          activeBootstrap = null;
        }
      });

      activeBootstrap = { userId, token, promise };
      return promise;
    },
    [
      setAccountBootstrap,
      setAchievements,
      setActivities,
      setCharacter,
      setCharacterPresentation,
      setEquippedCosmetics,
      setMissions,
      setOwnedCosmetics,
      setPersonalRecords,
      setPendingLevelUps,
      setProfile,
      setProgressionStreaks,
      setSkillTreeProgress
    ]
  );

  return {
    bootstrap,
    loading: accountBootstrap.loading,
    error: accountBootstrap.error,
    profileState: accountBootstrap.profileState,
    profileError: accountBootstrap.profileError
  };
};
