import { StyleSheet, View } from 'react-native';
import { colors, radii } from '@/constants/theme';
import { CosmeticItem, Rarity } from '@/types/domain';

export const RARITY_COLORS: Record<Rarity, string> = {
  common: '#A8B7CB',
  rare: '#35F6FF',
  epic: '#A778FF',
  legendary: '#FFD66E'
};

export const CosmeticThumbnail = ({ item, compact = false }: { item: CosmeticItem; compact?: boolean }) => {
  const rarityColor = RARITY_COLORS[item.rarity];

  return (
    <View style={[styles.preview, compact && styles.compact, { borderColor: rarityColor }]}>
      <View style={[styles.backGlow, { backgroundColor: item.colors.primary }]} />
      <View style={[styles.rarityRail, { backgroundColor: rarityColor }]} />
      <CosmeticShape item={item} />
    </View>
  );
};

const CosmeticShape = ({ item }: { item: CosmeticItem }) => {
  switch (item.visual.thumbnailComponent) {
    case 'headwear':
      return <Headwear item={item} />;
    case 'top':
      return <Top item={item} />;
    case 'bottom':
      return <Bottom item={item} />;
    case 'footwear':
      return <Footwear item={item} />;
    case 'frame':
      return <Frame item={item} />;
    case 'aura':
      return <Aura item={item} />;
    default:
      return <Accessory item={item} />;
  }
};

const Headwear = ({ item }: { item: CosmeticItem }) => {
  const silhouette = item.visual.silhouette;
  if (silhouette.includes('ponytail')) {
    return (
      <View style={styles.headwearStage}>
        <View style={[styles.hairCap, { backgroundColor: item.colors.primary }]} />
        <View style={[styles.ponytail, { backgroundColor: item.colors.secondary }]} />
        <View style={[styles.hairClasp, { backgroundColor: item.colors.accent }]} />
      </View>
    );
  }

  if (silhouette.includes('cap')) {
    return (
      <View style={styles.headwearStage}>
        <View style={[styles.capCrown, { backgroundColor: item.colors.primary, borderColor: item.colors.secondary }]} />
        <View style={[styles.capBrim, { backgroundColor: item.colors.accent ?? item.colors.secondary }]} />
        <Pattern item={item} compact />
      </View>
    );
  }

  return (
    <View style={styles.headwearStage}>
      <View
        style={[
          styles.band,
          silhouette.includes('visor') && styles.visor,
          silhouette.includes('crown') && styles.crownBand,
          { backgroundColor: item.colors.primary, borderColor: item.colors.secondary }
        ]}
      />
      {silhouette.includes('crown') && (
        <View style={styles.crownPoints}>
          {[0, 1, 2].map((point) => (
            <View key={`crown-point-${point}`} style={[styles.crownPoint, { backgroundColor: item.colors.primary }]} />
          ))}
        </View>
      )}
      <Pattern item={item} compact />
    </View>
  );
};

const Top = ({ item }: { item: CosmeticItem }) => {
  const jacket = item.visual.silhouette.includes('jacket');
  const singlet = item.visual.silhouette.includes('singlet');
  return (
    <View style={styles.topStage}>
      {!singlet && <View style={[styles.sleeve, styles.leftSleeve, { backgroundColor: item.colors.secondary }]} />}
      {!singlet && <View style={[styles.sleeve, styles.rightSleeve, { backgroundColor: item.colors.secondary }]} />}
      <View
        style={[
          styles.topBody,
          singlet && styles.singlet,
          jacket && styles.jacket,
          { backgroundColor: item.colors.primary, borderColor: item.colors.secondary }
        ]}
      >
        <View style={[styles.collar, { borderColor: item.colors.accent ?? colors.white }]} />
        {jacket && <View style={[styles.zip, { backgroundColor: item.colors.accent ?? colors.white }]} />}
        <Pattern item={item} />
      </View>
    </View>
  );
};

const Bottom = ({ item }: { item: CosmeticItem }) => {
  const shorts = item.visual.silhouette.includes('shorts');
  const leggings = item.visual.silhouette.includes('legging');
  return (
    <View style={styles.bottomStage}>
      <View style={[styles.waistband, { backgroundColor: item.colors.secondary }]} />
      {[0, 1].map((leg) => (
        <View
          key={`bottom-leg-${leg}`}
          style={[
            styles.bottomLeg,
            shorts && styles.shortLeg,
            leggings && styles.legging,
            { backgroundColor: item.colors.primary, borderColor: item.colors.secondary }
          ]}
        >
          <View style={[styles.legTrim, { backgroundColor: item.colors.accent ?? item.colors.secondary }]} />
        </View>
      ))}
    </View>
  );
};

const Footwear = ({ item }: { item: CosmeticItem }) => {
  const trail = item.visual.silhouette.includes('trail');
  const racer = item.visual.silhouette.includes('racer');
  return (
    <View style={styles.footwearStage}>
      {[0, 1].map((shoe) => (
        <View
          key={`shoe-${shoe}`}
          style={[
            styles.shoe,
            trail && styles.trailShoe,
            racer && styles.raceShoe,
            { backgroundColor: item.colors.primary, borderColor: item.colors.secondary }
          ]}
        >
          <View style={[styles.shoePanel, { backgroundColor: item.colors.accent ?? item.colors.secondary }]} />
          <View style={[styles.sole, { backgroundColor: item.colors.secondary }]} />
        </View>
      ))}
    </View>
  );
};

const Accessory = ({ item }: { item: CosmeticItem }) => {
  const towel = item.visual.silhouette.includes('towel');
  const sleeve = item.visual.silhouette.includes('sleeve');
  return (
    <View
      style={[
        styles.accessory,
        towel && styles.towel,
        sleeve && styles.armSleeve,
        { backgroundColor: item.colors.primary, borderColor: item.colors.secondary }
      ]}
    >
      <View style={[styles.accessoryFace, { backgroundColor: item.colors.accent ?? item.colors.secondary }]} />
      <Pattern item={item} compact />
    </View>
  );
};

const Frame = ({ item }: { item: CosmeticItem }) => (
  <View style={[styles.frame, { borderColor: item.colors.primary }]}>
    <View style={[styles.frameInner, { borderColor: item.colors.secondary }]} />
    {[styles.nodeTop, styles.nodeRight, styles.nodeBottom, styles.nodeLeft].map((position, index) => (
      <View
        key={`frame-node-${index}`}
        style={[styles.frameNode, position, { backgroundColor: item.colors.accent ?? item.colors.primary }]}
      />
    ))}
  </View>
);

const Aura = ({ item }: { item: CosmeticItem }) => (
  <View style={styles.auraStage}>
    <View style={[styles.auraOuter, { borderColor: item.colors.primary }]} />
    <View style={[styles.auraInner, { borderColor: item.colors.secondary }]} />
    {[0, 1, 2].map((rail) => (
      <View
        key={`aura-rail-${rail}`}
        style={[
          styles.auraRail,
          { left: 13 + rail * 20, backgroundColor: rail === 1 ? item.colors.accent ?? item.colors.primary : item.colors.primary }
        ]}
      />
    ))}
  </View>
);

const Pattern = ({ item, compact = false }: { item: CosmeticItem; compact?: boolean }) => {
  if (item.visual.pattern === 'solid') return null;
  const accent = item.colors.accent ?? item.colors.secondary;
  return (
    <View style={[styles.pattern, compact && styles.patternCompact]}>
      <View
        style={[
          styles.patternLine,
          item.visual.pattern === 'chevron' && styles.chevronLine,
          item.visual.pattern === 'pulse' && styles.pulseLine,
          { backgroundColor: accent }
        ]}
      />
      <View style={[styles.patternLine, styles.patternLineShort, { backgroundColor: item.colors.secondary }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  preview: {
    height: 126,
    borderRadius: radii.lg,
    borderWidth: 2,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  compact: { height: 72, width: 72, borderRadius: radii.md },
  backGlow: { position: 'absolute', width: 92, height: 92, borderRadius: 46, opacity: 0.14 },
  rarityRail: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, opacity: 0.9 },
  headwearStage: { width: 58, height: 46, alignItems: 'center', justifyContent: 'center' },
  band: { width: 56, height: 14, borderRadius: 7, borderWidth: 2 },
  visor: { height: 18, borderBottomLeftRadius: 18, borderBottomRightRadius: 18 },
  crownBand: { marginTop: 10 },
  crownPoints: { position: 'absolute', top: 2, flexDirection: 'row', gap: 5 },
  crownPoint: { width: 9, height: 14, borderTopLeftRadius: 5, borderTopRightRadius: 5, transform: [{ rotate: '45deg' }] },
  capCrown: { width: 46, height: 30, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomLeftRadius: 8, borderWidth: 2 },
  capBrim: { position: 'absolute', bottom: 4, right: 0, width: 31, height: 9, borderRadius: 6, transform: [{ rotate: '-7deg' }] },
  hairCap: { width: 46, height: 34, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomLeftRadius: 13, borderBottomRightRadius: 13 },
  ponytail: { position: 'absolute', right: 0, bottom: 0, width: 22, height: 38, borderRadius: 12, transform: [{ rotate: '-18deg' }] },
  hairClasp: { position: 'absolute', right: 15, top: 16, width: 10, height: 8, borderRadius: 4 },
  topStage: { width: 66, height: 62, alignItems: 'center', justifyContent: 'center' },
  topBody: { width: 48, height: 54, borderRadius: 12, borderWidth: 2, alignItems: 'center', overflow: 'hidden' },
  singlet: { width: 42, borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  jacket: { width: 54, borderRadius: 8 },
  sleeve: { position: 'absolute', top: 9, width: 18, height: 25, borderRadius: 8 },
  leftSleeve: { left: 2, transform: [{ rotate: '15deg' }] },
  rightSleeve: { right: 2, transform: [{ rotate: '-15deg' }] },
  collar: { width: 19, height: 9, borderBottomWidth: 2, borderRadius: 8 },
  zip: { position: 'absolute', top: 7, bottom: 3, width: 2 },
  bottomStage: { height: 64, flexDirection: 'row', gap: 5, alignItems: 'flex-start', paddingTop: 8 },
  waistband: { position: 'absolute', top: 4, width: 48, height: 8, borderRadius: 4 },
  bottomLeg: { width: 21, height: 53, borderRadius: 8, borderWidth: 2, alignItems: 'center', overflow: 'hidden' },
  shortLeg: { height: 33, borderBottomLeftRadius: 11, borderBottomRightRadius: 11 },
  legging: { width: 18, borderRadius: 7 },
  legTrim: { width: 4, height: '70%', borderRadius: 2, marginTop: 8, opacity: 0.75 },
  footwearStage: { flexDirection: 'row', gap: 4, alignItems: 'flex-end' },
  shoe: { width: 29, height: 23, borderRadius: 9, borderWidth: 2, overflow: 'hidden' },
  trailShoe: { height: 27, borderRadius: 7 },
  raceShoe: { width: 31, height: 20, borderTopRightRadius: 15 },
  shoePanel: { position: 'absolute', top: 5, left: 5, width: 14, height: 5, borderRadius: 3, transform: [{ rotate: '-12deg' }] },
  sole: { position: 'absolute', left: 2, right: 2, bottom: 2, height: 4, borderRadius: 2 },
  accessory: { width: 34, height: 44, borderRadius: 14, borderWidth: 2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  towel: { width: 50, height: 42, borderRadius: 7, transform: [{ rotate: '-8deg' }] },
  armSleeve: { width: 25, height: 55, borderRadius: 10 },
  accessoryFace: { width: 17, height: 13, borderRadius: 5 },
  frame: { width: 56, height: 56, borderRadius: 17, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  frameInner: { width: 38, height: 38, borderRadius: 12, borderWidth: 2 },
  frameNode: { position: 'absolute', width: 7, height: 7, borderRadius: 2 },
  nodeTop: { top: -5 }, nodeRight: { right: -5 }, nodeBottom: { bottom: -5 }, nodeLeft: { left: -5 },
  auraStage: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center' },
  auraOuter: { position: 'absolute', width: 58, height: 58, borderRadius: 29, borderWidth: 3, opacity: 0.8 },
  auraInner: { position: 'absolute', width: 39, height: 39, borderRadius: 20, borderWidth: 2, opacity: 0.55 },
  auraRail: { position: 'absolute', top: 6, width: 3, height: 50, borderRadius: 2, opacity: 0.65 },
  pattern: { position: 'absolute', left: 8, right: 8, bottom: 10, gap: 4 },
  patternCompact: { left: 10, right: 10, bottom: 9 },
  patternLine: { height: 4, borderRadius: 2 },
  patternLineShort: { width: '60%', height: 3, opacity: 0.7 },
  chevronLine: { transform: [{ rotate: '-12deg' }] },
  pulseLine: { width: '45%', alignSelf: 'center' }
});
