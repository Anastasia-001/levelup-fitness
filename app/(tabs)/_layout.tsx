import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { colors } from '@/constants/theme';
import { useBootstrap } from '@/hooks/useBootstrap';
import { supabase } from '@/lib/supabase';

const icons = {
  record: 'radio',
  activities: 'list',
  character: 'person',
  missions: 'flag',
  profile: 'settings'
} as const;

export default function TabsLayout() {
  const { bootstrap } = useBootstrap();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        bootstrap(data.user.id);
      }
    });
  }, [bootstrap]);

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.faint,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name as keyof typeof icons]} size={size} color={color} />
        )
      })}
    >
      <Tabs.Screen name="record" options={{ title: 'Record' }} />
      <Tabs.Screen name="activities" options={{ title: 'Activities' }} />
      <Tabs.Screen name="character" options={{ title: 'Character' }} />
      <Tabs.Screen name="missions" options={{ title: 'Missions' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
