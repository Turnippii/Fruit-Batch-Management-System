import { useMemo, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fontSize, radius, spacing } from '../../src/constants/theme';
import { strings, FRUIT_TYPE_LABELS } from '../../src/constants/strings';
import { SectionCard } from '../../src/components/SectionCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { AsyncState } from '../../src/components/AsyncState';
import { useLots } from '../../src/state/LotsContext';
import { useAuth } from '../../src/context/AuthContext';
import { useConfig } from '../../src/hooks/useConfig';
import { getConsumedRatioBreakdown, getTotalConsumedRatio } from '../../src/lib/shelfLife';

export default function ScanScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { lots, loading, error, updateLot } = useLots();
  const { config } = useConfig();
  const [receiving, setReceiving] = useState(false);

  // Mã lô vừa "quét" được (demo, chưa nối camera thật) — ưu tiên lô đang vận chuyển.
  const scannedLot = useMemo(() => lots.find((lot) => lot.status === 'in_transit') ?? lots[0], [lots]);

  async function handleReceive() {
    if (!scannedLot || !config || !profile) return;
    const actorId = profile.uid;
    const receivedAt = new Date();
    setReceiving(true);
    try {
      // Ghi một lần toàn bộ tiêu hao at_garden + in_transit làm giá trị khởi đầu cho
      // consumedRatio — từ đây trở đi nguồn sự thật chuyển sang ESP32 (đọc + trôi qua
      // trong resolveConsumedRatio), không tính lại từ harvestDate nữa.
      const initialConsumedRatio = getTotalConsumedRatio(
        getConsumedRatioBreakdown(scannedLot, config.assumedTemp, undefined, receivedAt)
      );
      await updateLot(scannedLot.id, {
        status: 'in_stock',
        currentHolderId: actorId,
        consumedRatio: initialConsumedRatio,
        updatedAt: receivedAt.toISOString(),
        history: [
          ...scannedLot.history,
          { event: 'received', timestamp: receivedAt.toISOString(), actorId, note: 'Đại lý tiếp nhận' },
          { event: 'in_stock', timestamp: receivedAt.toISOString(), actorId, note: 'Nhập kho đại lý' },
        ],
      });
      Alert.alert(strings.scan.receiveLot, `${scannedLot.id} đã được nhận vào kho.`);
    } catch (e) {
      Alert.alert(strings.common.errorGeneric, e instanceof Error ? e.message : undefined);
    } finally {
      setReceiving(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.content}>
        <View style={styles.scanFrame}>
          <Text style={styles.scanText}>{strings.scan.scanPlaceholder}</Text>
          <View style={[styles.corner, styles.cornerTopLeft]} />
          <View style={[styles.corner, styles.cornerTopRight]} />
          <View style={[styles.corner, styles.cornerBottomLeft]} />
          <View style={[styles.corner, styles.cornerBottomRight]} />
        </View>

        <AsyncState loading={loading} error={error} isEmpty={!scannedLot} emptyText={strings.lotAll.emptyResult}>
          {scannedLot && (
            <>
              <SectionCard title={strings.scan.scannedCodeTitle} style={styles.resultCard}>
                <Text style={styles.lotCode}>{scannedLot.id}</Text>
                <Text style={styles.lotFruit}>
                  {FRUIT_TYPE_LABELS[scannedLot.fruitType]} · {scannedLot.gardenName}
                </Text>
              </SectionCard>

              <View style={styles.buttonRow}>
                <PrimaryButton
                  label={receiving ? strings.common.loading : strings.scan.receiveLot}
                  onPress={handleReceive}
                  color={colors.blueMain}
                  disabled={scannedLot.status !== 'in_transit' || receiving || !config}
                  style={styles.flexButton}
                />
                <PrimaryButton
                  label={strings.scan.viewDetail}
                  onPress={() => router.push({ pathname: '/lot/[id]', params: { id: scannedLot.id } })}
                  variant="outline"
                  color={colors.blueMain}
                  style={styles.flexButton}
                />
              </View>
            </>
          )}
        </AsyncState>
      </View>
    </SafeAreaView>
  );
}

const CORNER_SIZE = 28;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  scanFrame: {
    height: 280,
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanText: {
    color: colors.white,
    fontSize: fontSize.sm,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.blueMain,
  },
  cornerTopLeft: {
    top: spacing.lg,
    left: spacing.lg,
    borderLeftWidth: 3,
    borderTopWidth: 3,
  },
  cornerTopRight: {
    top: spacing.lg,
    right: spacing.lg,
    borderRightWidth: 3,
    borderTopWidth: 3,
  },
  cornerBottomLeft: {
    bottom: spacing.lg,
    left: spacing.lg,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
  },
  cornerBottomRight: {
    bottom: spacing.lg,
    right: spacing.lg,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  resultCard: {
    marginTop: spacing.lg,
  },
  lotCode: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.blueMain,
  },
  lotFruit: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  flexButton: {
    flex: 1,
  },
});
