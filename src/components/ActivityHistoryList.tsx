import { StyleSheet, View } from 'react-native';
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
        <Card key={activity.id}>
          <View style={styles.activityTop}>
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle">{ACTIVITY_LABELS[activity.type]}</AppText>
              <AppText muted>{new Date(activity.completedAt).toLocaleString()}</AppText>
            </View>
            <AppText style={styles.exp}>+{activity.expEarned} EXP</AppText>
          </View>
          <View style={styles.activityMeta}>
            <AppText>{formatDuration(activity.durationSeconds)}</AppText>
            <AppText>{activity.distanceMeters ? formatDistance(activity.distanceMeters, units) : 'Manual'}</AppText>
          </View>
        </Card>
      ))}
    </View>
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
  }
});
