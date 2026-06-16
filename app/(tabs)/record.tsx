import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/AppText';
import { FitnessMap } from '@/components/FitnessMap';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ACTIVITY_LABELS, GPS_ACTIVITY_TYPES, MANUAL_ACTIVITY_TYPES, isGpsActivity } from '@/constants/activities';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { saveActivity, uploadActivityPhoto } from '@/services/activityService';
import { getTodayMissions } from '@/services/missionService';
import { ensureProfileAndCharacter } from '@/services/profileService';
import { useAppStore } from '@/store/appStore';
import { Activity, ActivityType, RoutePoint } from '@/types/domain';
import { formatDistance, formatDuration, formatPace } from '@/utils/format';
import { distanceBetweenMeters } from '@/utils/geo';

type RecordingState = 'idle' | 'recording' | 'paused';

const sportGroups = [
  { title: 'GPS sports', items: GPS_ACTIVITY_TYPES },
  { title: 'Manual workouts', items: MANUAL_ACTIVITY_TYPES }
] as const;

export default function RecordScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ActivityType>('run');
  const [sportModalVisible, setSportModalVisible] = useState(false);
  const [sportSearch, setSportSearch] = useState('');
  const [manualModalVisible, setManualModalVisible] = useState(false);
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [route, setRoute] = useState<RoutePoint[]>([]);
  const [currentPoint, setCurrentPoint] = useState<RoutePoint | null>(null);
  const [durationMinutes, setDurationMinutes] = useState('');
  const [sets, setSets] = useState('');
  const [reps, setReps] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [savedActivity, setSavedActivity] = useState<Activity | null>(null);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const recordingStateRef = useRef<RecordingState>('idle');
  const addActivity = useAppStore((state) => state.addActivity);
  const updateActivity = useAppStore((state) => state.updateActivity);
  const setCharacter = useAppStore((state) => state.setCharacter);
  const setMissions = useAppStore((state) => state.setMissions);
  const units = useAppStore((state) => state.profile?.unitPreference ?? 'metric');
  const selectedIsGps = isGpsActivity(selectedType);

  const visibleSportGroups = useMemo(() => {
    const query = sportSearch.trim().toLowerCase();
    return sportGroups.map((group) => ({
      ...group,
      items: group.items.filter((type) => ACTIVITY_LABELS[type].toLowerCase().includes(query))
    }));
  }, [sportSearch]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        await ensureProfileAndCharacter(
          data.user.id,
          data.user.user_metadata.username ?? data.user.email?.split('@')[0] ?? 'Rookie'
        );
      }
    });

    return () => {
      watchRef.current?.remove();
    };
  }, []);

  useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  useEffect(() => {
    if (recordingState !== 'recording') return;

    const timer = setInterval(() => setElapsedSeconds((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [recordingState]);

  const startGps = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Location needed', 'Enable location permission to record GPS activities.');
      return;
    }

    setElapsedSeconds(0);
    setDistanceMeters(0);
    setRoute([]);
    setCurrentPoint(null);
    setRecordingState('recording');

    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        distanceInterval: 5,
        timeInterval: 3000
      },
      (location) => {
        if (recordingStateRef.current !== 'recording') return;

        const point: RoutePoint = {
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          altitude: location.coords.altitude,
          accuracy: location.coords.accuracy,
          timestamp: location.timestamp
        };

        setCurrentPoint(point);
        setRoute((current) => {
          const last = current[current.length - 1];
          if (last) {
            setDistanceMeters((meters) => meters + distanceBetweenMeters(last, point));
          }
          return [...current, point];
        });
      }
    );
  };

  const stopGps = async () => {
    if (!userId) return;
    watchRef.current?.remove();
    watchRef.current = null;
    setRecordingState('idle');
    await saveWorkout({
      type: selectedType,
      durationSeconds: elapsedSeconds,
      distanceMeters,
      route
    });
  };

  const saveManualWorkout = async () => {
    await saveWorkout({
      type: selectedType,
      durationSeconds: Math.max(1, Number(durationMinutes || 0)) * 60,
      sets: sets ? Number(sets) : undefined,
      reps: reps ? Number(reps) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined
    });
    setDurationMinutes('');
    setSets('');
    setReps('');
    setWeightKg('');
    setManualModalVisible(false);
  };

  const saveWorkout = async (input: Parameters<typeof saveActivity>[1]) => {
    if (!userId) return;
    setSaving(true);
    try {
      const result = await saveActivity(userId, input);
      addActivity(result.activity);
      setCharacter(result.character);
      setMissions(result.missions.length ? result.missions : await getTodayMissions(userId));
      setSavedActivity(result.activity);
    } catch (caught) {
      Alert.alert('Could not save activity', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const addPhoto = async (source: 'camera' | 'library') => {
    if (!userId || !savedActivity) return;
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      Alert.alert('Photo permission needed', 'Allow photo access to attach an image to this activity.');
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.82 })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.82
          });

    if (result.canceled || !result.assets[0]?.uri) return;

    setPhotoUploading(true);
    try {
      const updated = await uploadActivityPhoto(userId, savedActivity.id, result.assets[0].uri);
      updateActivity(updated);
      setSavedActivity(updated);
    } catch (caught) {
      Alert.alert('Photo upload failed', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setPhotoUploading(false);
    }
  };

  const closePostActivity = () => {
    setSavedActivity(null);
    setElapsedSeconds(0);
    setDistanceMeters(0);
    setRoute([]);
    setCurrentPoint(null);
  };

  return (
    <Screen scroll={false}>
      <View style={styles.shell}>
        <View style={styles.mapArea}>
          <FitnessMap route={route} currentPoint={currentPoint} />
          <View style={styles.topOverlay}>
            <StatPill label="Time" value={formatDuration(elapsedSeconds)} />
            <StatPill label="Distance" value={formatDistance(distanceMeters, units)} />
            <StatPill label="Avg Pace" value={formatPace(elapsedSeconds, distanceMeters, units)} />
          </View>
          <View style={styles.sportBadge}>
            <Ionicons name={selectedIsGps ? 'navigate' : 'barbell'} size={16} color={colors.primary} />
            <AppText style={styles.sportBadgeText}>{ACTIVITY_LABELS[selectedType]}</AppText>
          </View>
        </View>

        <View style={styles.bottomControls}>
          <Pressable
            onPress={() => recordingState === 'idle' && setSportModalVisible(true)}
            disabled={recordingState !== 'idle'}
            style={({ pressed }) => [styles.sportButton, pressed && styles.pressed, recordingState !== 'idle' && styles.disabled]}
          >
            <Ionicons name={selectedIsGps ? 'walk' : 'fitness'} size={22} color={colors.primary} />
            <AppText variant="caption" style={styles.sportButtonText}>
              {ACTIVITY_LABELS[selectedType]}
            </AppText>
          </Pressable>

          <View style={styles.primaryControls}>
            {selectedIsGps ? (
              <>
                {recordingState === 'idle' && (
                  <Pressable onPress={startGps} disabled={saving} style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}>
                    <Ionicons name="play" size={30} color={colors.black} />
                  </Pressable>
                )}
                {recordingState === 'recording' && (
                  <View style={styles.recordingButtons}>
                    <PrimaryButton label="Pause" variant="secondary" onPress={() => setRecordingState('paused')} style={styles.controlButton} />
                    <PrimaryButton label={saving ? 'Saving...' : 'Stop'} variant="danger" onPress={stopGps} disabled={saving || elapsedSeconds < 5} style={styles.controlButton} />
                  </View>
                )}
                {recordingState === 'paused' && (
                  <View style={styles.recordingButtons}>
                    <PrimaryButton label="Resume" onPress={() => setRecordingState('recording')} style={styles.controlButton} />
                    <PrimaryButton label={saving ? 'Saving...' : 'Stop'} variant="danger" onPress={stopGps} disabled={saving || elapsedSeconds < 5} style={styles.controlButton} />
                  </View>
                )}
              </>
            ) : (
              <Pressable onPress={() => setManualModalVisible(true)} disabled={saving} style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}>
                <Ionicons name="add" size={30} color={colors.black} />
              </Pressable>
            )}
          </View>

          <View style={styles.sideSpacer} />
        </View>
      </View>

      <SportSelectorModal
        visible={sportModalVisible}
        search={sportSearch}
        onSearch={setSportSearch}
        groups={visibleSportGroups}
        selectedType={selectedType}
        onSelect={(type) => {
          setSelectedType(type);
          setSportModalVisible(false);
          setSportSearch('');
        }}
        onClose={() => setSportModalVisible(false)}
      />

      <ManualWorkoutModal
        visible={manualModalVisible}
        type={selectedType}
        durationMinutes={durationMinutes}
        sets={sets}
        reps={reps}
        weightKg={weightKg}
        saving={saving}
        onDuration={setDurationMinutes}
        onSets={setSets}
        onReps={setReps}
        onWeight={setWeightKg}
        onSave={saveManualWorkout}
        onClose={() => setManualModalVisible(false)}
      />

      <PostActivityModal
        activity={savedActivity}
        units={units}
        uploading={photoUploading}
        onCamera={() => addPhoto('camera')}
        onLibrary={() => addPhoto('library')}
        onClose={closePostActivity}
      />
    </Screen>
  );
}

const StatPill = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.statPill}>
    <AppText variant="caption" muted>
      {label}
    </AppText>
    <AppText style={styles.statValue}>{value}</AppText>
  </View>
);

const SportSelectorModal = ({
  visible,
  search,
  groups,
  selectedType,
  onSearch,
  onSelect,
  onClose
}: {
  visible: boolean;
  search: string;
  groups: { title: string; items: readonly ActivityType[] }[];
  selectedType: ActivityType;
  onSearch: (value: string) => void;
  onSelect: (type: ActivityType) => void;
  onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View>
            <AppText variant="caption" style={{ color: colors.primary }}>
              Activity
            </AppText>
            <AppText variant="title">Choose sport</AppText>
          </View>
          <Pressable onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
        <TextField value={search} onChangeText={onSearch} placeholder="Search sports" />
        <ScrollView contentContainerStyle={styles.sportList}>
          {groups.map((group) =>
            group.items.length ? (
              <View key={group.title} style={styles.sportGroup}>
                <AppText variant="caption" style={{ color: colors.primary }}>
                  {group.title}
                </AppText>
                {group.items.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => onSelect(type)}
                    style={[styles.sportRow, selectedType === type && styles.sportRowActive]}
                  >
                    <Ionicons name={isGpsActivity(type) ? 'navigate-outline' : 'barbell-outline'} size={20} color={colors.primary} />
                    <AppText style={{ flex: 1 }}>{ACTIVITY_LABELS[type]}</AppText>
                    {selectedType === type && <Ionicons name="checkmark-circle" size={20} color={colors.success} />}
                  </Pressable>
                ))}
              </View>
            ) : null
          )}
        </ScrollView>
      </View>
    </View>
  </Modal>
);

const ManualWorkoutModal = ({
  visible,
  type,
  durationMinutes,
  sets,
  reps,
  weightKg,
  saving,
  onDuration,
  onSets,
  onReps,
  onWeight,
  onSave,
  onClose
}: {
  visible: boolean;
  type: ActivityType;
  durationMinutes: string;
  sets: string;
  reps: string;
  weightKg: string;
  saving: boolean;
  onDuration: (value: string) => void;
  onSets: (value: string) => void;
  onReps: (value: string) => void;
  onWeight: (value: string) => void;
  onSave: () => void;
  onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View>
            <AppText variant="caption" style={{ color: colors.primary }}>
              Manual log
            </AppText>
            <AppText variant="title">{ACTIVITY_LABELS[type]}</AppText>
          </View>
          <Pressable onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>
        <TextField placeholder="Duration minutes" keyboardType="numeric" value={durationMinutes} onChangeText={onDuration} />
        <TextField placeholder="Sets optional" keyboardType="numeric" value={sets} onChangeText={onSets} />
        <TextField placeholder="Reps optional" keyboardType="numeric" value={reps} onChangeText={onReps} />
        <TextField placeholder="Weight kg optional" keyboardType="numeric" value={weightKg} onChangeText={onWeight} />
        <PrimaryButton label={saving ? 'Saving...' : 'Save workout'} onPress={onSave} disabled={saving || Number(durationMinutes || 0) <= 0} />
      </View>
    </View>
  </Modal>
);

const PostActivityModal = ({
  activity,
  units,
  uploading,
  onCamera,
  onLibrary,
  onClose
}: {
  activity: Activity | null;
  units: 'metric' | 'imperial';
  uploading: boolean;
  onCamera: () => void;
  onLibrary: () => void;
  onClose: () => void;
}) => (
  <Modal visible={Boolean(activity)} animationType="slide" onRequestClose={onClose}>
    <SafeAreaView style={styles.postSafeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.postKeyboard}
      >
        {activity && (
          <ScrollView
            contentContainerStyle={styles.postScroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.postHeader}>
              <View style={{ flex: 1 }}>
                <AppText variant="caption" style={{ color: colors.success }}>
                  Activity saved
                </AppText>
                <AppText variant="title">Add a photo?</AppText>
              </View>
              <Pressable onPress={onClose} style={styles.iconButton}>
                <Ionicons name="close" size={22} color={colors.text} />
              </Pressable>
            </View>

            {activity.photoUrl ? (
              <Image source={{ uri: activity.photoUrl }} style={styles.postPhoto} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <View style={styles.photoIconRing}>
                  <Ionicons name="image-outline" size={38} color={colors.primary} />
                </View>
                <AppText variant="subtitle">No photo attached</AppText>
                <AppText muted style={styles.photoHelpText}>
                  Add a workout photo now, or finish without one.
                </AppText>
              </View>
            )}

            <View style={styles.summaryGrid}>
              <SummaryCard label="Sport" value={ACTIVITY_LABELS[activity.type]} />
              <SummaryCard label="Time" value={formatDuration(activity.durationSeconds)} />
              <SummaryCard
                label="Distance"
                value={activity.distanceMeters ? formatDistance(activity.distanceMeters, units) : 'Manual'}
              />
            </View>

            <View style={styles.postActions}>
              <PrimaryButton label={uploading ? 'Uploading...' : 'Take photo'} onPress={onCamera} disabled={uploading} />
              <PrimaryButton
                label={uploading ? 'Uploading...' : 'Choose from library'}
                variant="secondary"
                onPress={onLibrary}
                disabled={uploading}
              />
              <PrimaryButton label="Save activity / Finish" onPress={onClose} disabled={uploading} />
              <PrimaryButton label={activity.photoUrl ? 'Done' : 'Skip'} variant="secondary" onPress={onClose} disabled={uploading} />
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  </Modal>
);

const SummaryCard = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.summaryCard}>
    <AppText variant="caption" muted>
      {label}
    </AppText>
    <AppText style={styles.summaryValue} numberOfLines={1}>
      {value}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    gap: spacing.md
  },
  mapArea: {
    flex: 1,
    minHeight: 0,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.black
  },
  topOverlay: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    gap: spacing.sm
  },
  statPill: {
    flex: 1,
    minHeight: 66,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: 'rgba(11, 22, 40, 0.86)',
    padding: spacing.sm,
    justifyContent: 'center'
  },
  statValue: {
    color: colors.text,
    fontWeight: '900'
  },
  sportBadge: {
    position: 'absolute',
    left: spacing.md,
    top: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(11, 22, 40, 0.78)',
    paddingHorizontal: spacing.md,
    minHeight: 38
  },
  sportBadgeText: {
    color: colors.primary,
    fontWeight: '900'
  },
  bottomControls: {
    minHeight: 116,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card
  },
  sportButton: {
    width: 96,
    minHeight: 70,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.xs
  },
  sportButtonText: {
    color: colors.primary,
    textAlign: 'center'
  },
  primaryControls: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  startButton: {
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.cyanGlow
  },
  recordingButtons: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  controlButton: {
    minWidth: 108,
    minHeight: 56,
    paddingHorizontal: spacing.md
  },
  sideSpacer: {
    width: 96
  },
  pressed: {
    transform: [{ scale: 0.97 }]
  },
  disabled: {
    opacity: 0.45
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 4, 10, 0.78)',
    justifyContent: 'flex-end'
  },
  sheet: {
    maxHeight: '90%',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.md
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center'
  },
  sportList: {
    gap: spacing.md,
    paddingBottom: spacing.md
  },
  sportGroup: {
    gap: spacing.sm
  },
  sportRow: {
    minHeight: 56,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  sportRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  postSafeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  postKeyboard: {
    flex: 1
  },
  postScroll: {
    flexGrow: 1,
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  photoPlaceholder: {
    minHeight: 300,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    ...shadows.cyanGlow
  },
  photoIconRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  photoHelpText: {
    textAlign: 'center'
  },
  postPhoto: {
    width: '100%',
    minHeight: 320,
    borderRadius: radii.lg,
    backgroundColor: colors.black
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  summaryCard: {
    flex: 1,
    minHeight: 76,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.card,
    padding: spacing.sm,
    justifyContent: 'center'
  },
  summaryValue: {
    color: colors.text,
    fontWeight: '900'
  },
  postActions: {
    gap: spacing.sm,
    paddingTop: spacing.xs
  }
});
