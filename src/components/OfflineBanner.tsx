import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../constants/theme';
import { strings } from '../constants/strings';
import { useIsOffline } from '../hooks/useIsOffline';

/** Chỉ hiện khi mất kết nối tới Firebase — tự ẩn ngay khi có lại (xem useIsOffline). */
export function OfflineBanner() {
  const offline = useIsOffline();
  if (!offline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>{strings.common.offlineMessage}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.redMain,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  text: {
    color: colors.white,
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
