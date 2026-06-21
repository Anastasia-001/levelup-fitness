import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText } from '@/components/AppText';
import { PrimaryButton } from '@/components/PrimaryButton';
import { FITNESS_CLASSES, recommendFitnessClass } from '@/constants/fitnessClasses';
import { colors, radii, spacing } from '@/constants/theme';
import { Activity, FitnessClassId } from '@/types/domain';

type Props = {
  visible: boolean;
  current: FitnessClassId;
  activities: Activity[];
  onClose: () => void;
  onSelect: (fitnessClass: FitnessClassId) => Promise<void>;
};

export const FitnessClassPicker = ({ visible, current, activities, onClose, onSelect }: Props) => {
  const recommended = useMemo(() => recommendFitnessClass(activities), [activities]);
  const [saving, setSaving] = useState<FitnessClassId | null>(null);

  const select = async (fitnessClass: FitnessClassId) => {
    if (fitnessClass === current || saving) return;
    setSaving(fitnessClass);
    try {
      await onSelect(fitnessClass);
      onClose();
    } finally {
      setSaving(null);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <AppText variant="caption" style={{ color: colors.primary }}>TRAINING IDENTITY</AppText>
              <AppText variant="title">Choose fitness class</AppText>
            </View>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <AppText muted>Your class personalizes mission suggestions and cosmetic identity. It never limits activities or changes EXP.</AppText>
          <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
            {FITNESS_CLASSES.map((fitnessClass) => {
              const selected = current === fitnessClass.id;
              const isRecommended = recommended === fitnessClass.id;
              return (
                <View key={`fitness-class-${fitnessClass.id}`} style={[styles.classCard, { borderColor: selected ? fitnessClass.accent : colors.borderDim }]}>
                  <View style={[styles.icon, { borderColor: fitnessClass.accent, backgroundColor: `${fitnessClass.accent}18` }]}>
                    <Ionicons name={fitnessClass.icon} size={25} color={fitnessClass.accent} />
                  </View>
                  <View style={styles.copy}>
                    <View style={styles.titleRow}>
                      <AppText variant="subtitle">{fitnessClass.name}</AppText>
                      {isRecommended && <AppText variant="caption" style={{ color: colors.success }}>RECOMMENDED</AppText>}
                    </View>
                    <AppText variant="caption" muted>{fitnessClass.description}</AppText>
                  </View>
                  <PrimaryButton
                    label={selected ? 'Selected' : saving === fitnessClass.id ? 'Saving...' : 'Choose'}
                    onPress={() => select(fitnessClass.id)}
                    disabled={selected || Boolean(saving)}
                    variant={selected ? 'secondary' : 'primary'}
                    style={styles.button}
                  />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(2, 4, 10, 0.8)' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    padding: spacing.lg,
    gap: spacing.md
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  closeButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: colors.borderDim,
    backgroundColor: colors.cardHigh,
    alignItems: 'center',
    justifyContent: 'center'
  },
  list: { gap: spacing.sm, paddingBottom: spacing.xl },
  classCard: {
    minHeight: 108,
    borderRadius: radii.md,
    borderWidth: 1,
    backgroundColor: colors.cardHigh,
    padding: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm
  },
  icon: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: spacing.xxs },
  titleRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: spacing.xs },
  button: { width: 88, minHeight: 42, paddingHorizontal: spacing.xs }
});
