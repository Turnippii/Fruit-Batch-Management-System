import { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import QRCode from 'react-native-qrcode-svg';
import { colors, fontSize, radius, spacing } from '../src/constants/theme';
import { strings, FRUIT_TYPE_LABELS, RIPENESS_LABELS, STORAGE_TYPE_LABELS } from '../src/constants/strings';
import { SectionCard } from '../src/components/SectionCard';
import { PrimaryButton } from '../src/components/PrimaryButton';
import { Chip } from '../src/components/Chip';
import { shelfLifeBase, ripenessFactor, ripenessSupported, assumedTemp } from '../src/mocks/config';
import { getExpiryDate, getRemainingDaysFloor, resolveConsumedRatio } from '../src/lib/shelfLife';
import { formatDate } from '../src/lib/format';
import { generateLotCode } from '../src/lib/lotCode';
import { useSession } from '../src/state/SessionContext';
import { useLots } from '../src/state/LotsContext';
import type { FruitTypeCode, StorageTypeCode } from '../src/mocks/lots';

const FRUIT_TYPES = Object.keys(FRUIT_TYPE_LABELS);
const STORAGE_TYPES = Object.keys(STORAGE_TYPE_LABELS);

export default function LotFormScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { addLot } = useLots();
  const params = useLocalSearchParams<{ fruitType?: string; ripeness?: string }>();

  const [fruitType, setFruitType] = useState(params.fruitType ?? 'Xoai');
  const [ripeness, setRipeness] = useState(params.ripeness ?? 'Chin_toi');
  const [quantity, setQuantity] = useState('100');
  const [storageType, setStorageType] = useState('lanh');
  const [gardenName, setGardenName] = useState(session?.orgName ?? '');

  const harvestDate = useMemo(() => new Date(), []);
  const lotCode = useMemo(() => generateLotCode(harvestDate), [harvestDate]);

  const ripenessLabel = ripenessSupported.includes(fruitType) ? RIPENESS_LABELS[ripeness] ?? RIPENESS_LABELS.Chin_toi : RIPENESS_LABELS.Chin_toi;

  const initialShelfDays = useMemo(() => {
    const base = shelfLifeBase[fruitType] ?? 7;
    const factor = ripenessFactor[ripeness] ?? 1;
    return Math.round(base * factor * 10) / 10;
  }, [fruitType, ripeness]);

  // Lô chưa thực sự tồn tại (chưa bấm "In tem QR"), nhưng trái cây đã bắt đầu hao mòn
  // kể từ harvestDate — dựng lô tạm để đi qua đúng resolveConsumedRatio thay vì giả
  // định consumedRatio = 0 trong lúc người dùng còn đang điền form.
  const previewConsumedRatio = resolveConsumedRatio(
    {
      status: 'at_garden',
      consumedRatio: null,
      harvestDate: harvestDate.toISOString(),
      storageType: storageType as StorageTypeCode,
      initialShelfDays,
      history: [{ event: 'harvested', timestamp: harvestDate.toISOString(), actorId: 'preview' }],
    },
    assumedTemp,
    undefined
  );
  // Neo mốc chiếu ở "now" (mặc định của getExpiryDate), không neo ở harvestDate —
  // nếu không, thời gian đã trôi qua từ lúc thu hoạch đến lúc xem preview này sẽ bị
  // trừ hai lần (một lần trong previewConsumedRatio, một lần nếu neo cố định harvestDate).
  const expiryDate = getExpiryDate(initialShelfDays, previewConsumedRatio);
  const remainingDays = getRemainingDaysFloor(initialShelfDays, previewConsumedRatio);

  function handlePrint() {
    const actorId = session?.email ?? 'grower-local';
    addLot({
      id: lotCode,
      fruitType: fruitType as FruitTypeCode,
      ripeness,
      harvestDate: harvestDate.toISOString(),
      quantity: Number(quantity) || 0,
      unit: strings.common.unitKg,
      storageType: storageType as StorageTypeCode,
      gardenName: gardenName || session?.orgName || 'Vườn của tôi',
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
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
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
          <Text style={styles.readonlyValue}>{formatDate(harvestDate)}</Text>

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
        </SectionCard>

        <SectionCard title={strings.lotForm.qrTitle} style={[styles.section, styles.qrCard]}>
          <QRCode value={lotCode} size={160} />
          <Text style={styles.lotCode}>{lotCode}</Text>
        </SectionCard>

        <PrimaryButton label={strings.lotForm.printQr} onPress={handlePrint} />
      </ScrollView>
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
  },
  resultLabel: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  resultValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
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
});
