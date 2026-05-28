import { useState } from 'react';
import { RefreshControl, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ActivityHistoryList } from '@/components/ActivityHistoryList';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { colors, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { listActivities } from '@/services/activityService';
import { useAppStore } from '@/store/appStore';

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
      <ActivityHistoryList activities={activities} units={units} />
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
});
