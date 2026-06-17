import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { AppText } from '@/components/AppText';
import { colors, radii, spacing } from '@/constants/theme';
import { RoutePoint } from '@/types/domain';

type ActivityRouteMapProps = {
  route?: RoutePoint[];
  height?: number;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
};

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#07111F' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A8B7CB' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#030713' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#21445C' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#07111F' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#101E36' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#132442' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#21445C' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#02040A' }] }
];

export const ActivityRouteMap = ({
  route,
  height = 180,
  interactive = false,
  style
}: ActivityRouteMapProps) => {
  const mapRef = useRef<MapView | null>(null);
  const [ready, setReady] = useState(false);
  const validRoute = useMemo(() => normalizeRoute(route), [route]);
  const sampledSegments = useMemo(() => splitRouteSegments(validRoute).map(sampleSegment), [validRoute]);
  const start = validRoute[0];
  const finish = validRoute[validRoute.length - 1];
  const initialRegion = {
    latitude: start?.latitude ?? 37.78825,
    longitude: start?.longitude ?? -122.4324,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015
  };

  useEffect(() => {
    if (!ready || validRoute.length === 0) return;

    const timer = setTimeout(() => {
      mapRef.current?.fitToCoordinates(validRoute, {
        edgePadding: { top: 42, right: 42, bottom: 42, left: 42 },
        animated: false
      });
    }, 80);

    return () => clearTimeout(timer);
  }, [ready, validRoute]);

  if (!validRoute.length) {
    return (
      <View style={[styles.placeholder, { height }, style]}>
        <View style={styles.placeholderRing} />
        <AppText variant="subtitle">No route captured</AppText>
        <AppText muted style={styles.placeholderText}>
          GPS route previews appear here for Run, Walk, Bike, and Hike.
        </AppText>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, { height }, style]}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={initialRegion}
        customMapStyle={DARK_MAP_STYLE}
        showsUserLocation={false}
        showsCompass={false}
        toolbarEnabled={false}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        onMapReady={() => setReady(true)}
        onLayout={() => setReady(true)}
      >
        {sampledSegments.map((segment) => (
          <Polyline
            key={`saved-route-${segment[0]?.segmentId ?? 0}-${segment[0]?.timestamp ?? 0}`}
            coordinates={segment}
            strokeColor={colors.route}
            strokeWidth={5}
            lineCap="round"
            lineJoin="round"
          />
        ))}
        {start && (
          <Marker coordinate={start} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.marker, styles.startMarker]} />
          </Marker>
        )}
        {finish && finish !== start && (
          <Marker coordinate={finish} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.marker, styles.finishMarker]} />
          </Marker>
        )}
      </MapView>
      <View style={styles.badge}>
        <AppText variant="caption" style={styles.badgeText}>
          {validRoute.length} GPS points
        </AppText>
      </View>
    </View>
  );
};

const normalizeRoute = (route?: RoutePoint[]) =>
  (route ?? [])
    .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude))
    .map((point, index) => ({
      ...point,
      segmentId: point.segmentId ?? 0,
      timestamp: Number.isFinite(point.timestamp) ? point.timestamp : index
    }));

const splitRouteSegments = (route: RoutePoint[]) => {
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

const sampleSegment = (segment: RoutePoint[]) => {
  const maxPoints = 600;
  if (segment.length <= maxPoints) return segment;

  const step = Math.ceil(segment.length / maxPoints);
  const sampled = segment.filter((_, index) => index % step === 0);
  const last = segment[segment.length - 1];
  return sampled[sampled.length - 1] === last ? sampled : [...sampled, last];
};

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.black
  },
  map: {
    flex: 1
  },
  marker: {
    width: 15,
    height: 15,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.white
  },
  startMarker: {
    backgroundColor: colors.success
  },
  finishMarker: {
    backgroundColor: colors.danger
  },
  badge: {
    position: 'absolute',
    left: spacing.sm,
    bottom: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: 'rgba(2, 4, 10, 0.78)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  badgeText: {
    color: colors.primary,
    fontWeight: '900'
  },
  placeholder: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.black,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg
  },
  placeholderRing: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft
  },
  placeholderText: {
    textAlign: 'center'
  }
});
