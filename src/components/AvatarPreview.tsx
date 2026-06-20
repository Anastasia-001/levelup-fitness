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
      <AuraGlow item={equipped.aura} />
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
      <Headwear item={equipped.head} />
      <View style={styles.neck} />
      <View
        style={[
          styles.torso,
          equipped.shirt?.visual.silhouette.includes('jacket') && styles.jacketTorso,
          equipped.shirt?.visual.silhouette.includes('singlet') && styles.singletTorso,
          { backgroundColor: equipped.shirt?.colors.primary ?? colors.cardSoft, borderColor: equipped.shirt?.colors.secondary ?? colors.primary }
        ]}
      >
        <View style={styles.collar} />
        <View style={[styles.torsoPanel, { backgroundColor: equipped.shirt?.colors.accent ?? colors.primary }]} />
        {equipped.shirt?.visual.pattern !== 'solid' && (
          <View style={[styles.outfitTrim, { backgroundColor: equipped.shirt?.colors.secondary ?? colors.primary }]} />
        )}
        <View style={styles.torsoHighlight} />
      </View>
      <View style={[styles.arm, styles.armLeft]} />
      <View style={[styles.arm, styles.armRight]} />
      <View style={styles.waist} />
      <View style={styles.legs}>
        <View style={[styles.leg, { backgroundColor: equipped.pants?.colors.primary ?? '#172A4A', borderColor: equipped.pants?.colors.secondary ?? colors.borderDim }]}>
          <View style={[styles.legStripe, equipped.pants?.visual.pattern === 'chevron' && styles.chevronTrim, { backgroundColor: equipped.pants?.colors.accent ?? colors.primary }]} />
        </View>
        <View style={[styles.leg, { backgroundColor: equipped.pants?.colors.primary ?? '#172A4A', borderColor: equipped.pants?.colors.secondary ?? colors.borderDim }]}>
          <View style={[styles.legStripe, equipped.pants?.visual.pattern === 'chevron' && styles.chevronTrim, { backgroundColor: equipped.pants?.colors.accent ?? colors.primary }]} />
        </View>
      </View>
      <View style={styles.shoes}>
        <View style={[styles.shoe, equipped.shoes?.visual.silhouette.includes('trail') && styles.trailShoe, { backgroundColor: equipped.shoes?.colors.primary ?? colors.primary, borderColor: equipped.shoes?.colors.secondary ?? colors.white }]}>
          <View style={styles.shoeSole} />
        </View>
        <View style={[styles.shoe, equipped.shoes?.visual.silhouette.includes('trail') && styles.trailShoe, { backgroundColor: equipped.shoes?.colors.primary ?? colors.primary, borderColor: equipped.shoes?.colors.secondary ?? colors.white }]}>
          <View style={styles.shoeSole} />
        </View>
      </View>
      {equipped.accessory && <AccessoryOverlay item={equipped.accessory} />}
    </View>
  );
};

const Headwear = ({ item }: { item: CosmeticItem | null }) => {
  const silhouette = item?.visual.silhouette ?? 'band';
  return (
    <>
      {silhouette.includes('ponytail') && (
        <View style={[styles.equippedPonytail, { backgroundColor: item?.colors.secondary ?? colors.secondary }]} />
      )}
      <View
        style={[
          styles.headband,
          silhouette.includes('cap') && styles.equippedCap,
          silhouette.includes('visor') && styles.equippedVisor,
          { backgroundColor: item?.colors.primary ?? colors.primary, borderColor: item?.colors.secondary ?? colors.primary }
        ]}
      />
      {silhouette.includes('crown') && (
        <View style={styles.equippedCrownRow}>
          {[0, 1, 2].map((point) => (
            <View key={`avatar-crown-${point}`} style={[styles.equippedCrownPoint, { backgroundColor: item?.colors.primary }]} />
          ))}
        </View>
      )}
    </>
  );
};

const AccessoryOverlay = ({ item }: { item: CosmeticItem }) => (
  <View
    style={[
      styles.accessory,
      item.visual.silhouette.includes('towel') && styles.towelAccessory,
      item.visual.silhouette.includes('sleeve') && styles.sleeveAccessory,
      { backgroundColor: item.colors.primary, borderColor: item.colors.secondary }
    ]}
  >
    <View style={[styles.accessoryDetail, { backgroundColor: item.colors.accent ?? item.colors.secondary }]} />
  </View>
);

const FrameGlow = ({ item }: { item: CosmeticItem | null }) =>
  item ? <View style={[styles.frameGlow, { borderColor: item.colors.primary, backgroundColor: item.colors.secondary }]} /> : null;

const AuraGlow = ({ item }: { item: CosmeticItem | null }) =>
  item ? (
    <View style={[styles.equippedAura, { borderColor: item.colors.primary, backgroundColor: item.colors.secondary }]}>
      <View style={[styles.equippedAuraCore, { borderColor: item.colors.accent ?? item.colors.primary }]} />
    </View>
  ) : null;

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
  equippedAura: {
    position: 'absolute',
    top: 18,
    width: 224,
    height: 292,
    borderRadius: 82,
    borderWidth: 4,
    opacity: 0.2,
    ...shadows.cyanGlow
  },
  equippedAuraCore: {
    position: 'absolute',
    top: 18,
    bottom: 18,
    left: 18,
    right: 18,
    borderRadius: 70,
    borderWidth: 2
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
    borderWidth: 1,
    zIndex: 6,
    ...shadows.cyanGlow
  },
  equippedCap: {
    top: 39,
    width: 88,
    height: 28,
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 20
  },
  equippedVisor: {
    height: 14,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18
  },
  equippedPonytail: {
    position: 'absolute',
    top: 66,
    right: 55,
    width: 30,
    height: 76,
    borderRadius: 18,
    transform: [{ rotate: '-18deg' }],
    zIndex: 2
  },
  equippedCrownRow: {
    position: 'absolute',
    top: 43,
    flexDirection: 'row',
    gap: 9,
    zIndex: 8
  },
  equippedCrownPoint: {
    width: 13,
    height: 18,
    borderTopLeftRadius: 7,
    borderTopRightRadius: 7,
    transform: [{ rotate: '45deg' }]
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
  jacketTorso: { width: 108, borderRadius: 20 },
  singletTorso: { width: 86, borderTopLeftRadius: 34, borderTopRightRadius: 34 },
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
  outfitTrim: {
    position: 'absolute',
    left: 10,
    bottom: 12,
    width: 38,
    height: 6,
    borderRadius: 4,
    transform: [{ rotate: '-8deg' }],
    opacity: 0.85
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
  chevronTrim: { transform: [{ rotate: '-8deg' }] },
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
  trailShoe: { height: 26, borderRadius: 8 },
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
    borderWidth: 2,
    ...shadows.cyanGlow
  },
  towelAccessory: {
    top: 130,
    right: 28,
    width: 30,
    height: 82,
    borderRadius: 9,
    transform: [{ rotate: '-8deg' }]
  },
  sleeveAccessory: {
    top: 144,
    right: 36,
    width: 25,
    height: 76,
    borderRadius: 12
  },
  accessoryDetail: {
    position: 'absolute',
    left: 4,
    right: 4,
    top: 6,
    height: 5,
    borderRadius: 3
  }
});
