import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/appStore';
import { levelFromTotalExp, statLevel } from '@/utils/exp';
import { useState } from 'react';

const statRows = [
  ['Endurance', 'enduranceExp'],
  ['Speed', 'speedExp'],
  ['Strength', 'strengthExp'],
  ['Consistency', 'consistencyExp']
] as const;

export default function CharacterScreen() {
  const character = useAppStore((state) => state.character);
  const profile = useAppStore((state) => state.profile);
  const progress = character ? levelFromTotalExp(character.totalExp) : null;
  const [customizing, setCustomizing] = useState(false);
  const coins = Math.floor((character?.totalExp ?? 0) / 5) + 120;

  return (
    <Screen>
      <View style={styles.topBar}>
        <View style={styles.identity}>
          <View style={styles.profileIcon}>
            <Ionicons name="person" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle">{profile?.username ?? 'Rookie'}</AppText>
            <AppText muted>Level {character?.level ?? 1}</AppText>
            <ProgressBar value={progress ? progress.currentLevelExp / progress.nextLevelExp : 0} />
          </View>
        </View>
        <View style={styles.coins}>
          <Ionicons name="diamond" size={16} color={colors.coin} />
          <AppText style={styles.coinText}>{coins}</AppText>
        </View>
      </View>

      <Card>
        <Pressable onPress={() => setCustomizing(true)} style={({ pressed }) => [styles.hero, pressed && styles.pressed]}>
          <View style={styles.levelBadge}>
            <AppText style={styles.levelBadgeText}>LVL {character?.level ?? 1}</AppText>
          </View>
          <PixelAvatar />
          <AppText muted>Tap to customize cosmetics</AppText>
        </Pressable>
        <View>
          <AppText variant="subtitle">Total EXP: {character?.totalExp ?? 0}</AppText>
          <AppText muted>
            {progress ? `${progress.currentLevelExp} / ${progress.nextLevelExp} EXP to next level` : 'Loading progress'}
          </AppText>
        </View>
      </Card>

      <View style={styles.statsGrid}>
        {statRows.map(([label, key]) => {
          const exp = character?.[key] ?? 0;
          return (
            <View key={key} style={styles.statCard}>
              <AppText variant="caption" style={{ color: colors.primary }}>
                {label}
              </AppText>
              <AppText variant="metric">Lv {statLevel(exp)}</AppText>
              <AppText muted>{exp} EXP</AppText>
              <ProgressBar value={(exp % 100) / 100} />
            </View>
          );
        })}
      </View>

      <CustomizationModal visible={customizing} onClose={() => setCustomizing(false)} />
    </Screen>
  );
}

const PixelAvatar = () => (
  <View style={styles.avatarWrap}>
    <View style={styles.aura} />
    <View style={styles.head} />
    <View style={styles.neck} />
    <View style={styles.body}>
      <View style={styles.chestGlow} />
    </View>
    <View style={styles.armLeft} />
    <View style={styles.armRight} />
    <View style={styles.legLeft} />
    <View style={styles.legRight} />
    <View style={styles.shoeLeft} />
    <View style={styles.shoeRight} />
  </View>
);

const CustomizationModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const categories = ['Head', 'Shirt', 'Pants', 'Shoes'];
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <AppText variant="caption" style={{ color: colors.primary }}>
                Cosmetics
              </AppText>
              <AppText variant="title">Customization</AppText>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          {categories.map((category, index) => (
            <View key={category} style={styles.cosmeticRow}>
              <View>
                <AppText variant="subtitle">{category}</AppText>
                <AppText muted>{index === 0 ? 'Starter option unlocked' : 'More cosmetics locked'}</AppText>
              </View>
              <View style={[styles.lockPill, index === 0 && styles.unlockedPill]}>
                <AppText style={styles.lockText}>{index === 0 ? 'Unlocked' : 'Locked'}</AppText>
              </View>
            </View>
          ))}
          <PrimaryButton label="Close" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  profileIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  coins: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.warning,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.cardHigh
  },
  coinText: {
    color: colors.coin,
    fontWeight: '900'
  },
  hero: {
    minHeight: 276,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    gap: spacing.sm
  },
  pressed: {
    opacity: 0.88
  },
  levelBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    ...shadows.cyanGlow
  },
  levelBadgeText: {
    color: colors.black,
    fontWeight: '900'
  },
  avatarWrap: {
    width: 170,
    height: 210,
    alignItems: 'center'
  },
  aura: {
    position: 'absolute',
    bottom: 10,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: colors.secondarySoft
  },
  head: {
    width: 54,
    height: 54,
    borderRadius: 16,
    backgroundColor: '#F0C9A0',
    borderWidth: 3,
    borderColor: colors.primary,
    marginTop: 20,
    zIndex: 4
  },
  neck: {
    width: 22,
    height: 16,
    backgroundColor: '#D6A77E',
    zIndex: 3
  },
  body: {
    width: 76,
    height: 78,
    borderRadius: 14,
    backgroundColor: colors.cardSoft,
    borderWidth: 3,
    borderColor: colors.primary,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chestGlow: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary
  },
  armLeft: {
    position: 'absolute',
    top: 96,
    left: 30,
    width: 28,
    height: 82,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.primaryDim
  },
  armRight: {
    position: 'absolute',
    top: 96,
    right: 30,
    width: 28,
    height: 82,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    borderWidth: 2,
    borderColor: colors.primaryDim
  },
  legLeft: {
    position: 'absolute',
    bottom: 24,
    left: 58,
    width: 26,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#172A4A',
    borderWidth: 2,
    borderColor: colors.borderDim
  },
  legRight: {
    position: 'absolute',
    bottom: 24,
    right: 58,
    width: 26,
    height: 72,
    borderRadius: 10,
    backgroundColor: '#172A4A',
    borderWidth: 2,
    borderColor: colors.borderDim
  },
  shoeLeft: {
    position: 'absolute',
    bottom: 8,
    left: 50,
    width: 38,
    height: 18,
    borderRadius: 8,
    backgroundColor: colors.primary
  },
  shoeRight: {
    position: 'absolute',
    bottom: 8,
    right: 50,
    width: 38,
    height: 18,
    borderRadius: 8,
    backgroundColor: colors.primary
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  statCard: {
    width: '48.4%',
    minHeight: 124,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.xs
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 4, 10, 0.78)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderDim
  },
  cosmeticRow: {
    minHeight: 74,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  lockPill: {
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.secondarySoft,
    borderWidth: 1,
    borderColor: colors.secondary
  },
  unlockedPill: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary
  },
  lockText: {
    fontWeight: '800'
  }
});
