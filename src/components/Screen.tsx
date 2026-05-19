import { ReactElement, ReactNode } from 'react';
import { RefreshControlProps, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  scroll: {
    flexGrow: 1
  },
  content: {
    flex: 1,
    padding: spacing.md,
    gap: spacing.md
  }
});
