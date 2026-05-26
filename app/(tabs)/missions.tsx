import { useState } from 'react';
import { Modal, Pressable, RefreshControl, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { getTodayMissions } from '@/services/missionService';
import { useAppStore } from '@/store/appStore';
import { Mission } from '@/types/domain';

export default function MissionsScreen() {
  const missions = useAppStore((state) => state.missions);
  const setMissions = useAppStore((state) => state.setMissions);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedMission, setSelectedMission] = useState<Mission | null>(null);
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

  const refresh = async () => {
    setRefreshing(true);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setMissions(await getTodayMissions(data.user.id));
    }
    setRefreshing(false);
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
            <AppText variant="title">Strength Training</AppText>
          </View>
          <View style={styles.percentBadge}>
            <AppText style={styles.percentText}>{Math.round(totalProgress * 100)}%</AppText>
          </View>
        </View>
        <ProgressBar value={totalProgress} />
        <View style={styles.summaryRow}>
          <AppText muted>{completedCount}/{visibleMissions.length || 3} completed</AppText>
          <AppText style={{ color: colors.warning, fontWeight: '900' }}>+{xpEarned} XP earned</AppText>
        </View>
        <AppText muted>Resets in {timeUntilTomorrow()}</AppText>

        <View style={styles.objectives}>
          {visibleMissions.length === 0 ? (
            <View style={styles.objectiveRow}>
              <AppText muted>No quests generated for this day.</AppText>
            </View>
          ) : (
            visibleMissions.map((mission) => (
              <Pressable key={mission.id} onPress={() => setSelectedMission(mission)} style={styles.objectiveRow}>
                <View style={styles.checkOrb}>
                  {mission.completedAt && <Ionicons name="checkmark" size={16} color={colors.black} />}
                </View>
                <View style={{ flex: 1 }}>
                  <AppText>{mission.title}</AppText>
                  <AppText muted>{formatObjectiveProgress(mission)}</AppText>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.primary} />
              </Pressable>
            ))
          )}
        </View>

        <PrimaryButton
          label={visibleMissions.length ? 'View Quest' : 'Start Quest'}
          onPress={() => visibleMissions[0] && setSelectedMission(visibleMissions[0])}
          disabled={!visibleMissions.length}
        />
      </Card>

      <QuestDetailModal mission={selectedMission} onClose={() => setSelectedMission(null)} />
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
  const target = mission.type === 'distance_walk_run' ? mission.targetValue / 1000 : mission.targetValue;
  const progress = mission.type === 'distance_walk_run' ? mission.progress / 1000 : mission.progress;
  const suffix = mission.type === 'distance_walk_run' ? ' km' : '';
  return `[${Math.floor(progress)}/${target}${suffix}]`;
};

const missionStat = (mission: Mission) => {
  if (mission.type === 'distance_walk_run') return 'END / SPD';
  if (mission.type === 'pushups') return 'STR';
  if (mission.type === 'workout_duration') return 'CON';
  return 'CON';
};

const missionDifficulty = (mission: Mission) => {
  if (mission.rewardExp >= 45) return 'Hard';
  if (mission.rewardExp >= 35) return 'Normal';
  return 'Easy';
};

const QuestDetailModal = ({ mission, onClose }: { mission: Mission | null; onClose: () => void }) => (
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
          <View style={styles.titleCard}>
            <AppText variant="title">{mission.title}</AppText>
            <AppText muted>Complete this physical objective to earn bonus EXP.</AppText>
          </View>
          <View style={styles.detailGrid}>
            <DetailTile label="Reward" value={`+${mission.rewardExp} XP`} />
            <DetailTile label="Stat" value={missionStat(mission)} />
            <DetailTile label="Difficulty" value={missionDifficulty(mission)} />
            <DetailTile label="Time" value="Today" />
          </View>
          <View>
            <AppText variant="subtitle">Description</AppText>
            <AppText muted>Log matching real-world activity before the daily reset. No penalties, just progress.</AppText>
          </View>
          <View>
            <AppText variant="subtitle">Objectives</AppText>
            <View style={styles.objectiveRow}>
              <View style={styles.checkOrb}>{mission.completedAt && <Ionicons name="checkmark" size={16} color={colors.black} />}</View>
              <AppText>{formatObjectiveProgress(mission)}</AppText>
            </View>
          </View>
          <PrimaryButton label={mission.completedAt ? 'Quest Complete' : 'Complete Quest'} onPress={onClose} disabled={!mission.completedAt} />
        </View>
      )}
    </View>
  </Modal>
);

const DetailTile = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.detailTile}>
    <AppText variant="caption" muted>
      {label}
    </AppText>
    <AppText style={styles.detailValue}>{value}</AppText>
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
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md
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
    color: colors.primary,
    fontWeight: '900'
  }
});
