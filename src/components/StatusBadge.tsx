import { StyleSheet, Text, View } from 'react-native';
import { fontSize, radius, spacing } from '../constants/theme';
import { LOT_STATUS_LABELS } from '../constants/strings';
import type { LotStatus } from '../mocks/lots';

interface StatusBadgeProps {
  status: LotStatus;
  color: string;
}

export function StatusBadge({ status, color }: StatusBadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: `${color}1A`, borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{LOT_STATUS_LABELS[status]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
});
