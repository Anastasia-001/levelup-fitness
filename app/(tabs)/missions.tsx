import { useState } from 'react';
import { RefreshControl, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { getTodayMissions } from '@/services/missionService';
import { useAppStore } from '@/store/appStore';

export default function MissionsScreen() {
  const missions = useAppStore((state) => state.missions);
  const setMissions = useAppStore((state) => state.setMissions);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = async () => {
    setRefreshing(true);
    const { data } = await supabase.auth.getUser();
    if (data.user) {
      setMissions(await getTodayMissions(data.user.id));
    }
    setRefreshing(false);
  };

  return (
    <Screen refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.primary} />}>
      <View>
        <AppText variant="caption" style={{ color: colors.primary }}>
          Daily missions
        </AppText>
        <AppText variant="title">Today</AppText>
      </View>
      {missions.map((mission) => (
        <Card key={mission.id}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <View style={{ flex: 1 }}>
              <AppText variant="subtitle">{mission.title}</AppText>
              <AppText muted>
                {Math.floor(mission.progress)} / {mission.targetValue}
              </AppText>
            </View>
            <AppText style={{ color: mission.completedAt ? colors.primary : colors.accent, fontWeight: '800' }}>
              {mission.completedAt ? 'DONE' : `+${mission.rewardExp}`}
            </AppText>
          </View>
          <ProgressBar value={mission.progress / mission.targetValue} />
        </Card>
      ))}
    </Screen>
  );
}
