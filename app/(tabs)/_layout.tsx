import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { colors } from '@/constants/theme';
import { useBootstrap } from '@/hooks/useBootstrap';
import { supabase } from '@/lib/supabase';

const icons = {
  record: 'radio-outline',
  shop: 'storefront-outline',
  character: 'person-circle-outline',
  missions: 'sparkles-outline',
  profile: 'settings-outline'
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
          backgroundColor: colors.card,
          borderTopColor: colors.borderDim,
          minHeight: 74,
          paddingTop: 8
        },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={icons[route.name as keyof typeof icons]} size={size} color={color} />
        )
      })}
    >
      <Tabs.Screen name="record" options={{ title: 'Record' }} />
      <Tabs.Screen name="shop" options={{ title: 'Shop' }} />
      <Tabs.Screen name="character" options={{ title: 'Character' }} />
      <Tabs.Screen name="missions" options={{ title: 'Missions' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile' }} />
    </Tabs>
  );
}
