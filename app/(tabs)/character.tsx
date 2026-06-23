import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/AppText';
import { AvatarPreview } from '@/components/AvatarPreview';
import { CosmeticThumbnail, RARITY_COLORS } from '@/components/CosmeticThumbnail';
import { FitnessClassPicker } from '@/components/FitnessClassPicker';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { CATEGORY_LABELS, COSMETIC_CATEGORIES, visibleCosmeticsForCategory } from '@/constants/cosmetics';
import { CHARACTER_POSES, resolveEvolutionStage } from '@/constants/characterProgression';
import { getFitnessClass, getStatTitle } from '@/constants/fitnessClasses';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { equipCosmetic, syncEarnedCosmetics } from '@/services/cosmeticService';
import { setCharacterPose, setFitnessClass } from '@/services/characterPresentationService';
import { useAppStore } from '@/store/appStore';
import {
  Activity,
  CharacterPoseDefinition,
  CharacterPoseId,
  CosmeticCategory,
  CosmeticItem,
  Mission,
  ProgressionStreaks,
  UserAchievement
} from '@/types/domain';
import { levelFromTotalExp, statLevel } from '@/utils/exp';
import { getCosmeticUnlockProgress } from '@/utils/cosmetics';

const statRows = [
  ['Endurance', 'enduranceExp', 'endurance', 'pulse-outline'],
  ['Speed', 'speedExp', 'speed', 'speedometer-outline'],
  ['Strength', 'strengthExp', 'strength', 'barbell-outline'],
  ['Consistency', 'consistencyExp', 'consistency', 'calendar-outline']
] as const;

type WardrobeCategory = CosmeticCategory | 'poses';

export default function CharacterScreen() {
  const router = useRouter();
  const storedCharacter = useAppStore((state) => state.character);
  const storedProfile = useAppStore((state) => state.profile);
  const accountBootstrap = useAppStore((state) => state.accountBootstrap);
  const character = storedCharacter && (!accountBootstrap.userId || storedCharacter.userId === accountBootstrap.userId)
    ? storedCharacter
    : null;
  const profile = storedProfile && (!accountBootstrap.userId || storedProfile.id === accountBootstrap.userId)
    ? storedProfile
    : null;
  const equippedCosmetics = useAppStore((state) => state.equippedCosmetics);
  const presentation = useAppStore((state) => state.characterPresentation);
  const progress = character ? levelFromTotalExp(character.totalExp) : null;
  const diamonds = 0;
  const [customizing, setCustomizing] = useState(false);
  const [classPickerVisible, setClassPickerVisible] = useState(false);
  const activities = useAppStore((state) => state.activities);
  const setCharacterPresentation = useAppStore((state) => state.setCharacterPresentation);
  const addOwnedCosmetic = useAppStore((state) => state.addOwnedCosmetic);
  const { height: screenHeight } = useWindowDimensions();
  const avatarHeight = Math.min(520, Math.max(340, screenHeight - 320));
  const evolution = resolveEvolutionStage(character?.level, presentation?.highestEvolutionStage).resolvedStage;
  const fitnessClass = getFitnessClass(presentation?.fitnessClass);

  const chooseFitnessClass = async (nextClass: Parameters<typeof setFitnessClass>[0]) => {
    try {
      setCharacterPresentation(await setFitnessClass(nextClass));
      const unlocked = await syncEarnedCosmetics();
      unlocked.forEach(addOwnedCosmetic);
    } catch (caught) {
      Alert.alert('Could not change class', caught instanceof Error ? caught.message : 'Try again.');
      throw caught;
    }
  };

  if (!character) {
    return (
      <Screen scroll={false}>
        <View style={styles.characterLoadState}>
          {accountBootstrap.loading ? (
            <ActivityIndicator color={colors.primary} size="large" />
          ) : (
            <Ionicons name="alert-circle-outline" size={34} color={colors.warning} />
          )}
          <AppText variant="title">
            {accountBootstrap.loading ? 'Loading character' : 'Character unavailable'}
          </AppText>
          <AppText muted style={{ textAlign: 'center' }}>
            {accountBootstrap.loading
              ? 'Restoring your existing level, EXP, stats, and equipment.'
              : 'Open Me and use Settings to retry your account data.'}
          </AppText>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll={false}>
      <View style={styles.topBar}>
        <View style={styles.identity}>
          <View style={styles.profileIcon}>
            <Ionicons name="person" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText style={styles.username}>{profile?.username ?? 'Rookie'}</AppText>
            <AppText variant="caption" muted>
              Level {character?.level ?? 1}
            </AppText>
            <MiniProgress value={progress ? progress.currentLevelExp / progress.nextLevelExp : 0} slim />
          </View>
        </View>
        <View style={styles.currencyCluster}>
          <CurrencyPill icon="ellipse" value={character?.coins ?? 0} color={colors.coin} />
          <CurrencyPill icon="diamond" value={diamonds} color={colors.danger} />
        </View>
      </View>

      <View style={styles.hero}>
        <LinearGradient
          pointerEvents="none"
          colors={['rgba(143, 92, 255, 0.16)', 'rgba(53, 246, 255, 0.04)', 'rgba(3, 7, 19, 0)']}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.sceneAtmosphere}
        />
        <View pointerEvents="none" style={styles.sceneRailLeft} />
        <View pointerEvents="none" style={styles.sceneRailRight} />
        <View pointerEvents="none" style={styles.floorGlow} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open character wardrobe"
          onPress={() => setCustomizing(true)}
          style={({ pressed }) => [styles.characterStage, pressed && styles.characterPressed]}
        >
          <AvatarPreview
            equipment={equippedCosmetics}
            height={avatarHeight}
            level={character.level}
            pose={presentation?.equippedPose}
            evolutionStage={presentation?.highestEvolutionStage}
          />
          <View style={styles.levelBadge}>
            <AppText style={styles.levelBadgeText}>LV {character?.level ?? 1}</AppText>
          </View>
          <View style={[styles.evolutionBadge, { borderColor: evolution.sceneColor }]}>
            <AppText variant="caption" style={{ color: evolution.sceneColor }}>{evolution.name}</AppText>
          </View>
        </Pressable>
        <Pressable
          onPress={() => setClassPickerVisible(true)}
          style={[styles.classBadge, { borderColor: fitnessClass.accent }]}
        >
          <Ionicons name={fitnessClass.icon} size={13} color={fitnessClass.accent} />
          <AppText variant="caption" style={{ color: fitnessClass.accent }}>{fitnessClass.name}</AppText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Skill Tree"
          hitSlop={10}
          onPress={() => router.push('/skill-tree')}
          style={({ pressed }) => [styles.skillTreeButton, pressed && styles.skillTreeButtonPressed]}
        >
          <Ionicons name="git-branch-outline" size={27} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => setCustomizing(true)} style={({ pressed }) => [styles.wardrobeButton, pressed && styles.pressed]}>
          <Ionicons name="shirt-outline" size={18} color={colors.primary} />
          <AppText style={styles.wardrobeButtonText}>Open wardrobe</AppText>
        </Pressable>
      </View>

      <View style={styles.statsGrid}>
        {statRows.map(([label, key, statKey, icon]) => {
          const exp = character?.[key] ?? 0;
          const level = statLevel(exp);
          const title = getStatTitle(statKey, level);
          return (
            <View key={key} style={styles.statCard}>
              <View style={styles.statHeader}>
                <Ionicons name={icon} size={13} color={colors.primary} />
                <AppText variant="caption" style={styles.statLabel}>{label}</AppText>
              </View>
              <View style={styles.statValueRow}>
                <AppText style={styles.statLevel}>Lv {level}</AppText>
                <AppText variant="caption" muted style={styles.statExpText}>
                  {exp} EXP
                </AppText>
              </View>
              <AppText variant="caption" numberOfLines={1} style={styles.statTitle}>{title.current.title}</AppText>
              <MiniProgress value={(exp % 100) / 100} />
            </View>
          );
        })}
      </View>

      <WardrobeModal visible={customizing} onClose={() => setCustomizing(false)} />
      <FitnessClassPicker
        visible={classPickerVisible}
        current={presentation?.fitnessClass ?? 'hybrid_athlete'}
        activities={activities}
        onClose={() => setClassPickerVisible(false)}
        onSelect={chooseFitnessClass}
      />
    </Screen>
  );
}

const WardrobeModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const { height: screenHeight } = useWindowDimensions();
  const character = useAppStore((state) => state.character);
  const activities = useAppStore((state) => state.activities);
  const achievements = useAppStore((state) => state.achievements);
  const personalRecords = useAppStore((state) => state.personalRecords);
  const streaks = useAppStore((state) => state.progressionStreaks);
  const missions = useAppStore((state) => state.missions);
  const ownedCosmetics = useAppStore((state) => state.ownedCosmetics);
  const equippedCosmetics = useAppStore((state) => state.equippedCosmetics);
  const presentation = useAppStore((state) => state.characterPresentation);
  const skillTreeProgress = useAppStore((state) => state.skillTreeProgress);
  const setEquippedCosmetics = useAppStore((state) => state.setEquippedCosmetics);
  const setCharacterPresentation = useAppStore((state) => state.setCharacterPresentation);
  const [userId, setUserId] = useState<string | null>(null);
  const [category, setCategory] = useState<WardrobeCategory>('head');
  const [equippingId, setEquippingId] = useState<string | null>(null);
  const [poseSavingId, setPoseSavingId] = useState<string | null>(null);
  const previewHeight = screenHeight < 700 ? 220 : screenHeight < 800 ? 244 : 272;
  const ownedIds = useMemo(() => new Set(ownedCosmetics.map((item) => item.itemId)), [ownedCosmetics]);
  const progressContext = useMemo(
    () => ({
      activities,
      achievements,
      personalRecords,
      streaks,
      characterLevel: character?.level ?? 1,
      fitnessClass: presentation?.fitnessClass,
      unlockedSkillNodeIds: skillTreeProgress?.unlockedNodeIds
    }),
    [achievements, activities, character?.level, personalRecords, presentation?.fitnessClass, skillTreeProgress?.unlockedNodeIds, streaks]
  );

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  const currentEquipped = category === 'poses' ? null : getEquippedId(equippedCosmetics, category);
  const items = useMemo(
    () => category === 'poses' ? [] : [...visibleCosmeticsForCategory(category)].sort((left, right) =>
      wardrobeRank(left, currentEquipped, ownedIds) - wardrobeRank(right, currentEquipped, ownedIds)
    ),
    [category, currentEquipped, ownedIds]
  );

  const canUseItem = (item: CosmeticItem) =>
    item.unlockSource.type === 'starter' || ownedIds.has(item.id);

  const equip = async (item: CosmeticItem) => {
    if (!userId || !canUseItem(item)) return;
    setEquippingId(item.id);
    try {
      setEquippedCosmetics(await equipCosmetic(userId, item.category, item.id));
    } catch (caught) {
      Alert.alert('Could not equip item', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setEquippingId(null);
    }
  };

  const selectPose = async (pose: CharacterPoseDefinition) => {
    if (!isPoseUnlocked(pose.id, { activities, achievements, missions, streaks, level: character?.level ?? 1, unlockedNodeIds: skillTreeProgress?.unlockedNodeIds ?? [] })) return;
    setPoseSavingId(pose.id);
    try {
      setCharacterPresentation(await setCharacterPose(pose.id));
    } catch (caught) {
      Alert.alert('Could not select pose', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setPoseSavingId(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <View>
              <AppText variant="caption" style={{ color: colors.primary }}>
                Equipment
              </AppText>
              <AppText variant="title">Wardrobe</AppText>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <LinearGradient
            colors={['rgba(143, 92, 255, 0.14)', 'rgba(3, 7, 19, 0.96)']}
            style={[styles.modalPreview, { height: previewHeight }]}
          >
            <View style={styles.previewFloor} />
            <AvatarPreview
              equipment={equippedCosmetics}
              height={Math.min(280, previewHeight - spacing.sm)}
              level={character?.level ?? 1}
              pose={presentation?.equippedPose}
              evolutionStage={presentation?.highestEvolutionStage}
            />
          </LinearGradient>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryStrip}
            style={styles.categoryScroller}
          >
            {[...COSMETIC_CATEGORIES, 'poses' as const].map((nextCategory) => (
              <Pressable
                key={nextCategory}
                onPress={() => setCategory(nextCategory)}
                style={[styles.categoryPill, category === nextCategory && styles.categoryPillActive]}
              >
                <AppText style={[styles.categoryLabel, category === nextCategory && styles.categoryPillText]}>
                  {nextCategory === 'poses' ? 'Poses' : CATEGORY_LABELS[nextCategory]}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>

          <ScrollView style={styles.itemScroller} contentContainerStyle={styles.itemList} showsVerticalScrollIndicator={false}>
            {category === 'poses' ? CHARACTER_POSES.map((pose) => {
              const selected = presentation?.equippedPose === pose.id;
              const unlocked = isPoseUnlocked(pose.id, {
                activities,
                achievements,
                missions,
                streaks,
                level: character?.level ?? 1,
                unlockedNodeIds: skillTreeProgress?.unlockedNodeIds ?? []
              });
              return (
                <View key={`pose-${pose.id}`} style={[styles.poseRow, selected && styles.poseRowSelected]}>
                  <View style={styles.poseThumbnail}>
                    <AvatarPreview
                      equipment={equippedCosmetics}
                      height={132}
                      level={character?.level ?? 1}
                      pose={pose.id}
                      evolutionStage={presentation?.highestEvolutionStage}
                    />
                  </View>
                  <View style={{ flex: 1, gap: 3 }}>
                    <AppText variant="subtitle">{pose.name}</AppText>
                    <AppText variant="caption" muted numberOfLines={2}>{pose.description}</AppText>
                    <AppText variant="caption" style={{ color: unlocked ? colors.success : colors.warning }}>
                      {selected ? 'Selected' : unlocked ? 'Unlocked' : pose.unlockLabel}
                    </AppText>
                  </View>
                  <PrimaryButton
                    label={selected ? 'Selected' : poseSavingId === pose.id ? 'Saving...' : unlocked ? 'Select' : 'Locked'}
                    onPress={() => selectPose(pose)}
                    disabled={!unlocked || selected || poseSavingId === pose.id}
                    variant={unlocked && !selected ? 'primary' : 'secondary'}
                    style={styles.equipButton}
                  />
                </View>
              );
            }) : items.map((item) => {
              const owned = canUseItem(item);
              const equipped = currentEquipped === item.id;
              const levelLocked = (character?.level ?? 1) < (item.unlockLevel ?? 1);
              const progress = getCosmeticUnlockProgress(item, progressContext);
              const earned = item.availability === 'earned';
              return (
                <View key={`${category}-${item.id}`} style={[styles.cosmeticRow, { borderColor: RARITY_COLORS[item.rarity] }]}>
                  <CosmeticThumbnail item={item} compact />
                  <View style={{ flex: 1 }}>
                    <AppText variant="subtitle">{item.name}</AppText>
                    <AppText variant="caption" style={{ color: RARITY_COLORS[item.rarity] }}>
                      {item.rarity.toUpperCase()} - {CATEGORY_LABELS[item.category]}
                    </AppText>
                    <AppText muted numberOfLines={2}>
                      {equipped
                        ? 'Equipped'
                        : owned
                          ? earned ? 'Earned' : 'Owned'
                          : earned
                            ? item.unlockSource.label
                          : levelLocked
                            ? `Unlocks at Level ${item.unlockLevel}`
                            : 'Buy in Shop'}
                    </AppText>
                    {earned && !owned && (
                      <View style={styles.wardrobeProgressRow}>
                        <View style={styles.wardrobeProgressTrack}>
                          <View style={[styles.wardrobeProgressFill, { width: `${progress.ratio * 100}%` }]} />
                        </View>
                        <AppText variant="caption" muted>{progress.label}</AppText>
                      </View>
                    )}
                  </View>
                  <PrimaryButton
                    label={equipped ? 'Equipped' : owned ? (equippingId === item.id ? 'Equipping...' : 'Equip') : 'Locked'}
                    onPress={() => equip(item)}
                    disabled={!owned || equipped || equippingId === item.id}
                    variant={owned && !equipped ? 'primary' : 'secondary'}
                    style={styles.equipButton}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const MiniProgress = ({ value, slim = false }: { value: number; slim?: boolean }) => (
  <View style={[styles.miniProgressTrack, slim && styles.miniProgressSlim]}>
    <View style={[styles.miniProgressFill, { width: `${Math.max(0, Math.min(1, value)) * 100}%` }]} />
  </View>
);

const CurrencyPill = ({
  icon,
  value,
  color
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  color: string;
}) => (
  <View style={[styles.currencyPill, { borderColor: color }]}>
    <Ionicons name={icon} size={15} color={color} />
    <AppText style={[styles.currencyText, { color }]}>{value}</AppText>
  </View>
);

const getEquippedId = (
  equipment: ReturnType<typeof useAppStore.getState>['equippedCosmetics'],
  category: CosmeticCategory
) => {
  if (!equipment) return null;
  const key = `${category}ItemId` as keyof typeof equipment;
  return equipment[key] as string | null;
};

const wardrobeRank = (item: CosmeticItem, equippedId: string | null, ownedIds: Set<string>) => {
  if (item.id === equippedId) return 0;
  if (item.unlockSource.type === 'starter' || ownedIds.has(item.id)) return 1;
  return 2;
};

const isPoseUnlocked = (
  pose: CharacterPoseId,
  context: {
    activities: Activity[];
    achievements: UserAchievement[];
    missions: Mission[];
    streaks: ProgressionStreaks | null;
    level: number;
    unlockedNodeIds: string[];
  }
) => {
  if (pose === 'neutral') return true;
  if (pose === 'ready_to_run') {
    return context.unlockedNodeIds.includes('speed_sprint_pose') ||
      context.achievements.some((achievement) => achievement.achievementId === 'first_gps_activity') ||
      context.activities.some((activity) => ['run', 'walk', 'bike', 'hike'].includes(activity.type));
  }
  if (pose === 'stretch') {
    return context.missions.some((mission) => mission.completedAt && mission.templateId.includes('recovery'));
  }
  if (pose === 'post_workout_victory') return context.level >= 5;
  if (pose === 'recovery') return (context.streaks?.longestActivityDayStreak ?? 0) >= 7;
  return context.level >= 10;
};

const styles = StyleSheet.create({
  characterLoadState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  profileIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  username: {
    fontSize: 16,
    fontWeight: '900'
  },
  miniProgressTrack: {
    height: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.black,
    overflow: 'hidden',
    marginTop: spacing.xs
  },
  miniProgressSlim: {
    height: 4,
    maxWidth: 154
  },
  miniProgressFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary
  },
  currencyCluster: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  currencyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 36,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.cardHigh
  },
  currencyText: {
    fontWeight: '900'
  },
  hero: {
    flex: 1,
    minHeight: 0,
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden',
    marginHorizontal: -spacing.md,
    paddingBottom: spacing.sm
  },
  sceneAtmosphere: {
    position: 'absolute',
    top: 0,
    left: '8%',
    right: '8%',
    bottom: 26,
    borderRadius: 140
  },
  sceneRailLeft: {
    position: 'absolute',
    left: '19%',
    top: '14%',
    width: 1,
    height: '52%',
    backgroundColor: 'rgba(53, 246, 255, 0.16)',
    transform: [{ rotate: '8deg' }]
  },
  sceneRailRight: {
    position: 'absolute',
    right: '20%',
    top: '20%',
    width: 1,
    height: '45%',
    backgroundColor: 'rgba(143, 92, 255, 0.22)',
    transform: [{ rotate: '-7deg' }]
  },
  floorGlow: {
    position: 'absolute',
    bottom: 54,
    width: 176,
    height: 25,
    borderRadius: 88,
    backgroundColor: 'rgba(53, 246, 255, 0.16)',
    transform: [{ scaleX: 1.4 }]
  },
  characterStage: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 0
  },
  characterPressed: {
    opacity: 0.94,
    transform: [{ scale: 0.992 }]
  },
  wardrobeButton: {
    minWidth: 214,
    minHeight: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(7, 17, 31, 0.9)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    ...shadows.cyanGlow
  },
  wardrobeButtonText: {
    color: colors.primary,
    fontWeight: '900'
  },
  pressed: {
    opacity: 0.88
  },
  levelBadge: {
    position: 'absolute',
    right: '18%',
    bottom: '11%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    zIndex: 10
  },
  levelBadgeText: {
    color: colors.black,
    fontWeight: '900'
  },
  evolutionBadge: {
    position: 'absolute',
    left: '17%',
    bottom: '11%',
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(3, 7, 19, 0.88)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    zIndex: 10
  },
  classBadge: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.md,
    zIndex: 12,
    minHeight: 30,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(3, 7, 19, 0.9)',
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  skillTreeButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    zIndex: 12,
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(3, 7, 19, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4
  },
  skillTreeButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.96 }]
  },
  statsGrid: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexShrink: 0
  },
  statCard: {
    width: '23.5%',
    minHeight: 62,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    gap: 3
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3
  },
  statLabel: {
    color: colors.primary,
    fontSize: 8
  },
  statTitle: {
    color: colors.text,
    fontSize: 7,
    fontWeight: '800'
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 2
  },
  statLevel: {
    fontSize: 12,
    fontWeight: '900'
  },
  statExpText: {
    fontSize: 8
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 4, 10, 0.78)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    height: '94%',
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.borderDim
  },
  modalPreview: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    overflow: 'hidden'
  },
  previewFloor: {
    position: 'absolute',
    bottom: 18,
    width: 120,
    height: 18,
    borderRadius: 60,
    backgroundColor: 'rgba(53, 246, 255, 0.15)',
    transform: [{ scaleX: 1.35 }]
  },
  categoryScroller: {
    flexGrow: 0,
    minHeight: 52
  },
  categoryStrip: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingRight: spacing.md
  },
  categoryPill: {
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: 'center'
  },
  categoryPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  categoryPillText: {
    color: colors.primary,
    fontWeight: '900'
  },
  categoryLabel: {
    lineHeight: 18
  },
  itemScroller: {
    flex: 1,
    minHeight: 0
  },
  itemList: {
    gap: spacing.sm,
    paddingBottom: spacing.lg
  },
  cosmeticRow: {
    minHeight: 94,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  poseRow: {
    minHeight: 150,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  poseRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  poseThumbnail: {
    width: 82,
    height: 132,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  wardrobeProgressRow: {
    gap: spacing.xs,
    marginTop: spacing.xs
  },
  wardrobeProgressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.black,
    overflow: 'hidden'
  },
  wardrobeProgressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.success
  },
  equipButton: {
    minWidth: 98,
    minHeight: 44,
    paddingHorizontal: spacing.sm
  }
});
