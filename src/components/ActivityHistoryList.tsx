import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { PrimaryButton } from '@/components/PrimaryButton';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ACTIVITY_LABELS } from '@/constants/activities';
import { colors, spacing } from '@/constants/theme';
import { Activity, UnitPreference } from '@/types/domain';
import { formatDistance, formatDuration } from '@/utils/format';

export const ActivityHistoryList = ({
  activities,
  units
}: {
  activities: Activity[];
  units: UnitPreference;
}) => {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

  if (activities.length === 0) {
    return (
      <Card>
        <AppText variant="subtitle">No activities yet</AppText>
        <AppText muted>Record a workout to start building your character history.</AppText>
      </Card>
    );
  }

  return (
    <View style={styles.list}>
      {activities.map((activity) => (
        <Pressable key={activity.id} onPress={() => setSelectedActivity(activity)}>
          <Card>
            {activity.photoUrl && <ActivityPhoto uri={activity.photoUrl} />}
            <View style={styles.activityTop}>
              <View style={{ flex: 1 }}>
                <AppText variant="subtitle">{activity.title || ACTIVITY_LABELS[activity.type]}</AppText>
                <AppText muted>{new Date(activity.completedAt).toLocaleString()}</AppText>
                <AppText variant="caption" style={styles.activityType}>
                  {ACTIVITY_LABELS[activity.type]}
                </AppText>
              </View>
              <AppText style={styles.exp}>+{activity.expEarned} EXP</AppText>
            </View>
            <View style={styles.activityMeta}>
              <AppText>{formatDuration(activity.durationSeconds)}</AppText>
              <AppText>{activity.distanceMeters ? formatDistance(activity.distanceMeters, units) : 'Manual'}</AppText>
            </View>
          </Card>
        </Pressable>
      ))}
      <Modal visible={Boolean(selectedActivity)} transparent animationType="slide" onRequestClose={() => setSelectedActivity(null)}>
        <View style={styles.modalBackdrop}>
          {selectedActivity && (
            <View style={styles.modalCard}>
              {selectedActivity.photoUrl && <ActivityPhoto uri={selectedActivity.photoUrl} large />}
              <AppText variant="title">{selectedActivity.title || ACTIVITY_LABELS[selectedActivity.type]}</AppText>
              <AppText variant="caption" style={styles.activityType}>
                {ACTIVITY_LABELS[selectedActivity.type]}
              </AppText>
              <AppText muted>{new Date(selectedActivity.completedAt).toLocaleString()}</AppText>
              <View style={styles.activityMeta}>
                <AppText>{formatDuration(selectedActivity.durationSeconds)}</AppText>
                <AppText>{selectedActivity.distanceMeters ? formatDistance(selectedActivity.distanceMeters, units) : 'Manual workout'}</AppText>
                <AppText style={styles.exp}>+{selectedActivity.expEarned} EXP</AppText>
              </View>
              <PrimaryButton label="Close" onPress={() => setSelectedActivity(null)} />
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
};

const ActivityPhoto = ({ uri, large = false }: { uri: string; large?: boolean }) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  if (failed) {
    return (
      <View style={[styles.photoPlaceholder, large && styles.detailPhoto]}>
        <AppText variant="caption" style={styles.photoPlaceholderText}>
          Photo unavailable
        </AppText>
      </View>
    );
  }

  return (
    <Image
      source={{ uri }}
      style={[styles.photo, large && styles.detailPhoto]}
      resizeMode="cover"
      onError={() => setFailed(true)}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    gap: spacing.md
  },
  activityTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  activityMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between'
  },
  exp: {
    color: colors.warning,
    fontWeight: '900'
  },
  activityType: {
    color: colors.primary,
    marginTop: spacing.xs
  },
  photo: {
    width: '100%',
    height: 150,
    borderRadius: 16,
    backgroundColor: colors.cardHigh
  },
  photoPlaceholder: {
    width: '100%',
    height: 150,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center'
  },
  photoPlaceholderText: {
    color: colors.primary
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 4, 10, 0.78)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md
  },
  detailPhoto: {
    width: '100%',
    height: 220,
    borderRadius: 18,
    backgroundColor: colors.cardHigh
  }
});
