import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../../constants/theme';
import { strings } from '../../constants/strings';
import { PrimaryButton } from '../PrimaryButton';
import type { MockPhoto } from '../../mocks/classifier';

interface PhotoFrameProps {
  photo: MockPhoto | null;
  isClassifying: boolean;
  onCapture: () => void;
  onRetake: () => void;
}

export function PhotoFrame({ photo, isClassifying, onCapture, onRetake }: PhotoFrameProps) {
  return (
    <View>
      <View style={[styles.frame, photo && { backgroundColor: photo.color }]}>
        {isClassifying ? (
          <>
            <ActivityIndicator size="large" color={colors.white} />
            <Text style={styles.frameText}>{strings.capture.classifying}</Text>
          </>
        ) : photo ? (
          <Text style={styles.emoji}>{photo.emoji}</Text>
        ) : (
          <Text style={styles.frameText}>{strings.capture.previewPlaceholder}</Text>
        )}
      </View>

      {photo && !isClassifying ? (
        <PrimaryButton label={strings.capture.retake} onPress={onRetake} variant="outline" style={styles.actionButton} />
      ) : (
        <PrimaryButton
          label={strings.capture.captureButton}
          onPress={onCapture}
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
  },
  frameText: {
    color: colors.white,
    fontSize: fontSize.sm,
    marginTop: spacing.sm,
  },
  emoji: {
    fontSize: 96,
  },
  actionButton: {
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
});
