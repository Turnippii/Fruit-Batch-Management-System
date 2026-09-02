import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, radius, spacing } from '../constants/theme';

interface ChipProps {
  label: string;
  selected?: boolean;
  color?: string;
  onPress: () => void;
}

export function Chip({ label, selected = false, color = colors.greenMain, onPress }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        selected ? { backgroundColor: color, borderColor: color } : styles.unselected,
      ]}
    >
      <Text style={[styles.label, { color: selected ? colors.white : colors.ink }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1.5,
    borderRadius: 18,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  unselected: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});
