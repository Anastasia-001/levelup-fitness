import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { SKILL_BRANCHES, SKILL_NODES } from '@/constants/skillTree';
import { colors, radii, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { getInventory } from '@/services/cosmeticService';
import { unlockSkillNode } from '@/services/skillTreeService';
import { useAppStore } from '@/store/appStore';
import { SkillBranch, SkillNodeDefinition } from '@/types/domain';

type SkillTreePanelProps = {
  showIntroCard?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const SkillTreePanel = ({ showIntroCard = true, style }: SkillTreePanelProps) => {
  const character = useAppStore((state) => state.character);
  const progress = useAppStore((state) => state.skillTreeProgress);
  const setProgress = useAppStore((state) => state.setSkillTreeProgress);
  const setOwnedCosmetics = useAppStore((state) => state.setOwnedCosmetics);
  const setEquippedCosmetics = useAppStore((state) => state.setEquippedCosmetics);
  const [branch, setBranch] = useState<SkillBranch>('endurance');
  const [unlockingId, setUnlockingId] = useState<string | null>(null);
  const branchInfo = SKILL_BRANCHES.find((candidate) => candidate.id === branch) ?? SKILL_BRANCHES[0];
  const nodes = SKILL_NODES.filter((node) => node.branch === branch);
  const unlocked = new Set(progress?.unlockedNodeIds ?? []);

  const confirmUnlock = (node: SkillNodeDefinition) => {
    if (unlocked.has(node.id) || unlockingId) return;
    const prerequisiteMet = !node.prerequisiteNodeId || unlocked.has(node.prerequisiteNodeId);
    const levelMet = (character?.level ?? 1) >= node.requiredLevel;
    const pointsMet = (progress?.availablePoints ?? 0) >= node.pointCost;
    if (!prerequisiteMet || !levelMet || !pointsMet) return;

    Alert.alert('Unlock skill?', `${node.name} costs ${node.pointCost} skill point.`, [
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
          } catch (caught) {
            Alert.alert('Skill not unlocked', caught instanceof Error ? caught.message : 'Try again.');
          } finally {
            setUnlockingId(null);
          }
        }
      }
    ]);
  };

  return (
    <View style={[styles.skillTree, style]}>
      {showIntroCard && (
        <Card>
          <View style={styles.skillHeader}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" style={{ color: colors.primary }}>PROGRESSION</AppText>
              <AppText variant="title">Skill Tree</AppText>
            </View>
            <View style={styles.pointBadge}>
              <Ionicons name="sparkles" size={16} color={colors.coin} />
              <AppText style={styles.pointText}>{progress?.availablePoints ?? 0} points</AppText>
            </View>
          </View>
          <AppText muted>Skill points come from level milestones. Skills add insight, variety, cosmetics, and convenience without changing EXP.</AppText>
        </Card>
      )}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.branchTabs}>
        {SKILL_BRANCHES.map((candidate) => (
          <Pressable
            key={`skill-branch-${candidate.id}`}
            onPress={() => setBranch(candidate.id)}
            style={[
              styles.branchTab,
              branch === candidate.id && { borderColor: candidate.color, backgroundColor: `${candidate.color}18` }
            ]}
          >
            <Ionicons name={candidate.icon as keyof typeof Ionicons.glyphMap} size={17} color={candidate.color} />
            <AppText variant="caption" style={branch === candidate.id ? { color: candidate.color } : undefined}>{candidate.name}</AppText>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.skillBranchHeader}>
        <Ionicons name={branchInfo.icon as keyof typeof Ionicons.glyphMap} size={20} color={branchInfo.color} />
        <AppText variant="subtitle">{branchInfo.name} branch</AppText>
      </View>
      <View style={styles.nodeList}>
        {nodes.map((node, index) => {
          const isUnlocked = unlocked.has(node.id);
          const prerequisiteMet = !node.prerequisiteNodeId || unlocked.has(node.prerequisiteNodeId);
          const levelMet = (character?.level ?? 1) >= node.requiredLevel;
          const pointsMet = (progress?.availablePoints ?? 0) >= node.pointCost;
          const canUnlock = prerequisiteMet && levelMet && pointsMet;
          const requirement = !prerequisiteMet
            ? `Requires ${SKILL_NODES.find((candidate) => candidate.id === node.prerequisiteNodeId)?.name ?? 'previous node'}`
            : !levelMet
              ? `Unlocks at Level ${node.requiredLevel}`
              : !pointsMet
                ? `Requires ${node.pointCost} skill point`
                : `${node.pointCost} skill point`;

          return (
            <View key={`skill-node-${node.id}`}>
              {index > 0 && <View style={[styles.nodeConnection, { backgroundColor: isUnlocked ? branchInfo.color : colors.borderDim }]} />}
              <Pressable
                onPress={() => confirmUnlock(node)}
                style={[
                  styles.nodeCard,
                  { borderColor: isUnlocked ? branchInfo.color : colors.borderDim },
                  !isUnlocked && !canUnlock && styles.nodeCardLocked
                ]}
              >
                <View style={[styles.nodeIcon, { borderColor: isUnlocked ? branchInfo.color : colors.borderDim }]}>
                  <Ionicons name={node.icon as keyof typeof Ionicons.glyphMap} size={21} color={isUnlocked ? branchInfo.color : colors.faint} />
                </View>
                <View style={{ flex: 1, gap: spacing.xxs }}>
                  <AppText variant="subtitle">{node.name}</AppText>
                  <AppText variant="caption" muted>{node.description}</AppText>
                  <AppText variant="caption" style={{ color: isUnlocked ? colors.success : canUnlock ? colors.primary : colors.warning }}>
                    {isUnlocked ? 'Unlocked' : unlockingId === node.id ? 'Unlocking...' : requirement}
                  </AppText>
                </View>
                <Ionicons
                  name={isUnlocked ? 'checkmark-circle' : canUnlock ? 'add-circle-outline' : 'lock-closed-outline'}
                  size={22}
                  color={isUnlocked ? colors.success : canUnlock ? colors.primary : colors.faint}
                />
              </Pressable>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  skillTree: {
    gap: spacing.md
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  pointBadge: {
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.coin,
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
  branchTabs: {
    gap: spacing.xs,
    paddingRight: spacing.md
  },
  branchTab: {
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  skillBranchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
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
    minHeight: 104,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.cardHigh,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  nodeCardLocked: {
    opacity: 0.72
  },
  nodeIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
