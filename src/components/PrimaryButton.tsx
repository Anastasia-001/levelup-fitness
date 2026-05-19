import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, radii, spacing } from '@/constants/theme';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  style?: ViewStyle;
};

export const PrimaryButton = ({
  label,
  onPress,
  variant = 'primary',
  disabled,
  style
}: PrimaryButtonProps) => (
  <Pressable
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.button,
      styles[variant],
      disabled && styles.disabled,
      pressed && !disabled && styles.pressed,
      style
    ]}
  >
    <AppText style={[styles.label, variant === 'primary' && styles.primaryLabel]}>{label}</AppText>
  </Pressable>
);

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderRadius: radii.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md
  },
  primary: {
    backgroundColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.border,
    borderWidth: 1
  },
  danger: {
    backgroundColor: colors.danger
  },
  disabled: {
    opacity: 0.45
  },
  pressed: {
    transform: [{ scale: 0.98 }]
  },
  label: {
    fontWeight: '800'
  },
  primaryLabel: {
    color: '#04110E'
  }
});
