import { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';

export const Card = ({ children }: { children: ReactNode }) => (
  <View style={styles.card}>{children}</View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm
  }
});
