import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadows } from '@/constants/theme';
import { CosmeticItem } from '@/types/domain';

export const CosmeticThumbnail = ({ item, compact = false }: { item: CosmeticItem; compact?: boolean }) => (
  <View style={[styles.preview, compact && styles.compact]}>
    <View style={[styles.glow, { backgroundColor: item.colors.primary }]} />
    {item.category === 'shirt' && <Shirt item={item} />}
    {item.category === 'pants' && <Pants item={item} />}
    {item.category === 'shoes' && <Shoes item={item} />}
    {item.category === 'head' && <Head item={item} />}
    {item.category === 'frame' && <Frame item={item} />}
    {item.category === 'accessory' && <Accessory item={item} />}
  </View>
);

const Shirt = ({ item }: { item: CosmeticItem }) => (
  <View style={[styles.shirt, { backgroundColor: item.colors.primary, borderColor: item.colors.secondary }]}>
    <View style={[styles.shirtStripe, { backgroundColor: item.colors.accent ?? colors.primary }]} />
  </View>
);

const Pants = ({ item }: { item: CosmeticItem }) => (
  <View style={styles.pantsWrap}>
    <View style={[styles.pantLeg, { backgroundColor: item.colors.primary, borderColor: item.colors.secondary }]} />
    <View style={[styles.pantLeg, { backgroundColor: item.colors.primary, borderColor: item.colors.secondary }]} />
  </View>
);

const Shoes = ({ item }: { item: CosmeticItem }) => (
  <View style={styles.shoesWrap}>
    <View style={[styles.shoe, { backgroundColor: item.colors.primary, borderColor: item.colors.secondary }]} />
    <View style={[styles.shoe, { backgroundColor: item.colors.primary, borderColor: item.colors.secondary }]} />
  </View>
);

const Head = ({ item }: { item: CosmeticItem }) => (
  <View style={[styles.headband, { backgroundColor: item.colors.primary, borderColor: item.colors.secondary }]} />
);

const Frame = ({ item }: { item: CosmeticItem }) => (
  <View style={[styles.frame, { borderColor: item.colors.primary }]}>
    <View style={[styles.frameCore, { borderColor: item.colors.secondary }]} />
  </View>
);

const Accessory = ({ item }: { item: CosmeticItem }) => (
  <Ionicons name="sparkles" size={42} color={item.colors.primary} />
);

const styles = StyleSheet.create({
  preview: {
    height: 126,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  compact: {
    height: 72,
    width: 72,
    borderRadius: radii.md
  },
  glow: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    opacity: 0.18
  },
  shirt: {
    width: 70,
    height: 76,
    borderRadius: 18,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.cyanGlow
  },
  shirtStripe: {
    width: 42,
    height: 8,
    borderRadius: 4
  },
  pantsWrap: {
    flexDirection: 'row',
    gap: 8
  },
  pantLeg: {
    width: 34,
    height: 86,
    borderRadius: 14,
    borderWidth: 3
  },
  shoesWrap: {
    flexDirection: 'row',
    gap: 8
  },
  shoe: {
    width: 50,
    height: 26,
    borderRadius: 13,
    borderWidth: 3
  },
  headband: {
    width: 90,
    height: 28,
    borderRadius: 14,
    borderWidth: 3,
    ...shadows.cyanGlow
  },
  frame: {
    width: 92,
    height: 92,
    borderRadius: 28,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.purpleGlow
  },
  frameCore: {
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 2
  }
});
