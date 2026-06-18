import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import {
  GPS_BACKGROUND_MAX_QUEUED_POINTS,
  GPS_DUPLICATE_TIME_WINDOW_MS,
  GPS_LONG_TRACKING_GAP_MS,
  GPS_MAX_ACCURACY_METERS,
  GPS_MAX_REASONABLE_SPEED_BY_SPORT,
  GPS_MIN_DISTANCE_METERS,
  GPS_MIN_TIME_MS,
  GPS_POOR_ACCURACY_METERS,
  GPS_POOR_ACCURACY_MIN_DISTANCE_METERS,
  GPS_REPORTED_SPEED_TOLERANCE
} from '@/constants/gps';
import { ActivityType, RoutePoint } from '@/types/domain';
import { distanceBetweenMeters } from '@/utils/geo';

export const BACKGROUND_LOCATION_TASK = 'levelup-fitness-background-location';

const BACKGROUND_POINTS_KEY = '@levelup-fitness/background-route-points';
const BACKGROUND_SESSION_KEY = '@levelup-fitness/background-route-session';

type BackgroundLocationData = {
  locations?: Location.LocationObject[];
};

type BackgroundSession = {
  active: boolean;
  activityType: ActivityType;
  startedAt: number;
};

export type LocationPermissionResult = {
  foregroundGranted: boolean;
  backgroundGranted: boolean;
  backgroundAvailable: boolean;
  taskManagerAvailable: boolean;
};

export type RoutePointResult = {
  accepted: boolean;
  point?: RoutePoint;
  distanceDelta: number;
  segmentId: number;
  startsNewSegment: boolean;
  reason?: string;
};

export const foregroundLocationOptions: Location.LocationOptions = {
  accuracy: Location.Accuracy.BestForNavigation,
  distanceInterval: GPS_MIN_DISTANCE_METERS,
  timeInterval: GPS_MIN_TIME_MS
};

const backgroundLocationOptions: Location.LocationTaskOptions = {
  ...foregroundLocationOptions,
  activityType: Location.ActivityType.Fitness,
  pausesUpdatesAutomatically: false,
  showsBackgroundLocationIndicator: true,
  deferredUpdatesDistance: 0,
  deferredUpdatesInterval: 0,
  deferredUpdatesTimeout: 0,
  foregroundService: {
    notificationTitle: 'LevelUp Fitness is recording',
    notificationBody: 'GPS tracking stays active while your workout is running.',
    notificationColor: '#35F6FF',
    killServiceOnDestroy: false
  }
};

export const requestGpsPermissions = async (requestBackground: boolean): Promise<LocationPermissionResult> => {
  const foreground = await Location.requestForegroundPermissionsAsync();
  const expoGoRuntime = isExpoGoRuntime();
  const taskManagerAvailable = expoGoRuntime ? false : await safeTaskManagerAvailable();
  const backgroundAvailable = expoGoRuntime ? false : await safeBackgroundLocationAvailable();
  let backgroundGranted = false;

  if (foreground.status === 'granted' && requestBackground && taskManagerAvailable && backgroundAvailable) {
    try {
      const background = await Location.requestBackgroundPermissionsAsync();
      backgroundGranted = background.status === 'granted';
    } catch (caught) {
      logGpsWarning('request-background-permission', caught);
    }
  }

  return {
    foregroundGranted: foreground.status === 'granted',
    backgroundGranted,
    backgroundAvailable,
    taskManagerAvailable
  };
};

export const startForegroundLocationUpdates = async (
  onPoint: (point: RoutePoint) => void,
  onError?: (message: string) => void
) =>
  Location.watchPositionAsync(
    foregroundLocationOptions,
    (location) => {
      const point = routePointFromLocation(location);
      if (point) {
        onPoint(point);
      }
    },
    onError
  );

export const startBackgroundLocationUpdates = async (activityType: ActivityType) => {
  const taskManagerAvailable = await safeTaskManagerAvailable();
  const backgroundAvailable = await safeBackgroundLocationAvailable();

  if (!taskManagerAvailable || !backgroundAvailable) {
    return false;
  }

  await AsyncStorage.setItem(
    BACKGROUND_SESSION_KEY,
    JSON.stringify({
      active: true,
      activityType,
      startedAt: Date.now()
    } satisfies BackgroundSession)
  );
  await clearQueuedBackgroundPoints();

  const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  if (alreadyStarted) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, backgroundLocationOptions);
  return true;
};

export const stopBackgroundLocationUpdates = async () => {
  await AsyncStorage.removeItem(BACKGROUND_SESSION_KEY);

  try {
    const alreadyStarted = await Location.hasStartedLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    if (alreadyStarted) {
      await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
    }
  } catch (caught) {
    logGpsWarning('stop-background-location', caught);
  }
};

export const clearQueuedBackgroundPoints = async () => {
  await AsyncStorage.removeItem(BACKGROUND_POINTS_KEY);
};

export const consumeQueuedBackgroundPoints = async () => {
  const points = await readQueuedBackgroundPoints();
  await clearQueuedBackgroundPoints();
  return points;
};

export const evaluateRoutePoint = ({
  point,
  lastPoint,
  activityType,
  segmentId,
  forceNewSegment = false
}: {
  point: RoutePoint;
  lastPoint?: RoutePoint | null;
  activityType: ActivityType;
  segmentId: number;
  forceNewSegment?: boolean;
}): RoutePointResult => {
  if (!isFiniteCoordinate(point)) {
    return { accepted: false, distanceDelta: 0, segmentId, startsNewSegment: false, reason: 'invalid-coordinate' };
  }

  if (isPoorAccuracy(point)) {
    return { accepted: false, distanceDelta: 0, segmentId, startsNewSegment: false, reason: 'poor-accuracy' };
  }

  if (!lastPoint || forceNewSegment) {
    return {
      accepted: true,
      point: { ...point, segmentId: forceNewSegment ? segmentId + 1 : segmentId },
      distanceDelta: 0,
      segmentId: forceNewSegment ? segmentId + 1 : segmentId,
      startsNewSegment: forceNewSegment
    };
  }

  if (point.timestamp <= lastPoint.timestamp) {
    return { accepted: false, distanceDelta: 0, segmentId, startsNewSegment: false, reason: 'stale-timestamp' };
  }

  const distance = distanceBetweenMeters(lastPoint, point);
  const timestampDelta = point.timestamp - lastPoint.timestamp;
  const elapsedSeconds = Math.max(0.001, (point.timestamp - lastPoint.timestamp) / 1000);
  const calculatedSpeed = distance / elapsedSeconds;
  const reportedSpeed = validSpeed(point.speed);
  const maxSpeed = GPS_MAX_REASONABLE_SPEED_BY_SPORT[activityType];
  const longGap = timestampDelta > GPS_LONG_TRACKING_GAP_MS;

  if (isDuplicateCoordinate(lastPoint, point) || (distance < GPS_MIN_DISTANCE_METERS && timestampDelta < GPS_DUPLICATE_TIME_WINDOW_MS)) {
    return { accepted: false, distanceDelta: 0, segmentId, startsNewSegment: false, reason: 'duplicate-point' };
  }

  if (
    (isPoorAccuracy(point, GPS_POOR_ACCURACY_METERS) || isPoorAccuracy(lastPoint, GPS_POOR_ACCURACY_METERS)) &&
    distance < GPS_POOR_ACCURACY_MIN_DISTANCE_METERS
  ) {
    return { accepted: false, distanceDelta: 0, segmentId, startsNewSegment: false, reason: 'poor-accuracy-small-move' };
  }

  if (reportedSpeed !== null && reportedSpeed > maxSpeed * GPS_REPORTED_SPEED_TOLERANCE) {
    return { accepted: false, distanceDelta: 0, segmentId, startsNewSegment: false, reason: 'unrealistic-reported-speed' };
  }

  if (!longGap && calculatedSpeed > maxSpeed) {
    return { accepted: false, distanceDelta: 0, segmentId, startsNewSegment: false, reason: 'unrealistic-speed' };
  }

  if (longGap) {
    const nextSegmentId = segmentId + 1;
    return {
      accepted: true,
      point: { ...point, segmentId: nextSegmentId },
      distanceDelta: 0,
      segmentId: nextSegmentId,
      startsNewSegment: true,
      reason: 'long-gap-new-segment'
    };
  }

  return {
    accepted: true,
    point: { ...point, segmentId },
    distanceDelta: distance,
    segmentId,
    startsNewSegment: false
  };
};

export const routePointFromLocation = (location: Location.LocationObject): RoutePoint | null => {
  const { coords } = location;
  const point: RoutePoint = {
    latitude: coords.latitude,
    longitude: coords.longitude,
    altitude: coords.altitude,
    accuracy: coords.accuracy,
    speed: coords.speed,
    timestamp: location.timestamp
  };

  return isFiniteCoordinate(point) ? point : null;
};

const readBackgroundSession = async (): Promise<BackgroundSession | null> => {
  const raw = await AsyncStorage.getItem(BACKGROUND_SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as BackgroundSession;
  } catch {
    return null;
  }
};

const readQueuedBackgroundPoints = async () => {
  const raw = await AsyncStorage.getItem(BACKGROUND_POINTS_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as RoutePoint[];
    return Array.isArray(parsed) ? parsed.filter(isFiniteCoordinate) : [];
  } catch {
    return [];
  }
};

const appendQueuedBackgroundPoints = async (points: RoutePoint[]) => {
  if (!points.length) return;
  const existing = await readQueuedBackgroundPoints();
  const merged = dedupeRoutePoints([...existing, ...points])
    .sort((a, b) => a.timestamp - b.timestamp)
    .slice(-GPS_BACKGROUND_MAX_QUEUED_POINTS);
  await AsyncStorage.setItem(BACKGROUND_POINTS_KEY, JSON.stringify(merged));
};

const dedupeRoutePoints = (points: RoutePoint[]) => {
  const seen = new Set<string>();
  const unique: RoutePoint[] = [];

  points.forEach((point) => {
    const key = `${point.timestamp}:${point.latitude.toFixed(6)}:${point.longitude.toFixed(6)}`;
    if (seen.has(key)) return;
    seen.add(key);
    unique.push(point);
  });

  return unique;
};

const isFiniteCoordinate = (point: RoutePoint) =>
  Number.isFinite(point.latitude) &&
  Number.isFinite(point.longitude) &&
  Math.abs(point.latitude) <= 90 &&
  Math.abs(point.longitude) <= 180 &&
  Number.isFinite(point.timestamp) &&
  point.timestamp > 0;

const isPoorAccuracy = (point: RoutePoint, threshold = GPS_MAX_ACCURACY_METERS) =>
  typeof point.accuracy === 'number' &&
  Number.isFinite(point.accuracy) &&
  point.accuracy > threshold;

const isDuplicateCoordinate = (a: RoutePoint, b: RoutePoint) =>
  Math.abs(a.latitude - b.latitude) < 0.000001 &&
  Math.abs(a.longitude - b.longitude) < 0.000001;

const validSpeed = (speed: RoutePoint['speed']) => {
  if (typeof speed !== 'number' || !Number.isFinite(speed) || speed < 0) {
    return null;
  }

  return speed;
};

const safeTaskManagerAvailable = async () => {
  try {
    return await TaskManager.isAvailableAsync();
  } catch {
    return false;
  }
};

const safeBackgroundLocationAvailable = async () => {
  try {
    return await Location.isBackgroundLocationAvailableAsync();
  } catch {
    return false;
  }
};

const isExpoGoRuntime = () => Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const logGpsWarning = (stage: string, error: unknown) => {
  if (!__DEV__) return;
  console.warn('[LevelUp] GPS tracking warning', { stage, error });
};

if (!TaskManager.isTaskDefined(BACKGROUND_LOCATION_TASK)) {
  TaskManager.defineTask<BackgroundLocationData>(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
    if (error) {
      logGpsWarning('background-task-error', error);
      return;
    }

    const session = await readBackgroundSession();
    if (!session?.active) return;

    const points = (data.locations ?? [])
      .map(routePointFromLocation)
      .filter((point): point is RoutePoint => Boolean(point))
      .filter((point) => !isPoorAccuracy(point));

    await appendQueuedBackgroundPoints(points);
  });
}
