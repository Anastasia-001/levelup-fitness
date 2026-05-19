import { StyleSheet, View } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, radii, spacing } from '@/constants/theme';

export const MetricTile = ({ label, value }: { label: string; value: string }) => (
  <View style={styles.tile}>
    <AppText variant="caption" muted>
      {label}
    </AppText>
    <AppText variant="metric">{value}</AppText>
  </View>
);

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 78,
    borderRadius: radii.sm,
    backgroundColor: colors.surfaceHigh,
    padding: spacing.sm,
    justifyContent: 'center',
    gap: 4
  }
});
