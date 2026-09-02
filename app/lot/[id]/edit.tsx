import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, fontSize, radius, spacing } from '../../../src/constants/theme';
import { strings, FRUIT_TYPE_LABELS, STORAGE_TYPE_LABELS } from '../../../src/constants/strings';
import { SectionCard } from '../../../src/components/SectionCard';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { Chip } from '../../../src/components/Chip';
import { useLots } from '../../../src/state/LotsContext';
import { formatDate } from '../../../src/lib/format';
import type { StorageTypeCode } from '../../../src/mocks/lots';

const STORAGE_TYPES = Object.keys(STORAGE_TYPE_LABELS);

export default function LotEditScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lots, updateLot } = useLots();
  const lot = useMemo(() => lots.find((item) => item.id === id), [lots, id]);

  const [quantity, setQuantity] = useState(lot ? String(lot.quantity) : '');
  const [storageType, setStorageType] = useState<StorageTypeCode>(lot?.storageType ?? 'lanh');
  const [note, setNote] = useState(lot?.note ?? '');

  if (!lot) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.content} />
      </SafeAreaView>
    );
  }

  function handleSave() {
    if (!lot) return;
    updateLot(lot.id, {
      quantity: Number(quantity) || 0,
      storageType,
      note: note.trim() || undefined,
    });
    Alert.alert(strings.lotEdit.saved, undefined, [{ text: strings.common.confirm, onPress: () => router.back() }]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <SectionCard title={strings.lotEdit.title} style={styles.section}>
          <FormLabel text={strings.lotForm.fruitType} />
          <Text style={styles.readonlyValue}>{FRUIT_TYPE_LABELS[lot.fruitType]}</Text>

          <FormLabel text={strings.lotForm.harvestDate} />
          <Text style={styles.readonlyValue}>{formatDate(lot.harvestDate)}</Text>
          <Text style={styles.lockedNote}>{strings.lotEdit.lockedNote}</Text>

          <FormLabel text={strings.lotEdit.quantity} />
          <TextInput style={styles.input} value={quantity} onChangeText={setQuantity} keyboardType="numeric" />

          <FormLabel text={strings.lotEdit.storageType} />
          <View style={styles.chipRow}>
            {STORAGE_TYPES.map((code) => (
              <Chip
                key={code}
                label={STORAGE_TYPE_LABELS[code]}
                selected={storageType === code}
                onPress={() => setStorageType(code as StorageTypeCode)}
              />
            ))}
          </View>

          <FormLabel text={strings.lotEdit.note} />
          <TextInput
            style={[styles.input, styles.noteInput]}
            value={note}
            onChangeText={setNote}
            placeholder={strings.lotEdit.notePlaceholder}
            placeholderTextColor={colors.muted}
            multiline
          />
        </SectionCard>

        <PrimaryButton label={strings.common.save} onPress={handleSave} />
      </ScrollView>
    </SafeAreaView>
  );
}

function FormLabel({ text }: { text: string }) {
  return <Text style={styles.formLabel}>{text}</Text>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  formLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.ink,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  readonlyValue: {
    fontSize: fontSize.md,
    color: colors.ink,
    fontWeight: '600',
  },
  lockedNote: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  input: {
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  noteInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
