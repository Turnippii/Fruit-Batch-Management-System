import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../constants/theme';
import { PrimaryButton } from './PrimaryButton';

interface EmptyStateProps {
  /** Emoji — đủ để có điểm nhấn hình ảnh mà không cần thêm bộ icon/thư viện mới. */
  icon?: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = '📭', text, actionLabel, onAction }: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.text}>{text}</Text>
      {actionLabel && onAction && (
        <PrimaryButton label={actionLabel} onPress={onAction} style={styles.action} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 48,
    marginBottom: spacing.xs,
  },
  text: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
  },
  action: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    alignSelf: 'stretch',
  },
});
