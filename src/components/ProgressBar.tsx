import { StyleSheet, View } from 'react-native';
import { colors, radii } from '@/constants/theme';

export const ProgressBar = ({ value }: { value: number }) => (
  <View style={styles.track}>
    <View style={[styles.fill, { width: `${Math.max(0, Math.min(1, value)) * 100}%` }]} />
  </View>
);

const styles = StyleSheet.create({
  track: {
    height: 10,
    backgroundColor: colors.surfaceHigh,
    borderRadius: radii.sm,
    overflow: 'hidden'
  },
  fill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radii.sm
  }
});
