import { useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { CosmeticThumbnail } from '@/components/CosmeticThumbnail';
import { Screen } from '@/components/Screen';
import { SHOP_COSMETICS } from '@/constants/cosmetics';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { purchaseCosmetic } from '@/services/cosmeticService';
import { useAppStore } from '@/store/appStore';
import { CosmeticCategory, CosmeticItem, EquippedCosmetics } from '@/types/domain';

const sections: CosmeticItem['shopSection'][] = [
  'Featured',
  'Shirts',
  'Pants',
  'Shoes',
  'Accessories',
  'Frames',
  'Rare'
];

export default function ShopScreen() {
  const character = useAppStore((state) => state.character);
  const ownedCosmetics = useAppStore((state) => state.ownedCosmetics);
  const equippedCosmetics = useAppStore((state) => state.equippedCosmetics);
  const setCharacter = useAppStore((state) => state.setCharacter);
  const addOwnedCosmetic = useAppStore((state) => state.addOwnedCosmetic);
  const [userId, setUserId] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const ownedIds = ownedCosmetics.map((item) => item.itemId);
  const coins = character?.coins ?? 0;
  const level = character?.level ?? 1;
  const grouped = useMemo(
    () =>
      sections
        .map((section) => ({ section, items: SHOP_COSMETICS.filter((item) => item.shopSection === section) }))
        .filter(({ items }) => items.length > 0),
    []
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const buy = async (item: CosmeticItem) => {
    if (!userId || !character) return;
    if (ownedIds.includes(item.id)) return;
    if (coins < item.price) {
      Alert.alert('Not enough coins', 'Complete activities and daily quests to earn more coins.');
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

  return (
    <Screen>
      <View style={styles.header}>
        <View>
          <AppText variant="caption" style={styles.neon}>
            Outfit shop
          </AppText>
          <AppText variant="title">Shop</AppText>
        </View>
        <View style={styles.coinPill}>
          <Ionicons name="ellipse" size={16} color={colors.coin} />
          <AppText style={styles.coinText}>{coins}</AppText>
        </View>
      </View>

      {grouped.map(({ section, items }) => (
        <View key={section} style={styles.section}>
          <View style={styles.sectionHeader}>
            <AppText variant="subtitle">{section}</AppText>
            <View style={styles.sectionLine} />
          </View>
          <View style={styles.grid}>
            {items.map((item) => {
              const isOwned = ownedIds.includes(item.id);
              const isEquipped = getEquippedId(equippedCosmetics, item.category) === item.id;
              const levelLocked = level < (item.unlockLevel ?? 1);
              const canBuy = coins >= item.price && !isOwned && !levelLocked;
              const stateLabel = isEquipped
                ? 'Equipped'
                : isOwned
                  ? 'Owned'
                  : levelLocked
                    ? 'Locked'
                    : canBuy
                      ? 'Buy'
                      : 'Need coins';
              return (
                <View key={item.id} style={[styles.itemCard, levelLocked && styles.lockedCard]}>
                  <View style={styles.thumbnailWrap}>
                    <CosmeticThumbnail item={item} compact />
                    <StatusPill
                      label={isEquipped ? 'Equipped' : isOwned ? 'Owned' : levelLocked ? `Lv ${item.unlockLevel}` : item.rarity}
                      color={isEquipped ? colors.primary : isOwned ? colors.success : levelLocked ? colors.secondary : rarityColor(item.rarity)}
                    />
                  </View>
                  <AppText style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </AppText>
                  <AppText variant="caption" style={[styles.rarity, { color: rarityColor(item.rarity) }]}>
                    {item.rarity}
                  </AppText>
                  <View style={styles.priceRow}>
                    <Ionicons name="ellipse" size={11} color={colors.coin} />
                    <AppText style={styles.price}>{item.price}</AppText>
                  </View>
                  {levelLocked && (
                    <AppText variant="caption" style={styles.lockText} numberOfLines={1}>
                      Unlocks Lv {item.unlockLevel}
                    </AppText>
                  )}
                  <Pressable
                    onPress={() => buy(item)}
                    disabled={!canBuy || purchasingId === item.id}
                    style={({ pressed }) => [
                      styles.buyButton,
                      canBuy ? styles.buyButtonActive : styles.buyButtonDisabled,
                      pressed && canBuy && styles.pressed
                    ]}
                  >
                    <AppText style={[styles.buyText, canBuy && styles.buyTextActive]}>
                      {purchasingId === item.id ? 'Buying' : stateLabel}
                    </AppText>
                  </Pressable>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </Screen>
  );
}

const StatusPill = ({ label, color }: { label: string; color: string }) => (
  <View style={[styles.statusPill, { borderColor: color }]}>
    <AppText style={[styles.statusText, { color }]}>{label}</AppText>
  </View>
);

const getEquippedId = (equipment: EquippedCosmetics | null, category: CosmeticCategory) => {
  if (!equipment) return null;
  const key = `${category}ItemId` as keyof EquippedCosmetics;
  return equipment[key] as string | null;
};

const rarityColor = (rarity: CosmeticItem['rarity']) => {
  switch (rarity) {
    case 'legendary':
      return colors.coin;
    case 'epic':
      return colors.secondary;
    case 'rare':
      return colors.primary;
    default:
      return colors.muted;
  }
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md
  },
  neon: {
    color: colors.primary
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: colors.cardHigh,
    paddingHorizontal: spacing.md,
    minHeight: 38
  },
  coinText: {
    color: colors.coin,
    fontWeight: '900'
  },
  section: {
    gap: spacing.sm
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.xs
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.borderDim
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs
  },
  itemCard: {
    width: '32%',
    minHeight: 214,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.card,
    padding: spacing.xs,
    gap: spacing.xs,
    ...shadows.card
  },
  lockedCard: {
    opacity: 0.86
  },
  thumbnailWrap: {
    alignItems: 'center',
    gap: spacing.xs
  },
  itemName: {
    minHeight: 38,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '900',
    textAlign: 'center'
  },
  rarity: {
    textAlign: 'center',
    fontSize: 10
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 20
  },
  price: {
    color: colors.coin,
    fontWeight: '900',
    fontSize: 12
  },
  statusPill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    backgroundColor: colors.cardHigh
  },
  statusText: {
    fontWeight: '900',
    fontSize: 10,
    textTransform: 'uppercase'
  },
  lockText: {
    color: colors.secondary,
    textAlign: 'center',
    fontSize: 9
  },
  buyButton: {
    minHeight: 32,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingHorizontal: spacing.xs
  },
  buyButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary
  },
  buyButtonDisabled: {
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh
  },
  buyText: {
    color: colors.muted,
    fontWeight: '900',
    fontSize: 11,
    textAlign: 'center'
  },
  buyTextActive: {
    color: colors.black
  },
  pressed: {
    transform: [{ scale: 0.97 }]
  }
});
