import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing, statusColorHex } from '../constants/theme';
import { FRUIT_TYPE_LABELS } from '../constants/strings';
import type { Lot } from '../mocks/lots';
import { assumedTemp as defaultAssumedTemp } from '../mocks/config';
import { getRemainingDaysFloor, getRemainingRatio, getStatusColor, resolveConsumedRatio } from '../lib/shelfLife';
import { getHolderRole } from '../lib/lotHolder';
import { useConfig } from '../hooks/useConfig';
import { useStationTemp } from '../hooks/useStationTemp';
import { StatusBadge } from './StatusBadge';

interface LotListItemProps {
  lot: Lot;
  onPress?: () => void;
}

export function LotListItem({ lot, onPress }: LotListItemProps) {
  const { config } = useConfig();
  const { station } = useStationTemp(lot.currentHolderId, getHolderRole(lot.status));
  const consumedRatio = resolveConsumedRatio(lot, config?.assumedTemp ?? defaultAssumedTemp, station?.temp, new Date());
  const remainingRatio = getRemainingRatio(consumedRatio);
  const statusColor = statusColorHex[getStatusColor(remainingRatio)];
  const remainingDays = getRemainingDaysFloor(lot.initialShelfDays, consumedRatio);

  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.stripe, { backgroundColor: statusColor }]} />
      <View style={styles.content}>
        <Text style={styles.title}>
          {FRUIT_TYPE_LABELS[lot.fruitType]} · {lot.gardenName}
        </Text>
        <Text style={styles.code}>{lot.id}</Text>
      </View>
      <View style={styles.right}>
        <Text style={[styles.days, { color: statusColor }]}>{remainingDays} ngày</Text>
        <StatusBadge status={lot.status} color={statusColor} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  stripe: {
    width: 5,
  },
  content: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'center',
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  code: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  right: {
    padding: spacing.md,
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  days: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
