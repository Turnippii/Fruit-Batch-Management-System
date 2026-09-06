import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { colors, fontSize, radius, spacing } from '../src/constants/theme';
import { strings, FRUIT_TYPE_LABELS, RIPENESS_LABELS, STORAGE_TYPE_LABELS } from '../src/constants/strings';
import { SectionCard } from '../src/components/SectionCard';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Chip } from '../src/components/Chip';
import { AsyncState } from '../src/components/AsyncState';
import { DatePickerModal } from '../src/components/DatePickerModal';
import { OfflineBanner } from '../src/components/OfflineBanner';
import {
  getConsumptionFactor,
  getExpiryDate,
  getForecastShelfDays,
  getRemainingDaysFloor,
  resolveConsumedRatio,
} from '../src/lib/shelfLife';
import { formatDate } from '../src/lib/format';
import { generateLotCode } from '../src/lib/lotCode';
import { useAuth } from '../src/context/AuthContext';
import { useLots } from '../src/state/LotsContext';
import { useConfig } from '../src/hooks/useConfig';
import type { FruitTypeCode, StorageTypeCode } from '../src/mocks/lots';

const MAX_HARVEST_DATE_PAST_DAYS = 30;

const FRUIT_TYPES = Object.keys(FRUIT_TYPE_LABELS);
const STORAGE_TYPES = Object.keys(STORAGE_TYPE_LABELS);

export default function LotFormScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { addLot } = useLots();
  const { config, loading: configLoading, error: configError } = useConfig();
  const params = useLocalSearchParams<{ fruitType?: string; ripeness?: string }>();

  const [fruitType, setFruitType] = useState(params.fruitType ?? 'Xoai');
  const [ripeness, setRipeness] = useState(params.ripeness ?? 'Chin_toi');
  const [quantity, setQuantity] = useState('100');
  const [storageType, setStorageType] = useState('lanh');
  const [gardenName, setGardenName] = useState(profile?.orgName ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [harvestDate, setHarvestDate] = useState(() => new Date());
  const [datePickerVisible, setDatePickerVisible] = useState(false);

  // Mã lô sinh một lần khi mở màn (không phụ thuộc harvestDate) — đổi ngày thu hoạch
  // không nên làm mã QR đã hiện trên màn đổi theo.
  const lotCode = useMemo(() => generateLotCode(new Date()), []);

  const ripenessSupported = config?.ripenessSupported ?? [];
  const ripenessLabel = ripenessSupported.includes(fruitType) ? RIPENESS_LABELS[ripeness] ?? RIPENESS_LABELS.Chin_toi : RIPENESS_LABELS.Chin_toi;

  // Số nguyên thống nhất cho toàn bộ vòng đời của lô (hiển thị VÀ dùng làm mẫu số công
  // thức tiêu hao) — tránh lệch số giữa "hạn ban đầu" và "còn lại" trên cùng một màn.
  const initialShelfDays = useMemo(() => {
    if (!config) return 0;
    const base = config.shelfLifeBase[fruitType] ?? 7;
    const factor = config.ripenessFactor[ripeness] ?? 1;
    return Math.round(base * factor);
  }, [config, fruitType, ripeness]);

  const assumedTempC = config
    ? storageType === 'lanh'
      ? config.assumedTemp.at_garden_cold
      : config.assumedTemp.at_garden_normal
    : 0;
  const consumptionFactor = getConsumptionFactor(assumedTempC);
  const forecastShelfDays = Math.round(getForecastShelfDays(initialShelfDays, assumedTempC));

  // Lô chưa thực sự tồn tại (chưa bấm "In tem QR"), nhưng trái cây đã bắt đầu hao mòn
  // kể từ harvestDate — dựng lô tạm để đi qua đúng resolveConsumedRatio thay vì giả
  // định consumedRatio = 0 trong lúc người dùng còn đang điền form.
  const previewConsumedRatio = config
    ? resolveConsumedRatio(
        {
          status: 'at_garden',
          consumedRatio: null,
          harvestDate: harvestDate.toISOString(),
          storageType: storageType as StorageTypeCode,
          initialShelfDays,
          history: [{ event: 'harvested', timestamp: harvestDate.toISOString(), actorId: 'preview' }],
        },
        config.assumedTemp,
        undefined
      )
    : 0;
  // Neo mốc chiếu ở "now" (mặc định của getExpiryDate), không neo ở harvestDate —
  // nếu không, thời gian đã trôi qua từ lúc thu hoạch đến lúc xem preview này sẽ bị
  // trừ hai lần (một lần trong previewConsumedRatio, một lần nếu neo cố định harvestDate).
  const expiryDate = getExpiryDate(initialShelfDays, previewConsumedRatio);
  const remainingDays = getRemainingDaysFloor(initialShelfDays, previewConsumedRatio);

  // Chia sẻ CHỈ mã lô dạng text bằng Share (lõi react-native, không cần thư viện mới) —
  // chia sẻ/lưu đúng ẢNH QR cần expo-sharing + expo-file-system (thư viện native mới,
  // phải build lại APK), nên tạm dừng ở mức chia sẻ mã cho tới khi được duyệt cài thêm.
  async function handleShareCode() {
    try {
      await Share.share({ message: `Mã lô hàng FruitTrace: ${lotCode}` });
    } catch (e) {
      Alert.alert(strings.common.errorGeneric, e instanceof Error ? e.message : undefined);
    }
  }

  async function handlePrint() {
    if (!profile) return;
    const actorId = profile.uid;
    setSubmitting(true);
    try {
      await addLot({
        id: lotCode,
        fruitType: fruitType as FruitTypeCode,
        ripeness,
        harvestDate: harvestDate.toISOString(),
        quantity: Number(quantity) || 0,
        unit: strings.common.unitKg,
        storageType: storageType as StorageTypeCode,
        gardenName: gardenName || profile.orgName || 'Vườn của tôi',
        initialShelfDays,
        consumedRatio: null,
        status: 'at_garden',
        growerId: actorId,
        currentHolderId: actorId,
        createdAt: new Date().toISOString(),
        history: [
          { event: 'harvested', timestamp: harvestDate.toISOString(), actorId, note: 'Thu hoạch tại vườn' },
          { event: 'qr_generated', timestamp: new Date().toISOString(), actorId, note: `Tạo mã QR ${lotCode}` },
        ],
      });
      Alert.alert(strings.lotForm.printQr, lotCode, [
        { text: strings.common.confirm, onPress: () => router.replace({ pathname: '/lot/[id]', params: { id: lotCode } }) },
      ]);
    } catch (e) {
      Alert.alert(strings.common.errorGeneric, e instanceof Error ? e.message : undefined);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <OfflineBanner />
      <AsyncState loading={configLoading} error={configError}>
        <ScrollView contentContainerStyle={styles.content}>
          <SectionCard title={strings.lotForm.title} style={styles.section}>
            <FormLabel text={strings.lotForm.fruitType} />
            <View style={styles.chipRow}>
              {FRUIT_TYPES.map((code) => (
                <Chip key={code} label={FRUIT_TYPE_LABELS[code]} selected={fruitType === code} onPress={() => setFruitType(code)} />
              ))}
            </View>

            <FormLabel text={strings.lotForm.ripeness} />
            <Text style={styles.readonlyValue}>{ripenessLabel}</Text>

            <FormLabel text={strings.lotForm.harvestDate} />
            <Pressable onPress={() => setDatePickerVisible(true)}>
              <Text style={styles.readonlyValue}>{formatDate(harvestDate)}</Text>
              <Text style={styles.changeHint}>{strings.lotForm.changeDateHint}</Text>
            </Pressable>

            <FormLabel text={strings.lotForm.quantity} />
            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              keyboardType="numeric"
              placeholder="0"
            />

            <FormLabel text={strings.lotForm.storageType} />
            <View style={styles.chipRow}>
              {STORAGE_TYPES.map((code) => (
                <Chip key={code} label={STORAGE_TYPE_LABELS[code]} selected={storageType === code} onPress={() => setStorageType(code)} />
              ))}
            </View>

            <FormLabel text={strings.lotForm.gardenName} />
            <TextInput
              style={styles.input}
              value={gardenName}
              onChangeText={setGardenName}
              placeholder={strings.lotForm.gardenName}
              placeholderTextColor={colors.muted}
            />
          </SectionCard>

          <SectionCard title={strings.lotForm.shelfLifeResultTitle} style={styles.section}>
            <ResultRow label={strings.lotForm.initialShelfDays} value={`${initialShelfDays} ${strings.common.days}`} />
            <ResultRow label={strings.lotForm.estimatedExpiry} value={formatDate(expiryDate)} />
            <ResultRow label={strings.retailerHome.daysLeft} value={`${remainingDays} ${strings.common.days}`} />
            <ResultRow label={strings.lotForm.assumedTempLabel} value={`${assumedTempC}°C`} />
            <ResultRow label={strings.lotForm.consumptionFactorLabel} value={`k = ${consumptionFactor.toFixed(2)}`} />
            <ResultRow
              label={strings.lotForm.forecastLifespanLabel}
              value={`~${forecastShelfDays} ${strings.common.days}`}
            />
            <Text style={styles.forecastNote}>{strings.lotForm.forecastNote}</Text>
          </SectionCard>

          <SectionCard title={strings.lotForm.qrTitle} style={[styles.section, styles.qrCard]}>
            <QRCode value={lotCode} size={160} />
            <Text style={styles.lotCode}>{lotCode}</Text>
            <PrimaryButton
              label={strings.lotForm.shareCode}
              onPress={handleShareCode}
              variant="outline"
              style={styles.shareButton}
            />
          </SectionCard>

          <PrimaryButton
            label={submitting ? strings.common.loading : strings.lotForm.printQr}
            onPress={handlePrint}
            disabled={submitting}
          />
        </ScrollView>
      </AsyncState>
      <DatePickerModal
        visible={datePickerVisible}
        title={strings.lotForm.harvestDatePickerTitle}
        value={harvestDate}
        maxPastDays={MAX_HARVEST_DATE_PAST_DAYS}
        onSelect={setHarvestDate}
        onClose={() => setDatePickerVisible(false)}
      />
    </SafeAreaView>
  );
}

function FormLabel({ text }: { text: string }) {
  return <Text style={styles.formLabel}>{text}</Text>;
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.resultRow}>
      <Text style={styles.resultLabel}>{label}</Text>
      <Text style={styles.resultValue}>{value}</Text>
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  readonlyValue: {
    fontSize: fontSize.md,
    color: colors.ink,
    fontWeight: '600',
  },
  changeHint: {
    fontSize: fontSize.xs,
    color: colors.greenMain,
    marginTop: spacing.xs,
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
  resultRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  resultLabel: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  resultValue: {
    flexShrink: 0,
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
    textAlign: 'right',
  },
  forecastNote: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  qrCard: {
    alignItems: 'center',
  },
  lotCode: {
    marginTop: spacing.md,
    fontSize: fontSize.lg,
    fontWeight: '800',
    letterSpacing: 1,
    color: colors.greenDark,
  },
  shareButton: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
    paddingHorizontal: spacing.xl,
  },
});
