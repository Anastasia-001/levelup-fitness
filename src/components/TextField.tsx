import { TextInput, TextInputProps, StyleSheet } from 'react-native';
import { colors, radii, spacing } from '@/constants/theme';

export const TextField = (props: TextInputProps) => (
  <TextInput
    placeholderTextColor={colors.faint}
    {...props}
    style={[styles.input, props.style]}
  />
);

const styles = StyleSheet.create({
  input: {
    minHeight: 48,
    borderRadius: radii.sm,
    borderColor: colors.border,
    borderWidth: 1,
    backgroundColor: colors.surfaceHigh,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16
  }
});
