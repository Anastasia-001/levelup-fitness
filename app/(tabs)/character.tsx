import { View, StyleSheet } from 'react-native';
import { AppText } from '@/components/AppText';
import { Card } from '@/components/Card';
import { ProgressBar } from '@/components/ProgressBar';
import { Screen } from '@/components/Screen';
import { colors, radii, spacing } from '@/constants/theme';
import { useAppStore } from '@/store/appStore';
import { levelFromTotalExp, statLevel } from '@/utils/exp';

const statRows = [
  ['Endurance', 'enduranceExp'],
  ['Speed', 'speedExp'],
  ['Strength', 'strengthExp'],
  ['Consistency', 'consistencyExp']
] as const;

export default function CharacterScreen() {
  const character = useAppStore((state) => state.character);
  const profile = useAppStore((state) => state.profile);
  const progress = character ? levelFromTotalExp(character.totalExp) : null;

  return (
    <Screen>
      <View>
        <AppText variant="caption" style={{ color: colors.primary }}>
          Character
        </AppText>
        <AppText variant="title">{profile?.username ?? 'Rookie'}</AppText>
      </View>

      <Card>
        <View style={styles.avatar}>
          <AppText variant="metric">LVL {character?.level ?? 1}</AppText>
        </View>
        <AppText variant="subtitle">Total EXP: {character?.totalExp ?? 0}</AppText>
        <ProgressBar value={progress ? progress.currentLevelExp / progress.nextLevelExp : 0} />
        <AppText muted>
          {progress ? `${progress.currentLevelExp} / ${progress.nextLevelExp} EXP to Level ${(character?.level ?? 1) + 1}` : 'Loading progress'}
        </AppText>
      </Card>

      <Card>
        <AppText variant="subtitle">Core stats</AppText>
        {statRows.map(([label, key]) => {
          const exp = character?.[key] ?? 0;
          return (
            <View key={key} style={styles.statRow}>
              <View style={{ flex: 1 }}>
                <AppText>{label}</AppText>
                <ProgressBar value={(exp % 100) / 100} />
              </View>
              <View style={styles.statLevel}>
                <AppText style={{ fontWeight: '800' }}>{statLevel(exp)}</AppText>
              </View>
            </View>
          );
        })}
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: {
    minHeight: 180,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceHigh,
    borderColor: colors.primaryDim,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md
  },
  statLevel: {
    width: 46,
    height: 46,
    borderRadius: radii.sm,
    backgroundColor: colors.primaryDim,
    alignItems: 'center',
    justifyContent: 'center'
  }
});
