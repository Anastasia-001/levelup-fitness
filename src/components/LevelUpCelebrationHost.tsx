import { useState } from 'react';
import { Alert } from 'react-native';
import { LevelUpCelebration } from '@/components/LevelUpCelebration';
import { markLevelUpViewed } from '@/services/levelUpService';
import { useAppStore } from '@/store/appStore';

export const LevelUpCelebrationHost = () => {
  const pendingLevelUps = useAppStore((state) => state.pendingLevelUps);
  const removePendingLevelUp = useAppStore((state) => state.removePendingLevelUp);
  const [saving, setSaving] = useState(false);
  const activeCelebration = pendingLevelUps[0] ?? null;

  const continueFromLevel = async () => {
    if (!activeCelebration || saving) return;
    setSaving(true);
    try {
      await markLevelUpViewed(activeCelebration.level);
      removePendingLevelUp(activeCelebration.level);
    } catch (caught) {
      Alert.alert(
        'Could not finish celebration',
        caught instanceof Error ? caught.message : 'Try again.'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <LevelUpCelebration
      visible={Boolean(activeCelebration)}
      celebration={activeCelebration}
      onContinue={continueFromLevel}
      busy={saving}
      queueLabel={
        pendingLevelUps.length > 1
          ? `${pendingLevelUps.length} level ups queued`
          : undefined
      }
    />
  );
};
