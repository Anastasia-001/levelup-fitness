import { GPS_SMOOTHING_MAX_SHIFT_METERS } from '@/constants/gps';
import type { RoutePoint } from '@/types/domain';
import { distanceBetweenMeters } from '@/utils/geo';

export const normalizeRouteForDisplay = (route?: RoutePoint[]) =>
  (route ?? [])
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    .map((point, index) => ({
      ...point,
      segmentId: point.segmentId ?? 0,
      timestamp: Number.isFinite(point.timestamp) ? point.timestamp : index
    }));

export const splitRouteSegments = (route: RoutePoint[]) => {
  const segments: RoutePoint[][] = [];

  route.forEach((point) => {
    const previousSegment = segments[segments.length - 1];
    const previousPoint = previousSegment?.[previousSegment.length - 1];

    if (!previousSegment || previousPoint?.segmentId !== point.segmentId) {
      segments.push([point]);
      return;
    }

    previousSegment.push(point);
  });

  return segments.filter((segment) => segment.length > 1);
};

export const smoothRouteSegmentForDisplay = (segment: RoutePoint[]) => {
  if (segment.length < 4) return segment;

  return segment.map((point, index) => {
    if (index === 0 || index === segment.length - 1) {
      return point;
    }

    const previous = segment[index - 1];
    const next = segment[index + 1];
    const candidate: RoutePoint = {
      ...point,
      latitude: previous.latitude * 0.2 + point.latitude * 0.6 + next.latitude * 0.2,
      longitude: previous.longitude * 0.2 + point.longitude * 0.6 + next.longitude * 0.2
    };
    const shiftMeters = distanceBetweenMeters(point, candidate);

    return shiftMeters <= GPS_SMOOTHING_MAX_SHIFT_METERS ? candidate : point;
  });
};

export const sampleRouteSegment = (segment: RoutePoint[], maxPoints = 600) => {
  if (segment.length <= maxPoints) return segment;

  const step = Math.ceil(segment.length / maxPoints);
  const sampled = segment.filter((_, index) => index % step === 0);
  const last = segment[segment.length - 1];
  return sampled[sampled.length - 1] === last ? sampled : [...sampled, last];
};
