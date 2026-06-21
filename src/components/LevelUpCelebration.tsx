import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Modal,
  StyleSheet,
  View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { COSMETICS } from '@/constants/cosmetics';
import { getEvolutionStageForLevel } from '@/constants/characterProgression';
import { SKILL_POINT_LEVELS } from '@/constants/skillTree';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { LevelUpCelebration as LevelUpCelebrationModel } from '@/types/domain';

type LevelUpCelebrationProps = {
  visible: boolean;
  celebration: LevelUpCelebrationModel | null;
  onContinue: () => void;
  additionalUnlocks?: string[];
  queueLabel?: string;
  busy?: boolean;
};

export const LevelUpCelebration = ({
  visible,
  celebration,
  onContinue,
  additionalUnlocks = [],
  queueLabel,
  busy = false
}: LevelUpCelebrationProps) => {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.94)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const celebrationLevel = celebration?.level;
  const celebrationPreviousLevel = celebration?.previousLevel;
  const evolutionStage = useMemo(() => {
    if (!celebration) return null;
    const previous = getEvolutionStageForLevel(celebration.previousLevel);
    const next = getEvolutionStageForLevel(celebration.level);
    return previous.id === next.id ? null : next;
  }, [celebration]);
  const unlocks = useMemo(() => {
    if (!celebration) return additionalUnlocks;
    const levelUnlocks = COSMETICS.filter((item) =>
      item.unlockSource.type === 'shop'
        ? item.unlockLevel === celebration.level
        : item.unlockSource.type === 'achievement' && item.unlockSource.id === `character_level_${celebration.level}`
    ).map((item) =>
      item.unlockSource.type === 'achievement'
        ? `Cosmetic earned: ${item.name}`
        : `Shop item available: ${item.name}`
    );
    const stageUnlocks = evolutionStage ? [`Evolution stage: ${evolutionStage.name}`] : [];
    const skillUnlocks = SKILL_POINT_LEVELS.includes(celebration.level as typeof SKILL_POINT_LEVELS[number])
      ? ['Skill point earned']
      : [];
    return [...new Set([...additionalUnlocks, ...stageUnlocks, ...skillUnlocks, ...levelUnlocks])];
  }, [additionalUnlocks, celebration, evolutionStage]);

  useEffect(() => {
    if (!visible || celebrationLevel === undefined) return;

    opacity.stopAnimation();
    scale.stopAnimation();
    progress.stopAnimation();
    opacity.setValue(0);
    scale.setValue(reduceMotion ? 1 : 0.94);
    progress.setValue(reduceMotion ? 1 : 0);

    const animation = reduceMotion
      ? Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true
        })
      : Animated.parallel([
          Animated.timing(opacity, {
            toValue: 1,
            duration: 240,
            useNativeDriver: true
          }),
          Animated.spring(scale, {
            toValue: 1,
            damping: 14,
            stiffness: 125,
            mass: 0.8,
            useNativeDriver: true
          }),
          Animated.timing(progress, {
            toValue: 1,
            duration: 760,
            delay: 180,
            useNativeDriver: false
          })
        ]);

    animation.start();
    AccessibilityInfo.announceForAccessibility(`Level up. Level ${celebrationLevel}.`);
    return () => animation.stop();
  }, [celebrationLevel, celebrationPreviousLevel, opacity, progress, reduceMotion, scale, visible]);

  if (!celebration) return null;

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%']
  });

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={() => undefined}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.backdrop, { opacity }]}>
          <Animated.View style={[styles.panel, { transform: [{ scale }] }]}>
            <View style={styles.topRule} />
            {queueLabel && (
              <AppText variant="caption" muted style={styles.queueLabel}>
                {queueLabel}
              </AppText>
            )}

            <View style={styles.levelIcon}>
              <Ionicons name="sparkles" size={32} color={colors.primary} />
            </View>
            <AppText style={styles.levelUpText}>LEVEL UP</AppText>
            <View style={styles.levelRow}>
              <AppText style={styles.levelNumber}>{celebration.previousLevel}</AppText>
              <Ionicons name="arrow-forward" size={28} color={colors.primary} />
              <AppText style={[styles.levelNumber, styles.newLevel]}>{celebration.level}</AppText>
            </View>

            {evolutionStage && (
              <View style={[styles.evolutionStage, { borderColor: evolutionStage.sceneColor }]}>
                <AppText variant="caption" style={{ color: evolutionStage.sceneColor }}>NEW EVOLUTION</AppText>
                <AppText variant="subtitle">{evolutionStage.name}</AppText>
              </View>
            )}

            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
            </View>

            <View style={styles.unlockSection}>
              <AppText variant="caption" style={styles.unlockEyebrow}>
                LEVEL REWARDS
              </AppText>
              {unlocks.length ? (
                unlocks.map((unlock) => (
                  <View key={`level-${celebration.level}-${unlock}`} style={styles.unlockRow}>
                    <Ionicons name="lock-open-outline" size={18} color={colors.success} />
                    <AppText style={{ flex: 1 }}>{unlock}</AppText>
                  </View>
                ))
              ) : (
                <View style={styles.unlockRow}>
                  <Ionicons name="trending-up-outline" size={18} color={colors.primary} />
                  <AppText style={{ flex: 1 }}>Character progression advanced to Level {celebration.level}.</AppText>
                </View>
              )}
            </View>

            <PrimaryButton
              label={busy ? 'Saving...' : 'Continue'}
              onPress={onContinue}
              disabled={busy}
              style={styles.continueButton}
            />
          </Animated.View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

const useReducedMotion = () => {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => subscription.remove();
  }, []);

  return reduceMotion;
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'rgba(2, 4, 10, 0.9)'
  },
  backdrop: {
    flex: 1,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  panel: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '92%',
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.card,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.md,
    ...shadows.cyanGlow
  },
  topRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: colors.secondary
  },
  queueLabel: {
    alignSelf: 'flex-end'
  },
  levelIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    borderWidth: 1,
    borderColor: colors.secondary,
    backgroundColor: colors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.purpleGlow
  },
  levelUpText: {
    color: colors.text,
    fontSize: 42,
    lineHeight: 48,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center'
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md
  },
  levelNumber: {
    minWidth: 54,
    color: colors.muted,
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '900',
    textAlign: 'center'
  },
  newLevel: {
    color: colors.primary
  },
  progressTrack: {
    width: '100%',
    height: 9,
    overflow: 'hidden',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.black
  },
  evolutionStage: {
    width: '100%',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.cardHigh,
    padding: spacing.sm
  },
  progressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary
  },
  unlockSection: {
    width: '100%',
    maxHeight: 220,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    padding: spacing.md,
    gap: spacing.sm
  },
  unlockEyebrow: {
    color: colors.warning,
    fontWeight: '900'
  },
  unlockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  continueButton: {
    width: '100%'
  }
});
