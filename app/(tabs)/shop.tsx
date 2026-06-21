import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { CosmeticThumbnail, RARITY_COLORS } from '@/components/CosmeticThumbnail';
import { Screen } from '@/components/Screen';
import { CATEGORY_LABELS, EARNED_COSMETICS, SHOP_COSMETICS } from '@/constants/cosmetics';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { equipCosmetic, purchaseCosmetic } from '@/services/cosmeticService';
import { useAppStore } from '@/store/appStore';
import { CosmeticCategory, CosmeticItem, EquippedCosmetics } from '@/types/domain';
import {
  formatRotationRemaining,
  getCosmeticUnlockProgress,
  getShopRotation
} from '@/utils/cosmetics';

type ShopSection = {
  id: string;
  title: string;
  subtitle?: string;
  accent: string;
  items: CosmeticItem[];
};

export default function ShopScreen() {
  const character = useAppStore((state) => state.character);
  const activities = useAppStore((state) => state.activities);
  const achievements = useAppStore((state) => state.achievements);
  const personalRecords = useAppStore((state) => state.personalRecords);
  const streaks = useAppStore((state) => state.progressionStreaks);
  const presentation = useAppStore((state) => state.characterPresentation);
  const ownedCosmetics = useAppStore((state) => state.ownedCosmetics);
  const equippedCosmetics = useAppStore((state) => state.equippedCosmetics);
  const setCharacter = useAppStore((state) => state.setCharacter);
  const setEquippedCosmetics = useAppStore((state) => state.setEquippedCosmetics);
  const addOwnedCosmetic = useAppStore((state) => state.addOwnedCosmetic);
  const [userId, setUserId] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<CosmeticItem | null>(null);
  const [clock, setClock] = useState(() => new Date());
  const ownedIds = useMemo(() => new Set(ownedCosmetics.map((item) => item.itemId)), [ownedCosmetics]);
  const coins = character?.coins ?? 0;
  const level = character?.level ?? 1;
  const rotation = useMemo(() => getShopRotation(clock), [clock]);
  const progressContext = useMemo(
    () => ({
      activities,
      achievements,
      personalRecords,
      streaks,
      characterLevel: level,
      fitnessClass: presentation?.fitnessClass
    }),
    [achievements, activities, level, personalRecords, presentation?.fitnessClass, streaks]
  );

  const sections = useMemo<ShopSection[]>(() => {
    const permanentCategories: CosmeticCategory[] = ['head', 'shirt', 'pants', 'shoes', 'accessory', 'frame', 'aura'];
    const activeRotationIds = new Set([...rotation.featured, ...rotation.seasonal].map((item) => item.id));
    const ownedRotationItems = SHOP_COSMETICS.filter((item, index, all) =>
        item.availability !== 'permanent' &&
        ownedIds.has(item.id) &&
        !activeRotationIds.has(item.id) &&
        all.findIndex((candidate) => candidate.id === item.id) === index
      );
    return [
      {
        id: 'featured-rotation',
        title: 'Featured',
        subtitle: `Refreshes in ${formatRotationRemaining(rotation.endsAt, clock)}`,
        accent: colors.primary,
        items: rotation.featured
      },
      {
        id: 'seasonal-rotation',
        title: 'Seasonal Rotation',
        subtitle: `Week ${rotation.rotationIndex + 1} selection`,
        accent: colors.secondary,
        items: rotation.seasonal
      },
      {
        id: 'earned-cosmetics',
        title: 'Earned Cosmetics',
        subtitle: 'Milestones and personal records',
        accent: colors.success,
        items: EARNED_COSMETICS
      },
      {
        id: 'owned-rotation-archive',
        title: 'Owned Rotation Items',
        subtitle: 'Kept after their storefront rotation ends',
        accent: colors.success,
        items: ownedRotationItems
      },
      ...permanentCategories.map((category) => ({
        id: `permanent-${category}`,
        title: CATEGORY_LABELS[category],
        subtitle: 'Permanent catalog',
        accent: colors.border,
        items: rotation.permanent.filter((item) => item.category === category)
      }))
    ].filter((section) => section.items.length > 0);
  }, [clock, ownedIds, rotation]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    const timer = setInterval(() => setClock(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const buy = async (item: CosmeticItem) => {
    if (!userId || !character || item.unlockSource.type !== 'shop') return;
    if (ownedIds.has(item.id)) return;
    if (level < (item.unlockLevel ?? 1)) {
      Alert.alert('Level required', `Reach Level ${item.unlockLevel} to buy this cosmetic.`);
      return;
    }
    if (coins < item.price) {
      Alert.alert('Not enough coins', 'Complete activities and daily quests to earn more Gold.');
      return;
    }

    setPurchasingId(item.id);
    try {
      const result = await purchaseCosmetic(userId, item, coins);
      setCharacter({ ...character, coins: result.coins });
      addOwnedCosmetic(result.ownedCosmetic);
      Alert.alert('Item unlocked', `${item.name} is now available in your wardrobe.`);
    } catch (caught) {
      Alert.alert('Purchase failed', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setPurchasingId(null);
    }
  };

  const equip = async (item: CosmeticItem) => {
    if (!userId || !ownedIds.has(item.id)) return;
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
    <Screen>
      <View style={styles.header}>
        <View>
          <AppText variant="caption" style={styles.neon}>Gold catalog</AppText>
          <AppText variant="title">Shop</AppText>
        </View>
        <View style={styles.coinPill}>
          <Ionicons name="ellipse" size={16} color={colors.coin} />
          <AppText style={styles.coinText}>{coins}</AppText>
        </View>
      </View>

      <View style={styles.rotationBanner}>
        <Ionicons name="time-outline" size={17} color={colors.primary} />
        <View style={{ flex: 1 }}>
          <AppText style={styles.rotationTitle}>Weekly storefront rotation</AppText>
          <AppText variant="caption" muted>
            Featured and seasonal items refresh in {formatRotationRemaining(rotation.endsAt, clock)}. Owned items stay yours.
          </AppText>
        </View>
      </View>

      {sections.map((section) => (
        <View key={section.id} style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionMarker, { backgroundColor: section.accent }]} />
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle">{section.title}</AppText>
              {section.subtitle && <AppText variant="caption" muted>{section.subtitle}</AppText>}
            </View>
          </View>
          <View style={styles.grid}>
            {section.items.map((item) => {
              const isOwned = ownedIds.has(item.id) || item.unlockSource.type === 'starter';
              const isEquipped = getEquippedId(equippedCosmetics, item.category) === item.id;
              const earnedItem = item.availability === 'earned';
              const levelLocked = !earnedItem && level < (item.unlockLevel ?? 1);
              const canBuy = item.unlockSource.type === 'shop' && coins >= item.price && !isOwned && !levelLocked;
              const canEquip = earnedItem && isOwned && !isEquipped;
              const progress = getCosmeticUnlockProgress(item, progressContext);
              const stateLabel = isEquipped
                ? 'Equipped'
                : isOwned
                  ? earnedItem ? 'Earned' : 'Owned'
                  : earnedItem
                    ? 'Locked'
                    : levelLocked
                      ? `Lv ${item.unlockLevel}`
                      : canBuy
                        ? 'Buy'
                        : 'Need Gold';

              return (
                <View
                  key={`${section.id}-${item.id}`}
                  style={[styles.itemCard, { borderColor: RARITY_COLORS[item.rarity] }, (levelLocked || earnedItem && !isOwned) && styles.lockedCard]}
                >
                  <Pressable onPress={() => setSelectedItem(item)} style={styles.thumbnailWrap}>
                    <CosmeticThumbnail item={item} compact />
                    <StatusPill label={stateLabel} color={statusColor(item, isOwned, isEquipped)} />
                  </Pressable>
                  <AppText style={styles.itemName} numberOfLines={2}>{item.name}</AppText>
                  <AppText variant="caption" style={[styles.rarity, { color: RARITY_COLORS[item.rarity] }]}>
                    {capitalize(item.rarity)}
                  </AppText>

                  {earnedItem ? (
                    <View style={styles.earnedProgress}>
                      <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: `${progress.ratio * 100}%` }]} />
                      </View>
                      <AppText variant="caption" style={styles.progressText} numberOfLines={1}>
                        {isOwned ? 'Requirement complete' : progress.label}
                      </AppText>
                    </View>
                  ) : (
                    <View style={styles.priceRow}>
                      <Ionicons name="ellipse" size={11} color={colors.coin} />
                      <AppText style={styles.price}>{item.price}</AppText>
                    </View>
                  )}

                  <Pressable
                    onPress={() => canEquip ? equip(item) : buy(item)}
                    disabled={(!canBuy && !canEquip) || purchasingId === item.id || equippingId === item.id}
                    style={({ pressed }) => [
                      styles.actionButton,
                      (canBuy || canEquip) ? styles.actionButtonActive : styles.actionButtonDisabled,
                      pressed && (canBuy || canEquip) && styles.pressed
                    ]}
                  >
                    <AppText style={[(canBuy || canEquip) ? styles.actionTextActive : styles.actionText]}>
                      {purchasingId === item.id ? 'Buying' : equippingId === item.id ? 'Equipping' : canEquip ? 'Equip' : stateLabel}
                    </AppText>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ))}

      <ItemDetailModal
        item={selectedItem}
        owned={selectedItem ? ownedIds.has(selectedItem.id) : false}
        equipped={selectedItem ? getEquippedId(equippedCosmetics, selectedItem.category) === selectedItem.id : false}
        progress={selectedItem ? getCosmeticUnlockProgress(selectedItem, progressContext) : null}
        onClose={() => setSelectedItem(null)}
      />
    </Screen>
  );
}

const ItemDetailModal = ({ item, owned, equipped, progress, onClose }: {
  item: CosmeticItem | null;
  owned: boolean;
  equipped: boolean;
  progress: ReturnType<typeof getCosmeticUnlockProgress> | null;
  onClose: () => void;
}) => (
  <Modal visible={Boolean(item)} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      {item && (
        <View style={[styles.detailCard, { borderColor: RARITY_COLORS[item.rarity] }]}>
          <View style={styles.detailHeader}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" style={{ color: RARITY_COLORS[item.rarity] }}>{capitalize(item.rarity)}</AppText>
              <AppText variant="title">{item.name}</AppText>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={21} color={colors.text} />
            </Pressable>
          </View>
          <CosmeticThumbnail item={item} />
          <AppText muted>{item.description}</AppText>
          <View style={styles.detailMeta}>
            <DetailChip label={CATEGORY_LABELS[item.category]} />
            <DetailChip label={equipped ? 'Equipped' : owned ? 'Owned' : item.unlockSource.label} />
          </View>
          {item.availability === 'earned' && progress && (
            <View style={styles.detailRequirement}>
              <AppText style={styles.requirementTitle}>Unlock requirement</AppText>
              <AppText muted>{item.unlockSource.label}</AppText>
              <AppText style={{ color: colors.success }}>{owned ? 'Earned' : progress.label}</AppText>
            </View>
          )}
        </View>
      )}
    </View>
  </Modal>
);

const StatusPill = ({ label, color }: { label: string; color: string }) => (
  <View style={[styles.statusPill, { borderColor: color }]}>
    <AppText style={[styles.statusText, { color }]}>{label}</AppText>
  </View>
);

const DetailChip = ({ label }: { label: string }) => (
  <View style={styles.detailChip}><AppText variant="caption">{label}</AppText></View>
);

const getEquippedId = (equipment: EquippedCosmetics | null, category: CosmeticCategory) => {
  if (!equipment) return null;
  const key = `${category}ItemId` as keyof EquippedCosmetics;
  return equipment[key] as string | null;
};

const statusColor = (item: CosmeticItem, owned: boolean, equipped: boolean) =>
  equipped ? colors.primary : owned ? colors.success : RARITY_COLORS[item.rarity];

const capitalize = (value: string) => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  neon: { color: colors.primary },
  coinPill: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, borderRadius: radii.pill, borderWidth: 1, borderColor: colors.warning, backgroundColor: colors.cardHigh, paddingHorizontal: spacing.md, minHeight: 38 },
  coinText: { color: colors.coin, fontWeight: '900' },
  rotationBanner: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radii.md, borderWidth: 1, borderColor: colors.borderDim, backgroundColor: colors.cardHigh },
  rotationTitle: { fontWeight: '900' },
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs },
  sectionMarker: { width: 4, height: 34, borderRadius: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  itemCard: { width: '32%', minHeight: 232, borderRadius: radii.md, borderWidth: 1, backgroundColor: colors.card, padding: spacing.xs, gap: spacing.xs, ...shadows.card },
  lockedCard: { opacity: 0.88 },
  thumbnailWrap: { alignItems: 'center', gap: spacing.xs },
  itemName: { minHeight: 38, fontSize: 12, lineHeight: 16, fontWeight: '900', textAlign: 'center' },
  rarity: { textAlign: 'center', fontSize: 10, fontWeight: '800' },
  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.xs, minHeight: 24 },
  price: { color: colors.coin, fontWeight: '900', fontSize: 12 },
  earnedProgress: { minHeight: 24, gap: 3 },
  progressTrack: { height: 4, borderRadius: 2, backgroundColor: colors.black, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2, backgroundColor: colors.success },
  progressText: { fontSize: 8, textAlign: 'center', color: colors.muted },
  statusPill: { borderRadius: radii.pill, borderWidth: 1, paddingHorizontal: spacing.xs, paddingVertical: 2, backgroundColor: colors.cardHigh },
  statusText: { fontWeight: '900', fontSize: 9, textTransform: 'uppercase' },
  actionButton: { minHeight: 32, borderRadius: radii.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 'auto', paddingHorizontal: spacing.xs },
  actionButtonActive: { borderColor: colors.primary, backgroundColor: colors.primary },
  actionButtonDisabled: { borderColor: colors.borderDim, backgroundColor: colors.cardHigh },
  actionText: { color: colors.muted, fontWeight: '900', fontSize: 10, textAlign: 'center' },
  actionTextActive: { color: colors.black, fontWeight: '900', fontSize: 10, textAlign: 'center' },
  pressed: { transform: [{ scale: 0.97 }] },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(2, 4, 10, 0.84)', justifyContent: 'center', padding: spacing.lg },
  detailCard: { borderRadius: radii.lg, borderWidth: 2, backgroundColor: colors.card, padding: spacing.lg, gap: spacing.md, ...shadows.card },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  closeButton: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.borderDim, backgroundColor: colors.cardHigh, alignItems: 'center', justifyContent: 'center' },
  detailMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  detailChip: { borderRadius: radii.pill, borderWidth: 1, borderColor: colors.borderDim, backgroundColor: colors.cardHigh, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  detailRequirement: { gap: spacing.xs, borderTopWidth: 1, borderTopColor: colors.borderDim, paddingTop: spacing.md },
  requirementTitle: { color: colors.primary, fontWeight: '900' }
});
