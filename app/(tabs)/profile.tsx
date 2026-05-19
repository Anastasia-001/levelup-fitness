import { useState } from 'react';
import { useEffect } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { updateProfile } from '@/services/profileService';
import { useAppStore } from '@/store/appStore';
import { UnitPreference } from '@/types/domain';

export default function ProfileScreen() {
  const profile = useAppStore((state) => state.profile);
  const setProfile = useAppStore((state) => state.setProfile);
  const reset = useAppStore((state) => state.reset);
  const [username, setUsername] = useState(profile?.username ?? '');
  const [unitPreference, setUnitPreference] = useState<UnitPreference>(profile?.unitPreference ?? 'metric');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setUsername(profile.username);
      setUnitPreference(profile.unitPreference);
    }
  }, [profile]);

  const save = async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) return;

    setSaving(true);
    try {
      setProfile(await updateProfile(data.user.id, { username, unitPreference }));
      Alert.alert('Profile saved');
    } catch (caught) {
      Alert.alert('Could not save profile', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
    reset();
  };

  return (
    <Screen>
      <View>
        <AppText variant="caption" style={{ color: colors.primary }}>
          Profile
        </AppText>
        <AppText variant="title">Settings</AppText>
      </View>

      <Card>
        <AppText variant="subtitle">Identity</AppText>
        <TextField placeholder="Username" value={username} onChangeText={setUsername} />
        <AppText variant="caption" muted>
          Units
        </AppText>
        <View style={styles.segment}>
          {(['metric', 'imperial'] as const).map((unit) => (
            <Pressable
              key={unit}
              onPress={() => setUnitPreference(unit)}
              style={[styles.segmentItem, unitPreference === unit && styles.segmentActive]}
            >
              <AppText style={unitPreference === unit && styles.segmentTextActive}>
                {unit === 'metric' ? 'Metric' : 'Imperial'}
              </AppText>
            </Pressable>
          ))}
        </View>
        <PrimaryButton label={saving ? 'Saving...' : 'Save profile'} onPress={save} disabled={saving || !username.trim()} />
      </Card>

      <Card>
        <AppText variant="subtitle">Account</AppText>
        <PrimaryButton label="Logout" variant="secondary" onPress={logout} />
        <PrimaryButton label="Delete account placeholder" variant="danger" onPress={() => Alert.alert('Delete account', 'Account deletion flow placeholder.')} />
        <PrimaryButton label="Privacy policy placeholder" variant="secondary" onPress={() => Alert.alert('Privacy policy', 'Privacy policy placeholder.')} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  segmentActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryDim
  },
  segmentTextActive: {
    fontWeight: '800'
  }
});
