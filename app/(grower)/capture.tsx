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
import { USE_MOCK } from '../../src/config';
import {
  classify as classifyMock,
  parseLabel,
  pickMockPhoto,
  ClassifyResult,
  MockScenario,
} from '../../src/mocks/classifier';
import { classify as classifyReal } from '../../src/lib/classifier';

// Đấu theo cờ USE_MOCK giống các service khác (xem src/config.ts) — bật mock được cả
// lúc demo mất mạng hoặc model lỗi, không phải sửa lại màn hình.
const classify = USE_MOCK ? classifyMock : classifyReal;

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
  const [modelError, setModelError] = useState<string | null>(null);
  const [manualFruitType, setManualFruitType] = useState<string | null>(null);
  const [ripeness, setRipeness] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  // Model lỗi (không nạp được / suy luận lỗi) coi như tin cậy thấp — rơi về chọn thủ
  // công thay vì crash hay đứng màn hình (mục 5 yêu cầu tích hợp TFLite).
  const isManualMode = (result !== null && result.confidence < AI_CONFIDENCE_THRESHOLD) || modelError !== null;
  const aiFruitType = result && !isManualMode ? parseLabel(result.label).fruitType : null;
  const effectiveFruitType = isManualMode ? manualFruitType : aiFruitType;
  const isSpoiled = (result?.label.endsWith('_hong') ?? false) || (ripeness?.endsWith('_hong') ?? false);
  const sheetOptions = aiFruitType ? RIPENESS_SHEET_OPTIONS_BY_FRUIT[aiFruitType] : undefined;

  const canContinue = !isClassifying && !isSpoiled && effectiveFruitType !== null && ripeness !== null;

  function reset() {
    setCameraOpen(false);
    setPhotoUri(null);
    setResult(null);
    setModelError(null);
    setManualFruitType(null);
    setRipeness(null);
    setIsSheetOpen(false);
  }

  function handleOpenCamera() {
    reset();
    setCameraOpen(true);
  }

  // Ở chế độ mock, classify(uri) chỉ hiểu các key ảnh giả định trong CLASSIFY_RESULTS
  // nên tra kết quả canned bằng key mock theo kịch bản demo đang chọn, TÁCH RIÊNG khỏi
  // ảnh thật hiển thị cho người dùng. Ở chế độ thật, ảnh chụp được truyền thẳng cho
  // model TFLite trên máy.
  async function handleShutter() {
    if (!cameraRef.current) return;
    let capturedUri: string;
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.5 });
      capturedUri = picture.uri;
    } catch (e) {
      Alert.alert(strings.common.errorGeneric, e instanceof Error ? e.message : undefined);
      return;
    }

    setCameraOpen(false);
    setPhotoUri(capturedUri);
    setIsClassifying(true);
    setModelError(null);
    try {
      const classifyInput = USE_MOCK ? pickMockPhoto(demoMode).uri : capturedUri;
      const res = await classify(classifyInput);
      setResult(res);
      const spoiled = res.label.endsWith('_hong');
      const lowConfidence = res.confidence < AI_CONFIDENCE_THRESHOLD;
      if (!spoiled && !lowConfidence) {
        setRipeness(parseLabel(res.label).ripeness);
      }
    } catch (e) {
      // KHÔNG để app crash — rơi về chọn thủ công, giữ nguyên ảnh vừa chụp.
      setModelError(e instanceof Error ? e.message : strings.capture.modelErrorHint);
    } finally {
      setIsClassifying(false);
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
        {USE_MOCK && !cameraOpen && !photoUri && !isClassifying && (
          <SectionCard title={strings.capture.demoModeLabel} style={styles.section}>
            <View style={styles.chipRow}>
              {DEMO_OPTIONS.map((option) => (
                <Chip key={option.key} label={option.label} selected={demoMode === option.key} onPress={() => setDemoMode(option.key)} />
              ))}
            </View>
          </SectionCard>
        )}

        {!photoUri && !isClassifying && <Text style={styles.captureHint}>{strings.capture.captureHint}</Text>}

        <PhotoFrame
          cameraRef={cameraRef}
          cameraOpen={cameraOpen}
          photoUri={photoUri}
          isClassifying={isClassifying}
          onOpenCamera={handleOpenCamera}
          onShutter={handleShutter}
          onRetake={reset}
        />

        {(result || modelError) && !isClassifying && (
          <>
            {modelError && (
              <SectionCard style={[styles.section, styles.modelErrorCard]}>
                <Text style={styles.modelErrorTitle}>{strings.capture.modelErrorTitle}</Text>
                <Text style={styles.modelErrorText}>{modelError}</Text>
              </SectionCard>
            )}

            {isSpoiled && (
              <SectionCard style={[styles.section, styles.spoiledCard]}>
                <Text style={styles.spoiledText}>{strings.capture.spoiledWarning}</Text>
              </SectionCard>
            )}

            {!isSpoiled && !isManualMode && aiFruitType && result && (
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

            {!isSpoiled && isManualMode && (
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
  captureHint: {
    marginBottom: spacing.sm,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
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
  modelErrorCard: {
    borderColor: colors.amberMain,
    backgroundColor: `${colors.amberMain}14`,
  },
  modelErrorTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.amberMain,
  },
  modelErrorText: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.ink,
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
