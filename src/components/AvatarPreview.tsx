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
  const scale = size === 'large' ? 1.15 : 0.64;

  return (
    <View style={[styles.wrap, { transform: [{ scale }] }]}>
      <FrameGlow item={equipped.frame} />
      <View style={styles.aura} />
      <View style={styles.motionLineLeft} />
      <View style={styles.motionLineRight} />
      <View style={styles.hairBack} />
      <View style={styles.hairRibbon} />
      <View style={styles.head}>
        <View style={styles.fringe} />
        <View style={styles.sideLockLeft} />
        <View style={styles.sideLockRight} />
        <View style={styles.hairShine} />
        <View style={styles.eyeLeft} />
        <View style={styles.eyeRight} />
        <View style={styles.eyeSparkLeft} />
        <View style={styles.eyeSparkRight} />
        <View style={styles.cheekLeft} />
        <View style={styles.cheekRight} />
        <View style={styles.smile} />
      </View>
      <Headband item={equipped.head} />
      <View style={styles.neck} />
      <View style={[styles.torso, { backgroundColor: equipped.shirt?.colors.primary ?? colors.cardSoft, borderColor: equipped.shirt?.colors.secondary ?? colors.primary }]}>
        <View style={styles.collar} />
        <View style={[styles.torsoPanel, { backgroundColor: equipped.shirt?.colors.accent ?? colors.primary }]} />
        <View style={styles.torsoHighlight} />
      </View>
      <View style={[styles.arm, styles.armLeft]} />
      <View style={[styles.arm, styles.armRight]} />
      <View style={styles.waist} />
      <View style={styles.legs}>
        <View style={[styles.leg, { backgroundColor: equipped.pants?.colors.primary ?? '#172A4A', borderColor: equipped.pants?.colors.secondary ?? colors.borderDim }]}>
          <View style={[styles.legStripe, { backgroundColor: equipped.pants?.colors.accent ?? colors.primary }]} />
        </View>
        <View style={[styles.leg, { backgroundColor: equipped.pants?.colors.primary ?? '#172A4A', borderColor: equipped.pants?.colors.secondary ?? colors.borderDim }]}>
          <View style={[styles.legStripe, { backgroundColor: equipped.pants?.colors.accent ?? colors.primary }]} />
        </View>
      </View>
      <View style={styles.shoes}>
        <View style={[styles.shoe, { backgroundColor: equipped.shoes?.colors.primary ?? colors.primary, borderColor: equipped.shoes?.colors.secondary ?? colors.white }]}>
          <View style={styles.shoeSole} />
        </View>
        <View style={[styles.shoe, { backgroundColor: equipped.shoes?.colors.primary ?? colors.primary, borderColor: equipped.shoes?.colors.secondary ?? colors.white }]}>
          <View style={styles.shoeSole} />
        </View>
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
    width: 230,
    height: 330,
    alignItems: 'center'
  },
  frameGlow: {
    position: 'absolute',
    top: 30,
    width: 208,
    height: 260,
    borderRadius: 58,
    borderWidth: 3,
    opacity: 0.42,
    ...shadows.purpleGlow
  },
  aura: {
    position: 'absolute',
    top: 44,
    width: 188,
    height: 250,
    borderRadius: 74,
    backgroundColor: colors.secondarySoft
  },
  motionLineLeft: {
    position: 'absolute',
    top: 72,
    left: 26,
    width: 4,
    height: 112,
    borderRadius: 4,
    backgroundColor: 'rgba(53, 246, 255, 0.18)',
    transform: [{ rotate: '18deg' }]
  },
  motionLineRight: {
    position: 'absolute',
    top: 92,
    right: 28,
    width: 4,
    height: 128,
    borderRadius: 4,
    backgroundColor: 'rgba(143, 92, 255, 0.24)',
    transform: [{ rotate: '-15deg' }]
  },
  hairBack: {
    position: 'absolute',
    top: 26,
    width: 100,
    height: 104,
    borderTopLeftRadius: 48,
    borderTopRightRadius: 48,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    backgroundColor: '#17213B',
    zIndex: 3
  },
  hairRibbon: {
    position: 'absolute',
    top: 92,
    width: 92,
    height: 34,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    backgroundColor: '#10182F',
    zIndex: 2
  },
  head: {
    width: 70,
    height: 76,
    borderRadius: 30,
    backgroundColor: '#F3CBA9',
    borderWidth: 2,
    borderColor: '#FFE2C7',
    marginTop: 42,
    zIndex: 5,
    alignItems: 'center'
  },
  fringe: {
    position: 'absolute',
    top: -8,
    width: 72,
    height: 28,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 20,
    backgroundColor: '#17213B',
    zIndex: 7
  },
  sideLockLeft: {
    position: 'absolute',
    top: 8,
    left: -8,
    width: 18,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#17213B',
    transform: [{ rotate: '10deg' }],
    zIndex: 6
  },
  sideLockRight: {
    position: 'absolute',
    top: 7,
    right: -8,
    width: 18,
    height: 50,
    borderRadius: 12,
    backgroundColor: '#17213B',
    transform: [{ rotate: '-10deg' }],
    zIndex: 6
  },
  hairShine: {
    position: 'absolute',
    top: 1,
    left: 19,
    width: 22,
    height: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    zIndex: 8,
    transform: [{ rotate: '-12deg' }]
  },
  eyeLeft: {
    position: 'absolute',
    top: 31,
    left: 18,
    width: 8,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#0A1428'
  },
  eyeRight: {
    position: 'absolute',
    top: 31,
    right: 18,
    width: 8,
    height: 12,
    borderRadius: 4,
    backgroundColor: '#0A1428'
  },
  eyeSparkLeft: {
    position: 'absolute',
    top: 33,
    left: 21,
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.white,
    zIndex: 8
  },
  eyeSparkRight: {
    position: 'absolute',
    top: 33,
    right: 21,
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.white,
    zIndex: 8
  },
  cheekLeft: {
    position: 'absolute',
    top: 45,
    left: 12,
    width: 10,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 92, 138, 0.34)'
  },
  cheekRight: {
    position: 'absolute',
    top: 45,
    right: 12,
    width: 10,
    height: 4,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 92, 138, 0.34)'
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
    top: 55,
    width: 82,
    height: 10,
    borderRadius: 8,
    zIndex: 6,
    ...shadows.cyanGlow
  },
  neck: {
    width: 26,
    height: 18,
    backgroundColor: '#D6A77E',
    zIndex: 4
  },
  torso: {
    width: 98,
    height: 96,
    borderRadius: 28,
    borderWidth: 3,
    zIndex: 4,
    alignItems: 'center',
    justifyContent: 'center'
  },
  collar: {
    position: 'absolute',
    top: 8,
    width: 48,
    height: 18,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    borderBottomWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.45)'
  },
  torsoPanel: {
    width: 48,
    height: 54,
    borderRadius: 18,
    opacity: 0.88
  },
  torsoHighlight: {
    position: 'absolute',
    top: 24,
    right: 18,
    width: 9,
    height: 44,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.12)'
  },
  arm: {
    position: 'absolute',
    top: 135,
    width: 34,
    height: 102,
    borderRadius: 18,
    backgroundColor: '#F3CBA9',
    borderWidth: 2,
    borderColor: '#FFE2C7',
    zIndex: 2
  },
  armLeft: {
    left: 42,
    transform: [{ rotate: '7deg' }]
  },
  armRight: {
    right: 42,
    transform: [{ rotate: '-7deg' }]
  },
  waist: {
    width: 78,
    height: 18,
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
    width: 36,
    height: 92,
    borderRadius: 15,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center'
  },
  legStripe: {
    width: 6,
    height: '86%',
    borderRadius: 5,
    opacity: 0.35,
    marginTop: 8
  },
  shoes: {
    flexDirection: 'row',
    gap: 8,
    zIndex: 5
  },
  shoe: {
    width: 52,
    height: 22,
    borderRadius: radii.pill,
    borderWidth: 2,
    overflow: 'hidden'
  },
  shoeSole: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 2,
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.5)'
  },
  accessory: {
    position: 'absolute',
    top: 112,
    right: 42,
    width: 20,
    height: 20,
    borderRadius: 10,
    ...shadows.cyanGlow
  }
});
