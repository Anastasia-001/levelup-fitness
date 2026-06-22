import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import { colors } from '@/constants/theme';
import { cancelBootstrap, useBootstrap } from '@/hooks/useBootstrap';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/appStore';

const icons = {
  shop: 'storefront-outline',
  record: 'radio-outline',
  character: 'person-circle-outline',
  missions: 'sparkles-outline',
  me: 'person-outline'
} as const;

export default function TabsLayout() {
  const { bootstrap } = useBootstrap();
  const activeUserId = useRef<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;
      if (error) {
        if (__DEV__) console.warn('[LevelUp auth] Session lookup failed.', error);
        useAppStore.getState().setAccountBootstrap({
          loading: false,
          error: error.message,
          profileState: 'error',
          profileError: error.message
        });
        return;
      }
      const userId = data.session?.user.id ?? null;
      activeUserId.current = userId;
      if (userId) void bootstrap(userId);
    };

    void loadSession();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user.id ?? null;
      if (userId === activeUserId.current) return;

      const previousUserId = activeUserId.current;
      activeUserId.current = userId;
      if (previousUserId) cancelBootstrap(previousUserId);
      if (userId) {
        void bootstrap(userId);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      if (activeUserId.current) cancelBootstrap(activeUserId.current);
    };
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
      <Tabs.Screen name="shop" options={{ title: 'Shop' }} />
      <Tabs.Screen name="record" options={{ title: 'Record' }} />
      <Tabs.Screen name="character" options={{ title: 'Character' }} />
      <Tabs.Screen name="missions" options={{ title: 'Missions' }} />
      <Tabs.Screen name="me" options={{ title: 'Me' }} />
    </Tabs>
  );
}
