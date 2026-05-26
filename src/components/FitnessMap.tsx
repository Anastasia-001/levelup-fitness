import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors } from '@/constants/theme';
import { RoutePoint } from '@/types/domain';

type FitnessMapProps = {
  route: RoutePoint[];
  currentPoint: RoutePoint | null;
};

export const FitnessMap = ({ route, currentPoint }: FitnessMapProps) => (
  <View style={styles.webMap}>
    <View style={styles.gridLineVertical} />
    <View style={styles.gridLineHorizontal} />
    {currentPoint && (
      <View style={styles.markerOuter}>
        <View style={styles.markerPulse} />
        <View style={styles.markerDot} />
      </View>
    )}
    <AppText variant="caption" style={{ color: colors.primary }}>
      {route.length ? `${route.length} GPS points captured` : 'GPS route preview'}
    </AppText>
  </View>
);

const styles = StyleSheet.create({
  webMap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.black,
    overflow: 'hidden'
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
  markerOuter: {
    width: 34,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12
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
