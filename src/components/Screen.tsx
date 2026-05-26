import { ReactElement, ReactNode } from 'react';
import { RefreshControlProps, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing } from '@/constants/theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  refreshControl?: ReactElement<RefreshControlProps>;
};

export const Screen = ({ children, scroll = true, refreshControl }: ScreenProps) => {
  const content = <View style={styles.content}>{children}</View>;

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        pointerEvents="none"
        colors={['rgba(143, 92, 255, 0.2)', 'rgba(53, 246, 255, 0.06)', 'transparent']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.backdrop}
      />
      <View pointerEvents="none" style={styles.purpleGlow} />
      <View pointerEvents="none" style={styles.cyanGlow} />
      {scroll ? (
        <ScrollView refreshControl={refreshControl} contentContainerStyle={styles.scroll}>
          {content}
        </ScrollView>
      ) : (
        content
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject
  },
  purpleGlow: {
    position: 'absolute',
    top: -90,
    right: -60,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: colors.secondarySoft
  },
  cyanGlow: {
    position: 'absolute',
    bottom: 80,
    left: -90,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.primarySoft
  },
  scroll: {
    flexGrow: 1
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.lg
  }
});
