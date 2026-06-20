import { GPS_MAX_REASONABLE_SPEED_BY_SPORT } from '@/constants/gps';
import { isGpsActivity } from '@/constants/activities';
import {
  Activity,
  PersonalRecord,
  PersonalRecordType,
  RoutePoint,
  UnitPreference
} from '@/types/domain';
import { formatDistance, formatDuration } from '@/utils/format';
import { distanceBetweenMeters } from '@/utils/geo';
import { normalizeRouteForDisplay, splitRouteSegments } from '@/utils/routeRendering';

export type PersonalRecordCandidate = {
  record_type: PersonalRecordType;
  sport_key: Activity['type'] | 'all';
  value: number;
  period_start?: string;
};

export const PERSONAL_RECORD_LABELS: Record<PersonalRecordType, string> = {
  fastest_1_km: 'Fastest 1 km',
  fastest_5_km: 'Fastest 5 km',
  longest_distance: 'Longest distance',
  longest_duration: 'Longest duration',
  fastest_average_pace: 'Fastest average pace',
  most_activities_week: 'Most activities in one week',
  highest_activity_exp: 'Highest activity EXP'
};

export const localDateKey = (date = new Date()) =>
  [date.getFullYear(), date.getMonth() + 1, date.getDate()]
    .map((part, index) => (index === 0 ? String(part) : String(part).padStart(2, '0')))
    .join('-');

export const localWeekStartKey = (date = new Date()) => {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const mondayOffset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - mondayOffset);
  return localDateKey(start);
};

export const buildPersonalRecordCandidates = (
  activity: Activity,
  allActivities: Activity[]
): PersonalRecordCandidate[] => {
  const candidates: PersonalRecordCandidate[] = [];
  const sportKey = activity.type;
  const distanceMeters = activity.distanceMeters ?? 0;

  if (activity.durationSeconds > 0) {
    candidates.push({
      record_type: 'longest_duration',
      sport_key: sportKey,
      value: activity.durationSeconds
    });
  }

  if (activity.expEarned > 0) {
    candidates.push({
      record_type: 'highest_activity_exp',
      sport_key: sportKey,
      value: activity.expEarned
    });
  }

  const weekStart = activity.localWeekStart ?? localWeekStartKey(new Date(activity.completedAt));
  const activitiesInWeek = allActivities.filter(
    (candidate) =>
      (candidate.localWeekStart ?? localWeekStartKey(new Date(candidate.completedAt))) === weekStart
  ).length;

  if (activitiesInWeek > 0) {
    candidates.push({
      record_type: 'most_activities_week',
      sport_key: 'all',
      value: activitiesInWeek,
      period_start: weekStart
    });
  }

  if (!isGpsActivity(activity.type) || distanceMeters <= 0) {
    return candidates;
  }

  candidates.push({
    record_type: 'longest_distance',
    sport_key: sportKey,
    value: distanceMeters
  });

  if (!hasReasonablePaceData(activity)) {
    return candidates;
  }

  const averagePaceSecondsPerKm = activity.durationSeconds / (distanceMeters / 1000);
  candidates.push({
    record_type: 'fastest_average_pace',
    sport_key: sportKey,
    value: averagePaceSecondsPerKm
  });

  const fastestKilometer = fastestSegmentSeconds(activity.route, 1000);
  if (fastestKilometer !== null) {
    candidates.push({
      record_type: 'fastest_1_km',
      sport_key: sportKey,
      value: fastestKilometer
    });
  }

  const fastestFiveKilometers = fastestSegmentSeconds(activity.route, 5000);
  if (fastestFiveKilometers !== null) {
    candidates.push({
      record_type: 'fastest_5_km',
      sport_key: sportKey,
      value: fastestFiveKilometers
    });
  }

  return candidates;
};

export const buildBestPersonalRecordCandidateGroups = (activities: Activity[]) => {
  const winners = new Map<string, { activity: Activity; candidate: PersonalRecordCandidate }>();
  const ordered = [...activities].sort(
    (left, right) => new Date(left.completedAt).getTime() - new Date(right.completedAt).getTime()
  );

  ordered.forEach((activity) => {
    buildPersonalRecordCandidates(activity, activities).forEach((candidate) => {
      const key = `${candidate.record_type}:${candidate.sport_key}`;
      const current = winners.get(key);
      if (!current || isBetterCandidate(candidate, current.candidate) || isLaterWeeklyTie(candidate, current.candidate)) {
        winners.set(key, { activity, candidate });
      }
    });
  });

  const groups = new Map<string, { activity: Activity; candidates: PersonalRecordCandidate[] }>();
  winners.forEach(({ activity, candidate }) => {
    const group = groups.get(activity.id) ?? { activity, candidates: [] };
    group.candidates.push(candidate);
    groups.set(activity.id, group);
  });

  return [...groups.values()];
};

export const formatPersonalRecordValue = (record: PersonalRecord, units: UnitPreference) => {
  if (record.recordType === 'longest_distance') {
    return formatDistance(record.value, units);
  }

  if (['fastest_1_km', 'fastest_5_km', 'longest_duration'].includes(record.recordType)) {
    return formatDuration(record.value);
  }

  if (record.recordType === 'fastest_average_pace') {
    const paceSeconds = units === 'imperial' ? record.value * 1.609344 : record.value;
    return `${formatDuration(paceSeconds)} /${units === 'imperial' ? 'mi' : 'km'}`;
  }

  if (record.recordType === 'highest_activity_exp') {
    return `${Math.round(record.value)} EXP`;
  }

  return `${Math.round(record.value)} activities`;
};

const hasReasonablePaceData = (activity: Activity) => {
  if (!isGpsActivity(activity.type)) return false;
  if (!activity.route || activity.route.length < 2) return false;
  if (!activity.distanceMeters || activity.distanceMeters < 200 || activity.durationSeconds <= 0) return false;

  const averageSpeed = activity.distanceMeters / activity.durationSeconds;
  return averageSpeed > 0.2 && averageSpeed <= GPS_MAX_REASONABLE_SPEED_BY_SPORT[activity.type];
};

const fastestSegmentSeconds = (route: RoutePoint[] | undefined, targetMeters: number) => {
  const segments = splitRouteSegments(normalizeRouteForDisplay(route));
  let fastest: number | null = null;

  segments.forEach((segment) => {
    let startIndex = 0;
    let windowDistance = 0;

    for (let endIndex = 1; endIndex < segment.length; endIndex += 1) {
      windowDistance += distanceBetweenMeters(segment[endIndex - 1], segment[endIndex]);

      while (
        startIndex < endIndex - 1 &&
        windowDistance - distanceBetweenMeters(segment[startIndex], segment[startIndex + 1]) >= targetMeters
      ) {
        windowDistance -= distanceBetweenMeters(segment[startIndex], segment[startIndex + 1]);
        startIndex += 1;
      }

      if (windowDistance < targetMeters) continue;
      const elapsedSeconds = (segment[endIndex].timestamp - segment[startIndex].timestamp) / 1000;
      if (elapsedSeconds <= 0) continue;

      const estimatedTargetSeconds = elapsedSeconds * (targetMeters / windowDistance);
      fastest = fastest === null ? estimatedTargetSeconds : Math.min(fastest, estimatedTargetSeconds);
    }
  });

  return fastest;
};

const isBetterCandidate = (candidate: PersonalRecordCandidate, current: PersonalRecordCandidate) =>
  isLowerBetter(candidate.record_type)
    ? candidate.value < current.value
    : candidate.value > current.value;

const isLaterWeeklyTie = (candidate: PersonalRecordCandidate, current: PersonalRecordCandidate) =>
  candidate.record_type === 'most_activities_week' &&
  candidate.value === current.value &&
  (candidate.period_start ?? '') >= (current.period_start ?? '');

const isLowerBetter = (recordType: PersonalRecordType) =>
  ['fastest_1_km', 'fastest_5_km', 'fastest_average_pace'].includes(recordType);
