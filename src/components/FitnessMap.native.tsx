import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { colors } from '@/constants/theme';
import { RoutePoint } from '@/types/domain';

type FitnessMapProps = {
  route: RoutePoint[];
  currentPoint: RoutePoint | null;
};

export const FitnessMap = ({ route, currentPoint }: FitnessMapProps) => {
  const last = route[route.length - 1] ?? currentPoint;
  const routeSegments = splitRouteSegments(route);
  const region = {
    latitude: last?.latitude ?? 37.78825,
    longitude: last?.longitude ?? -122.4324,
    latitudeDelta: 0.01,
    longitudeDelta: 0.01
  };

  return (
    <MapView
      style={styles.map}
      region={region}
      showsUserLocation={false}
      showsCompass={false}
      toolbarEnabled={false}
    >
      {routeSegments.map((segment) => (
        <Polyline
          key={`route-segment-${segment[0]?.segmentId ?? 0}-${segment[0]?.timestamp ?? 0}`}
          coordinates={segment}
          strokeColor={colors.route}
          strokeWidth={5}
        />
      ))}
      {currentPoint && (
        <Marker coordinate={currentPoint} anchor={{ x: 0.5, y: 0.5 }}>
          <View style={styles.markerOuter}>
            <View style={styles.markerPulse} />
            <View style={styles.markerDot} />
          </View>
        </Marker>
      )}
    </MapView>
  );
};

const splitRouteSegments = (route: RoutePoint[]) => {
  const segments: RoutePoint[][] = [];

  route.forEach((point) => {
    const previousSegment = segments[segments.length - 1];
    const previousPoint = previousSegment?.[previousSegment.length - 1];
    const startsNewSegment =
      !previousSegment ||
      previousPoint?.segmentId !== point.segmentId;

    if (startsNewSegment) {
      segments.push([point]);
      return;
    }

    previousSegment.push(point);
  });

  return segments.filter((segment) => segment.length > 1);
};

const styles = StyleSheet.create({
  map: {
    flex: 1
  },
  markerOuter: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center'
  },
  markerPulse: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(53, 246, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(53, 246, 255, 0.55)'
  },
  markerDot: {
    width: 13,
    height: 13,
    borderRadius: 7,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.white
  }
});
