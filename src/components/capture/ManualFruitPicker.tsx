import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../../constants/theme';
import { strings, FRUIT_TYPE_LABELS, RIPENESS_CHIPS_BY_FRUIT, RIPENESS_LABELS } from '../../constants/strings';
import { Chip } from '../Chip';

const FRUIT_TYPES = Object.keys(FRUIT_TYPE_LABELS);

interface ManualFruitPickerProps {
  fruitType: string | null;
  ripeness: string | null;
  onSelectFruit: (code: string) => void;
  onSelectRipeness: (code: string) => void;
}

export function ManualFruitPicker({ fruitType, ripeness, onSelectFruit, onSelectRipeness }: ManualFruitPickerProps) {
  const ripenessChips = fruitType ? RIPENESS_CHIPS_BY_FRUIT[fruitType] : undefined;

  return (
    <View>
      <Text style={styles.warning}>{strings.capture.lowConfidenceNotice}</Text>

      <Text style={styles.label}>{strings.capture.manualFruitLabel}</Text>
      <View style={styles.chipRow}>
        {FRUIT_TYPES.map((code) => (
          <Chip key={code} label={FRUIT_TYPE_LABELS[code]} selected={fruitType === code} onPress={() => onSelectFruit(code)} />
        ))}
      </View>

      {fruitType && ripenessChips && (
        <>
          <Text style={styles.label}>{strings.capture.manualRipenessLabel}</Text>
          <View style={styles.chipRow}>
            {ripenessChips.map((code) => (
              <Chip key={code} label={RIPENESS_LABELS[code]} selected={ripeness === code} onPress={() => onSelectRipeness(code)} />
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  warning: {
    fontSize: fontSize.sm,
    color: colors.redMain,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.ink,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
