import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, AppState, Image, Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActivityRouteMap } from '@/components/ActivityRouteMap';
import { AppText } from '@/components/AppText';
import { FitnessMap } from '@/components/FitnessMap';
import { LevelUpCelebration } from '@/components/LevelUpCelebration';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { getAchievementById } from '@/constants/achievements';
import { ACTIVITY_LABELS, GPS_ACTIVITY_TYPES, MANUAL_ACTIVITY_TYPES, isGpsActivity } from '@/constants/activities';
import { colors, radii, shadows, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import {
  listActivities,
  processPendingActivityRewards,
  saveActivity,
  updateActivityRewardMilestones,
  updateActivityTitle,
  updateActivityType,
  uploadActivityPhoto
} from '@/services/activityService';
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
import { listPendingLevelUps } from '@/services/levelUpService';
import {
  clearManualWorkoutSession,
  loadManualWorkoutSession,
  persistManualWorkoutSession
} from '@/services/manualWorkoutSession';
import { getTodayMissions } from '@/services/missionService';
import { ensureProfileAndCharacter, getCharacter } from '@/services/profileService';
import { rebuildPersonalRecords, refreshProgressionMilestones } from '@/services/progressionService';
import { useAppStore } from '@/store/appStore';
import {
  Activity,
  ActivityType,
  LevelUpCelebration as LevelUpCelebrationModel,
  ManualActivityType,
  PersonalRecord,
  RoutePoint
} from '@/types/domain';
import { formatDistance, formatDuration, formatPace, formatSpeed } from '@/utils/format';
import { elevationGainMeters } from '@/utils/geo';
import { PERSONAL_RECORD_LABELS } from '@/utils/progression';
import {
  MANUAL_WORKOUT_MAX_REPS,
  MANUAL_WORKOUT_MAX_SETS,
  MANUAL_WORKOUT_MAX_WEIGHT_KG,
  ManualWorkoutSession,
  createManualWorkoutSession,
  durationSecondsFromMinutes,
  elapsedManualWorkoutSeconds,
  isStaleManualWorkoutSession,
  parseManualNumber,
  transitionManualWorkout
} from '@/utils/manualWorkout';

type RecordingState = 'idle' | 'recording' | 'paused';
type GpsStatus = 'finding' | 'ready' | 'unavailable';
type PostSaveSyncSubsystem = 'rewards' | 'missions' | 'progression' | 'levels';
type PostSaveSyncFailure = { subsystem: PostSaveSyncSubsystem; message: string };
type PostSaveSyncWarning = { activityId: string; failures: PostSaveSyncFailure[] };

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
  const [manualSession, setManualSession] = useState<ManualWorkoutSession | null>(null);
  const [manualNowMs, setManualNowMs] = useState(() => Date.now());
  const [manualValidationError, setManualValidationError] = useState<string | null>(null);
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
  const [postSaveSyncWarning, setPostSaveSyncWarning] = useState<PostSaveSyncWarning | null>(null);
  const [postSaveSyncRetrying, setPostSaveSyncRetrying] = useState(false);
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
  const manualSessionRef = useRef<ManualWorkoutSession | null>(null);
  const manualSaveInFlightRef = useRef(false);
  const loadedManualSessionUserRef = useRef<string | null>(null);
  const appStateRef = useRef(AppState.currentState);
  const addActivity = useAppStore((state) => state.addActivity);
  const addOwnedCosmetic = useAppStore((state) => state.addOwnedCosmetic);
  const updateActivity = useAppStore((state) => state.updateActivity);
  const setCharacter = useAppStore((state) => state.setCharacter);
  const setMissions = useAppStore((state) => state.setMissions);
  const setProgressionStreaks = useAppStore((state) => state.setProgressionStreaks);
  const setAchievements = useAppStore((state) => state.setAchievements);
  const setPersonalRecords = useAppStore((state) => state.setPersonalRecords);
  const setPendingLevelUps = useAppStore((state) => state.setPendingLevelUps);
  const setActivities = useAppStore((state) => state.setActivities);
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
    if (!userId || loadedManualSessionUserRef.current === userId) return;
    loadedManualSessionUserRef.current = userId;

    void loadManualWorkoutSession(userId).then((storedSession) => {
      if (!storedSession || ['completed', 'cancelled'].includes(storedSession.phase)) {
        if (storedSession) void clearManualWorkoutSession(userId);
        return;
      }

      const recoverableSession = storedSession.phase === 'saving'
        ? transitionManualWorkout(storedSession, { type: 'SAVE_FAILED' })
        : storedSession.phase === 'finishing'
          ? transitionManualWorkout(storedSession, { type: 'OPEN_DETAILS' })
          : storedSession;
      setSelectedType(recoverableSession.activityType);

      if (isStaleManualWorkoutSession(recoverableSession)) {
        Alert.alert(
          'Review old workout',
          'This manual workout has been active for more than 12 hours. It will not be saved or rewarded until you enter a valid duration.',
          [
            {
              text: 'Discard session',
              style: 'destructive',
              onPress: () => {
                void clearManualWorkoutSession(userId);
                setManualSession(null);
                setManualModalVisible(false);
              }
            },
            {
              text: 'Review duration',
              onPress: () => {
                const reviewSession = transitionManualWorkout(recoverableSession, { type: 'REVIEW_DURATION' });
                setManualSession(reviewSession);
                setDurationMinutes('');
                setManualValidationError('Enter the workout duration before saving.');
                setManualModalVisible(true);
              }
            }
          ],
          { cancelable: false }
        );
        return;
      }

      setManualSession(recoverableSession);
      if (recoverableSession.finalDurationSeconds !== null) {
        setDurationMinutes(formatDurationMinutes(recoverableSession.finalDurationSeconds));
      }
      setManualModalVisible(true);
    });
  }, [userId]);

  useEffect(() => {
    if (!manualSession) return;
    if (manualSession.phase === 'completed' || manualSession.phase === 'cancelled') {
      void clearManualWorkoutSession(manualSession.userId);
      return;
    }
    void persistManualWorkoutSession(manualSession).catch((caught) => {
      if (__DEV__) console.warn('[LevelUp] Could not persist manual workout session', caught);
    });
  }, [manualSession]);

  useEffect(() => {
    setManualNowMs(Date.now());
    if (manualSession?.phase !== 'recording') return;

    const timer = setInterval(() => setManualNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [manualSession?.phase, manualSession?.sessionId]);

  useEffect(() => {
    recordingStateRef.current = recordingState;
  }, [recordingState]);

  useEffect(() => {
    manualSessionRef.current = manualSession;
  }, [manualSession]);

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
      if (wasBackgrounded && nextState === 'active' && manualSessionRef.current) {
        setManualNowMs(Date.now());
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

  const openManualWorkout = () => {
    setManualValidationError(null);
    setManualModalVisible(true);
  };

  const startManualWorkout = () => {
    if (!userId || selectedIsGps) return;
    const session = createManualWorkoutSession(userId, selectedType as ManualActivityType);
    setManualSession(session);
    setManualNowMs(session.startedAtMs);
    setDurationMinutes('');
    setManualValidationError(null);
  };

  const pauseManualWorkout = () => {
    if (!manualSession) return;
    const nowMs = Date.now();
    setManualNowMs(nowMs);
    setManualSession(transitionManualWorkout(manualSession, { type: 'PAUSE', nowMs }));
  };

  const resumeManualWorkout = () => {
    if (!manualSession) return;
    const nowMs = Date.now();
    setManualNowMs(nowMs);
    setManualSession(transitionManualWorkout(manualSession, { type: 'RESUME', nowMs }));
  };

  const finishManualWorkout = () => {
    if (!manualSession) return;
    const nowMs = Date.now();
    const finishingSession = transitionManualWorkout(manualSession, { type: 'FINISH', nowMs });
    const detailsSession = transitionManualWorkout(finishingSession, { type: 'OPEN_DETAILS' });
    setManualNowMs(nowMs);
    setManualSession(detailsSession);
    setDurationMinutes(formatDurationMinutes(detailsSession.finalDurationSeconds ?? 0));
    setManualValidationError(null);
  };

  const cancelManualWorkout = () => {
    Keyboard.dismiss();
    if (!manualSession || manualSession.phase === 'idle') {
      setManualModalVisible(false);
      return;
    }

    Alert.alert(
      'Discard workout?',
      'Your unsaved manual workout will be removed and its timer will stop.',
      [
        { text: 'Keep workout', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            const cancelled = transitionManualWorkout(manualSession, { type: 'CANCEL' });
            setManualSession(cancelled);
            void clearManualWorkoutSession(cancelled.userId);
            resetManualWorkoutForm();
            setManualSession(null);
            setManualModalVisible(false);
          }
        }
      ]
    );
  };

  const resetManualWorkoutForm = () => {
    setDurationMinutes('');
    setSets('');
    setReps('');
    setWeightKg('');
    setManualValidationError(null);
    manualSaveInFlightRef.current = false;
  };

  const saveManualWorkout = async () => {
    if (!manualSession || manualSession.phase !== 'details' || manualSaveInFlightRef.current) return;

    let activeSavingSession: ManualWorkoutSession | null = null;
    try {
      const durationSeconds = durationSecondsFromMinutes(durationMinutes);
      const parsedSets = parseManualNumber(sets, 'Sets', { integer: true, max: MANUAL_WORKOUT_MAX_SETS });
      const parsedReps = parseManualNumber(reps, 'Reps', { integer: true, max: MANUAL_WORKOUT_MAX_REPS });
      const parsedWeight = parseManualNumber(weightKg, 'Weight', { max: MANUAL_WORKOUT_MAX_WEIGHT_KG });
      const nowMs = Date.now();
      const savingSession = transitionManualWorkout(manualSession, {
        type: 'BEGIN_SAVE',
        durationSeconds,
        nowMs
      });
      activeSavingSession = savingSession;

      manualSaveInFlightRef.current = true;
      setManualValidationError(null);
      setManualSession(savingSession);
      await persistManualWorkoutSession(savingSession);

      const completedAtMs = savingSession.completedAtMs ?? nowMs;
      const saved = await saveWorkout({
        type: savingSession.activityType,
        durationSeconds,
        sets: parsedSets,
        reps: parsedReps,
        weightKg: parsedWeight,
        startedAt: new Date(completedAtMs - durationSeconds * 1000).toISOString(),
        completedAt: new Date(completedAtMs).toISOString(),
        clientSessionId: savingSession.sessionId
      });

      if (!saved) {
        setManualSession(transitionManualWorkout(savingSession, { type: 'SAVE_FAILED' }));
        return;
      }

      const completedSession = transitionManualWorkout(savingSession, { type: 'SAVE_SUCCEEDED' });
      setManualSession(completedSession);
      await clearManualWorkoutSession(completedSession.userId);
      resetManualWorkoutForm();
      setManualSession(null);
      setManualModalVisible(false);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : 'Review the workout details and try again.';
      if (__DEV__) {
        console.warn('[LevelUp] Manual workout validation warning', {
          sessionId: manualSession.sessionId,
          message
        });
      }
      setManualValidationError(message);
      if (activeSavingSession) {
        setManualSession(transitionManualWorkout(activeSavingSession, { type: 'SAVE_FAILED' }));
      }
    } finally {
      manualSaveInFlightRef.current = false;
    }
  };

  const refreshProgressionForActivity = async (activity: Activity) => {
    if (!userId) throw new Error('You need to be logged in to synchronize progression.');
    const activities = [
      activity,
      ...useAppStore.getState().activities.filter((current) => current.id !== activity.id)
    ];
    const progression = await refreshProgressionMilestones({
      userId,
      activities,
      newActivity: activity
    });
    const recordIds = progression.newPersonalRecords.map(
      (record) => `${record.recordType}:${record.sportKey}`
    );
    const achievementsUnlocked = progression.newAchievements.flatMap((achievement) => {
      const definition = getAchievementById(achievement.achievementId);
      return definition
        ? [{ id: definition.id, title: definition.title, rewardCoins: definition.rewardCoins }]
        : [];
    });
    const personalRecords = progression.newPersonalRecords.map((record) => ({
      recordType: record.recordType,
      sportKey: record.sportKey
    }));
    let activityForSummary: Activity = {
      ...activity,
      personalRecordIds: [...new Set([...(activity.personalRecordIds ?? []), ...recordIds])]
    };

    const currentRewardSummary = activityForSummary.rewardSummary;
    if (currentRewardSummary) {
      try {
        activityForSummary = await updateActivityRewardMilestones(activityForSummary, {
          achievementsUnlocked,
          personalRecords
        });
      } catch (caught) {
        logRecordSaveError('persist-reward-milestones', { activityId: activity.id }, caught);
        activityForSummary = {
          ...activityForSummary,
          rewardSummary: {
            ...currentRewardSummary,
            achievementsUnlocked,
            personalRecords,
            goldCoins:
              currentRewardSummary.characterExp +
              (currentRewardSummary.missionGoldCoins ?? 0) +
              achievementsUnlocked.reduce((total, achievement) => total + achievement.rewardCoins, 0)
          }
        };
      }
    }

    updateActivity(activityForSummary);
    setNewPersonalRecords(progression.newPersonalRecords);
    setProgressionStreaks(progression.streaks);
    setAchievements(progression.achievements);
    setPersonalRecords(progression.personalRecords);
    setCharacter(progression.character);
    progression.newCosmetics.forEach((cosmetic) => addOwnedCosmetic(cosmetic));
    return activityForSummary;
  };

  const saveWorkout = async (input: Parameters<typeof saveActivity>[1]) => {
    if (!userId) {
      Alert.alert('Could not save activity', 'You need to be logged in before saving an activity.');
      return false;
    }

    setSaving(true);
    setPostSaveSyncWarning(null);
    try {
      const syncFailures: PostSaveSyncFailure[] = [];
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
        logRecordSaveError('refresh-missions-after-save', { activityId: result.activity.id }, caught);
        syncFailures.push(createPostSaveSyncFailure('missions', caught));
      }

      if (result.sideEffectError) {
        syncFailures.push(createPostSaveSyncFailure('rewards', result.sideEffectError));
      }

      let activityForSummary = result.activity;
      try {
        activityForSummary = await refreshProgressionForActivity(result.activity);
      } catch (caught) {
        setNewPersonalRecords([]);
        logRecordSaveError('refresh-progression-after-save', { activityId: result.activity.id }, caught);
        syncFailures.push(createPostSaveSyncFailure('progression', caught));
      }

      setActivityTitle('');
      setSavedActivity(activityForSummary);
      try {
        setPendingLevelUps(await listPendingLevelUps(userId));
      } catch (caught) {
        logRecordSaveError('refresh-level-up-queue', { activityId: result.activity.id }, caught);
        syncFailures.push(createPostSaveSyncFailure('levels', caught));
      }
      setPostSaveSyncWarning(syncFailures.length ? {
        activityId: result.activity.id,
        failures: uniqueSyncFailures(syncFailures)
      } : null);
      return true;
    } catch (caught) {
      logRecordSaveError('save-workout', input, caught);
      Alert.alert('Could not save activity', activitySaveErrorMessage(caught));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const retryPostSaveSync = async () => {
    if (!userId || !savedActivity || postSaveSyncRetrying) return;
    setPostSaveSyncRetrying(true);
    const failedSubsystems = new Set(
      postSaveSyncWarning?.failures.map((failure) => failure.subsystem) ?? []
    );
    const syncFailures: PostSaveSyncFailure[] = [];
    let activityForSummary = savedActivity;

    if (failedSubsystems.has('rewards')) {
      try {
        await processPendingActivityRewards(userId);
        const [nextActivities, nextCharacter] = await Promise.all([
          listActivities(userId),
          getCharacter(userId)
        ]);
        setActivities(nextActivities);
        setCharacter(nextCharacter);
        activityForSummary = nextActivities.find((activity) => activity.id === savedActivity.id) ?? savedActivity;
        setSavedActivity(activityForSummary);
      } catch (caught) {
        logRecordSaveError('retry-rewards-after-save', { activityId: savedActivity.id }, caught);
        syncFailures.push(createPostSaveSyncFailure('rewards', caught));
      }
    }

    if (failedSubsystems.has('missions')) {
      try {
        setMissions(await getTodayMissions(userId));
      } catch (caught) {
        logRecordSaveError('retry-missions-after-save', { activityId: savedActivity.id }, caught);
        syncFailures.push(createPostSaveSyncFailure('missions', caught));
      }
    }

    if (failedSubsystems.has('progression')) {
      try {
        activityForSummary = await refreshProgressionForActivity(activityForSummary);
        setSavedActivity(activityForSummary);
      } catch (caught) {
        logRecordSaveError('retry-progression-after-save', { activityId: savedActivity.id }, caught);
        syncFailures.push(createPostSaveSyncFailure('progression', caught));
      }
    }

    if (failedSubsystems.has('levels')) {
      try {
        setPendingLevelUps(await listPendingLevelUps(userId));
      } catch (caught) {
        logRecordSaveError('retry-level-up-queue', { activityId: savedActivity.id }, caught);
        syncFailures.push(createPostSaveSyncFailure('levels', caught));
      }
    }

    setPostSaveSyncWarning(syncFailures.length ? {
      activityId: savedActivity.id,
      failures: uniqueSyncFailures(syncFailures)
    } : null);
    setPostSaveSyncRetrying(false);
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
        let markedActivity: Activity = {
          ...updated,
          personalRecordIds: activityRecords.map((record) => `${record.recordType}:${record.sportKey}`)
        };
        if (markedActivity.rewardSummary) {
          try {
            markedActivity = await updateActivityRewardMilestones(markedActivity, {
              achievementsUnlocked: markedActivity.rewardSummary.achievementsUnlocked,
              personalRecords: activityRecords.map((record) => ({
                recordType: record.recordType,
                sportKey: record.sportKey
              })),
              replacePersonalRecords: true
            });
          } catch (caught) {
            logRecordSaveError('persist-records-after-sport-change', { activityId: updated.id, type }, caught);
          }
        }
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
    setPostSaveSyncWarning(null);
    setPostSaveSyncRetrying(false);
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
              <Pressable onPress={openManualWorkout} disabled={saving} style={({ pressed }) => [styles.startButton, pressed && styles.pressed]}>
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
        session={manualSession}
        elapsedSeconds={manualSession ? elapsedManualWorkoutSeconds(manualSession, manualNowMs) : 0}
        durationMinutes={durationMinutes}
        sets={sets}
        reps={reps}
        weightKg={weightKg}
        saving={saving}
        validationError={manualValidationError}
        onDuration={setDurationMinutes}
        onSets={setSets}
        onReps={setReps}
        onWeight={setWeightKg}
        onStart={startManualWorkout}
        onPause={pauseManualWorkout}
        onResume={resumeManualWorkout}
        onFinish={finishManualWorkout}
        onSave={saveManualWorkout}
        onClose={cancelManualWorkout}
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
        syncWarning={postSaveSyncWarning}
        syncRetrying={postSaveSyncRetrying}
        onTitleChange={setActivityTitle}
        onSportChange={correctSavedActivityType}
        onPhotoRenderError={() => setPhotoRenderFailed(true)}
        onCamera={() => addPhoto('camera')}
        onLibrary={() => addPhoto('library')}
        onRetrySync={retryPostSaveSync}
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

const formatDurationMinutes = (durationSeconds: number) => {
  const minutes = Math.max(0, durationSeconds) / 60;
  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1);
};

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

const postSaveSyncErrorMessage = (caught: unknown) => {
  const message = errorMessage(caught);
  if (/achievement_id.*ambiguous|42702/i.test(message)) {
    return 'Progression needs the latest Supabase achievement hotfix. Your activity is already saved.';
  }
  return message || 'Your activity is saved, but this data could not synchronize yet.';
};

const createPostSaveSyncFailure = (
  subsystem: PostSaveSyncSubsystem,
  caught: unknown
): PostSaveSyncFailure => ({ subsystem, message: postSaveSyncErrorMessage(caught) });

const uniqueSyncFailures = (failures: PostSaveSyncFailure[]) =>
  [...new Map(failures.map((failure) => [failure.subsystem, failure])).values()];

const POST_SAVE_SYNC_LABELS: Record<PostSaveSyncSubsystem, string> = {
  rewards: 'Rewards',
  missions: 'Missions',
  progression: 'Progression',
  levels: 'Level queue'
};

const formatPostSaveSyncFailure = (failure: PostSaveSyncFailure) =>
  `${POST_SAVE_SYNC_LABELS[failure.subsystem]}: ${failure.message}`;

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
    const value = caught as Error & Record<string, unknown>;
    return {
      name: caught.name,
      code: value.code,
      message: caught.message,
      details: value.details,
      hint: value.hint,
      migration: value.migration,
      stack: caught.stack
    };
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
  console.warn('[LevelUp] Record save flow warning', {
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
  session,
  elapsedSeconds,
  durationMinutes,
  sets,
  reps,
  weightKg,
  saving,
  validationError,
  onDuration,
  onSets,
  onReps,
  onWeight,
  onStart,
  onPause,
  onResume,
  onFinish,
  onSave,
  onClose
}: {
  visible: boolean;
  type: ActivityType;
  session: ManualWorkoutSession | null;
  elapsedSeconds: number;
  durationMinutes: string;
  sets: string;
  reps: string;
  weightKg: string;
  saving: boolean;
  validationError: string | null;
  onDuration: (value: string) => void;
  onSets: (value: string) => void;
  onReps: (value: string) => void;
  onWeight: (value: string) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onSave: () => void;
  onClose: () => void;
}) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={styles.modalBackdrop}>
      <View style={styles.sheet}>
        <View style={styles.sheetHeader}>
          <View>
            <AppText variant="caption" style={{ color: colors.primary }}>
              Manual workout
            </AppText>
            <AppText variant="title">{ACTIVITY_LABELS[session?.activityType ?? type]}</AppText>
          </View>
          <Pressable onPress={onClose} style={styles.iconButton}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        {!session && (
          <View style={styles.manualStartState}>
            <Ionicons name="timer-outline" size={34} color={colors.primary} />
            <AppText style={styles.manualStartCopy}>Start when your workout begins. The timer survives normal background transitions.</AppText>
            <PrimaryButton label="Start workout" onPress={onStart} />
          </View>
        )}

        {session && ['recording', 'paused', 'finishing'].includes(session.phase) && (
          <View style={styles.manualTimerState}>
            <AppText variant="caption" style={{ color: session.phase === 'paused' ? colors.warning : colors.primary }}>
              {session.phase === 'paused' ? 'PAUSED' : session.phase === 'finishing' ? 'FINISHING' : 'ACTIVE'}
            </AppText>
            <AppText style={styles.manualTimerValue}>{formatDuration(elapsedSeconds)}</AppText>
            <View style={styles.manualTimerControls}>
              {session.phase === 'recording' && (
                <PrimaryButton label="Pause" variant="secondary" onPress={onPause} style={styles.manualTimerButton} />
              )}
              {session.phase === 'paused' && (
                <PrimaryButton label="Resume" onPress={onResume} style={styles.manualTimerButton} />
              )}
              <PrimaryButton
                label="Finish"
                variant="danger"
                onPress={onFinish}
                disabled={session.phase === 'finishing' || elapsedSeconds < 1}
                style={styles.manualTimerButton}
              />
            </View>
          </View>
        )}

        {session && ['details', 'saving'].includes(session.phase) && (
          <>
            <AppText variant="caption" style={{ color: colors.primary }}>Workout details</AppText>
            <TextField placeholder="Duration minutes" keyboardType="decimal-pad" value={durationMinutes} onChangeText={onDuration} />
            <TextField placeholder="Sets optional" keyboardType="number-pad" value={sets} onChangeText={onSets} />
            <TextField placeholder="Reps optional" keyboardType="number-pad" value={reps} onChangeText={onReps} />
            <TextField placeholder="Weight kg optional" keyboardType="decimal-pad" value={weightKg} onChangeText={onWeight} />
            {validationError && <AppText style={styles.manualValidationError}>{validationError}</AppText>}
            <PrimaryButton
              label={saving || session.phase === 'saving' ? 'Saving...' : 'Save workout'}
              onPress={onSave}
              disabled={saving || session.phase === 'saving' || !durationMinutes.trim()}
            />
          </>
        )}
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
  syncWarning,
  syncRetrying,
  onTitleChange,
  onSportChange,
  onPhotoRenderError,
  onCamera,
  onLibrary,
  onRetrySync,
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
  syncWarning: PostSaveSyncWarning | null;
  syncRetrying: boolean;
  onTitleChange: (value: string) => void;
  onSportChange: (type: ActivityType) => void;
  onPhotoRenderError: () => void;
  onCamera: () => void;
  onLibrary: () => void;
  onRetrySync: () => void;
  onClose: () => void;
}) => {
  const insets = useSafeAreaInsets();
  const [sportPickerVisible, setSportPickerVisible] = useState(false);
  const [mediaTab, setMediaTab] = useState<'map' | 'photo'>('map');
  const photoUri = photoPreviewUri || activity?.photoUrl;
  const hasRoute = Boolean(activity?.route?.length);
  const hasPhoto = Boolean(photoUri && !photoRenderFailed);
  const elevation = elevationGainMeters(activity?.route);
  const sportEditingDisabled = uploading || titleSaving || sportSaving || syncRetrying;

  useEffect(() => {
    setMediaTab(hasRoute ? 'map' : hasPhoto ? 'photo' : 'map');
  }, [activity?.id, hasPhoto, hasRoute]);

  const selectSport = (type: ActivityType) => {
    if (!activity || activity.type === type) {
      setSportPickerVisible(false);
      return;
    }

    onSportChange(type);
    setSportPickerVisible(false);
  };

  return (
    <Modal
      visible={Boolean(activity)}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => {
        if (!syncRetrying) onClose();
      }}
    >
      <SafeAreaView style={styles.postSafeArea} edges={['right', 'left']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.postKeyboard}
        >
          {activity && (
            <ScrollView
              contentContainerStyle={[
                styles.postScroll,
                {
                  paddingTop: insets.top + spacing.lg,
                  paddingBottom: insets.bottom + spacing.xl
                }
              ]}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.postHeader}>
                <View style={{ flex: 1 }}>
                  <AppText variant="caption" style={{ color: colors.success }}>
                    ACTIVITY COMPLETE
                  </AppText>
                  <AppText variant="title">
                    {title.trim() || activity.title || fallbackActivityTitle(activity.type)}
                  </AppText>
                  <AppText muted>
                    {ACTIVITY_LABELS[activity.type]} - {new Date(activity.completedAt).toLocaleString()}
                  </AppText>
                </View>
                <Pressable onPress={onClose} disabled={syncRetrying} style={[styles.iconButton, syncRetrying && styles.disabled]}>
                  <Ionicons name="close" size={22} color={colors.text} />
                </Pressable>
              </View>

              <View style={styles.postMediaSection}>
                {hasRoute && hasPhoto && (
                  <View style={styles.mediaTabs}>
                    {(['map', 'photo'] as const).map((tab) => (
                      <Pressable
                        key={`post-media-${tab}`}
                        onPress={() => setMediaTab(tab)}
                        style={[styles.mediaTab, mediaTab === tab && styles.mediaTabActive]}
                      >
                        <Ionicons
                          name={tab === 'map' ? 'map-outline' : 'image-outline'}
                          size={16}
                          color={mediaTab === tab ? colors.black : colors.primary}
                        />
                        <AppText style={mediaTab === tab && styles.mediaTabTextActive}>
                          {tab === 'map' ? 'Map' : 'Photo'}
                        </AppText>
                      </Pressable>
                    ))}
                  </View>
                )}

                {hasRoute && mediaTab === 'map' ? (
                  <ActivityRouteMap route={activity.route} height={260} />
                ) : hasPhoto && photoUri ? (
                  <Image
                    source={{ uri: photoUri }}
                    style={styles.postPhoto}
                    resizeMode="cover"
                    onError={onPhotoRenderError}
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <View style={styles.photoIconRing}>
                      <Ionicons
                        name={photoRenderFailed ? 'warning-outline' : 'map-outline'}
                        size={38}
                        color={colors.primary}
                      />
                    </View>
                    <AppText variant="subtitle">
                      {photoRenderFailed ? 'Photo could not be previewed' : 'No map or photo available'}
                    </AppText>
                    <AppText muted style={styles.photoHelpText}>
                      {photoRenderFailed
                        ? 'Choose another image or switch back to the saved route.'
                        : 'Manual activities can still be finished without media.'}
                    </AppText>
                  </View>
                )}
              </View>
              {photoUploadError && (
                <View style={styles.photoError}>
                  <Ionicons name="warning-outline" size={18} color={colors.warning} />
                  <AppText style={styles.photoErrorText}>{photoUploadError}</AppText>
                </View>
              )}
              {syncWarning?.activityId === activity.id && (
                <View style={styles.postSyncWarning}>
                  <Ionicons name="cloud-offline-outline" size={20} color={colors.warning} />
                  <View style={{ flex: 1, gap: spacing.xxs }}>
                    <AppText style={styles.postSyncWarningTitle}>Activity saved - sync needs attention</AppText>
                    <AppText variant="caption" muted numberOfLines={3}>
                      {syncWarning.failures.map(formatPostSaveSyncFailure).join(' ')}
                    </AppText>
                  </View>
                  <Pressable
                    onPress={onRetrySync}
                    disabled={syncRetrying}
                    style={[styles.postSyncRetry, syncRetrying && styles.disabled]}
                  >
                    <Ionicons name="refresh" size={16} color={colors.primary} />
                    <AppText variant="caption" style={styles.postSyncRetryText}>
                      {syncRetrying ? 'Retrying' : 'Retry'}
                    </AppText>
                  </Pressable>
                </View>
              )}

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
              <SummaryCard label="Duration" value={formatDuration(activity.durationSeconds)} />
              <SummaryCard
                label="Distance"
                value={activity.distanceMeters ? formatDistance(activity.distanceMeters, units) : 'Manual'}
              />
              <SummaryCard
                label={activity.type === 'bike' ? 'Avg speed' : 'Avg pace'}
                value={
                  isGpsActivity(activity.type)
                    ? activity.type === 'bike'
                      ? formatSpeed(activity.durationSeconds, activity.distanceMeters, units)
                      : formatPace(activity.durationSeconds, activity.distanceMeters, units)
                    : '--'
                }
              />
              {elevation !== null && (
                <SummaryCard
                  label="Elevation"
                  value={units === 'imperial' ? `${Math.round(elevation * 3.28084)} ft` : `${Math.round(elevation)} m`}
                />
              )}
            </View>

            <RewardBreakdown activity={activity} fallbackRecords={newPersonalRecords} />

            <View style={styles.postActions}>
              <PrimaryButton label={uploading ? 'Uploading...' : 'Take photo'} onPress={onCamera} disabled={uploading || titleSaving || sportSaving || syncRetrying} />
              <PrimaryButton
                label={uploading ? 'Uploading...' : 'Choose from library'}
                variant="secondary"
                onPress={onLibrary}
                disabled={uploading || titleSaving || sportSaving || syncRetrying}
              />
              <PrimaryButton label={titleSaving ? 'Saving...' : 'Save activity / Finish'} onPress={onClose} disabled={uploading || titleSaving || sportSaving || syncRetrying} />
              <PrimaryButton label={activity.photoUrl ? 'Done' : 'Skip'} variant="secondary" onPress={onClose} disabled={uploading || titleSaving || sportSaving || syncRetrying} />
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

const RewardBreakdown = ({
  activity,
  fallbackRecords
}: {
  activity: Activity;
  fallbackRecords: PersonalRecord[];
}) => {
  const summary = activity.rewardSummary;
  const [levelPreviewVisible, setLevelPreviewVisible] = useState(false);
  const records = summary?.personalRecords.length
    ? summary.personalRecords
    : fallbackRecords.map((record) => ({ recordType: record.recordType, sportKey: record.sportKey }));
  const levelCelebration: LevelUpCelebrationModel | null =
    summary?.levelBefore !== null &&
    summary?.levelBefore !== undefined &&
    summary.levelAfter !== null &&
    summary.levelAfter !== undefined &&
    summary.levelAfter > summary.levelBefore
      ? {
          userId: activity.userId,
          previousLevel: summary.levelBefore,
          level: summary.levelAfter,
          queuedAt: summary.processedAt,
          viewedAt: null
        }
      : null;

  useEffect(() => {
    setLevelPreviewVisible(false);
  }, [activity.id]);

  return (
    <>
      <View style={styles.rewardPanel}>
        <View style={styles.rewardHeader}>
          <View>
            <AppText variant="caption" style={{ color: colors.warning }}>
              REWARDS
            </AppText>
            <AppText variant="subtitle">Training gains</AppText>
          </View>
          <Ionicons name="sparkles" size={24} color={colors.warning} />
        </View>

        {summary ? (
          <>
            <View style={styles.rewardGrid}>
              <RewardLine icon="flash" label="Character EXP" value={`+${summary.characterExp}`} />
              <RewardLine icon="ellipse" label="Gold Coins" value={`+${summary.goldCoins}`} coin />
              {Object.entries(summary.statExp).map(([stat, value]) => (
                <RewardLine
                  key={`reward-stat-${stat}`}
                  icon="trending-up"
                  label={stat.charAt(0).toUpperCase() + stat.slice(1)}
                  value={`+${value}`}
                />
              ))}
            </View>

            {levelCelebration && (
              <Pressable onPress={() => setLevelPreviewVisible(true)} style={styles.levelReward}>
                <Ionicons name="star" size={20} color={colors.warning} />
                <View style={{ flex: 1 }}>
                  <AppText style={styles.levelRewardText}>Level Up: {summary.levelBefore} to {summary.levelAfter}</AppText>
                  <AppText variant="caption" muted>Tap to view celebration</AppText>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.warning} />
              </Pressable>
            )}

            {summary.missionsCompleted.map((mission) => (
              <View key={`reward-mission-${mission.id}`} style={styles.rewardEventGroup}>
                <RewardEvent
                  icon="checkmark-circle"
                  label="Mission Complete"
                  value={`${mission.title} (+${mission.rewardExp} EXP, +${mission.rewardCoins ?? 0} gold)`}
                />
                {mission.optionalUnlockName && (
                  <RewardEvent
                    icon="ribbon"
                    label="Badge Unlocked"
                    value={mission.optionalUnlockName}
                  />
                )}
              </View>
            ))}
            {summary.achievementsUnlocked.map((achievement) => (
              <RewardEvent
                key={`reward-achievement-${achievement.id}`}
                icon="medal"
                label="Achievement Unlocked"
                value={achievement.title}
              />
            ))}
            {records.map((record) => (
              <RewardEvent
                key={`reward-record-${record.recordType}-${record.sportKey}`}
                icon="trophy"
                label="New Record"
                value={`${PERSONAL_RECORD_LABELS[record.recordType]} - ${
                  record.sportKey === 'all' ? 'All sports' : ACTIVITY_LABELS[record.sportKey]
                }`}
              />
            ))}
          </>
        ) : (
          <AppText muted>Rewards are saved with this activity and will sync when progression is available.</AppText>
        )}
      </View>

      <LevelUpCelebration
        visible={levelPreviewVisible && Boolean(levelCelebration)}
        celebration={levelCelebration}
        onContinue={() => setLevelPreviewVisible(false)}
        additionalUnlocks={summary?.achievementsUnlocked.map((achievement) => achievement.title) ?? []}
      />
    </>
  );
};

const RewardLine = ({
  icon,
  label,
  value,
  coin = false
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  coin?: boolean;
}) => (
  <View style={styles.rewardLine}>
    <Ionicons name={icon} size={16} color={coin ? colors.coin : colors.primary} />
    <View style={{ flex: 1 }}>
      <AppText variant="caption" muted>
        {label}
      </AppText>
      <AppText style={[styles.rewardValue, coin && { color: colors.coin }]}>{value}</AppText>
    </View>
  </View>
);

const RewardEvent = ({
  icon,
  label,
  value
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) => (
  <View style={styles.rewardEvent}>
    <Ionicons name={icon} size={19} color={colors.warning} />
    <View style={{ flex: 1 }}>
      <AppText variant="caption" style={{ color: colors.warning }}>
        {label}
      </AppText>
      <AppText>{value}</AppText>
    </View>
  </View>
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
  manualStartState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md
  },
  manualStartCopy: {
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 21
  },
  manualTimerState: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md
  },
  manualTimerValue: {
    color: colors.text,
    fontSize: 42,
    lineHeight: 50,
    fontWeight: '900'
  },
  manualTimerControls: {
    width: '100%',
    flexDirection: 'row',
    gap: spacing.sm
  },
  manualTimerButton: {
    flex: 1
  },
  manualValidationError: {
    color: colors.warning,
    lineHeight: 20
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
  postMediaSection: {
    gap: spacing.sm
  },
  mediaTabs: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  mediaTab: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  mediaTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary
  },
  mediaTabTextActive: {
    color: colors.black,
    fontWeight: '900'
  },
  photoPlaceholder: {
    minHeight: 260,
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
  postSyncWarning: {
    minHeight: 74,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: 'rgba(255, 184, 77, 0.08)',
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  postSyncWarningTitle: {
    color: colors.warning,
    fontWeight: '900'
  },
  postSyncRetry: {
    minHeight: 38,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs
  },
  postSyncRetryText: {
    color: colors.primary,
    fontWeight: '900'
  },
  postPhoto: {
    width: '100%',
    height: 260,
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
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  summaryCard: {
    flexGrow: 1,
    flexBasis: '45%',
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
  rewardPanel: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: 'rgba(255, 184, 77, 0.07)',
    padding: spacing.md,
    gap: spacing.sm
  },
  rewardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md
  },
  rewardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm
  },
  rewardLine: {
    flexBasis: '45%',
    flexGrow: 1,
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  rewardValue: {
    color: colors.primary,
    fontWeight: '900'
  },
  rewardEvent: {
    minHeight: 54,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  rewardEventGroup: {
    gap: spacing.sm
  },
  levelReward: {
    minHeight: 52,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.warning,
    backgroundColor: 'rgba(255, 184, 77, 0.12)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm
  },
  levelRewardText: {
    color: colors.warning,
    fontWeight: '900'
  },
  postActions: {
    gap: spacing.sm,
    paddingTop: spacing.xs
  }
});
