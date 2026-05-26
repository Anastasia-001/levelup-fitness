export const colors = {
  background: '#030713',
  backgroundAlt: '#07111F',
  card: '#0B1628',
  cardHigh: '#101E36',
  cardSoft: '#132442',
  border: '#1F9FBE',
  borderDim: '#21445C',
  primary: '#35F6FF',
  primarySoft: 'rgba(53, 246, 255, 0.18)',
  primaryDim: '#0C6D7A',
  secondary: '#8F5CFF',
  secondarySoft: 'rgba(143, 92, 255, 0.22)',
  success: '#47F39A',
  warning: '#FFB84D',
  danger: '#FF5C8A',
  text: '#F7FBFF',
  muted: '#A8B7CB',
  faint: '#62738A',
  black: '#02040A',
  white: '#FFFFFF',
  coin: '#FFD66E',
  route: '#35F6FF'
};

export const spacing = {
  xxs: 4,
  xs: 6,
  sm: 10,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 44
};

export const radii = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999
};

export const typography = {
  title: 28,
  subtitle: 18,
  body: 15,
  caption: 12,
  metric: 24
};

export const shadows = {
  cyanGlow: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.42,
    shadowRadius: 12,
    elevation: 8
  },
  purpleGlow: {
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 6
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 18,
    elevation: 5
  }
};

export const commonStyles = {
  neonCard: {
    backgroundColor: colors.card,
    borderColor: colors.borderDim,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadows.card
  }
};
