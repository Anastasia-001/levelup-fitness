import { Text, TextProps, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';

type AppTextProps = TextProps & {
  variant?: 'title' | 'subtitle' | 'body' | 'caption' | 'metric';
  muted?: boolean;
};

export const AppText = ({ variant = 'body', muted, style, ...props }: AppTextProps) => (
  <Text {...props} style={[styles.base, styles[variant], muted && styles.muted, style]} />
);

const styles = StyleSheet.create({
  base: {
    color: colors.text,
    letterSpacing: 0
  },
  title: {
    fontSize: 28,
    fontWeight: '800'
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '700'
  },
  body: {
    fontSize: 15,
    lineHeight: 21
  },
  caption: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  metric: {
    fontSize: 24,
    fontWeight: '800'
  },
  muted: {
    color: colors.muted
  }
});
