import { RoutePoint } from '@/types/domain';

const toRadians = (value: number) => (value * Math.PI) / 180;

export const distanceBetweenMeters = (a: RoutePoint, b: RoutePoint) => {
  const earthRadius = 6371000;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  return 2 * earthRadius * Math.asin(Math.sqrt(h));
};

export const routeDistanceMeters = (points: RoutePoint[]) =>
  points.reduce((total, point, index) => {
    if (index === 0) {
      return 0;
    }

    if (points[index - 1].segmentId !== point.segmentId) {
      return total;
    }

    return total + distanceBetweenMeters(points[index - 1], point);
  }, 0);

export const elevationGainMeters = (points: RoutePoint[] = []) => {
  let validPairs = 0;
  const gain = points.reduce((total, point, index) => {
    if (index === 0 || points[index - 1].segmentId !== point.segmentId) return total;
    const previousAltitude = points[index - 1].altitude;
    const altitude = point.altitude;
    if (
      typeof previousAltitude !== 'number' ||
      typeof altitude !== 'number' ||
      !Number.isFinite(previousAltitude) ||
      !Number.isFinite(altitude)
    ) {
      return total;
    }

    validPairs += 1;
    return total + Math.max(0, altitude - previousAltitude);
  }, 0);

  return validPairs > 0 && gain >= 1 ? gain : null;
};
