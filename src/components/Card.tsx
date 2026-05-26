import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, shadows, spacing } from '@/constants/theme';

export const Card = ({ children }: { children: ReactNode }) => (
  <View style={styles.card}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.borderDim,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    ...shadows.card
  }
});
