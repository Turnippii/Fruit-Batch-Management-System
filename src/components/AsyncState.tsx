import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../constants/theme';
import { strings } from '../constants/strings';
import { PrimaryButton } from './PrimaryButton';

interface AsyncStateProps {
  loading: boolean;
  error: string | null;
  isEmpty?: boolean;
  emptyText?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}

/**
 * Gói 3 trạng thái chuẩn cho màn hình cần dữ liệu Firebase: đang tải / lỗi / rỗng.
 * Chỉ render `children` (nội dung thật) khi cả 3 trạng thái trên đều không xảy ra.
 */
export function AsyncState({ loading, error, isEmpty, emptyText, onRetry, children }: AsyncStateProps) {
  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.greenMain} />
        <Text style={styles.hint}>{strings.common.loading}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>{error}</Text>
        {onRetry && <PrimaryButton label={strings.common.retry} onPress={onRetry} style={styles.retryButton} />}
      </View>
    );
  }

  if (isEmpty) {
    return (
      <View style={styles.center}>
        <Text style={styles.hint}>{emptyText ?? strings.common.emptyGeneric}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  hint: {
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.redMain,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  retryButton: {
    paddingHorizontal: spacing.xl,
  },
});
