import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing, StatusColorKey, statusColorHex } from '../constants/theme';
import { ALERT_LEVEL_LABELS, FRUIT_TYPE_LABELS, strings } from '../constants/strings';
import { formatDateTime } from '../lib/format';
import { getRemainingDaysFloor, resolveConsumedRatio } from '../lib/shelfLife';
import type { Lot } from '../mocks/lots';
import { assumedTemp as defaultAssumedTemp } from '../mocks/config';
import { useConfig } from '../hooks/useConfig';
import { useStationTemp } from '../hooks/useStationTemp';

interface AlertCardProps {
  level: StatusColorKey;
  message: string;
  createdAt: string;
  lot?: Lot;
  onPress?: () => void;
}

export function AlertCard({ level, message, createdAt, lot, onPress }: AlertCardProps) {
  const { config } = useConfig();
  const { station } = useStationTemp(lot?.currentHolderId);
  const color = statusColorHex[level];
  const remainingDays = lot
    ? getRemainingDaysFloor(
        lot.initialShelfDays,
        resolveConsumedRatio(lot, config?.assumedTemp ?? defaultAssumedTemp, station?.temp, new Date())
      )
    : null;

  return (
    <Pressable onPress={onPress} style={[styles.card, { borderLeftColor: color }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.level, { color }]}>{ALERT_LEVEL_LABELS[level]}</Text>
        <Text style={styles.time}>{formatDateTime(createdAt)}</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
      {lot ? (
        <Text style={styles.lotInfo}>
          {lot.id} · {FRUIT_TYPE_LABELS[lot.fruitType]} · {remainingDays} {strings.common.days} {strings.retailerHome.daysLeft}
        </Text>
      ) : null}
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  level: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  time: {
    fontSize: fontSize.xs,
    color: colors.muted,
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
