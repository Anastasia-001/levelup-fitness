import { Text, TextProps, StyleSheet } from 'react-native';
import { colors, typography } from '@/constants/theme';

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
    fontSize: typography.title,
    fontWeight: '900'
  },
  subtitle: {
    fontSize: typography.subtitle,
    fontWeight: '800'
  },
  body: {
    fontSize: typography.body,
    lineHeight: 21
  },
  caption: {
    fontSize: typography.caption,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  metric: {
    fontSize: typography.metric,
    fontWeight: '900'
  },
  muted: {
    color: colors.muted
  }
});
