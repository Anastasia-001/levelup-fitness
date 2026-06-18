import { UnitPreference } from '@/types/domain';

export const formatDuration = (seconds: number) => {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hrs = Math.floor(safeSeconds / 3600);
  const mins = Math.floor((safeSeconds % 3600) / 60);
  const secs = safeSeconds % 60;

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const formatDistance = (meters = 0, units: UnitPreference = 'metric') => {
  if (units === 'imperial') {
    return `${(meters / 1609.344).toFixed(2)} mi`;
  }

  return `${(meters / 1000).toFixed(2)} km`;
};

export const formatPace = (seconds: number, meters = 0, units: UnitPreference = 'metric') => {
  if (meters <= 0 || seconds <= 0) {
    return '--';
  }

  const unitMeters = units === 'imperial' ? 1609.344 : 1000;
  const paceSeconds = seconds / (meters / unitMeters);
  return `${formatDuration(paceSeconds)} /${units === 'imperial' ? 'mi' : 'km'}`;
};

export const formatSpeed = (seconds: number, meters = 0, units: UnitPreference = 'metric') => {
  if (meters <= 0 || seconds <= 0) {
    return '--';
  }

  const hours = seconds / 3600;
  const distance = units === 'imperial' ? meters / 1609.344 : meters / 1000;
  return `${(distance / hours).toFixed(1)} ${units === 'imperial' ? 'mph' : 'km/h'}`;
};

export const todayKey = () => new Date().toISOString().slice(0, 10);
