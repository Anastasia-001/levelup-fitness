import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { ActivityHistoryList } from '@/components/ActivityHistoryList';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { FitnessMap } from '@/components/FitnessMap';
import { MetricTile } from '@/components/MetricTile';
import { PrimaryButton } from '@/components/PrimaryButton';
import { Screen } from '@/components/Screen';
import { TextField } from '@/components/TextField';
import { ACTIVITY_LABELS, GPS_ACTIVITY_TYPES, MANUAL_ACTIVITY_TYPES, isGpsActivity } from '@/constants/activities';
import { colors, radii, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import { saveActivity } from '@/services/activityService';
import { getTodayMissions } from '@/services/missionService';
import { ensureProfileAndCharacter } from '@/services/profileService';
import { useAppStore } from '@/store/appStore';
import { ActivityType, RoutePoint } from '@/types/domain';
import { formatDistance, formatDuration, formatPace } from '@/utils/format';
import { distanceBetweenMeters } from '@/utils/geo';

type RecordingState = 'idle' | 'recording' | 'paused';

export default function RecordScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ActivityType>('run');
  const [mode, setMode] = useState<'record' | 'history'>('record');
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
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const recordingStateRef = useRef<RecordingState>('idle');
  const addActivity = useAppStore((state) => state.addActivity);
  const setCharacter = useAppStore((state) => state.setCharacter);
  const setMissions = useAppStore((state) => state.setMissions);
  const units = useAppStore((state) => state.profile?.unitPreference ?? 'metric');
  const activities = useAppStore((state) => state.activities);

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
    if (recordingState !== 'recording') {
      return;
    }

    const timer = setInterval(() => setElapsedSeconds((current) => current + 1), 1000);
    return () => clearInterval(timer);
  }, [recordingState]);

  const selectedIsGps = isGpsActivity(selectedType);
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
        if (recordingStateRef.current !== 'recording') {
          return;
        }

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

  const pauseGps = () => setRecordingState('paused');
  const resumeGps = () => setRecordingState('recording');

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
  };

  const saveWorkout = async (input: Parameters<typeof saveActivity>[1]) => {
    if (!userId) return;
    setSaving(true);
    try {
      const result = await saveActivity(userId, input);
      addActivity(result.activity);
      setCharacter(result.character);
      setMissions(result.missions.length ? result.missions : await getTodayMissions(userId));
      Alert.alert('Activity saved', `Earned ${result.expEarned} EXP${result.bonusExp ? ` including ${result.bonusExp} mission bonus` : ''}.`);
    } catch (caught) {
      Alert.alert('Could not save activity', caught instanceof Error ? caught.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen scroll={mode === 'history' || !selectedIsGps}>
      <View>
        <AppText variant="caption" style={{ color: colors.primary }}>
          Record
        </AppText>
        <AppText variant="title">{mode === 'record' ? 'Choose your activity' : 'Activity history'}</AppText>
      </View>

      <View style={styles.segment}>
        {(['record', 'history'] as const).map((nextMode) => (
          <Pressable
            key={nextMode}
            onPress={() => recordingState === 'idle' && setMode(nextMode)}
            style={[styles.segmentItem, mode === nextMode && styles.segmentActive]}
          >
            <AppText style={mode === nextMode && styles.segmentText}>
              {nextMode === 'record' ? 'Record' : 'History'}
            </AppText>
          </Pressable>
        ))}
      </View>

      {mode === 'history' ? (
        <ActivityHistoryList activities={activities} units={units} />
      ) : (
        <>
          {recordingState === 'idle' && (
            <View style={styles.optionsGrid}>
              {[...GPS_ACTIVITY_TYPES, ...MANUAL_ACTIVITY_TYPES].map((type) => (
                <Pressable
                  key={type}
                  onPress={() => setSelectedType(type)}
                  style={[styles.option, selectedType === type && styles.optionActive]}
                >
                  <AppText style={selectedType === type && styles.optionTextActive}>{ACTIVITY_LABELS[type]}</AppText>
                </Pressable>
              ))}
            </View>
          )}

          {selectedIsGps ? (
            <View style={styles.gpsLayout}>
              <View style={styles.metricsRow}>
                <MetricTile label="Time" value={formatDuration(elapsedSeconds)} />
                <MetricTile label="Distance" value={formatDistance(distanceMeters, units)} />
              </View>
              <View style={styles.metricsRow}>
                <MetricTile label="Avg pace" value={formatPace(elapsedSeconds, distanceMeters, units)} />
                <MetricTile label="Route points" value={String(route.length)} />
              </View>

              <View style={styles.mapShell}>
                <FitnessMap route={route} currentPoint={currentPoint} />
                {route.length === 0 && (
                  <View pointerEvents="none" style={styles.mapEmpty}>
                    <AppText variant="caption" style={{ color: colors.primary }}>
                      GPS route will appear here
                    </AppText>
                  </View>
                )}
              </View>

              <View style={styles.controls}>
                {recordingState === 'idle' && <PrimaryButton label="Start GPS" onPress={startGps} disabled={saving} />}
                {recordingState === 'recording' && <PrimaryButton label="Pause" variant="secondary" onPress={pauseGps} />}
                {recordingState === 'paused' && <PrimaryButton label="Resume" onPress={resumeGps} />}
                {recordingState !== 'idle' && (
                  <PrimaryButton label={saving ? 'Saving...' : 'Stop and save'} variant="danger" onPress={stopGps} disabled={saving || elapsedSeconds < 5} />
                )}
              </View>
            </View>
          ) : (
            <Card>
              <AppText variant="subtitle">{ACTIVITY_LABELS[selectedType]}</AppText>
              <TextField placeholder="Duration minutes" keyboardType="numeric" value={durationMinutes} onChangeText={setDurationMinutes} />
              <TextField placeholder="Sets optional" keyboardType="numeric" value={sets} onChangeText={setSets} />
              <TextField placeholder="Reps optional" keyboardType="numeric" value={reps} onChangeText={setReps} />
              <TextField placeholder="Weight kg optional" keyboardType="numeric" value={weightKg} onChangeText={setWeightKg} />
              <PrimaryButton
                label={saving ? 'Saving...' : 'Save workout'}
                onPress={saveManualWorkout}
                disabled={saving || Number(durationMinutes || 0) <= 0}
              />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  segment: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.borderDim,
    padding: spacing.xs
  },
  segmentItem: {
    flex: 1,
    minHeight: 42,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center'
  },
  segmentActive: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary
  },
  segmentText: {
    color: colors.primary,
    fontWeight: '900'
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    flexShrink: 0
  },
  option: {
    width: '47.8%',
    minHeight: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm
  },
  optionActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  optionTextActive: {
    color: colors.text,
    fontWeight: '800'
  },
  metricsRow: {
    flexDirection: 'row',
    gap: spacing.sm
  },
  gpsLayout: {
    flex: 1,
    gap: spacing.sm,
    minHeight: 0
  },
  mapShell: {
    height: 190,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.black
  },
  mapEmpty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(3, 7, 19, 0.45)'
  },
  controls: {
    gap: spacing.sm,
    flexShrink: 0,
    paddingTop: spacing.xs
  }
});
