import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { AppText } from '@/components/AppText';
import { colors, radii, shadows, spacing } from '@/constants/theme';

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
    minHeight: 54,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    borderWidth: 1
  },
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.cyanGlow
  },
  secondary: {
    backgroundColor: colors.cardHigh,
    borderColor: colors.border
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger
  },
  disabled: {
    opacity: 0.45
  },
  pressed: {
    transform: [{ scale: 0.98 }]
  },
  label: {
    fontWeight: '900'
  },
  primaryLabel: {
    color: '#04110E'
  }
});
