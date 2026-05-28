import { useEffect, useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { CosmeticThumbnail } from '@/components/CosmeticThumbnail';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { SHOP_COSMETICS } from '@/constants/cosmetics';
import { colors, radii, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { purchaseCosmetic } from '@/services/cosmeticService';
import { useAppStore } from '@/store/appStore';
import { CosmeticItem } from '@/types/domain';

const sections: CosmeticItem['shopSection'][] = ['Featured', 'Outfits', 'Shoes', 'Accessories'];

export default function ShopScreen() {
  const character = useAppStore((state) => state.character);
  const ownedCosmetics = useAppStore((state) => state.ownedCosmetics);
  const setCharacter = useAppStore((state) => state.setCharacter);
  const addOwnedCosmetic = useAppStore((state) => state.addOwnedCosmetic);
  const [userId, setUserId] = useState<string | null>(null);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const ownedIds = ownedCosmetics.map((item) => item.itemId);
  const coins = character?.coins ?? 0;
  const level = character?.level ?? 1;
  const grouped = useMemo(
    () => sections.map((section) => ({ section, items: SHOP_COSMETICS.filter((item) => item.shopSection === section) })),
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
          <Ionicons name="diamond" size={16} color={colors.coin} />
          <AppText style={styles.coinText}>{coins}</AppText>
        </View>
      </View>

      {grouped.map(({ section, items }) => (
        <View key={section} style={styles.section}>
          <AppText variant="subtitle">{section}</AppText>
          <View style={styles.grid}>
            {items.map((item) => {
              const isOwned = ownedIds.includes(item.id);
              const levelLocked = level < (item.unlockLevel ?? 1);
              const canBuy = coins >= item.price && !isOwned && !levelLocked;
              return (
                <Card key={item.id}>
                  <CosmeticThumbnail item={item} />
                  <View style={styles.itemHeader}>
                    <View style={{ flex: 1 }}>
                      <AppText variant="subtitle">{item.name}</AppText>
                      <AppText muted>{item.category.toUpperCase()}</AppText>
                    </View>
                    {isOwned && <StatusPill label="Owned" color={colors.success} />}
                    {levelLocked && <StatusPill label={`Lv ${item.unlockLevel}`} color={colors.secondary} />}
                  </View>
                  <AppText muted>{item.description}</AppText>
                  <View style={styles.priceRow}>
                    <Ionicons name="diamond" size={14} color={colors.coin} />
                    <AppText style={styles.price}>{item.price}</AppText>
                    {!isOwned && !levelLocked && coins < item.price && <AppText muted>Not enough coins</AppText>}
                  </View>
                  <PrimaryButton
                    label={
                      isOwned
                        ? 'Owned'
                        : levelLocked
                          ? `Unlocks at Level ${item.unlockLevel}`
                          : canBuy
                            ? purchasingId === item.id
                              ? 'Buying...'
                              : 'Buy'
                            : 'Not enough coins'
                    }
                    onPress={() => buy(item)}
                    disabled={!canBuy || purchasingId === item.id}
                    variant={canBuy ? 'primary' : 'secondary'}
                  />
                </Card>
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
  grid: {
    gap: spacing.md
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  price: {
    color: colors.coin,
    fontWeight: '900'
  },
  statusPill: {
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.cardHigh
  },
  statusText: {
    fontWeight: '900'
  }
});
