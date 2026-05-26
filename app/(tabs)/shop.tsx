import { useMemo, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/appStore';

type ShopItem = {
  name: string;
  type: string;
  price: number;
  section: 'Featured' | 'Outfits' | 'Shoes' | 'Accessories';
};

const shopItems: ShopItem[] = [
  { name: 'Neon Runner Shirt', type: 'Shirt', price: 250, section: 'Featured' },
  { name: 'Shadow Training Pants', type: 'Pants', price: 300, section: 'Outfits' },
  { name: 'Starter Sneakers', type: 'Shoes', price: 150, section: 'Shoes' },
  { name: 'Cyan Headband', type: 'Head', price: 100, section: 'Accessories' },
  { name: 'Purple Aura Frame', type: 'Frame', price: 500, section: 'Featured' }
];

const sections: ShopItem['section'][] = ['Featured', 'Outfits', 'Shoes', 'Accessories'];

export default function ShopScreen() {
  const totalExp = useAppStore((state) => state.character?.totalExp ?? 0);
  const [owned, setOwned] = useState<string[]>([]);
  const coins = Math.floor(totalExp / 5) + 120;
  const grouped = useMemo(
    () => sections.map((section) => ({ section, items: shopItems.filter((item) => item.section === section) })),
    []
  );

  const buy = (item: ShopItem) => {
    if (coins < item.price) {
      Alert.alert('Not enough coins', 'Keep completing physical activities and daily quests to earn more.');
      return;
    }
    setOwned((current) => [...current, item.name]);
    Alert.alert('Item unlocked', `${item.name} is ready in customization.`);
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
              const isOwned = owned.includes(item.name);
              const canBuy = coins >= item.price && !isOwned;
              return (
                <Card key={item.name}>
                  <View style={styles.preview}>
                    <View style={styles.pixelBody} />
                    <View style={styles.pixelGlow} />
                  </View>
                  <AppText variant="subtitle">{item.name}</AppText>
                  <AppText muted>{item.type}</AppText>
                  <View style={styles.priceRow}>
                    <Ionicons name="diamond" size={14} color={colors.coin} />
                    <AppText style={styles.price}>{item.price}</AppText>
                  </View>
                  <PrimaryButton
                    label={isOwned ? 'Owned' : canBuy ? 'Buy' : 'Not enough coins'}
                    onPress={() => buy(item)}
                    disabled={!canBuy}
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
  preview: {
    height: 116,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  pixelBody: {
    width: 58,
    height: 74,
    borderRadius: radii.sm,
    backgroundColor: colors.secondary,
    borderWidth: 3,
    borderColor: colors.primary,
    ...shadows.cyanGlow
  },
  pixelGlow: {
    position: 'absolute',
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: colors.secondarySoft
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  price: {
    color: colors.coin,
    fontWeight: '900'
  }
});
