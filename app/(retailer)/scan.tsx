import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, Vibration, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView, type BarcodeScanningResult } from 'expo-camera';
import { colors, fontSize, radius, spacing } from '../../src/constants/theme';
import { strings, FRUIT_TYPE_LABELS, LOT_STATUS_LABELS } from '../../src/constants/strings';
import { SectionCard } from '../../src/components/SectionCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { AsyncState } from '../../src/components/AsyncState';
import { CameraPermissionGate } from '../../src/components/CameraPermissionGate';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { useLots } from '../../src/state/LotsContext';
import { useAuth } from '../../src/context/AuthContext';
import { useConfig } from '../../src/hooks/useConfig';
import { useLotById } from '../../src/hooks/useLotById';
import { isValidLotCode, normalizeLotCode } from '../../src/lib/lotCode';
import { getScanOutcome } from '../../src/lib/lotHolder';
import { getConsumedRatioBreakdown, getTotalConsumedRatio } from '../../src/lib/shelfLife';

export default function ScanScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { updateLot } = useLots();
  const { config } = useConfig();
  const [receiving, setReceiving] = useState(false);
  const [scannedCode, setScannedCode] = useState<string | null>(null);
  const scanLockRef = useRef(false);

  // Chuẩn hoá (trim + hoa) trước khi vừa kiểm tra định dạng vừa dùng làm khoá tra
  // Firebase — dùng CHUNG một giá trị để hai bước không lệch nhau (validate qua rồi
  // tra bằng chuỗi thô chưa chuẩn hoá sẽ ra "không tìm thấy" giả).
  const normalizedCode = scannedCode !== null ? normalizeLotCode(scannedCode) : null;
  const isValidFormat = normalizedCode !== null && isValidLotCode(normalizedCode);
  const { lot, loading: lotLoading, error: lotError } = useLotById(isValidFormat ? normalizedCode! : undefined);

  function handleBarcodeScanned(result: BarcodeScanningResult) {
    if (scanLockRef.current) return;
    scanLockRef.current = true;
    Vibration.vibrate(50);
    setScannedCode(result.data);
  }

  function handleRescan() {
    scanLockRef.current = false;
    setScannedCode(null);
  }

  async function handleReceive() {
    if (!lot || !config || !profile) return;
    const actorId = profile.uid;
    const receivedAt = new Date();
    setReceiving(true);
    try {
      // Ghi một lần toàn bộ tiêu hao at_garden + in_transit làm giá trị khởi đầu cho
      // consumedRatio — từ đây trở đi nguồn sự thật chuyển sang ESP32 (đọc + trôi qua
      // trong resolveConsumedRatio), không tính lại từ harvestDate nữa.
      const initialConsumedRatio = getTotalConsumedRatio(
        getConsumedRatioBreakdown(lot, config.assumedTemp, undefined, receivedAt)
      );
      await updateLot(lot.id, {
        status: 'in_stock',
        currentHolderId: actorId,
        consumedRatio: initialConsumedRatio,
        updatedAt: receivedAt.toISOString(),
        history: [
          ...lot.history,
          { event: 'received', timestamp: receivedAt.toISOString(), actorId, note: 'Đại lý tiếp nhận' },
          { event: 'in_stock', timestamp: receivedAt.toISOString(), actorId, note: 'Nhập kho đại lý' },
        ],
      });
      Alert.alert(strings.scan.receiveLot, `${lot.id} đã được nhận vào kho.`);
      handleRescan();
    } catch (e) {
      Alert.alert(strings.common.errorGeneric, e instanceof Error ? e.message : undefined);
    } finally {
      setReceiving(false);
    }
  }

  const outcome = lot && profile ? getScanOutcome(lot, profile.uid) : null;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OfflineBanner />
      <CameraPermissionGate>
        <View style={styles.content}>
          <View style={styles.scanFrame}>
            <CameraView
              style={StyleSheet.absoluteFill}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scannedCode ? undefined : handleBarcodeScanned}
            />
            {!scannedCode && <Text style={styles.scanText}>{strings.scan.scanPlaceholder}</Text>}
            <View style={[styles.corner, styles.cornerTopLeft]} />
            <View style={[styles.corner, styles.cornerTopRight]} />
            <View style={[styles.corner, styles.cornerBottomLeft]} />
            <View style={[styles.corner, styles.cornerBottomRight]} />
          </View>

          {scannedCode && !isValidFormat && (
            <ScanResultCard message={strings.scan.errorInvalidFormat} onRescan={handleRescan} />
          )}

          {scannedCode && isValidFormat && (
            <AsyncState loading={lotLoading} error={lotError}>
              {!lot ? (
                <ScanResultCard message={strings.scan.errorNotFound} onRescan={handleRescan} />
              ) : (
                <>
                  <SectionCard title={strings.scan.scannedCodeTitle} style={styles.resultCard}>
                    <Text style={styles.lotCode}>{lot.id}</Text>
                    <Text style={styles.lotFruit}>
                      {FRUIT_TYPE_LABELS[lot.fruitType]} · {lot.gardenName}
                    </Text>
                    {outcome === 'at_garden' && <Text style={styles.outcomeError}>{strings.scan.errorAtGarden}</Text>}
                    {outcome === 'already_in_stock' && (
                      <Text style={styles.outcomeError}>{strings.scan.errorAlreadyInStock}</Text>
                    )}
                    {outcome === 'held_by_other_retailer' && (
                      <Text style={styles.outcomeError}>{strings.scan.errorHeldByOther}</Text>
                    )}
                    {outcome === 'unavailable' && (
                      <Text style={styles.outcomeError}>
                        {strings.scan.errorUnavailablePrefix} {LOT_STATUS_LABELS[lot.status].toLowerCase()}
                        {strings.scan.errorUnavailableSuffix}
                      </Text>
                    )}
                  </SectionCard>

                  <View style={styles.buttonRow}>
                    {outcome === 'receivable' && (
                      <PrimaryButton
                        label={receiving ? strings.common.loading : strings.scan.receiveLot}
                        onPress={handleReceive}
                        color={colors.blueMain}
                        disabled={receiving || !config}
                        style={styles.flexButton}
                      />
                    )}
                    <PrimaryButton
                      label={strings.scan.viewDetail}
                      onPress={() => router.push({ pathname: '/lot/[id]', params: { id: lot.id } })}
                      variant="outline"
                      color={colors.blueMain}
                      style={styles.flexButton}
                    />
                  </View>
                  <PrimaryButton label={strings.scan.rescan} onPress={handleRescan} variant="outline" style={styles.rescanButton} />
                </>
              )}
            </AsyncState>
          )}
        </View>
      </CameraPermissionGate>
    </SafeAreaView>
  );
}

function ScanResultCard({ message, onRescan }: { message: string; onRescan: () => void }) {
  return (
    <>
      <SectionCard style={styles.resultCard}>
        <Text style={styles.outcomeError}>{message}</Text>
      </SectionCard>
      <PrimaryButton label={strings.scan.rescan} onPress={onRescan} variant="outline" style={styles.rescanButton} />
    </>
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
    overflow: 'hidden',
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
  outcomeError: {
    marginTop: spacing.sm,
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.redMain,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  flexButton: {
    flex: 1,
  },
  rescanButton: {
    marginTop: spacing.md,
  },
});
