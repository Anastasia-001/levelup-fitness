import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, radii, spacing } from '@/constants/theme';
import { RoutePoint } from '@/types/domain';

type ActivityRouteMapProps = {
  route?: RoutePoint[];
  height?: number;
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
};

export const ActivityRouteMap = ({ route, height = 180, style }: ActivityRouteMapProps) => {
  const points = route?.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude)) ?? [];

  return (
    <View style={[styles.webMap, { height }, style]}>
      <View style={styles.gridLineVertical} />
      <View style={styles.gridLineHorizontal} />
      {points.length > 0 ? (
        <>
          <View style={styles.routeLine} />
          <View style={[styles.marker, styles.startMarker]} />
          <View style={[styles.marker, styles.finishMarker]} />
          <AppText variant="caption" style={styles.routeText}>
            {points.length} GPS points captured
          </AppText>
        </>
      ) : (
        <>
          <View style={styles.placeholderRing} />
          <AppText variant="subtitle">No route captured</AppText>
          <AppText muted style={styles.placeholderText}>
            GPS route previews appear here for outdoor activities.
          </AppText>
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  webMap: {
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.black,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.md
  },
  gridLineVertical: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: colors.borderDim
  },
  gridLineHorizontal: {
    position: 'absolute',
    height: 1,
    width: '100%',
    backgroundColor: colors.borderDim
  },
  routeLine: {
    position: 'absolute',
    width: '68%',
    height: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.route,
    transform: [{ rotate: '-18deg' }]
  },
  marker: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.white
  },
  startMarker: {
    left: '18%',
    bottom: '35%',
    backgroundColor: colors.success
  },
  finishMarker: {
    right: '18%',
    top: '35%',
    backgroundColor: colors.danger
  },
  routeText: {
    color: colors.primary,
    fontWeight: '900'
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
