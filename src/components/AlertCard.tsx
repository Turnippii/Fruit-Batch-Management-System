import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing, statusColorHex } from '../constants/theme';
import { ALERT_LEVEL_LABELS, FRUIT_TYPE_LABELS, strings } from '../constants/strings';
import type { LotAlert } from '../lib/lotAlerts';

interface AlertCardProps {
  alert: LotAlert;
  onPress?: () => void;
}

export function AlertCard({ alert, onPress }: AlertCardProps) {
  const { lot, level, remainingDays } = alert;
  const color = statusColorHex[level];

  return (
    <Pressable onPress={onPress} style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.level, { color }]}>{ALERT_LEVEL_LABELS[level]}</Text>
        <Text style={[styles.days, { color }]}>
          {remainingDays} {strings.common.days} {strings.retailerHome.daysLeft}
        </Text>
      </View>
      <Text style={styles.message}>{strings.alerts.message[level]}</Text>
      <Text style={styles.lotInfo}>
        {FRUIT_TYPE_LABELS[lot.fruitType]} · {lot.id}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'center',
    columnGap: spacing.sm,
  },
  level: {
    flexShrink: 0,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  days: {
    flexShrink: 0,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  message: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  lotInfo: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
});
