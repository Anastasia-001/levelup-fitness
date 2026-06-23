import { useState } from 'react';
import { Alert } from 'react-native';
import { LevelUpCelebration } from '@/components/LevelUpCelebration';
import { listPendingLevelUps, markLevelUpBatchViewed } from '@/services/levelUpService';
import { useAppStore } from '@/store/appStore';
import { buildLevelUpBatch } from '@/utils/levelUpBatch';

export const LevelUpCelebrationHost = () => {
  const pendingLevelUps = useAppStore((state) => state.pendingLevelUps);
  const setPendingLevelUps = useAppStore((state) => state.setPendingLevelUps);
  const [saving, setSaving] = useState(false);
  const batch = buildLevelUpBatch(pendingLevelUps);
  const activeCelebration = batch?.celebration ?? null;

  const continueFromLevel = async () => {
    if (!activeCelebration || !batch || saving) return;
    setSaving(true);
    try {
      await markLevelUpBatchViewed(batch.firstLevel, batch.finalLevel);
      setPendingLevelUps(await listPendingLevelUps(activeCelebration.userId));
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
    />
  );
};
