import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { ACTIVITY_LABELS } from '@/constants/activities';
import { colors, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { listActivities } from '@/services/activityService';
import { useAppStore } from '@/store/appStore';
import { formatDistance, formatDuration } from '@/utils/format';

export default function ActivityHistoryScreen() {
  const router = useRouter();
  const activities = useAppStore((state) => state.activities);
  const units = useAppStore((state) => state.profile?.unitPreference ?? 'metric');
  const setActivities = useAppStore((state) => state.setActivities);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setActivities(await listActivities(data.user.id));
    }
    setRefreshing(false);
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <View style={styles.header}>
        <View>
          <AppText variant="caption" style={{ color: colors.primary }}>
            Logbook
          </AppText>
          <AppText variant="title">Activity History</AppText>
        </View>
        <PrimaryButton label="Back" variant="secondary" onPress={() => router.back()} />
      </View>
      {activities.length === 0 ? (
        <Card>
          <AppText variant="subtitle">No activities yet</AppText>
          <AppText muted>Record a workout to start building your character history.</AppText>
        </Card>
      ) : (
        activities.map((activity) => (
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
        ))
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
