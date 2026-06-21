import { Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CHARACTER_ASSETS, CharacterAsset, CharacterPose, POSE_PRESENTATIONS } from '@/constants/characterAssets';
import { getEvolutionStage } from '@/constants/characterProgression';
import { colors, shadows } from '@/constants/theme';
import { getEquippedItems } from '@/services/cosmeticService';
import { CosmeticItem, EquippedCosmetics, EvolutionStageId } from '@/types/domain';

type AvatarPreviewProps = {
  equipment: EquippedCosmetics | null;
  size?: 'large' | 'wardrobe' | 'small';
  height?: number;
  pose?: CharacterPose;
  evolutionStage?: EvolutionStageId;
};

const SIZE_HEIGHTS = { large: 470, wardrobe: 280, small: 220 } as const;

export const AvatarPreview = ({
  equipment,
  size = 'large',
  height,
  pose = 'neutral',
  evolutionStage = 'starter'
}: AvatarPreviewProps) => {
  const equipped = getEquippedItems(equipment);
  const asset = CHARACTER_ASSETS[pose];
  const posePresentation = POSE_PRESENTATIONS[pose];
  const stage = getEvolutionStage(evolutionStage);
  const stageHeight = height ?? SIZE_HEIGHTS[size];
  const artWidth = stageHeight * (asset.canvas.width / asset.canvas.height);
  const stageWidth = Math.max(170, stageHeight * 0.54);

  return (
    <View
      style={[styles.stage, { width: stageWidth, height: stageHeight }]}
      accessibilityLabel="LevelUp Fitness character wearing equipped cosmetics"
    >
      <Atmosphere aura={equipped.aura} frame={equipped.frame} stageColor={stage.sceneColor} poseAccent={posePresentation.accent} />
      <View
        style={[
          styles.artboard,
          { width: artWidth, height: stageHeight, transform: [...posePresentation.transform, { scale: stage.postureScale }] }
        ]}
      >
        <Image source={asset.source} resizeMode="contain" fadeDuration={0} style={styles.characterArt} />
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <EvolutionBaseTrim color={stage.trimColor} stage={stage.id} torso={asset.anchors.torso} legs={asset.anchors.legs} />
          <HeadwearOverlay item={equipped.head} anchor={asset.anchors.head} />
          <TopOverlay item={equipped.shirt} anchor={asset.anchors.torso} />
          <BottomOverlay item={equipped.pants} waist={asset.anchors.waist} legs={asset.anchors.legs} />
          <ShoeOverlay item={equipped.shoes} anchor={asset.anchors.shoes} />
          <AccessoryOverlay item={equipped.accessory} anchor={asset.anchors.wrist} />
        </View>
      </View>
    </View>
  );
};

const Atmosphere = ({
  aura,
  frame,
  stageColor,
  poseAccent
}: {
  aura: CosmeticItem | null;
  frame: CosmeticItem | null;
  stageColor: string;
  poseAccent: string;
}) => (
  <View pointerEvents="none" style={StyleSheet.absoluteFill}>
    <LinearGradient
      colors={[
        withAlpha(aura?.colors.primary ?? stageColor, aura ? 0.2 : 0.12),
        'rgba(3, 7, 19, 0)'
      ]}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
      style={styles.atmosphereGlow}
    />
    <View style={[styles.poseAccent, { backgroundColor: withAlpha(poseAccent, 0.28) }]} />
    {aura && (
      <>
        <View style={[styles.auraRing, { borderColor: withAlpha(aura.colors.primary, 0.5) }]} />
        <View style={[styles.auraRail, styles.auraRailLeft, { backgroundColor: withAlpha(aura.colors.secondary, 0.38) }]} />
        <View style={[styles.auraRail, styles.auraRailRight, { backgroundColor: withAlpha(aura.colors.primary, 0.34) }]} />
      </>
    )}
    {frame && (
      <View style={[styles.profileFrame, { borderColor: withAlpha(frame.colors.primary, 0.54) }]}>
        <View style={[styles.frameCorner, styles.frameCornerTopLeft, { borderColor: frame.colors.secondary }]} />
        <View style={[styles.frameCorner, styles.frameCornerBottomRight, { borderColor: frame.colors.accent ?? frame.colors.primary }]} />
      </View>
    )}
  </View>
);

const EvolutionBaseTrim = ({
  color,
  stage,
  torso,
  legs
}: {
  color: string;
  stage: EvolutionStageId;
  torso: OverlayProps['anchor'];
  legs: OverlayProps['anchor'];
}) => (
  <>
    <View style={[styles.anchor, torso]}>
      <View style={[styles.evolutionShoulderTrim, { borderColor: withAlpha(color, stage === 'starter' ? 0.28 : 0.62) }]} />
    </View>
    <View style={[styles.anchor, legs]}>
      <View style={[styles.evolutionLegTrim, { backgroundColor: withAlpha(color, stage === 'elite' ? 0.72 : 0.42) }]} />
    </View>
  </>
);

const HeadwearOverlay = ({ item, anchor }: OverlayProps) => {
  if (!item) return null;
  const silhouette = item.visual.silhouette;
  return (
    <View style={[styles.anchor, anchor]}>
      {silhouette.includes('ponytail') && (
        <View style={[styles.ponytailAccent, { borderColor: item.colors.secondary }]} />
      )}
      {silhouette.includes('cap') ? (
        <>
          <View style={[styles.capCrown, { backgroundColor: withAlpha(item.colors.primary, 0.92), borderColor: item.colors.secondary }]} />
          <View style={[styles.capBrim, { backgroundColor: item.colors.accent ?? item.colors.secondary }]} />
        </>
      ) : (
        <View
          style={[
            styles.headBand,
            silhouette.includes('visor') && styles.visorBand,
            { backgroundColor: withAlpha(item.colors.primary, 0.9), borderColor: item.colors.secondary }
          ]}
        >
          <View style={[styles.headBandTrim, { backgroundColor: item.colors.accent ?? item.colors.secondary }]} />
        </View>
      )}
      {silhouette.includes('crown') && (
        <View style={styles.crownRow}>
          {[0, 1, 2].map((point) => (
            <View key={`character-crown-point-${point}`} style={[styles.crownPoint, { backgroundColor: item.colors.primary }]} />
          ))}
        </View>
      )}
    </View>
  );
};

const TopOverlay = ({ item, anchor }: OverlayProps) => {
  if (!item) return null;
  const jacket = item.visual.silhouette.includes('jacket');
  const singlet = item.visual.silhouette.includes('singlet');
  return (
    <View style={[styles.anchor, anchor]}>
      <LinearGradient
        colors={[withAlpha(item.colors.primary, 0.34), 'rgba(0, 0, 0, 0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.topTint, jacket && styles.jacketTint, singlet && styles.singletTint]}
      />
      <View style={[styles.leftLapel, { borderColor: item.colors.secondary }]} />
      <View style={[styles.rightLapel, { borderColor: item.colors.secondary }]} />
      <View
        style={[
          styles.chestTrim,
          item.visual.pattern === 'chevron' && styles.chevronChestTrim,
          { backgroundColor: item.colors.accent ?? item.colors.secondary }
        ]}
      />
      {jacket && <View style={[styles.jacketZip, { backgroundColor: item.colors.accent ?? colors.white }]} />}
    </View>
  );
};

const BottomOverlay = ({ item, waist, legs }: { item: CosmeticItem | null; waist: OverlayProps['anchor']; legs: OverlayProps['anchor'] }) => {
  if (!item) return null;
  const shorts = item.visual.silhouette.includes('shorts');
  return (
    <>
      <View style={[styles.anchor, waist]}>
        <View style={[styles.waistTrim, { backgroundColor: withAlpha(item.colors.secondary, 0.88) }]} />
        <View style={[styles.waistTab, { backgroundColor: item.colors.accent ?? item.colors.primary }]} />
      </View>
      <View style={[styles.anchor, legs]}>
        <LinearGradient
          colors={[withAlpha(item.colors.primary, shorts ? 0.26 : 0.2), 'rgba(0, 0, 0, 0)']}
          style={[styles.legTint, shorts && styles.shortsTint]}
        />
        <View style={[styles.legRail, { backgroundColor: item.colors.secondary }]}>
          <View style={[styles.legRailAccent, { backgroundColor: item.colors.accent ?? item.colors.primary }]} />
        </View>
      </View>
    </>
  );
};

const ShoeOverlay = ({ item, anchor }: OverlayProps) => {
  if (!item) return null;
  return (
    <View style={[styles.anchor, anchor, styles.shoeRow]}>
      {[0, 1].map((shoe) => (
        <View
          key={`character-shoe-overlay-${shoe}`}
          style={[styles.shoeAccent, { borderColor: item.colors.secondary, backgroundColor: withAlpha(item.colors.primary, 0.32) }]}
        >
          <View style={[styles.shoeSlash, { backgroundColor: item.colors.accent ?? item.colors.secondary }]} />
        </View>
      ))}
    </View>
  );
};

const AccessoryOverlay = ({ item, anchor }: OverlayProps) => {
  if (!item) return null;
  const towel = item.visual.silhouette.includes('towel');
  const sleeve = item.visual.silhouette.includes('sleeve');
  return (
    <View
      style={[
        styles.anchor,
        anchor,
        styles.wristAccessory,
        towel && styles.towelAccessory,
        sleeve && styles.sleeveAccessory,
        { borderColor: item.colors.secondary, backgroundColor: withAlpha(item.colors.primary, 0.9) }
      ]}
    >
      <View style={[styles.accessoryFace, { backgroundColor: item.colors.accent ?? item.colors.secondary }]} />
    </View>
  );
};

type OverlayProps = {
  item: CosmeticItem | null;
  anchor: CharacterAsset['anchors']['head'];
};

const withAlpha = (hex: string, alpha: number) => {
  if (!hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return hex;
  const normalized = hex.length === 4
    ? `${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`
    : hex.slice(1);
  const channels = normalized.match(/.{2}/g)?.map((channel) => Number.parseInt(channel, 16));
  return channels ? `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})` : hex;
};

const styles = StyleSheet.create({
  stage: { alignItems: 'center', justifyContent: 'center', overflow: 'visible' },
  artboard: { position: 'relative' },
  characterArt: { width: '100%', height: '100%' },
  anchor: { position: 'absolute' },
  atmosphereGlow: { position: 'absolute', top: '4%', left: '4%', right: '4%', bottom: '5%', borderRadius: 120 },
  poseAccent: { position: 'absolute', bottom: '7%', left: '23%', right: '23%', height: 8, borderRadius: 20, transform: [{ scaleX: 1.5 }] },
  auraRing: { position: 'absolute', top: '8%', left: '8%', right: '8%', bottom: '8%', borderRadius: 100, borderWidth: 2, ...shadows.cyanGlow },
  auraRail: { position: 'absolute', top: '18%', width: 2, height: '58%', borderRadius: 2 },
  auraRailLeft: { left: '15%', transform: [{ rotate: '7deg' }] },
  auraRailRight: { right: '15%', transform: [{ rotate: '-7deg' }] },
  profileFrame: { position: 'absolute', top: '5%', left: '7%', right: '7%', bottom: '5%', borderRadius: 92, borderWidth: 2, opacity: 0.7 },
  frameCorner: { position: 'absolute', width: 26, height: 26, borderWidth: 3 },
  frameCornerTopLeft: { top: -4, left: -4, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 12 },
  frameCornerBottomRight: { right: -4, bottom: -4, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 12 },
  headBand: { position: 'absolute', top: '15%', left: '12%', width: '70%', height: '10%', borderRadius: 8, borderWidth: 1, transform: [{ rotate: '-5deg' }], overflow: 'hidden' },
  visorBand: { height: '15%', borderBottomLeftRadius: 14, borderBottomRightRadius: 14 },
  headBandTrim: { position: 'absolute', right: '8%', top: 0, bottom: 0, width: '12%' },
  capCrown: { position: 'absolute', top: '1%', left: '15%', width: '62%', height: '30%', borderTopLeftRadius: 24, borderTopRightRadius: 24, borderBottomLeftRadius: 8, borderWidth: 1 },
  capBrim: { position: 'absolute', top: '25%', right: '6%', width: '42%', height: '7%', borderRadius: 7, transform: [{ rotate: '-8deg' }] },
  ponytailAccent: { position: 'absolute', top: '4%', right: '-5%', width: '38%', height: '56%', borderRadius: 24, borderRightWidth: 4, transform: [{ rotate: '-12deg' }], opacity: 0.8 },
  crownRow: { position: 'absolute', top: '5%', left: '22%', flexDirection: 'row', gap: 3 },
  crownPoint: { width: 8, height: 10, borderTopLeftRadius: 5, borderTopRightRadius: 5, transform: [{ rotate: '45deg' }] },
  topTint: { position: 'absolute', left: '8%', top: '4%', width: '84%', height: '86%', borderRadius: 20 },
  jacketTint: { borderTopLeftRadius: 8, borderTopRightRadius: 8 },
  singletTint: { left: '18%', width: '64%', borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  leftLapel: { position: 'absolute', left: '19%', top: '7%', width: '25%', height: '46%', borderRightWidth: 2, borderBottomWidth: 2, borderBottomRightRadius: 18, transform: [{ rotate: '-5deg' }] },
  rightLapel: { position: 'absolute', right: '19%', top: '7%', width: '25%', height: '46%', borderLeftWidth: 2, borderBottomWidth: 2, borderBottomLeftRadius: 18, transform: [{ rotate: '5deg' }] },
  chestTrim: { position: 'absolute', left: '31%', bottom: '14%', width: '38%', height: 4, borderRadius: 3 },
  chevronChestTrim: { transform: [{ rotate: '-11deg' }] },
  jacketZip: { position: 'absolute', left: '49%', top: '12%', width: 2, height: '70%', borderRadius: 1 },
  waistTrim: { position: 'absolute', left: '8%', top: '12%', width: '84%', height: '24%', borderRadius: 8, transform: [{ rotate: '1deg' }] },
  waistTab: { position: 'absolute', right: '12%', top: '5%', width: '22%', height: '30%', borderRadius: 4 },
  legTint: { position: 'absolute', left: '9%', top: 0, width: '82%', height: '96%', borderRadius: 26 },
  shortsTint: { height: '30%' },
  legRail: { position: 'absolute', right: '18%', top: '3%', width: 4, height: '82%', borderRadius: 3, transform: [{ rotate: '-3deg' }], opacity: 0.82 },
  legRailAccent: { position: 'absolute', top: '18%', left: -2, width: 8, height: '24%', borderRadius: 4 },
  shoeRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingHorizontal: '3%', paddingBottom: '3%' },
  shoeAccent: { width: '46%', height: '45%', borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  shoeSlash: { position: 'absolute', left: '20%', top: '34%', width: '58%', height: 3, borderRadius: 2, transform: [{ rotate: '-12deg' }] },
  wristAccessory: { borderRadius: 7, borderWidth: 1, transform: [{ rotate: '-7deg' }], overflow: 'hidden' },
  towelAccessory: { left: '38%', top: '-12%', width: '86%', height: '170%', borderRadius: 5 },
  sleeveAccessory: { left: '4%', top: '-70%', width: '70%', height: '210%', borderRadius: 10, opacity: 0.78 },
  accessoryFace: { position: 'absolute', left: '18%', right: '18%', top: '20%', height: '28%', borderRadius: 3 },
  evolutionShoulderTrim: { position: 'absolute', left: '12%', right: '12%', top: '9%', height: '24%', borderTopWidth: 2, borderRadius: 20 },
  evolutionLegTrim: { position: 'absolute', left: '18%', top: '7%', width: 3, height: '68%', borderRadius: 2 }
});
