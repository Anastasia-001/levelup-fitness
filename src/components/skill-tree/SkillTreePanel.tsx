import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleProp, StyleSheet, useWindowDimensions, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { SKILL_BRANCHES, SKILL_NODES } from '@/constants/skillTree';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { getInventory } from '@/services/cosmeticService';
import { unlockSkillNode } from '@/services/skillTreeService';
import { useAppStore } from '@/store/appStore';
import { SkillBranch, SkillNodeDefinition } from '@/types/domain';
import { statLevel } from '@/utils/exp';

type SkillTreePanelProps = {
  style?: StyleProp<ViewStyle>;
};

type NodeState = {
  isUnlocked: boolean;
  canUnlock: boolean;
  status: 'unlocked' | 'available' | 'prerequisite' | 'level' | 'points';
  label: string;
  detail: string;
};

const BRANCH_DESCRIPTIONS: Record<SkillBranch, string> = {
  endurance: 'Build route stamina, distance clarity, and recovery-friendly training variety.',
  speed: 'Improve pace insight, split presentation, and run-focused movement style.',
  strength: 'Expand gym and bodyweight training variety with strength-focused unlocks.',
  consistency: 'Support weekly habits, reroll convenience, and streak-based presentation.'
};

const BRANCH_ACCENTS: Record<SkillBranch, string> = {
  endurance: '#47F3B0',
  speed: '#35F6FF',
  strength: '#FF8A4D',
  consistency: '#9F7CFF'
};

const STAT_EXP_KEYS = {
  endurance: 'enduranceExp',
  speed: 'speedExp',
  strength: 'strengthExp',
  consistency: 'consistencyExp'
} as const;

export const SkillTreePanel = ({ style }: SkillTreePanelProps) => {
  const character = useAppStore((state) => state.character);
  const progress = useAppStore((state) => state.skillTreeProgress);
  const setProgress = useAppStore((state) => state.setSkillTreeProgress);
  const setOwnedCosmetics = useAppStore((state) => state.setOwnedCosmetics);
  const setEquippedCosmetics = useAppStore((state) => state.setEquippedCosmetics);
  const [selectedBranch, setSelectedBranch] = useState<SkillBranch | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const [recentlyUnlockedId, setRecentlyUnlockedId] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const unlocked = useMemo(() => new Set(progress?.unlockedNodeIds ?? []), [progress?.unlockedNodeIds]);

  const branchSummaries = useMemo(
    () => SKILL_BRANCHES.map((branch) => {
      const branchNodes = SKILL_NODES.filter((node) => node.branch === branch.id);
      const unlockedCount = branchNodes.filter((node) => unlocked.has(node.id)).length;
      const exp = character?.[STAT_EXP_KEYS[branch.id]] ?? 0;
      return {
        ...branch,
        color: BRANCH_ACCENTS[branch.id],
        description: BRANCH_DESCRIPTIONS[branch.id],
        nodes: branchNodes,
        unlockedCount,
        totalCount: branchNodes.length,
        statLevel: statLevel(exp),
        progressRatio: branchNodes.length ? unlockedCount / branchNodes.length : 0
      };
    }),
    [character, unlocked]
  );

  const confirmUnlock = (node: SkillNodeDefinition) => {
    const state = getNodeState(node, unlocked, character?.level ?? 1, progress?.availablePoints ?? 0);
    if (!state.canUnlock || unlockingId) return;
    const remainingPoints = Math.max(0, (progress?.availablePoints ?? 0) - node.pointCost);

    Alert.alert(
      'Unlock skill?',
      `${node.name}\n\n${node.description}\n\nCost: ${node.pointCost} skill point\nRemaining after unlock: ${remainingPoints}`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            setUnlockingId(node.id);
            try {
              const { data } = await supabase.auth.getUser();
              if (!data.user) throw new Error('Sign in to unlock skills.');
              setProgress(await unlockSkillNode(data.user.id, node.id));
              const inventory = await getInventory(data.user.id);
              setOwnedCosmetics(inventory.ownedCosmetics);
              setEquippedCosmetics(inventory.equippedCosmetics);
              if (!mountedRef.current) return;
              setRecentlyUnlockedId(node.id);
              if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
              flashTimerRef.current = setTimeout(() => {
                if (mountedRef.current) setRecentlyUnlockedId(null);
              }, 1200);
            } catch (caught) {
              Alert.alert('Skill not unlocked', caught instanceof Error ? caught.message : 'Try again.');
            } finally {
              if (mountedRef.current) setUnlockingId(null);
            }
          }
        }
      ]
    );
  };

  const selectedSummary = branchSummaries.find((branch) => branch.id === selectedBranch) ?? null;

  return (
    <View style={[styles.skillTree, style]}>
      {selectedSummary ? (
        <SkillBranchDetail
          branch={selectedSummary}
          characterLevel={character?.level ?? 1}
          availablePoints={progress?.availablePoints ?? 0}
          unlocked={unlocked}
          unlockingId={unlockingId}
          recentlyUnlockedId={recentlyUnlockedId}
          onBack={() => setSelectedBranch(null)}
          onUnlock={confirmUnlock}
        />
      ) : (
        <SkillTreeHub
          branches={branchSummaries}
          availablePoints={progress?.availablePoints ?? 0}
          onSelectBranch={setSelectedBranch}
        />
      )}
    </View>
  );
};

const SkillTreeHub = ({
  branches,
  availablePoints,
  onSelectBranch
}: {
  branches: BranchSummary[];
  availablePoints: number;
  onSelectBranch: (branch: SkillBranch) => void;
}) => {
  const { width } = useWindowDimensions();
  const layoutWidth = Math.min(620, Math.max(300, width - spacing.md * 2));
  const circleSize = Math.max(102, Math.min(124, layoutWidth * 0.29));
  const hubHeight = circleSize * 3.56;
  const stageWrapMinHeight = hubHeight + spacing.xxl;
  const sideTop = circleSize * 1.28;
  const bottomTop = circleSize * 2.56;
  const centerSize = Math.max(64, Math.min(76, circleSize * 0.64));
  const centerLeft = (layoutWidth - centerSize) / 2;
  const centerTop = (hubHeight - centerSize) / 2;
  const sideInset = Math.max(0, Math.min(spacing.sm, (layoutWidth - 340) / 4));
  const centerY = centerTop + centerSize / 2;
  const leftConnectorStart = sideInset + circleSize + spacing.sm;
  const leftConnectorWidth = Math.max(0, centerLeft - spacing.sm - leftConnectorStart);
  const rightConnectorStart = centerLeft + centerSize + spacing.sm;
  const rightConnectorEnd = layoutWidth - sideInset - circleSize - spacing.sm;
  const rightConnectorWidth = Math.max(0, rightConnectorEnd - rightConnectorStart);
  const positions: Record<SkillBranch, ViewStyle> = {
    endurance: { top: 0, left: (layoutWidth - circleSize) / 2 },
    speed: { top: sideTop, left: sideInset },
    strength: { top: sideTop, right: sideInset },
    consistency: { top: bottomTop, left: (layoutWidth - circleSize) / 2 }
  };

  return (
    <View style={styles.hubWrap}>
      <View style={styles.hubIntro}>
        <AppText variant="caption" style={{ color: colors.primary }}>FOUR BRANCHES</AppText>
        <AppText variant="subtitle">Choose a path to inspect and unlock skills.</AppText>
      </View>

      <View style={[styles.diamondStageWrap, { minHeight: stageWrapMinHeight }]}>
        <View style={[styles.diamondStage, { width: layoutWidth, height: hubHeight }]}>
          <View style={[styles.centerLine, styles.centerLineVertical, { top: circleSize + spacing.sm, left: layoutWidth / 2 - 1, height: bottomTop - circleSize - spacing.lg }]} />
          <View style={[styles.centerLine, styles.centerLineLeft, { top: centerY, left: leftConnectorStart, width: leftConnectorWidth }]} />
          <View style={[styles.centerLine, styles.centerLineRight, { top: centerY, left: rightConnectorStart, width: rightConnectorWidth }]} />
          <View style={[styles.centerOrb, { width: centerSize, height: centerSize, borderRadius: centerSize / 2, left: centerLeft, top: centerTop }]}>
            <View pointerEvents="none" style={styles.centerGlow} />
            <AppText style={styles.centerPoints}>{availablePoints}</AppText>
            <AppText variant="caption" muted style={styles.centerLabel}>Skill</AppText>
            <AppText variant="caption" muted style={styles.centerLabel}>Points</AppText>
          </View>

          {branches.map((branch) => (
            <BranchCircle
              key={`skill-hub-${branch.id}`}
              branch={branch}
              size={circleSize}
              style={positions[branch.id]}
              onPress={() => onSelectBranch(branch.id)}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const BranchCircle = ({
  branch,
  size,
  style,
  onPress
}: {
  branch: BranchSummary;
  size: number;
  style: ViewStyle;
  onPress: () => void;
}) => {
  const progressWidth = `${Math.round(branch.progressRatio * 100)}%` as `${number}%`;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${branch.name} branch, stat level ${branch.statLevel}, ${branch.unlockedCount} of ${branch.totalCount} skills unlocked`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.branchCircle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: branch.color,
          shadowColor: branch.color
        },
        style,
        pressed && styles.branchCirclePressed
      ]}
    >
      <View style={[styles.branchIconOrb, { borderColor: branch.color, backgroundColor: `${branch.color}18` }]}>
        <Ionicons name={branch.icon as keyof typeof Ionicons.glyphMap} size={20} color={branch.color} />
      </View>
      <AppText style={[styles.branchName, { color: branch.color }]} numberOfLines={1}>{branch.name}</AppText>
      <AppText variant="caption" muted style={styles.branchLevel} numberOfLines={1}>LV {branch.statLevel}</AppText>
      <AppText variant="caption" style={styles.branchCount} numberOfLines={1}>{branch.unlockedCount}/{branch.totalCount}</AppText>
      <View style={styles.branchProgressTrack}>
        <View style={[styles.branchProgressFill, { width: progressWidth, backgroundColor: branch.color }]} />
      </View>
    </Pressable>
  );
};

const SkillBranchDetail = ({
  branch,
  characterLevel,
  availablePoints,
  unlocked,
  unlockingId,
  recentlyUnlockedId,
  onBack,
  onUnlock
}: {
  branch: BranchSummary;
  characterLevel: number;
  availablePoints: number;
  unlocked: Set<string>;
  unlockingId: string | null;
  recentlyUnlockedId: string | null;
  onBack: () => void;
  onUnlock: (node: SkillNodeDefinition) => void;
}) => (
  <View style={styles.detailWrap}>
    <View style={styles.detailHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to Skill Tree branches"
        hitSlop={10}
        onPress={onBack}
        style={({ pressed }) => [styles.branchBackButton, pressed && styles.branchBackPressed]}
      >
        <Ionicons name="chevron-back" size={22} color={branch.color} />
      </Pressable>
      <View style={[styles.detailIcon, { borderColor: branch.color, backgroundColor: `${branch.color}18` }]}>
        <Ionicons name={branch.icon as keyof typeof Ionicons.glyphMap} size={24} color={branch.color} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText variant="caption" style={{ color: branch.color }}>BRANCH</AppText>
        <AppText variant="title">{branch.name}</AppText>
      </View>
      <View style={[styles.detailPointBadge, { borderColor: colors.coin }]}>
        <Ionicons name="sparkles" size={15} color={colors.coin} />
        <AppText style={styles.pointText}>{availablePoints}</AppText>
      </View>
    </View>

    <View style={[styles.branchSummaryCard, { borderColor: branch.color }]}>
      <View style={styles.summaryMetricRow}>
        <SummaryMetric label="Stat Level" value={`${branch.statLevel}`} accent={branch.color} />
        <SummaryMetric label="Unlocked" value={`${branch.unlockedCount}/${branch.totalCount}`} accent={branch.color} />
        <SummaryMetric label="Available" value={`${availablePoints}`} accent={colors.coin} />
      </View>
      <AppText muted>{branch.description}</AppText>
    </View>

    <View style={styles.nodeList}>
      {branch.nodes.map((node, index) => {
        const state = getNodeState(node, unlocked, characterLevel, availablePoints);
        return (
          <View key={`skill-node-${branch.id}-${node.id}`}>
            {index > 0 && (
              <View style={[styles.nodeConnection, { backgroundColor: state.isUnlocked ? branch.color : colors.borderDim }]} />
            )}
            <SkillNodeCard
              node={node}
              branch={branch}
              state={state}
              isBusy={unlockingId === node.id}
              recentlyUnlocked={recentlyUnlockedId === node.id}
              onUnlock={() => onUnlock(node)}
            />
          </View>
        );
      })}
    </View>

    <View style={styles.futureCard}>
      <Ionicons name="add-circle-outline" size={18} color={colors.faint} />
      <AppText muted>More {branch.name.toLowerCase()} skills can be added later through the existing skill constants.</AppText>
    </View>
  </View>
);

const SkillNodeCard = ({
  node,
  branch,
  state,
  isBusy,
  recentlyUnlocked,
  onUnlock
}: {
  node: SkillNodeDefinition;
  branch: BranchSummary;
  state: NodeState;
  isBusy: boolean;
  recentlyUnlocked: boolean;
  onUnlock: () => void;
}) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={`${node.name}. ${state.label}. ${node.pointCost} skill point. Required level ${node.requiredLevel}.`}
    disabled={!state.canUnlock || isBusy}
    onPress={onUnlock}
    style={({ pressed }) => [
      styles.nodeCard,
      { borderColor: state.isUnlocked || state.canUnlock ? branch.color : colors.borderDim },
      !state.isUnlocked && !state.canUnlock && styles.nodeCardLocked,
      recentlyUnlocked && { backgroundColor: `${branch.color}18` },
      pressed && state.canUnlock && styles.nodePressed
    ]}
  >
    <View style={[styles.nodeIcon, { borderColor: state.isUnlocked ? colors.success : state.canUnlock ? branch.color : colors.borderDim }]}>
      <Ionicons name={node.icon as keyof typeof Ionicons.glyphMap} size={21} color={state.isUnlocked ? colors.success : state.canUnlock ? branch.color : colors.faint} />
    </View>
    <View style={{ flex: 1, gap: spacing.xs }}>
      <View style={styles.nodeTitleRow}>
        <AppText variant="subtitle" style={{ flex: 1 }}>{node.name}</AppText>
        <StatusPill state={state} color={branch.color} isBusy={isBusy} />
      </View>
      <AppText variant="caption" muted>{node.description}</AppText>
      <View style={styles.nodeMetaGrid}>
        <NodeMeta icon="sparkles-outline" label={`${node.pointCost} point`} color={colors.coin} />
        <NodeMeta icon="star-outline" label={`Level ${node.requiredLevel}`} color={branch.color} />
        <NodeMeta icon="git-branch-outline" label={node.prerequisiteNodeId ? prerequisiteName(node.prerequisiteNodeId) : 'No prerequisite'} color={colors.muted} />
        <NodeMeta icon="gift-outline" label={formatEffectKey(node.effectKey)} color={colors.success} />
      </View>
      <AppText variant="caption" style={{ color: state.isUnlocked ? colors.success : state.canUnlock ? branch.color : colors.warning }}>
        {isBusy ? 'Unlocking...' : state.detail}
      </AppText>
    </View>
    <Ionicons
      name={state.isUnlocked ? 'checkmark-circle' : state.canUnlock ? 'add-circle-outline' : 'lock-closed-outline'}
      size={23}
      color={state.isUnlocked ? colors.success : state.canUnlock ? branch.color : colors.faint}
    />
  </Pressable>
);

const StatusPill = ({ state, color, isBusy }: { state: NodeState; color: string; isBusy: boolean }) => {
  const pillColor = state.isUnlocked ? colors.success : state.canUnlock ? color : colors.warning;
  return (
    <View style={[styles.statusPill, { borderColor: pillColor, backgroundColor: `${pillColor}14` }]}>
      <AppText variant="caption" style={{ color: pillColor, fontWeight: '900' }}>
        {isBusy ? 'Unlocking' : state.label}
      </AppText>
    </View>
  );
};

const SummaryMetric = ({ label, value, accent }: { label: string; value: string; accent: string }) => (
  <View style={styles.summaryMetric}>
    <AppText variant="caption" muted>{label}</AppText>
    <AppText style={[styles.summaryMetricValue, { color: accent }]}>{value}</AppText>
  </View>
);

const NodeMeta = ({ icon, label, color }: { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }) => (
  <View style={styles.nodeMeta}>
    <Ionicons name={icon} size={13} color={color} />
    <AppText variant="caption" muted numberOfLines={1}>{label}</AppText>
  </View>
);

const getNodeState = (
  node: SkillNodeDefinition,
  unlocked: Set<string>,
  characterLevel: number,
  availablePoints: number
): NodeState => {
  if (unlocked.has(node.id)) {
    return {
      isUnlocked: true,
      canUnlock: false,
      status: 'unlocked',
      label: 'Unlocked',
      detail: 'Completed. This skill cannot be purchased again.'
    };
  }

  if (node.prerequisiteNodeId && !unlocked.has(node.prerequisiteNodeId)) {
    return {
      isUnlocked: false,
      canUnlock: false,
      status: 'prerequisite',
      label: 'Locked',
      detail: `Requires ${prerequisiteName(node.prerequisiteNodeId)} first.`
    };
  }

  if (characterLevel < node.requiredLevel) {
    return {
      isUnlocked: false,
      canUnlock: false,
      status: 'level',
      label: 'Level locked',
      detail: `Requires character Level ${node.requiredLevel}.`
    };
  }

  if (availablePoints < node.pointCost) {
    return {
      isUnlocked: false,
      canUnlock: false,
      status: 'points',
      label: 'Need points',
      detail: `Requires ${node.pointCost} skill point. You have ${availablePoints}.`
    };
  }

  return {
    isUnlocked: false,
    canUnlock: true,
    status: 'available',
    label: 'Available',
    detail: `${node.pointCost} skill point to unlock.`
  };
};

const prerequisiteName = (nodeId: string) =>
  SKILL_NODES.find((node) => node.id === nodeId)?.name ?? 'previous skill';

const formatEffectKey = (effectKey: string) =>
  effectKey
    .split('_')
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ');

type BranchSummary = {
  id: SkillBranch;
  name: string;
  icon: string;
  color: string;
  description: string;
  nodes: SkillNodeDefinition[];
  unlockedCount: number;
  totalCount: number;
  statLevel: number;
  progressRatio: number;
};

const styles = StyleSheet.create({
  skillTree: {
    gap: spacing.md
  },
  hubWrap: {
    alignItems: 'center',
    gap: spacing.md
  },
  hubIntro: {
    width: '100%',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.xs
  },
  diamondStage: {
    alignSelf: 'center',
    position: 'relative'
  },
  diamondStageWrap: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl
  },
  centerLine: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    backgroundColor: 'rgba(53, 246, 255, 0.24)'
  },
  centerLineVertical: {
    width: 2
  },
  centerLineLeft: {
    transform: [{ rotate: '-22deg' }]
  },
  centerLineRight: {
    transform: [{ rotate: '22deg' }]
  },
  centerOrb: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(3, 7, 19, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xs,
    overflow: 'hidden',
    ...shadows.cyanGlow
  },
  centerGlow: {
    position: 'absolute',
    width: '120%',
    height: '120%',
    borderRadius: 999,
    backgroundColor: 'rgba(143, 92, 255, 0.12)'
  },
  centerPoints: {
    color: colors.coin,
    fontSize: 18,
    fontWeight: '900'
  },
  centerLabel: {
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 10
  },
  branchCircle: {
    position: 'absolute',
    borderWidth: 1,
    backgroundColor: 'rgba(7, 17, 31, 0.94)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    shadowOpacity: 0.22,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4
  },
  branchCirclePressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }]
  },
  branchIconOrb: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 1
  },
  branchName: {
    fontSize: 12,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 14
  },
  branchLevel: {
    fontSize: 10,
    lineHeight: 12
  },
  branchCount: {
    color: colors.text,
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '800'
  },
  branchProgressTrack: {
    width: '60%',
    height: 5,
    borderRadius: radii.pill,
    backgroundColor: colors.black,
    borderWidth: 1,
    borderColor: colors.borderDim,
    overflow: 'hidden',
    marginTop: 3
  },
  branchProgressFill: {
    height: '100%',
    borderRadius: radii.pill
  },
  detailWrap: {
    gap: spacing.md
  },
  detailHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  branchBackButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center'
  },
  branchBackPressed: {
    opacity: 0.82
  },
  detailIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  detailPointBadge: {
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 214, 110, 0.08)',
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  pointText: {
    color: colors.coin,
    fontWeight: '900'
  },
  branchSummaryCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    backgroundColor: colors.card,
    padding: spacing.md,
    gap: spacing.md
  },
  summaryMetricRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  summaryMetric: {
    flex: 1,
    minHeight: 62,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm
  },
  summaryMetricValue: {
    fontSize: 20,
    fontWeight: '900'
  },
  nodeList: {
    gap: 0
  },
  nodeConnection: {
    width: 2,
    height: 18,
    marginLeft: 26
  },
  nodeCard: {
    minHeight: 140,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.cardHigh,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  nodeCardLocked: {
    opacity: 0.74
  },
  nodePressed: {
    opacity: 0.9,
    transform: [{ scale: 0.995 }]
  },
  nodeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center'
  },
  nodeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  statusPill: {
    minHeight: 26,
    borderRadius: radii.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm
  },
  nodeMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs
  },
  nodeMeta: {
    maxWidth: '48%',
    minHeight: 26,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  futureCard: {
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.card,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  }
});
