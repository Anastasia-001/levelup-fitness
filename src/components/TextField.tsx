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
    borderRadius: radii.md,
    borderColor: colors.borderDim,
    borderWidth: 1,
    backgroundColor: colors.cardHigh,
    color: colors.text,
    paddingHorizontal: spacing.md,
    fontSize: 16
  }
});
