import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, fontSize, radius, spacing, statusColorHex } from '../../../src/constants/theme';
import { strings, FRUIT_TYPE_LABELS, RIPENESS_LABELS, SHELF_STAGE_LABELS } from '../../../src/constants/strings';
import { SectionCard } from '../../../src/components/SectionCard';
import { StatusBadge } from '../../../src/components/StatusBadge';
import { PrimaryButton } from '../../../src/components/PrimaryButton';
import { useLots } from '../../../src/state/LotsContext';
import { useSession } from '../../../src/state/SessionContext';
import { assumedTemp } from '../../../src/mocks/config';
import { mockStation } from '../../../src/mocks/lots';
import { formatDate } from '../../../src/lib/format';
import {
  getCountdownParts,
  getExpiryDate,
  getRemainingRatio,
  getStatusColor,
  formatCountdown,
  getConsumedRatioBreakdown,
  resolveConsumedRatio,
  type ShelfStageBreakdown,
} from '../../../src/lib/shelfLife';

function formatTempSourceLine(item: ShelfStageBreakdown, isOngoing: boolean): string {
  const stageLabel = SHELF_STAGE_LABELS[item.stage];
  const dateRange = isOngoing
    ? `từ ${formatDate(item.from)}`
    : `${formatDate(item.from)} - ${formatDate(item.to)}`;
  const sourceLabel = item.isMeasured ? strings.lotDetail.tempSourceMeasured : strings.lotDetail.tempSourceAssumed;
  return `${stageLabel} ${dateRange}: ${sourceLabel} ${item.tempC}°C`;
}

export default function LotDetailScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { lots, deleteLot } = useLots();
  const { id } = useLocalSearchParams<{ id: string }>();
  const lot = useMemo(() => lots.find((item) => item.id === id), [lots, id]);

  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!lot) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.content} />
      </SafeAreaView>
    );
  }

  const isOwner = session?.role === 'grower';
  const canDelete = lot.status === 'at_garden';
  const consumedRatio = resolveConsumedRatio(lot, assumedTemp, mockStation.temp, now);
  const expiryDate = getExpiryDate(lot.initialShelfDays, consumedRatio);
  const countdown = getCountdownParts(expiryDate, now);
  const remainingRatio = getRemainingRatio(consumedRatio);
  const statusColorKey = getStatusColor(remainingRatio);
  const statusColor = statusColorHex[statusColorKey];
  const consumedPercent = Math.round(consumedRatio * 100);
  const lastHistoryNote = lot.history[lot.history.length - 1]?.note;
  const tempBreakdown = getConsumedRatioBreakdown(lot, assumedTemp, mockStation.temp, now);

  const lotId = lot.id;

  function handleDelete() {
    Alert.alert(strings.lotDetail.deleteConfirmTitle, strings.lotDetail.deleteConfirmMessage, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: () => {
          deleteLot(lotId);
          router.replace('/(grower)');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.lotCode}>{lot.id}</Text>
          <StatusBadge status={lot.status} color={statusColor} />
        </View>
        <Text style={styles.basicInfo}>
          {FRUIT_TYPE_LABELS[lot.fruitType]} · {lot.gardenName}
        </Text>

        <SectionCard title={strings.lotDetail.countdownTitle} style={[styles.section, styles.countdownCard]}>
          <Text style={[styles.countdownText, { color: statusColor }]}>{formatCountdown(countdown)}</Text>
        </SectionCard>

        <SectionCard style={styles.section}>
          <Text style={styles.progressLabel}>
            {strings.lotDetail.consumedProgress}: {consumedPercent}%
          </Text>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${consumedPercent}%`, backgroundColor: statusColor }]} />
          </View>
        </SectionCard>

        <SectionCard title={strings.lotDetail.infoTitle} style={styles.section}>
          <InfoRow label={strings.lotDetail.fruitType} value={FRUIT_TYPE_LABELS[lot.fruitType]} />
          <InfoRow label={strings.lotDetail.ripeness} value={RIPENESS_LABELS[lot.ripeness] ?? lot.ripeness} />
          <InfoRow label={strings.lotDetail.quantity} value={`${lot.quantity} ${lot.unit}`} />
          <InfoRow label={strings.lotDetail.gardenName} value={lot.gardenName} />
        </SectionCard>

        <SectionCard title={strings.lotDetail.tempSourceTitle} style={styles.section}>
          {tempBreakdown.map((item, index) => (
            <Text key={item.stage} style={styles.tempSourceLine}>
              {formatTempSourceLine(item, index === tempBreakdown.length - 1)}
            </Text>
          ))}
        </SectionCard>

        {(lastHistoryNote || lot.note) && (
          <SectionCard title={strings.lotDetail.noteTitle} style={styles.section}>
            {lot.note ? <Text style={styles.noteText}>{lot.note}</Text> : null}
            {lastHistoryNote ? <Text style={styles.noteText}>{lastHistoryNote}</Text> : null}
          </SectionCard>
        )}

        {isOwner && (
          <View style={styles.ownerActions}>
            <PrimaryButton
              label={strings.lotDetail.editButton}
              onPress={() => router.push({ pathname: '/lot/[id]/edit', params: { id: lot.id } })}
              variant="outline"
              style={styles.actionButton}
            />
            <PrimaryButton
              label={strings.lotDetail.deleteButton}
              onPress={handleDelete}
              color={colors.redMain}
              variant="outline"
              disabled={!canDelete}
              style={styles.actionButton}
            />
          </View>
        )}
        {isOwner && !canDelete && <Text style={styles.deleteNote}>{strings.lotDetail.deleteNotAllowed}</Text>}

        <PrimaryButton
          label={strings.lotDetail.traceButton}
          onPress={() =>
            router.push({
              pathname: isOwner ? '/(grower)/alerts' : '/(retailer)/alerts',
              params: { lotId: lot.id },
            })
          }
          color={colors.blueMain}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  lotCode: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.ink,
  },
  basicInfo: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  countdownCard: {
    alignItems: 'center',
  },
  countdownText: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    letterSpacing: 1,
  },
  progressLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  progressTrack: {
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  noteText: {
    fontSize: fontSize.sm,
    color: colors.ink,
  },
  tempSourceLine: {
    fontSize: fontSize.sm,
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  ownerActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  deleteNote: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
});
