import { useEffect, useMemo, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ActivityHistoryList } from '@/components/ActivityHistoryList';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { colors, radii, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { updateProfile } from '@/services/profileService';
import { useAppStore } from '@/store/appStore';
import { Profile, UnitPreference } from '@/types/domain';
import { formatDistance, formatDuration } from '@/utils/format';

export default function MeScreen() {
  const profile = useAppStore((state) => state.profile);
  const activities = useAppStore((state) => state.activities);
  const units = profile?.unitPreference ?? 'metric';
  const [settingsVisible, setSettingsVisible] = useState(false);
  const totalDistance = activities.reduce((sum, activity) => sum + (activity.distanceMeters ?? 0), 0);
  const totalDuration = activities.reduce((sum, activity) => sum + activity.durationSeconds, 0);
  const totalExp = activities.reduce((sum, activity) => sum + activity.expEarned, 0);
  const weekly = useMemo(() => buildWeeklyBars(activities), [activities]);

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.identity}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={30} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText variant="title">{profile?.username ?? 'Rookie'}</AppText>
            <AppText muted>{profile?.location || 'Set your location'}</AppText>
          </View>
        </View>
        <Pressable onPress={() => setSettingsVisible(true)} style={styles.settingsButton}>
          <Ionicons name="settings-outline" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={styles.summaryGrid}>
        <SummaryTile label="Activities" value={String(activities.length)} />
        <SummaryTile label="Distance" value={formatDistance(totalDistance, units)} />
        <SummaryTile label="Time" value={formatDuration(totalDuration)} />
        <SummaryTile label="EXP" value={String(totalExp)} />
      </View>

      <Card>
        <View style={styles.cardHeader}>
          <View>
            <AppText variant="caption" style={{ color: colors.primary }}>
              Weekly progress
            </AppText>
            <AppText variant="subtitle">Training rhythm</AppText>
          </View>
          <AppText muted>{weekly.reduce((sum, day) => sum + day.count, 0)} sessions</AppText>
        </View>
        <View style={styles.graph}>
          {weekly.map((day) => (
            <View key={day.id} style={styles.barWrap}>
              <View style={[styles.bar, { height: Math.max(8, day.count * 22) }]} />
              <AppText variant="caption" muted>
                {day.label}
              </AppText>
            </View>
          ))}
        </View>
      </Card>

      <View>
        <AppText variant="caption" style={{ color: colors.primary }}>
          Private feed
        </AppText>
        <AppText variant="title">Activity History</AppText>
      </View>
      <ActivityHistoryList activities={activities} units={units} />

      <SettingsModal visible={settingsVisible} onClose={() => setSettingsVisible(false)} />
    </Screen>
  );
}

const SettingsModal = ({ visible, onClose }: { visible: boolean; onClose: () => void }) => {
  const profile = useAppStore((state) => state.profile);
  const setProfile = useAppStore((state) => state.setProfile);
  const reset = useAppStore((state) => state.reset);
  const [draft, setDraft] = useState<Profile | null>(profile);
  const [email, setEmail] = useState('');

  useEffect(() => {
    setDraft(profile);
  }, [profile]);

  useEffect(() => {
    if (!draft || !profile) return;
    const changed = JSON.stringify(draft) !== JSON.stringify(profile);
    if (!changed) return;

    const timer = setTimeout(async () => {
      try {
        const saved = await updateProfile(profile.id, {
          username: draft.username,
          location: draft.location,
          unitPreference: draft.unitPreference,
          privacyControlsEnabled: draft.privacyControlsEnabled,
          healthDataEnabled: draft.healthDataEnabled,
          emailNotificationsEnabled: draft.emailNotificationsEnabled,
          pushNotificationsEnabled: draft.pushNotificationsEnabled
        });
        setProfile(saved);
      } catch (caught) {
        Alert.alert('Settings not saved', caught instanceof Error ? caught.message : 'Try again.');
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [draft, profile, setProfile]);

  const logout = async () => {
    await supabase.auth.signOut();
    reset();
  };

  const changeEmail = async () => {
    if (!email.trim()) return;
    const { error } = await supabase.auth.updateUser({ email: email.trim() });
    if (error) {
      Alert.alert('Email update failed', error.message);
      return;
    }
    Alert.alert('Email update started', 'Check your inbox to confirm the new email address.');
    setEmail('');
  };

  if (!draft) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.cardHeader}>
            <View>
              <AppText variant="caption" style={{ color: colors.primary }}>
                Autosaved
              </AppText>
              <AppText variant="title">Settings</AppText>
            </View>
            <Pressable onPress={onClose} style={styles.settingsButton}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.settingsContent} showsVerticalScrollIndicator={false}>
            <TextField value={draft.username} onChangeText={(username) => setDraft({ ...draft, username })} placeholder="Username" />
            <TextField value={draft.location ?? ''} onChangeText={(location) => setDraft({ ...draft, location })} placeholder="Location" />
            <View style={styles.emailRow}>
              <View style={{ flex: 1 }}>
                <TextField value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="Change email" />
              </View>
              <PrimaryButton label="Send" onPress={changeEmail} disabled={!email.trim()} style={styles.sendButton} />
            </View>

            <SettingsSegment
              label="Units of measurement"
              value={draft.unitPreference}
              onChange={(unitPreference) => setDraft({ ...draft, unitPreference })}
            />
            <SettingsSwitch label="Privacy controls" value={draft.privacyControlsEnabled} onChange={(privacyControlsEnabled) => setDraft({ ...draft, privacyControlsEnabled })} />
            <SettingsSwitch label="Health data" value={draft.healthDataEnabled} onChange={(healthDataEnabled) => setDraft({ ...draft, healthDataEnabled })} />
            <SettingsSwitch label="Email notifications" value={draft.emailNotificationsEnabled} onChange={(emailNotificationsEnabled) => setDraft({ ...draft, emailNotificationsEnabled })} />
            <SettingsSwitch label="Push notifications" value={draft.pushNotificationsEnabled} onChange={(pushNotificationsEnabled) => setDraft({ ...draft, pushNotificationsEnabled })} />
            <PrimaryButton label="Policy / Privacy Policy" variant="secondary" onPress={() => Alert.alert('Policy', 'Privacy policy placeholder.')} />
            <PrimaryButton label="Log out" variant="secondary" onPress={logout} />
            <PrimaryButton label="Delete account" variant="danger" onPress={() => Alert.alert('Delete account', 'Account deletion flow placeholder.')} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const SummaryTile = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.summaryTile}>
    <AppText variant="caption" muted>
      {label}
    </AppText>
    <AppText variant="metric">{value}</AppText>
  </View>
);

const SettingsSwitch = ({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) => (
  <View style={styles.settingRow}>
    <AppText>{label}</AppText>
    <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primaryDim, false: colors.borderDim }} thumbColor={value ? colors.primary : colors.muted} />
  </View>
);

const SettingsSegment = ({
  label,
  value,
  onChange
}: {
  label: string;
  value: UnitPreference;
  onChange: (value: UnitPreference) => void;
}) => (
  <View style={styles.settingBlock}>
    <AppText>{label}</AppText>
    <View style={styles.segment}>
      {(['metric', 'imperial'] as const).map((unit) => (
        <Pressable key={unit} onPress={() => onChange(unit)} style={[styles.segmentItem, value === unit && styles.segmentActive]}>
          <AppText style={value === unit && styles.segmentText}>{unit === 'metric' ? 'Metric' : 'Imperial'}</AppText>
        </Pressable>
      ))}
    </View>
  </View>
);

const buildWeeklyBars = (activities: ReturnType<typeof useAppStore.getState>['activities']) => {
  const today = new Date();
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (6 - index));
    return {
      id: date.toDateString(),
      label: date.toLocaleString(undefined, { weekday: 'short' }).slice(0, 1),
      count: activities.filter((activity) => new Date(activity.completedAt).toDateString() === date.toDateString()).length
    };
  });
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  identity: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center'
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  summaryTile: {
    width: '48.4%',
    minHeight: 82,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.card,
    padding: spacing.md,
    justifyContent: 'center'
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  graph: {
    height: 132,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  barWrap: {
    flex: 1,
    alignItems: 'center',
    gap: spacing.xs
  },
  bar: {
    width: '80%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 4, 10, 0.78)',
    justifyContent: 'flex-end'
  },
  modalCard: {
    height: '92%',
    backgroundColor: colors.card,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md
  },
  settingsContent: {
    gap: spacing.md,
    paddingBottom: spacing.lg
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  sendButton: {
    minWidth: 88
  },
  settingRow: {
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  settingBlock: {
    gap: spacing.sm
  },
  segment: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  segmentItem: {
    flex: 1,
    minHeight: 44,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderDim,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cardHigh
  },
  segmentActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  segmentText: {
    color: colors.primary,
    fontWeight: '900'
  }
});
