import { useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { CameraView } from 'expo-camera';
import { colors, fontSize, spacing } from '../../src/constants/theme';
import { strings, FRUIT_TYPE_LABELS, RIPENESS_LABELS, RIPENESS_SHEET_OPTIONS_BY_FRUIT, RIPENESS_CHIPS_BY_FRUIT } from '../../src/constants/strings';
import { SectionCard } from '../../src/components/SectionCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { Chip } from '../../src/components/Chip';
import { BottomSheet } from '../../src/components/BottomSheet';
import { CameraPermissionGate } from '../../src/components/CameraPermissionGate';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { PhotoFrame } from '../../src/components/capture/PhotoFrame';
import { ManualFruitPicker } from '../../src/components/capture/ManualFruitPicker';
import { classify, parseLabel, pickMockPhoto, ClassifyResult, MockScenario } from '../../src/mocks/classifier';

const AI_CONFIDENCE_THRESHOLD = 0.7;

const DEMO_OPTIONS: { key: MockScenario | 'random'; label: string }[] = [
  { key: 'random', label: strings.capture.demoRandom },
  { key: 'high_confidence', label: strings.capture.demoHigh },
  { key: 'low_confidence', label: strings.capture.demoLow },
  { key: 'spoiled', label: strings.capture.demoSpoiled },
];

export default function CaptureScreen() {
  const router = useRouter();
  const cameraRef = useRef<CameraView>(null);
  const [demoMode, setDemoMode] = useState<MockScenario | 'random'>('random');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [isClassifying, setIsClassifying] = useState(false);
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [manualFruitType, setManualFruitType] = useState<string | null>(null);
  const [ripeness, setRipeness] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const isLowConfidence = result !== null && result.confidence < AI_CONFIDENCE_THRESHOLD;
  const aiFruitType = result && !isLowConfidence ? parseLabel(result.label).fruitType : null;
  const effectiveFruitType = isLowConfidence ? manualFruitType : aiFruitType;
  const isSpoiled = (result?.label.endsWith('_hong') ?? false) || (ripeness?.endsWith('_hong') ?? false);
  const sheetOptions = aiFruitType ? RIPENESS_SHEET_OPTIONS_BY_FRUIT[aiFruitType] : undefined;

  const canContinue = !isClassifying && !isSpoiled && effectiveFruitType !== null && ripeness !== null;

  function reset() {
    setCameraOpen(false);
    setPhotoUri(null);
    setResult(null);
    setManualFruitType(null);
    setRipeness(null);
    setIsSheetOpen(false);
  }

  function handleOpenCamera() {
    reset();
    setCameraOpen(true);
  }

  // Nhận diện vẫn là mock cho tới mốc 4 (thay TFLite thật) — classify(uri) chỉ hiểu
  // các key ảnh giả định trong CLASSIFY_RESULTS, nên tra kết quả canned bằng key mock
  // theo kịch bản demo đang chọn, TÁCH RIÊNG khỏi ảnh thật hiển thị cho người dùng.
  async function handleShutter() {
    if (!cameraRef.current) return;
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      setCameraOpen(false);
      setPhotoUri(picture.uri);
      setIsClassifying(true);
      const mockKey = pickMockPhoto(demoMode).uri;
      const res = await classify(mockKey);
      setResult(res);
      setIsClassifying(false);
      const spoiled = res.label.endsWith('_hong');
      const lowConfidence = res.confidence < AI_CONFIDENCE_THRESHOLD;
      if (!spoiled && !lowConfidence) {
        setRipeness(parseLabel(res.label).ripeness);
      }
    } catch (e) {
      setCameraOpen(false);
      setIsClassifying(false);
      Alert.alert(strings.common.errorGeneric, e instanceof Error ? e.message : undefined);
    }
  }

  function handleContinue() {
    if (!canContinue) return;
    router.push({ pathname: '/lot-form', params: { fruitType: effectiveFruitType, ripeness } });
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OfflineBanner />
      <CameraPermissionGate>
      <ScrollView contentContainerStyle={styles.content}>
        {!cameraOpen && !photoUri && !isClassifying && (
          <SectionCard title={strings.capture.demoModeLabel} style={styles.section}>
            <View style={styles.chipRow}>
              {DEMO_OPTIONS.map((option) => (
                <Chip key={option.key} label={option.label} selected={demoMode === option.key} onPress={() => setDemoMode(option.key)} />
              ))}
            </View>
          </SectionCard>
        )}

        <PhotoFrame
          cameraRef={cameraRef}
          cameraOpen={cameraOpen}
          photoUri={photoUri}
          isClassifying={isClassifying}
          onOpenCamera={handleOpenCamera}
          onShutter={handleShutter}
          onRetake={reset}
        />

        {result && !isClassifying && (
          <>
            {isSpoiled && (
              <SectionCard style={[styles.section, styles.spoiledCard]}>
                <Text style={styles.spoiledText}>{strings.capture.spoiledWarning}</Text>
              </SectionCard>
            )}

            {!isSpoiled && !isLowConfidence && aiFruitType && (
              <>
                <SectionCard title={strings.capture.aiResultTitle} style={styles.section}>
                  <Text style={styles.fruitResult}>{FRUIT_TYPE_LABELS[aiFruitType]}</Text>
                  <Text style={styles.confidence}>
                    {strings.capture.confidence}: {Math.round(result.confidence * 100)}%
                  </Text>
                </SectionCard>

                <SectionCard style={styles.section}>
                  <View style={styles.ripenessHeader}>
                    <Text style={styles.ripenessTitle}>{strings.capture.ripenessTitle}</Text>
                    {sheetOptions && (
                      <PrimaryButton label={strings.common.edit} onPress={() => setIsSheetOpen(true)} variant="outline" style={styles.editButton} />
                    )}
                  </View>
                  <Text style={styles.ripenessValue}>{ripeness ? RIPENESS_LABELS[ripeness] : ''}</Text>
                </SectionCard>
              </>
            )}

            {!isSpoiled && isLowConfidence && (
              <SectionCard style={styles.section}>
                <ManualFruitPicker
                  fruitType={manualFruitType}
                  ripeness={ripeness}
                  onSelectFruit={(code) => {
                    setManualFruitType(code);
                    const chips = RIPENESS_CHIPS_BY_FRUIT[code];
                    setRipeness(chips ? chips[1] ?? chips[0] : 'Chin_toi');
                  }}
                  onSelectRipeness={setRipeness}
                />
              </SectionCard>
            )}
          </>
        )}

        <PrimaryButton label={strings.common.continue} onPress={handleContinue} disabled={!canContinue} />
      </ScrollView>

      {sheetOptions && (
        <BottomSheet
          visible={isSheetOpen}
          title={strings.capture.bottomSheetTitle}
          options={sheetOptions.map((code) => ({ key: code, label: RIPENESS_LABELS[code] }))}
          selectedKey={ripeness ?? undefined}
          onSelect={setRipeness}
          onClose={() => setIsSheetOpen(false)}
        />
      )}
      </CameraPermissionGate>
    </SafeAreaView>
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
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  fruitResult: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.greenDark,
  },
  confidence: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  spoiledCard: {
    borderColor: colors.redMain,
    backgroundColor: `${colors.redMain}14`,
  },
  spoiledText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.redMain,
  },
  ripenessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ripenessTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.ink,
  },
  editButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  ripenessValue: {
    marginTop: spacing.sm,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.greenMain,
  },
});
