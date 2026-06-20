import { useEffect, useState } from 'react';
import { Alert, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { getDailyRerollsRemaining, getTodayMissions, rerollMission } from '@/services/missionService';
import { useAppStore } from '@/store/appStore';
import { Mission, MissionDifficulty } from '@/types/domain';

export default function MissionsScreen() {
  const missions = useAppStore((state) => state.missions);
  const setMissions = useAppStore((state) => state.setMissions);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [rerollsRemaining, setRerollsRemaining] = useState(0);
  const [rerollingId, setRerollingId] = useState<string | null>(null);
  const today = new Date();
  const isSelectedToday = selectedDate.toDateString() === today.toDateString();
  const visibleMissions = isSelectedToday ? missions : [];
  const completedCount = visibleMissions.filter((mission) => mission.completedAt).length;
  const totalProgress = visibleMissions.length
    ? visibleMissions.reduce((sum, mission) => sum + Math.min(1, mission.progress / mission.targetValue), 0) / visibleMissions.length
    : 0;
  const xpEarned = visibleMissions
    .filter((mission) => mission.completedAt)
    .reduce((sum, mission) => sum + mission.rewardExp, 0);
  const goldEarned = visibleMissions
    .filter((mission) => mission.completedAt)
    .reduce((sum, mission) => sum + mission.rewardCoins, 0);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      setUserId(data.user.id);
      try {
        setRerollsRemaining(await getDailyRerollsRemaining(data.user.id));
      } catch (caught) {
        if (__DEV__) console.warn('[LevelUp] Mission reroll status unavailable.', caught);
      }
    });
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        const [nextMissions, remaining] = await Promise.all([
          getTodayMissions(data.user.id),
          getDailyRerollsRemaining(data.user.id)
        ]);
        setMissions(nextMissions);
        setRerollsRemaining(remaining);
      }
    } catch (caught) {
      Alert.alert('Could not refresh missions', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const requestReroll = (mission: Mission) => {
    if (!userId || mission.completedAt || rerollsRemaining <= 0 || rerollingId) return;
    Alert.alert(
      'Reroll mission?',
      `Replace this ${mission.difficulty} mission with a similar safe objective?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reroll',
          onPress: async () => {
            setRerollingId(mission.id);
            try {
              const replacement = await rerollMission(userId, mission, missions);
              setMissions(missions.map((current) => (current.id === replacement.id ? replacement : current)));
              setSelectedMission((current) => (current?.id === replacement.id ? replacement : current));
              setRerollsRemaining(0);
            } catch (caught) {
              Alert.alert('Reroll unavailable', caught instanceof Error ? caught.message : 'Try again.');
            } finally {
              setRerollingId(null);
            }
          }
        }
      ]
    );
  };

  const weekDays = getWeekDays(selectedDate);
  const shiftWeek = (direction: -1 | 1) => {
    const next = new Date(selectedDate);
    next.setDate(next.getDate() + direction * 7);
    setSelectedDate(next);
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <View style={styles.monthBar}>
        <Pressable onPress={() => shiftWeek(-1)} style={styles.arrowButton}>
          <Ionicons name="chevron-back" size={22} color={colors.primary} />
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <AppText variant="caption" style={{ color: colors.primary }}>
            Daily quests
          </AppText>
          <AppText variant="title">
            {selectedDate.toLocaleString(undefined, { month: 'long', year: 'numeric' })}
          </AppText>
        </View>
        <Pressable onPress={() => shiftWeek(1)} style={styles.arrowButton}>
          <Ionicons name="chevron-forward" size={22} color={colors.primary} />
        </Pressable>
      </View>

      <View style={styles.dayStrip}>
        {weekDays.map((day) => {
          const isActive = day.toDateString() === selectedDate.toDateString();
          const isToday = day.toDateString() === today.toDateString();
          const allDone = isToday && missions.length > 0 && missions.every((mission) => mission.completedAt);
          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => setSelectedDate(day)}
              style={[styles.dayPill, isActive && styles.dayPillActive, allDone && styles.dayPillDone]}
            >
              <AppText variant="caption" muted={!isActive}>
                {day.toLocaleString(undefined, { weekday: 'short' })}
              </AppText>
              <AppText style={[styles.dayNumber, isActive && styles.dayNumberActive]}>{day.getDate()}</AppText>
              {allDone && <View style={styles.doneDot} />}
            </Pressable>
          );
        })}
      </View>

      <Card>
        <View style={styles.questHeader}>
          <View style={{ flex: 1 }}>
            <AppText variant="caption" style={{ color: colors.primary }}>
              Daily Quest
            </AppText>
            <AppText variant="title">Daily Training</AppText>
          </View>
          <View style={styles.percentBadge}>
            <AppText style={styles.percentText}>{Math.round(totalProgress * 100)}%</AppText>
          </View>
        </View>
        <ProgressBar value={totalProgress} />
        <View style={styles.summaryRow}>
          <AppText muted>{completedCount}/{visibleMissions.length || 3} completed</AppText>
          <View style={styles.earnedRewards}>
            <AppText style={{ color: colors.primary, fontWeight: '900' }}>+{xpEarned} XP</AppText>
            <AppText style={{ color: colors.coin, fontWeight: '900' }}>+{goldEarned} gold</AppText>
          </View>
        </View>
        <View style={styles.resetRow}>
          <AppText muted>Resets in {timeUntilTomorrow()}</AppText>
          <View style={styles.rerollStatus}>
            <Ionicons name="refresh" size={14} color={rerollsRemaining ? colors.primary : colors.faint} />
            <AppText variant="caption" style={{ color: rerollsRemaining ? colors.primary : colors.faint }}>
              {rerollsRemaining} reroll remaining
            </AppText>
          </View>
        </View>

        <View style={styles.objectives}>
          {visibleMissions.length === 0 ? (
            <View style={styles.objectiveRow}>
              <AppText muted>No quests generated for this day.</AppText>
            </View>
          ) : (
            visibleMissions.map((mission) => {
              const accent = difficultyColor(mission.difficulty);
              return (
              <Pressable
                key={mission.id}
                onPress={() => setSelectedMission(mission)}
                style={[styles.objectiveRow, { borderColor: accent }]}
              >
                <View style={styles.checkOrb}>
                  {mission.completedAt && <Ionicons name="checkmark" size={16} color={colors.black} />}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.missionTitleRow}>
                    <AppText style={{ flex: 1 }}>{mission.title}</AppText>
                    <DifficultyBadge difficulty={mission.difficulty} />
                  </View>
                  <AppText muted>{formatObjectiveProgress(mission)}</AppText>
                  <View style={styles.missionRewards}>
                    <AppText variant="caption" style={{ color: colors.primary }}>+{mission.rewardExp} EXP</AppText>
                    <AppText variant="caption" style={{ color: colors.coin }}>+{mission.rewardCoins} gold</AppText>
                  </View>
                  {mission.optionalUnlockName && (
                    <AppText variant="caption" style={styles.cardUnlockReward} numberOfLines={1}>
                      Unlock: {mission.optionalUnlockName}
                    </AppText>
                  )}
                </View>
                {!mission.completedAt && rerollsRemaining > 0 && (
                  <Pressable
                    onPress={(event) => {
                      event.stopPropagation();
                      requestReroll(mission);
                    }}
                    disabled={Boolean(rerollingId)}
                    style={styles.rerollIconButton}
                  >
                    <Ionicons name="refresh" size={17} color={colors.primary} />
                  </Pressable>
                )}
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </Pressable>
              );
            })
          )}
        </View>

        <PrimaryButton
          label={visibleMissions.length ? 'View Quest' : 'Start Quest'}
          onPress={() => visibleMissions[0] && setSelectedMission(visibleMissions[0])}
          disabled={!visibleMissions.length}
        />
      </Card>

      <QuestDetailModal
        mission={selectedMission}
        canReroll={Boolean(selectedMission && !selectedMission.completedAt && rerollsRemaining > 0)}
        rerolling={selectedMission?.id === rerollingId}
        onReroll={requestReroll}
        onClose={() => setSelectedMission(null)}
      />
    </Screen>
  );
}

const getWeekDays = (date: Date) => {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
};

const timeUntilTomorrow = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  const totalMinutes = Math.max(0, Math.floor((tomorrow.getTime() - now.getTime()) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const formatObjectiveProgress = (mission: Mission) => {
  if (mission.type === 'distance_walk_run') {
    return `${(mission.progress / 1000).toFixed(1)} / ${(mission.targetValue / 1000).toFixed(1)} km`;
  }
  if (mission.type === 'workout_duration') {
    return `${Math.floor(mission.progress / 60)} / ${Math.round(mission.targetValue / 60)} min`;
  }
  if (mission.type === 'pushups') {
    return `${Math.floor(mission.progress)} / ${mission.targetValue} reps`;
  }
  return `${Math.floor(mission.progress)} / ${mission.targetValue} activities`;
};

const missionStat = (mission: Mission) => {
  if (mission.type === 'distance_walk_run') return 'END / SPD';
  if (mission.type === 'pushups') return 'STR';
  if (mission.type === 'workout_duration') return 'CON';
  return 'CON';
};

const difficultyColor = (difficulty: MissionDifficulty) => {
  if (difficulty === 'easy') return colors.success;
  if (difficulty === 'medium') return colors.primary;
  if (difficulty === 'hard') return colors.secondary;
  return colors.coin;
};

const DifficultyBadge = ({ difficulty }: { difficulty: MissionDifficulty }) => (
  <View style={[styles.difficultyBadge, { borderColor: difficultyColor(difficulty) }]}>
    <AppText variant="caption" style={{ color: difficultyColor(difficulty), fontWeight: '900' }}>
      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
    </AppText>
  </View>
);

const QuestDetailModal = ({
  mission,
  canReroll,
  rerolling,
  onReroll,
  onClose
}: {
  mission: Mission | null;
  canReroll: boolean;
  rerolling: boolean;
  onReroll: (mission: Mission) => void;
  onClose: () => void;
}) => (
  <Modal visible={Boolean(mission)} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      {mission && (
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <AppText variant="caption" style={{ color: colors.primary }}>
              Quest detail
            </AppText>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.detailContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.titleCard, { borderColor: difficultyColor(mission.difficulty) }]}>
              <View style={styles.missionTitleRow}>
                <AppText variant="title" style={{ flex: 1 }}>{mission.title}</AppText>
                <DifficultyBadge difficulty={mission.difficulty} />
              </View>
              <AppText muted>Complete this physical objective to earn its listed rewards.</AppText>
            </View>
            <View style={styles.detailGrid}>
              <DetailTile label="EXP" value={`+${mission.rewardExp}`} />
              <DetailTile label="Gold" value={`+${mission.rewardCoins}`} accent={colors.coin} />
              <DetailTile label="Stat" value={missionStat(mission)} />
              <DetailTile label="Time limit" value="Today" />
            </View>
            {mission.optionalUnlockName && (
              <View style={styles.unlockReward}>
                <Ionicons name="ribbon-outline" size={20} color={colors.coin} />
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" style={{ color: colors.coin }}>OPTIONAL UNLOCK</AppText>
                  <AppText>{mission.optionalUnlockName}</AppText>
                </View>
              </View>
            )}
            <View>
              <AppText variant="subtitle">Description</AppText>
              <AppText muted>Log matching real-world activity before the daily reset. There are no penalties for an incomplete mission.</AppText>
            </View>
            <View>
              <AppText variant="subtitle">Objective</AppText>
              <View style={styles.objectiveRow}>
                <View style={styles.checkOrb}>{mission.completedAt && <Ionicons name="checkmark" size={16} color={colors.black} />}</View>
                <AppText>{formatObjectiveProgress(mission)}</AppText>
              </View>
            </View>
            {canReroll && (
              <PrimaryButton
                label={rerolling ? 'Rerolling...' : 'Use daily reroll'}
                variant="secondary"
                onPress={() => onReroll(mission)}
                disabled={rerolling}
              />
            )}
            <PrimaryButton label={mission.completedAt ? 'Quest Complete' : 'Keep Training'} onPress={onClose} />
          </ScrollView>
        </View>
      )}
    </View>
  </Modal>
);

const DetailTile = ({ label, value, accent = colors.primary }: { label: string; value: string; accent?: string }) => (
  <View style={styles.detailTile}>
    <AppText variant="caption" muted>
      {label}
    </AppText>
    <AppText style={[styles.detailValue, { color: accent }]}>{value}</AppText>
  </View>
);

const styles = StyleSheet.create({
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  arrowButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayStrip: {
    flexDirection: 'row',
    gap: spacing.xs
  },
  dayPill: {
    flex: 1,
    minHeight: 72,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xxs
  },
  dayPillActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  dayPillDone: {
    borderColor: colors.success
  },
  dayNumber: {
    fontWeight: '900',
    color: colors.muted
  },
  dayNumberActive: {
    color: colors.text
  },
  doneDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success
  },
  questHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  percentBadge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  percentText: {
    color: colors.primary,
    fontWeight: '900'
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  earnedRewards: {
    alignItems: 'flex-end',
    gap: spacing.xxs
  },
  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  rerollStatus: {
    minHeight: 30,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs
  },
  objectives: {
    gap: spacing.sm
  },
  objectiveRow: {
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  missionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  missionRewards: {
    marginTop: spacing.xs,
    flexDirection: 'row',
    gap: spacing.sm
  },
  cardUnlockReward: {
    marginTop: spacing.xs,
    color: colors.coin,
    fontWeight: '800'
  },
  difficultyBadge: {
    minHeight: 26,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: colors.black,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center'
  },
  rerollIconButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkOrb: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 4, 10, 0.78)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    maxHeight: '92%',
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md
  },
  detailContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg
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
    borderWidth: 1,
    borderColor: colors.borderDim,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardHigh
  },
  titleCard: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    padding: spacing.md,
    gap: spacing.xs
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  detailTile: {
    width: '48%',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    padding: spacing.sm
  },
  detailValue: {
    fontWeight: '900'
  },
  unlockReward: {
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.coin,
    backgroundColor: 'rgba(255, 214, 110, 0.08)',
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  }
});
