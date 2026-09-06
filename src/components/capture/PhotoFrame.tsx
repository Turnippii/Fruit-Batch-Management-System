import { RefObject } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';
import { CameraView } from 'expo-camera';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { strings } from '../../constants/strings';
import { PrimaryButton } from '../PrimaryButton';

interface PhotoFrameProps {
  cameraRef: RefObject<CameraView | null>;
  cameraOpen: boolean;
  photoUri: string | null;
  isClassifying: boolean;
  onOpenCamera: () => void;
  onShutter: () => void;
  onRetake: () => void;
}

export function PhotoFrame({
  cameraRef,
  cameraOpen,
  photoUri,
  isClassifying,
  onOpenCamera,
  onShutter,
  onRetake,
}: PhotoFrameProps) {
  return (
    <View>
      <View style={styles.frame}>
        {cameraOpen ? (
          <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />
        ) : isClassifying ? (
          <>
            {photoUri && <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} />}
            <View style={styles.classifyingOverlay}>
              <ActivityIndicator size="large" color={colors.white} />
              <Text style={styles.frameText}>{strings.capture.classifying}</Text>
            </View>
          </>
        ) : photoUri ? (
          <Image source={{ uri: photoUri }} style={StyleSheet.absoluteFill} />
        ) : (
          <Text style={styles.frameText}>{strings.capture.previewPlaceholder}</Text>
        )}
      </View>

      {cameraOpen ? (
        <PrimaryButton label={strings.capture.captureButton} onPress={onShutter} style={styles.actionButton} />
      ) : photoUri && !isClassifying ? (
        <PrimaryButton label={strings.capture.retake} onPress={onRetake} variant="outline" style={styles.actionButton} />
      ) : (
        <PrimaryButton
          label={strings.capture.captureButton}
          onPress={onOpenCamera}
          disabled={isClassifying}
          style={styles.actionButton}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 260,
    borderRadius: radius.lg,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  classifyingOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(31, 41, 55, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  frameText: {
    color: colors.white,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  actionButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});
