import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { SkillTreePanel } from '@/components/skill-tree/SkillTreePanel';
import { colors, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/appStore';

export default function SkillTreeScreen() {
  const router = useRouter();
  const availablePoints = useAppStore((state) => state.skillTreeProgress?.availablePoints ?? 0);

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Character"
          hitSlop={10}
          onPress={() => router.back()}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Ionicons name="chevron-back" size={23} color={colors.primary} />
        </Pressable>
        <View style={styles.titleBlock}>
          <AppText variant="caption" style={{ color: colors.primary }}>
            Character Progression
          </AppText>
          <AppText variant="title">Skill Tree</AppText>
        </View>
        <View style={styles.pointsBadge}>
          <Ionicons name="sparkles" size={16} color={colors.coin} />
          <AppText style={styles.pointsText}>{availablePoints}</AppText>
        </View>
      </View>

      <SkillTreePanel />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center'
  },
  pressed: {
    opacity: 0.82
  },
  titleBlock: {
    flex: 1
  },
  pointsBadge: {
    minHeight: 38,
    minWidth: 68,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.coin,
    backgroundColor: 'rgba(255, 214, 110, 0.08)',
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  pointsText: {
    color: colors.coin,
    fontWeight: '900'
  }
});
