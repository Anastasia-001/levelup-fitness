import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { AvatarPreview } from '@/components/AvatarPreview';
import { CosmeticThumbnail } from '@/components/CosmeticThumbnail';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { CATEGORY_LABELS, COSMETIC_CATEGORIES, visibleCosmeticsForCategory } from '@/constants/cosmetics';
import { colors, radii, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { equipCosmetic } from '@/services/cosmeticService';
import { useAppStore } from '@/store/appStore';
import { CosmeticCategory, CosmeticItem } from '@/types/domain';
import { levelFromTotalExp, statLevel } from '@/utils/exp';

const statRows = [
  ['Endurance', 'enduranceExp'],
  ['Speed', 'speedExp'],
  ['Strength', 'strengthExp'],
  ['Consistency', 'consistencyExp']
] as const;

export default function CharacterScreen() {
  const character = useAppStore((state) => state.character);
  const profile = useAppStore((state) => state.profile);
  const equippedCosmetics = useAppStore((state) => state.equippedCosmetics);
  const progress = character ? levelFromTotalExp(character.totalExp) : null;
  const [customizing, setCustomizing] = useState(false);

  return (
    <Screen scroll={false}>
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
          <AppText style={styles.coinText}>{character?.coins ?? 0}</AppText>
        </View>
      </View>

      <Pressable onPress={() => setCustomizing(true)} style={({ pressed }) => [styles.hero, pressed && styles.pressed]}>
        <View style={styles.sceneGlow} />
        <View style={styles.floorGlow} />
        <View style={styles.characterStage}>
          <View style={styles.levelBadge}>
            <AppText style={styles.levelBadgeText}>LVL {character?.level ?? 1}</AppText>
          </View>
          <AvatarPreview equipment={equippedCosmetics} />
        </View>
        <View style={styles.progressPanel}>
          <View style={{ flex: 1 }}>
            <AppText variant="subtitle">Total EXP: {character?.totalExp ?? 0}</AppText>
            <AppText muted>
              {progress ? `${progress.currentLevelExp} / ${progress.nextLevelExp} EXP to next level` : 'Loading progress'}
            </AppText>
          </View>
          <AppText muted>Tap to open wardrobe</AppText>
        </View>
      </Pressable>

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

      <WardrobeModal visible={customizing} onClose={() => setCustomizing(false)} />
    </Screen>
  );
}

const WardrobeModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const character = useAppStore((state) => state.character);
  const ownedCosmetics = useAppStore((state) => state.ownedCosmetics);
  const equippedCosmetics = useAppStore((state) => state.equippedCosmetics);
  const setEquippedCosmetics = useAppStore((state) => state.setEquippedCosmetics);
  const [userId, setUserId] = useState<string | null>(null);
  const [category, setCategory] = useState<CosmeticCategory>('head');
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const ownedIds = useMemo(() => ownedCosmetics.map((item) => item.itemId), [ownedCosmetics]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const currentEquipped = getEquippedId(equippedCosmetics, category);
  const items = visibleCosmeticsForCategory(category);

  const canUseItem = (item: CosmeticItem) =>
    item.price === 0 || ownedIds.includes(item.id);

  const equip = async (item: CosmeticItem) => {
    if (!userId || !canUseItem(item)) return;
    setEquippingId(item.id);
    try {
      setEquippedCosmetics(await equipCosmetic(userId, item.category, item.id));
    } catch (caught) {
      Alert.alert('Could not equip item', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setEquippingId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <AppText variant="caption" style={{ color: colors.primary }}>
                Equipment
              </AppText>
              <AppText variant="title">Wardrobe</AppText>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.modalPreview}>
            <AvatarPreview equipment={equippedCosmetics} size="small" />
          </View>

          <View style={styles.categoryStrip}>
            {COSMETIC_CATEGORIES.map((nextCategory) => (
              <Pressable
                key={nextCategory}
                onPress={() => setCategory(nextCategory)}
                style={[styles.categoryPill, category === nextCategory && styles.categoryPillActive]}
              >
                <AppText style={category === nextCategory && styles.categoryPillText}>
                  {CATEGORY_LABELS[nextCategory]}
                </AppText>
              </Pressable>
            ))}
          </View>

          <ScrollView contentContainerStyle={styles.itemList} showsVerticalScrollIndicator={false}>
            {items.map((item) => {
              const owned = canUseItem(item);
              const equipped = currentEquipped === item.id;
              const levelLocked = (character?.level ?? 1) < (item.unlockLevel ?? 1);
              return (
                <View key={item.id} style={styles.cosmeticRow}>
                  <CosmeticThumbnail item={item} compact />
                  <View style={{ flex: 1 }}>
                    <AppText variant="subtitle">{item.name}</AppText>
                    <AppText muted>
                      {equipped
                        ? 'Equipped'
                        : owned
                          ? 'Owned'
                          : levelLocked
                            ? `Unlocks at Level ${item.unlockLevel}`
                            : 'Buy in Shop'}
                    </AppText>
                  </View>
                  <PrimaryButton
                    label={equipped ? 'Equipped' : owned ? (equippingId === item.id ? 'Equipping...' : 'Equip') : 'Locked'}
                    onPress={() => equip(item)}
                    disabled={!owned || equipped || equippingId === item.id}
                    variant={owned && !equipped ? 'primary' : 'secondary'}
                    style={styles.equipButton}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const getEquippedId = (
  equipment: ReturnType<typeof useAppStore.getState>['equippedCosmetics'],
  category: CosmeticCategory
) => {
  if (!equipment) return null;
  const key = `${category}ItemId` as keyof typeof equipment;
  return equipment[key] as string | null;
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
    flex: 1,
    minHeight: 0,
    borderRadius: radii.lg,
    backgroundColor: 'rgba(2, 4, 10, 0.34)',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm
  },
  sceneGlow: {
    position: 'absolute',
    top: 18,
    width: 230,
    height: 260,
    borderRadius: 120,
    backgroundColor: colors.secondarySoft
  },
  floorGlow: {
    position: 'absolute',
    bottom: 70,
    width: 250,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primarySoft,
    transform: [{ scaleX: 1.24 }]
  },
  characterStage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center'
  },
  progressPanel: {
    width: '100%',
    minHeight: 58,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: 'rgba(11, 22, 40, 0.72)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
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
    zIndex: 10
  },
  levelBadgeText: {
    color: colors.black,
    fontWeight: '900'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    flexShrink: 0
  },
  statCard: {
    width: '48.4%',
    minHeight: 96,
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
    height: '92%',
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
  modalPreview: {
    height: 190,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.black,
    overflow: 'hidden'
  },
  categoryStrip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs
  },
  categoryPill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  categoryPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  categoryPillText: {
    color: colors.primary,
    fontWeight: '900'
  },
  itemList: {
    gap: spacing.sm,
    paddingBottom: spacing.lg
  },
  cosmeticRow: {
    minHeight: 94,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  equipButton: {
    minWidth: 98,
    minHeight: 44,
    paddingHorizontal: spacing.sm
  }
});
