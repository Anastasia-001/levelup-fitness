import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityRouteMap } from '@/components/ActivityRouteMap';
import { AppText } from '@/components/AppText';
import { FitnessMap } from '@/components/FitnessMap';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ACTIVITY_LABELS, GPS_ACTIVITY_TYPES, MANUAL_ACTIVITY_TYPES, isGpsActivity } from '@/constants/activities';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { saveActivity, updateActivityTitle, updateActivityType, uploadActivityPhoto } from '@/services/activityService';
import {
  clearQueuedBackgroundPoints,
  consumeQueuedBackgroundPoints,
  evaluateRoutePoint,
  requestGpsPermissions,
  routePointFromLocation,
  startBackgroundLocationUpdates,
  startForegroundLocationUpdates,
  stopBackgroundLocationUpdates
} from '@/services/gpsTracking';
import { fallbackActivityTitle } from '@/services/mappers';
import { getTodayMissions } from '@/services/missionService';
import { ensureProfileAndCharacter } from '@/services/profileService';
import { rebuildPersonalRecords, refreshProgressionMilestones } from '@/services/progressionService';
import { useAppStore } from '@/store/appStore';
import { Activity, ActivityType, PersonalRecord, RoutePoint } from '@/types/domain';
import { formatDistance, formatDuration, formatPace } from '@/utils/format';
import { PERSONAL_RECORD_LABELS } from '@/utils/progression';

type RecordingState = 'idle' | 'recording' | 'paused';
type GpsStatus = 'finding' | 'ready' | 'unavailable';

const sportGroups = [
  { id: 'gps-sports', title: 'GPS sports', items: GPS_ACTIVITY_TYPES },
  { id: 'manual-workouts', title: 'Manual workouts', items: MANUAL_ACTIVITY_TYPES }
] as const;
const POST_ACTIVITY_TYPES: ActivityType[] = [...GPS_ACTIVITY_TYPES, ...MANUAL_ACTIVITY_TYPES];

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
  const [titleSaving, setTitleSaving] = useState(false);
  const [sportSaving, setSportSaving] = useState(false);
  const [activityTitle, setActivityTitle] = useState('');
  const [photoPreviewUri, setPhotoPreviewUri] = useState<string | null>(null);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const [photoRenderFailed, setPhotoRenderFailed] = useState(false);
  const [backgroundTrackingActive, setBackgroundTrackingActive] = useState(false);
  const [backgroundTrackingWarning, setBackgroundTrackingWarning] = useState<string | null>(null);
  const [gpsStatus, setGpsStatus] = useState<GpsStatus>('finding');
  const [savedActivity, setSavedActivity] = useState<Activity | null>(null);
  const [newPersonalRecords, setNewPersonalRecords] = useState<PersonalRecord[]>([]);
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const recordingStateRef = useRef<RecordingState>('idle');
  const selectedTypeRef = useRef<ActivityType>('run');
  const startedAtMsRef = useRef<number | null>(null);
  const pausedAtMsRef = useRef<number | null>(null);
  const stoppedAtMsRef = useRef<number | null>(null);
  const pausedDurationMsRef = useRef(0);
  const routeRef = useRef<RoutePoint[]>([]);
  const currentPointRef = useRef<RoutePoint | null>(null);
  const distanceMetersRef = useRef(0);
  const segmentIdRef = useRef(0);
  const backgroundTrackingAllowedRef = useRef(false);
  const forceNextSegmentRef = useRef(false);
  const appStateRef = useRef(AppState.currentState);
  const addActivity = useAppStore((state) => state.addActivity);
  const updateActivity = useAppStore((state) => state.updateActivity);
  const setCharacter = useAppStore((state) => state.setCharacter);
  const setMissions = useAppStore((state) => state.setMissions);
  const setProgressionStreaks = useAppStore((state) => state.setProgressionStreaks);
  const setAchievements = useAppStore((state) => state.setAchievements);
  const setPersonalRecords = useAppStore((state) => state.setPersonalRecords);
  const units = useAppStore((state) => state.profile?.unitPreference ?? 'metric');
  const selectedIsGps = isGpsActivity(selectedType);

  const calculateElapsedSeconds = useCallback((now = Date.now()) => {
    if (!startedAtMsRef.current) return 0;
    const end = recordingStateRef.current === 'paused' && pausedAtMsRef.current ? pausedAtMsRef.current : now;
    return Math.max(0, Math.floor((end - startedAtMsRef.current - pausedDurationMsRef.current) / 1000));
  }, []);

  const visibleSportGroups = useMemo(() => {
    const query = sportSearch.trim().toLowerCase();
    return sportGroups.map((group) => ({
      ...group,
      items: group.items.filter((type) => ACTIVITY_LABELS[type].toLowerCase().includes(query))
    }));
  }, [sportSearch]);

  const getCurrentLocationPoint = useCallback(
    async ({ requestPermission = false, showLoading = false }: { requestPermission?: boolean; showLoading?: boolean } = {}) => {
      if (Platform.OS === 'web') {
        setGpsStatus('unavailable');
        return null;
      }

      if (showLoading) {
        setGpsStatus('finding');
      }

      try {
        if (requestPermission) {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (permission.status !== 'granted') {
            setGpsStatus('unavailable');
            return null;
          }
        }

        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.BestForNavigation
        });
        const point = routePointFromLocation(location);

        if (!point) {
          setGpsStatus(currentPointRef.current ? 'ready' : 'unavailable');
          return null;
        }

        currentPointRef.current = point;
        setCurrentPoint(point);
        setGpsStatus('ready');
        return point;
      } catch (caught) {
        if (__DEV__) console.warn('[LevelUp] Initial GPS fix failed', caught);
        setGpsStatus(currentPointRef.current ? 'ready' : 'unavailable');
        return null;
      }
    },
    []
  );

  const appendRoutePoint = useCallback((point: RoutePoint, forceNewSegment = false) => {
    if (recordingStateRef.current !== 'recording') return;

    const result = evaluateRoutePoint({
      point,
      lastPoint: routeRef.current[routeRef.current.length - 1],
      activityType: selectedTypeRef.current,
      segmentId: segmentIdRef.current,
      forceNewSegment: forceNewSegment || forceNextSegmentRef.current
    });

    if (!result.accepted || !result.point) {
      if (__DEV__ && result.reason && result.reason !== 'duplicate-point') {
        console.log('[LevelUp] Ignored GPS point', result.reason);
      }
      return;
    }

    forceNextSegmentRef.current = false;
    segmentIdRef.current = result.segmentId;
    const nextRoute = [...routeRef.current, result.point];
    const nextDistance = distanceMetersRef.current + result.distanceDelta;

    routeRef.current = nextRoute;
    currentPointRef.current = result.point;
    distanceMetersRef.current = nextDistance;
    setRoute(nextRoute);
    setDistanceMeters(nextDistance);
    setCurrentPoint(result.point);
    setGpsStatus('ready');
  }, []);

  const mergeQueuedBackgroundRoutePoints = useCallback(async () => {
    const points = await consumeQueuedBackgroundPoints();
    if (!points.length) return;

    points
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((point) => appendRoutePoint(point));
  }, [appendRoutePoint]);

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
      void stopBackgroundLocationUpdates();
    };
  }, []);

  useEffect(() => {
    void getCurrentLocationPoint({ requestPermission: true, showLoading: true });
  }, [getCurrentLocationPoint]);

  useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  useEffect(() => {
    selectedTypeRef.current = selectedType;
  }, [selectedType]);

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    currentPointRef.current = currentPoint;
  }, [currentPoint]);

  useEffect(() => {
    distanceMetersRef.current = distanceMeters;
  }, [distanceMeters]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      const wasBackgrounded = appStateRef.current.match(/inactive|background/);
      appStateRef.current = nextState;

      if (wasBackgrounded && nextState === 'active' && recordingStateRef.current !== 'idle') {
        setElapsedSeconds(calculateElapsedSeconds());
        void mergeQueuedBackgroundRoutePoints();
      }
    });

    return () => subscription.remove();
  }, [calculateElapsedSeconds, mergeQueuedBackgroundRoutePoints]);

  useEffect(() => {
    if (recordingState === 'idle') return;

    setElapsedSeconds(calculateElapsedSeconds());
    const timer = setInterval(() => setElapsedSeconds(calculateElapsedSeconds()), 1000);
    return () => clearInterval(timer);
  }, [calculateElapsedSeconds, recordingState]);

  const startLiveLocationWatch = async () => {
    watchRef.current?.remove();
    watchRef.current = await startForegroundLocationUpdates(
      (point) => {
        void (async () => {
          await mergeQueuedBackgroundRoutePoints();
          appendRoutePoint(point);
        })();
      },
      (message) => {
        if (__DEV__) console.warn('[LevelUp] Foreground GPS error', message);
      }
    );
  };

  const startBackgroundTrackingIfAllowed = async () => {
    if (!backgroundTrackingAllowedRef.current) return;

    try {
      const started = await startBackgroundLocationUpdates(selectedTypeRef.current);
      setBackgroundTrackingActive(started);
      if (!started) {
        setBackgroundTrackingWarning('Foreground GPS only');
      }
    } catch (caught) {
      setBackgroundTrackingActive(false);
      setBackgroundTrackingWarning('Foreground GPS only');
      if (__DEV__) console.warn('[LevelUp] Background GPS failed to start', caught);
    }
  };

  const startGps = async () => {
    const wantsBackground = await confirmBackgroundTracking();
    const permissions = await requestGpsPermissions(wantsBackground);
    if (!permissions.foregroundGranted) {
      Alert.alert('Location needed', 'Enable location permission to record GPS activities.');
      return;
    }

    if (wantsBackground && !permissions.backgroundGranted) {
      setBackgroundTrackingWarning('Foreground GPS only');
      Alert.alert(
        'Foreground-only recording',
        permissions.taskManagerAvailable && permissions.backgroundAvailable
          ? 'Background location was not granted. You can still record, but locked-screen tracking may be inaccurate.'
          : 'Expo Go cannot fully run background GPS tasks. You can still test foreground recording here, then use a development build for locked-screen tracking.'
      );
    } else {
      setBackgroundTrackingWarning(null);
    }

    const initialPoint = await getCurrentLocationPoint({ showLoading: true });
    const seedPoint = initialPoint ?? currentPointRef.current;
    const seedResult = seedPoint
      ? evaluateRoutePoint({
          point: seedPoint,
          activityType: selectedTypeRef.current,
          segmentId: 0
        })
      : null;
    const initialRoute = seedResult?.accepted && seedResult.point ? [seedResult.point] : [];

    setElapsedSeconds(0);
    setDistanceMeters(0);
    setRoute(initialRoute);
    setCurrentPoint(seedPoint ?? null);
    routeRef.current = initialRoute;
    currentPointRef.current = seedPoint ?? null;
    distanceMetersRef.current = 0;
    segmentIdRef.current = 0;
    setGpsStatus(seedPoint ? 'ready' : 'finding');
    startedAtMsRef.current = Date.now();
    pausedAtMsRef.current = null;
    stoppedAtMsRef.current = null;
    pausedDurationMsRef.current = 0;
    backgroundTrackingAllowedRef.current = permissions.backgroundGranted;
    forceNextSegmentRef.current = false;
    setRecordingState('recording');
    recordingStateRef.current = 'recording';
    try {
      await clearQueuedBackgroundPoints();
      await startBackgroundTrackingIfAllowed();
      await startLiveLocationWatch();
    } catch (caught) {
      recordingStateRef.current = 'idle';
      setRecordingState('idle');
      watchRef.current?.remove();
      watchRef.current = null;
      await stopBackgroundLocationUpdates();
      setBackgroundTrackingActive(false);
      setBackgroundTrackingWarning(null);
      logRecordSaveError('start-gps-tracking', { type: selectedType }, caught);
      Alert.alert('Could not start GPS', caught instanceof Error ? caught.message : 'Try again.');
    }
  };

  const pauseGps = async () => {
    await mergeQueuedBackgroundRoutePoints();
    pausedAtMsRef.current = Date.now();
    recordingStateRef.current = 'paused';
    setRecordingState('paused');
    setElapsedSeconds(calculateElapsedSeconds());
    watchRef.current?.remove();
    watchRef.current = null;
    await stopBackgroundLocationUpdates();
    setBackgroundTrackingActive(false);
  };

  const stopGps = async () => {
    if (!userId) return;
    await mergeQueuedBackgroundRoutePoints();
    const stoppedAtMs = Date.now();
    stoppedAtMsRef.current = stoppedAtMs;
    const finalElapsedSeconds = calculateElapsedSeconds(stoppedAtMs);
    watchRef.current?.remove();
    watchRef.current = null;
    await stopBackgroundLocationUpdates();
    setBackgroundTrackingActive(false);
    setRecordingState('idle');
    recordingStateRef.current = 'idle';
    await saveWorkout({
      type: selectedType,
      durationSeconds: finalElapsedSeconds,
      distanceMeters: distanceMetersRef.current,
      route: routeRef.current,
      startedAt: startedAtMsRef.current ? new Date(startedAtMsRef.current).toISOString() : undefined,
      completedAt: new Date(stoppedAtMs).toISOString()
    });
  };

  const resumeGps = async () => {
    if (pausedAtMsRef.current) {
      pausedDurationMsRef.current += Date.now() - pausedAtMsRef.current;
    }

    pausedAtMsRef.current = null;
    forceNextSegmentRef.current = true;
    recordingStateRef.current = 'recording';
    setRecordingState('recording');
    setElapsedSeconds(calculateElapsedSeconds());
    await clearQueuedBackgroundPoints();
    await startBackgroundTrackingIfAllowed();
    await startLiveLocationWatch();
  };

  const saveManualWorkout = async () => {
    const saved = await saveWorkout({
      type: selectedType,
      durationSeconds: Math.max(1, Number(durationMinutes || 0)) * 60,
      sets: sets ? Number(sets) : undefined,
      reps: reps ? Number(reps) : undefined,
      weightKg: weightKg ? Number(weightKg) : undefined
    });

    if (!saved) return;

    setDurationMinutes('');
    setSets('');
    setReps('');
    setWeightKg('');
    setManualModalVisible(false);
  };

  const saveWorkout = async (input: Parameters<typeof saveActivity>[1]) => {
    if (!userId) {
      Alert.alert('Could not save activity', 'You need to be logged in before saving an activity.');
      return false;
    }

    setSaving(true);
    try {
      const result = await saveActivity(userId, input);
      addActivity(result.activity);
      if (result.character) {
        setCharacter(result.character);
      }

      try {
        if (result.missions.length) {
          setMissions(result.missions);
        } else {
          setMissions(await getTodayMissions(userId));
        }
      } catch (caught) {
        logRecordSaveError('refresh-missions-after-save', input, caught);
      }

      if (result.sideEffectError && __DEV__) {
        console.warn('[LevelUp] Activity saved, but a post-save side effect failed.', result.sideEffectError);
      }

      let activityForSummary = result.activity;
      try {
        const activities = [
          result.activity,
          ...useAppStore.getState().activities.filter((activity) => activity.id !== result.activity.id)
        ];
        const progression = await refreshProgressionMilestones({
          userId,
          activities,
          newActivity: result.activity
        });
        const recordIds = progression.newPersonalRecords.map(
          (record) => `${record.recordType}:${record.sportKey}`
        );

        if (recordIds.length) {
          activityForSummary = {
            ...result.activity,
            personalRecordIds: [...new Set([...(result.activity.personalRecordIds ?? []), ...recordIds])]
          };
          updateActivity(activityForSummary);
        }

        setNewPersonalRecords(progression.newPersonalRecords);
        setProgressionStreaks(progression.streaks);
        setAchievements(progression.achievements);
        setPersonalRecords(progression.personalRecords);
        setCharacter(progression.character);
      } catch (caught) {
        setNewPersonalRecords([]);
        logRecordSaveError('refresh-progression-after-save', { activityId: result.activity.id }, caught);
      }

      setActivityTitle('');
      setSavedActivity(activityForSummary);
      return true;
    } catch (caught) {
      logRecordSaveError('save-workout', input, caught);
      Alert.alert('Could not save activity', activitySaveErrorMessage(caught));
      return false;
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
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            base64: true,
            quality: 0.82
          })
        : await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            base64: true,
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            quality: 0.82
          });

    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.uri) return;

    setPhotoPreviewUri(asset.uri);
    setPhotoUploadError(null);
    setPhotoRenderFailed(false);
    setPhotoUploading(true);
    try {
      const updated = await uploadActivityPhoto(userId, savedActivity.id, asset);
      updateActivity(updated);
      setSavedActivity(updated);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Try again.';
      setPhotoUploadError(message);
      Alert.alert('Photo upload failed', message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const correctSavedActivityType = async (type: ActivityType) => {
    if (!savedActivity || savedActivity.type === type) return;

    setSportSaving(true);
    try {
      const updated = await updateActivityType(savedActivity.id, type);
      const activities = useAppStore
        .getState()
        .activities.map((activity) => (activity.id === updated.id ? updated : activity));

      try {
        const records = await rebuildPersonalRecords(activities);
        const activityRecords = records.filter((record) => record.activityId === updated.id);
        const markedActivity = {
          ...updated,
          personalRecordIds: activityRecords.map((record) => `${record.recordType}:${record.sportKey}`)
        };
        setPersonalRecords(records);
        setNewPersonalRecords(activityRecords);
        updateActivity(markedActivity);
        setSavedActivity(markedActivity);
      } catch (caught) {
        logRecordSaveError('rebuild-records-after-sport-change', { activityId: updated.id, type }, caught);
        updateActivity(updated);
        setSavedActivity(updated);
      }
    } catch (caught) {
      Alert.alert('Could not update sport', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setSportSaving(false);
    }
  };

  const closePostActivity = async () => {
    if (savedActivity) {
      const title = activityTitle.trim() || fallbackActivityTitle(savedActivity.type);
      setTitleSaving(true);
      try {
        const updated = await updateActivityTitle(savedActivity.id, title, savedActivity);
        updateActivity(updated);
        setSavedActivity(updated);
      } catch (caught) {
        logRecordSaveError('finish-activity-title', { activityId: savedActivity.id, title }, caught);
        Alert.alert('Could not save title', caught instanceof Error ? caught.message : 'Try again.');
        setTitleSaving(false);
        return;
      }
    }

    setSavedActivity(null);
    setActivityTitle('');
    setPhotoPreviewUri(null);
    setPhotoUploadError(null);
    setPhotoRenderFailed(false);
    setTitleSaving(false);
    setSportSaving(false);
    setNewPersonalRecords([]);
    setElapsedSeconds(0);
    setDistanceMeters(0);
    setRoute([]);
    routeRef.current = [];
    distanceMetersRef.current = 0;
    startedAtMsRef.current = null;
    pausedAtMsRef.current = null;
    stoppedAtMsRef.current = null;
    pausedDurationMsRef.current = 0;
    segmentIdRef.current = 0;
    backgroundTrackingAllowedRef.current = false;
    forceNextSegmentRef.current = false;
    setBackgroundTrackingActive(false);
    setBackgroundTrackingWarning(null);
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
            <Ionicons name={selectedIsGps ? 'navigate' : 'barbell'} size={13} color={colors.primary} />
            <AppText style={styles.sportBadgeText} numberOfLines={1}>
              {ACTIVITY_LABELS[selectedType]}
            </AppText>
          </View>
          {!currentPoint && (
            <View style={styles.gpsSearchingBadge} pointerEvents="none">
              <Ionicons
                name={gpsStatus === 'finding' ? 'locate' : 'alert-circle'}
                size={14}
                color={gpsStatus === 'finding' ? colors.primary : colors.warning}
              />
              <AppText style={[styles.gpsSearchingText, { color: gpsStatus === 'finding' ? colors.primary : colors.warning }]}>
                {gpsStatus === 'finding' ? 'Finding GPS...' : 'GPS unavailable'}
              </AppText>
            </View>
          )}
          {recordingState !== 'idle' && (
            <View style={[styles.gpsModeBadge, backgroundTrackingActive ? styles.gpsModeBadgeActive : styles.gpsModeBadgeWarning]}>
              <Ionicons
                name={backgroundTrackingActive ? 'lock-closed' : 'phone-portrait'}
                size={13}
                color={backgroundTrackingActive ? colors.success : colors.warning}
              />
              <AppText style={[styles.gpsModeText, { color: backgroundTrackingActive ? colors.success : colors.warning }]}>
                {backgroundTrackingActive ? 'BG GPS' : backgroundTrackingWarning ?? 'FG GPS'}
              </AppText>
            </View>
          )}
        </View>

        <View style={styles.bottomControls}>
          {recordingState === 'idle' && (
            <Pressable
              onPress={() => setSportModalVisible(true)}
              style={({ pressed }) => [styles.sportButton, pressed && styles.pressed]}
            >
              <Ionicons name={selectedIsGps ? 'walk' : 'fitness'} size={22} color={colors.primary} />
              <AppText variant="caption" style={styles.sportButtonText}>
                {ACTIVITY_LABELS[selectedType]}
              </AppText>
            </Pressable>
          )}

          <View style={[styles.primaryControls, recordingState !== 'idle' && styles.primaryControlsRecording]}>
            {selectedIsGps ? (
              <>
                {recordingState === 'idle' && (
                  <Pressable onPress={startGps} disabled={saving} style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}>
                    <Ionicons name="play" size={30} color={colors.black} />
                  </Pressable>
                )}
                {recordingState === 'recording' && (
                  <View style={styles.recordingButtons}>
                    <PrimaryButton label="Pause" variant="secondary" onPress={pauseGps} style={styles.controlButton} />
                    <PrimaryButton label={saving ? 'Saving...' : 'Stop'} variant="danger" onPress={stopGps} disabled={saving || elapsedSeconds < 5} style={styles.controlButton} />
                  </View>
                )}
                {recordingState === 'paused' && (
                  <View style={styles.recordingButtons}>
                    <PrimaryButton label="Resume" onPress={resumeGps} style={styles.controlButton} />
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

          {recordingState === 'idle' && <View style={styles.sideSpacer} />}
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
        title={activityTitle}
        titleSaving={titleSaving}
        sportSaving={sportSaving}
        photoPreviewUri={photoPreviewUri}
        photoUploadError={photoUploadError}
        photoRenderFailed={photoRenderFailed}
        newPersonalRecords={newPersonalRecords}
        onTitleChange={setActivityTitle}
        onSportChange={correctSavedActivityType}
        onPhotoRenderError={() => setPhotoRenderFailed(true)}
        onCamera={() => addPhoto('camera')}
        onLibrary={() => addPhoto('library')}
        onClose={closePostActivity}
      />
    </Screen>
  );
}

const confirmBackgroundTracking = () =>
  new Promise<boolean>((resolve) => {
    if (Platform.OS === 'web') {
      resolve(false);
      return;
    }

    Alert.alert(
      'Keep recording when locked?',
      'Background location is required to keep recording when the screen is locked or the app is in the background.',
      [
        {
          text: 'Foreground only',
          style: 'cancel',
          onPress: () => resolve(false)
        },
        {
          text: 'Enable background GPS',
          onPress: () => resolve(true)
        }
      ]
    );
  });

const activitySaveErrorMessage = (caught: unknown) => {
  const message = errorMessage(caught);

  if (/row-level security|rls/i.test(message)) {
    return 'Supabase blocked this save. Check that the activities table allows authenticated users to insert their own rows.';
  }

  if (/could not find|schema cache|column|42703|pgrst204/i.test(message)) {
    return 'Your Supabase activities table is missing a field used by the app. Run the latest migrations and try again.';
  }

  return message || 'Check your connection and try again.';
};

const errorMessage = (caught: unknown) => {
  if (caught instanceof Error) return caught.message;
  if (typeof caught === 'string') return caught;
  if (caught && typeof caught === 'object' && 'message' in caught) {
    return String((caught as { message?: unknown }).message ?? '');
  }
  return '';
};

const serializeError = (caught: unknown) => {
  if (caught instanceof Error) {
    return { name: caught.name, message: caught.message, stack: caught.stack };
  }

  if (!caught || typeof caught !== 'object') {
    return { message: String(caught) };
  }

  const value = caught as Record<string, unknown>;
  return {
    code: value.code,
    message: value.message,
    details: value.details,
    hint: value.hint,
    status: value.status,
    raw: value
  };
};

const logRecordSaveError = (stage: string, payload: unknown, caught: unknown) => {
  if (!__DEV__) return;
  console.error('[LevelUp] Record save flow error', {
    stage,
    payload,
    error: serializeError(caught)
  });
};

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
  groups: { id: string; title: string; items: readonly ActivityType[] }[];
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
              <View key={group.id} style={styles.sportGroup}>
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
  title,
  titleSaving,
  sportSaving,
  photoPreviewUri,
  photoUploadError,
  photoRenderFailed,
  newPersonalRecords,
  onTitleChange,
  onSportChange,
  onPhotoRenderError,
  onCamera,
  onLibrary,
  onClose
}: {
  activity: Activity | null;
  units: 'metric' | 'imperial';
  uploading: boolean;
  title: string;
  titleSaving: boolean;
  sportSaving: boolean;
  photoPreviewUri: string | null;
  photoUploadError: string | null;
  photoRenderFailed: boolean;
  newPersonalRecords: PersonalRecord[];
  onTitleChange: (value: string) => void;
  onSportChange: (type: ActivityType) => void;
  onPhotoRenderError: () => void;
  onCamera: () => void;
  onLibrary: () => void;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [sportPickerVisible, setSportPickerVisible] = useState(false);
  const photoUri = photoPreviewUri || activity?.photoUrl;
  const sportEditingDisabled = uploading || titleSaving || sportSaving;

  const selectSport = (type: ActivityType) => {
    if (!activity || activity.type === type) {
      setSportPickerVisible(false);
      return;
    }

    onSportChange(type);
    setSportPickerVisible(false);
  };

  return (
    <Modal visible={Boolean(activity)} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.postSafeArea} edges={['top', 'right', 'bottom', 'left']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.postKeyboard}
        >
          {activity && (
            <ScrollView
              contentContainerStyle={[
                styles.postScroll,
                {
                  paddingTop: Math.max(spacing.lg, insets.top ? spacing.md : spacing.lg),
                  paddingBottom: Math.max(spacing.xl, insets.bottom + spacing.lg)
                }
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.postHeader}>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" style={{ color: colors.success }}>
                    ACTIVITY SAVED
                  </AppText>
                  <AppText variant="title">Add a photo?</AppText>
                </View>
                <Pressable onPress={onClose} style={styles.iconButton}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>
              </View>

              {photoUri && !photoRenderFailed ? (
                <Image
                  source={{ uri: photoUri }}
                  style={styles.postPhoto}
                  resizeMode="cover"
                  onError={onPhotoRenderError}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <View style={styles.photoIconRing}>
                    <Ionicons name="image-outline" size={38} color={colors.primary} />
                  </View>
                  <AppText variant="subtitle">{photoRenderFailed ? 'Photo could not be previewed' : 'No photo attached'}</AppText>
                  <AppText muted style={styles.photoHelpText}>
                    {photoRenderFailed
                      ? 'Choose another image or try taking a new photo.'
                      : 'Add a workout photo now, or finish without one.'}
                  </AppText>
                </View>
              )}
              {photoUploadError && (
                <View style={styles.photoError}>
                  <Ionicons name="warning-outline" size={18} color={colors.warning} />
                  <AppText style={styles.photoErrorText}>{photoUploadError}</AppText>
                </View>
              )}

              {newPersonalRecords.length > 0 && (
                <View style={styles.personalRecordBanner}>
                  <View style={styles.personalRecordHeader}>
                    <Ionicons name="trophy" size={22} color={colors.warning} />
                    <View style={{ flex: 1 }}>
                      <AppText variant="caption" style={styles.personalRecordEyebrow}>
                        NEW PERSONAL RECORD
                      </AppText>
                      <AppText variant="subtitle">
                        {newPersonalRecords.length} milestone{newPersonalRecords.length === 1 ? '' : 's'} set
                      </AppText>
                    </View>
                  </View>
                  {newPersonalRecords.map((record) => (
                    <View key={`post-record-${record.recordType}-${record.sportKey}`} style={styles.personalRecordRow}>
                      <AppText>{PERSONAL_RECORD_LABELS[record.recordType]}</AppText>
                      <AppText style={styles.personalRecordSport}>
                        {record.sportKey === 'all' ? 'All sports' : ACTIVITY_LABELS[record.sportKey]}
                      </AppText>
                    </View>
                  ))}
                </View>
              )}

            <View style={styles.routePreviewSection}>
              <View>
                <AppText variant="caption" style={{ color: colors.primary }}>
                  Route
                </AppText>
                <AppText variant="subtitle">Workout path</AppText>
              </View>
              <ActivityRouteMap route={activity.route} height={220} />
            </View>

            <View style={styles.titleFieldGroup}>
              <AppText variant="caption" style={{ color: colors.primary }}>
                Title
              </AppText>
              <TextField
                value={title}
                onChangeText={onTitleChange}
                placeholder="Give this activity a title"
                returnKeyType="done"
                editable={!titleSaving}
              />
            </View>

            <View style={styles.postSportSection}>
              <View style={styles.postSportHeader}>
                <AppText variant="caption" style={{ color: colors.primary }}>
                  Sport
                </AppText>
                {sportSaving && <AppText muted>Updating...</AppText>}
              </View>
              <Pressable
                onPress={() => setSportPickerVisible(true)}
                disabled={sportEditingDisabled}
                style={({ pressed }) => [
                  styles.postSportSelector,
                  pressed && styles.pressed,
                  sportEditingDisabled && styles.disabled
                ]}
              >
                <View style={styles.postSportSelectorIcon}>
                  <Ionicons name={isGpsActivity(activity.type) ? 'navigate-outline' : 'barbell-outline'} size={18} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" muted>
                    Sport
                  </AppText>
                  <AppText style={styles.postSportSelectorText}>Sport: {ACTIVITY_LABELS[activity.type]}</AppText>
                </View>
                <Ionicons name="chevron-down" size={20} color={colors.primary} />
              </Pressable>
            </View>

            <View style={styles.summaryGrid}>
              <SummaryCard label="Sport" value={ACTIVITY_LABELS[activity.type]} />
              <SummaryCard label="Time" value={formatDuration(activity.durationSeconds)} />
              <SummaryCard
                label="Distance"
                value={activity.distanceMeters ? formatDistance(activity.distanceMeters, units) : 'Manual'}
              />
            </View>

            <View style={styles.postActions}>
              <PrimaryButton label={uploading ? 'Uploading...' : 'Take photo'} onPress={onCamera} disabled={uploading || titleSaving || sportSaving} />
              <PrimaryButton
                label={uploading ? 'Uploading...' : 'Choose from library'}
                variant="secondary"
                onPress={onLibrary}
                disabled={uploading || titleSaving || sportSaving}
              />
              <PrimaryButton label={titleSaving ? 'Saving...' : 'Save activity / Finish'} onPress={onClose} disabled={uploading || titleSaving || sportSaving} />
              <PrimaryButton label={activity.photoUrl ? 'Done' : 'Skip'} variant="secondary" onPress={onClose} disabled={uploading || titleSaving || sportSaving} />
            </View>
            </ScrollView>
          )}
        </KeyboardAvoidingView>

        {activity && (
          <Modal
            visible={sportPickerVisible}
            transparent
            animationType="fade"
            onRequestClose={() => setSportPickerVisible(false)}
          >
            <View style={styles.postSportSheetWrap}>
              <Pressable style={StyleSheet.absoluteFill} onPress={() => setSportPickerVisible(false)} />
              <View style={[styles.postSportSheet, { paddingBottom: Math.max(spacing.lg, insets.bottom + spacing.sm) }]}>
                <View style={styles.postSportSheetHeader}>
                  <View>
                    <AppText variant="caption" style={{ color: colors.primary }}>
                      Sport
                    </AppText>
                    <AppText variant="subtitle">Choose activity</AppText>
                  </View>
                  <Pressable onPress={() => setSportPickerVisible(false)} style={styles.iconButton}>
                    <Ionicons name="close" size={22} color={colors.text} />
                  </Pressable>
                </View>
                <ScrollView style={styles.postSportSheetList} contentContainerStyle={styles.postSportSheetContent}>
                  {POST_ACTIVITY_TYPES.map((type) => {
                    const selected = activity.type === type;
                    return (
                      <Pressable
                        key={`post-sport-${type}`}
                        onPress={() => selectSport(type)}
                        disabled={sportEditingDisabled || selected}
                        style={({ pressed }) => [
                          styles.postSportSheetRow,
                          selected && styles.postSportSheetRowActive,
                          pressed && !selected && styles.pressed,
                          sportEditingDisabled && !selected && styles.disabled
                        ]}
                      >
                        <Ionicons
                          name={isGpsActivity(type) ? 'navigate-outline' : 'barbell-outline'}
                          size={20}
                          color={selected ? colors.black : colors.primary}
                        />
                        <AppText style={[styles.postSportSheetText, selected && styles.postSportSheetTextActive]}>
                          {ACTIVITY_LABELS[type]}
                        </AppText>
                        {selected && <Ionicons name="checkmark-circle" size={20} color={colors.black} />}
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>
            </View>
          </Modal>
        )}
      </SafeAreaView>
    </Modal>
  );
};

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
    left: spacing.sm,
    top: spacing.sm,
    maxWidth: 132,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(11, 22, 40, 0.78)',
    paddingHorizontal: spacing.sm,
    minHeight: 30
  },
  sportBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900'
  },
  gpsSearchingBadge: {
    position: 'absolute',
    left: spacing.sm,
    top: 46,
    minHeight: 30,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: 'rgba(11, 22, 40, 0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm
  },
  gpsSearchingText: {
    fontSize: 11,
    fontWeight: '900'
  },
  gpsModeBadge: {
    position: 'absolute',
    right: spacing.md,
    top: spacing.md,
    minHeight: 32,
    borderRadius: radii.pill,
    borderWidth: 1,
    backgroundColor: 'rgba(11, 22, 40, 0.78)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm
  },
  gpsModeBadgeActive: {
    borderColor: colors.success
  },
  gpsModeBadgeWarning: {
    borderColor: colors.warning
  },
  gpsModeText: {
    fontSize: 11,
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
  primaryControlsRecording: {
    width: '100%'
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
  photoError: {
    minHeight: 46,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: 'rgba(255, 184, 77, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  photoErrorText: {
    flex: 1,
    color: colors.warning,
    fontWeight: '700'
  },
  personalRecordBanner: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: 'rgba(255, 184, 77, 0.1)',
    padding: spacing.md,
    gap: spacing.sm
  },
  personalRecordHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  personalRecordEyebrow: {
    color: colors.warning,
    fontWeight: '900'
  },
  personalRecordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm
  },
  personalRecordSport: {
    color: colors.primary,
    fontWeight: '800'
  },
  postPhoto: {
    width: '100%',
    minHeight: 320,
    borderRadius: radii.lg,
    backgroundColor: colors.cardHigh
  },
  titleFieldGroup: {
    gap: spacing.xs
  },
  routePreviewSection: {
    gap: spacing.sm
  },
  postSportSection: {
    gap: spacing.sm
  },
  postSportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  postSportSelector: {
    minHeight: 58,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  postSportSelectorIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center'
  },
  postSportSelectorText: {
    color: colors.text,
    fontWeight: '900'
  },
  postSportSheetWrap: {
    flex: 1,
    backgroundColor: 'rgba(2, 4, 10, 0.72)',
    justifyContent: 'flex-end'
  },
  postSportSheet: {
    maxHeight: '58%',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.md
  },
  postSportSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  postSportSheetList: {
    maxHeight: 360
  },
  postSportSheetContent: {
    gap: spacing.sm,
    paddingBottom: spacing.sm
  },
  postSportSheetRow: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md
  },
  postSportSheetRowActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary
  },
  postSportSheetText: {
    flex: 1,
    color: colors.text,
    fontWeight: '800'
  },
  postSportSheetTextActive: {
    color: colors.black,
    fontWeight: '900'
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
