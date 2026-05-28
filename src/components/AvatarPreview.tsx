import { StyleSheet, View } from 'react-native';
import { colors, radii, shadows } from '@/constants/theme';
import { CosmeticItem, EquippedCosmetics } from '@/types/domain';
import { getEquippedItems } from '@/services/cosmeticService';

type AvatarPreviewProps = {
  equipment: EquippedCosmetics | null;
  size?: 'large' | 'small';
};

export const AvatarPreview = ({ equipment, size = 'large' }: AvatarPreviewProps) => {
  const equipped = getEquippedItems(equipment);
  const scale = size === 'large' ? 1 : 0.72;

  return (
    <View style={[styles.wrap, { transform: [{ scale }] }]}>
      <FrameGlow item={equipped.frame} />
      <View style={styles.aura} />
      <View style={styles.hairBack} />
      <View style={styles.head}>
        <View style={styles.eyeLeft} />
        <View style={styles.eyeRight} />
        <View style={styles.smile} />
      </View>
      <Headband item={equipped.head} />
      <View style={styles.neck} />
      <View style={[styles.torso, { backgroundColor: equipped.shirt?.colors.primary ?? colors.cardSoft, borderColor: equipped.shirt?.colors.secondary ?? colors.primary }]}>
        <View style={[styles.torsoPanel, { backgroundColor: equipped.shirt?.colors.accent ?? colors.primary }]} />
      </View>
      <View style={[styles.arm, styles.armLeft]} />
      <View style={[styles.arm, styles.armRight]} />
      <View style={styles.waist} />
      <View style={styles.legs}>
        <View style={[styles.leg, { backgroundColor: equipped.pants?.colors.primary ?? '#172A4A', borderColor: equipped.pants?.colors.secondary ?? colors.borderDim }]} />
        <View style={[styles.leg, { backgroundColor: equipped.pants?.colors.primary ?? '#172A4A', borderColor: equipped.pants?.colors.secondary ?? colors.borderDim }]} />
      </View>
      <View style={styles.shoes}>
        <View style={[styles.shoe, { backgroundColor: equipped.shoes?.colors.primary ?? colors.primary, borderColor: equipped.shoes?.colors.secondary ?? colors.white }]} />
        <View style={[styles.shoe, { backgroundColor: equipped.shoes?.colors.primary ?? colors.primary, borderColor: equipped.shoes?.colors.secondary ?? colors.white }]} />
      </View>
      {equipped.accessory && <View style={[styles.accessory, { backgroundColor: equipped.accessory.colors.primary }]} />}
    </View>
  );
};

const Headband = ({ item }: { item: CosmeticItem | null }) => (
  <View style={[styles.headband, { backgroundColor: item?.colors.primary ?? colors.primary }]} />
);

const FrameGlow = ({ item }: { item: CosmeticItem | null }) =>
  item ? <View style={[styles.frameGlow, { borderColor: item.colors.primary, backgroundColor: item.colors.secondary }]} /> : null;

const styles = StyleSheet.create({
  wrap: {
    width: 210,
    height: 300,
    alignItems: 'center'
  },
  frameGlow: {
    position: 'absolute',
    top: 24,
    width: 190,
    height: 240,
    borderRadius: 44,
    borderWidth: 3,
    opacity: 0.42,
    ...shadows.purpleGlow
  },
  aura: {
    position: 'absolute',
    top: 42,
    width: 170,
    height: 220,
    borderRadius: 60,
    backgroundColor: colors.secondarySoft
  },
  hairBack: {
    position: 'absolute',
    top: 24,
    width: 78,
    height: 76,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    backgroundColor: '#17213B',
    zIndex: 3
  },
  head: {
    width: 64,
    height: 70,
    borderRadius: 26,
    backgroundColor: '#F3CBA9',
    borderWidth: 2,
    borderColor: '#FFE2C7',
    marginTop: 36,
    zIndex: 5,
    alignItems: 'center'
  },
  eyeLeft: {
    position: 'absolute',
    top: 28,
    left: 17,
    width: 7,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#0A1428'
  },
  eyeRight: {
    position: 'absolute',
    top: 28,
    right: 17,
    width: 7,
    height: 10,
    borderRadius: 4,
    backgroundColor: '#0A1428'
  },
  smile: {
    position: 'absolute',
    bottom: 17,
    width: 18,
    height: 7,
    borderBottomWidth: 2,
    borderColor: '#9E5D62',
    borderRadius: 10
  },
  headband: {
    position: 'absolute',
    top: 48,
    width: 74,
    height: 10,
    borderRadius: 8,
    zIndex: 6,
    ...shadows.cyanGlow
  },
  neck: {
    width: 24,
    height: 16,
    backgroundColor: '#D6A77E',
    zIndex: 4
  },
  torso: {
    width: 88,
    height: 86,
    borderRadius: 22,
    borderWidth: 3,
    zIndex: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  torsoPanel: {
    width: 42,
    height: 42,
    borderRadius: 16,
    opacity: 0.88
  },
  arm: {
    position: 'absolute',
    top: 120,
    width: 32,
    height: 94,
    borderRadius: 18,
    backgroundColor: '#F3CBA9',
    borderWidth: 2,
    borderColor: '#FFE2C7',
    zIndex: 2
  },
  armLeft: {
    left: 40,
    transform: [{ rotate: '7deg' }]
  },
  armRight: {
    right: 40,
    transform: [{ rotate: '-7deg' }]
  },
  waist: {
    width: 72,
    height: 16,
    backgroundColor: colors.primaryDim,
    borderRadius: 8,
    zIndex: 5
  },
  legs: {
    flexDirection: 'row',
    gap: 10,
    zIndex: 3
  },
  leg: {
    width: 34,
    height: 82,
    borderRadius: 14,
    borderWidth: 2
  },
  shoes: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 5
  },
  shoe: {
    width: 48,
    height: 20,
    borderRadius: radii.pill,
    borderWidth: 2
  },
  accessory: {
    position: 'absolute',
    top: 102,
    right: 42,
    width: 18,
    height: 18,
    borderRadius: 9
  }
});
