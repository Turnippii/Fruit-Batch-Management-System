import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../constants/theme';
import { strings } from '../constants/strings';
import { useDemo } from '../context/DemoContext';

/** Chỉ hiện khi chế độ demo đang bật — cảnh báo rõ ràng để không ai nhầm số liệu
 * đang xem là dữ liệu thật (đồng hồ hiển thị đã bị nén tốc độ). */
export function DemoBanner() {
  const { enabled, timeScale } = useDemo();
  if (!enabled) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        {strings.demo.bannerText} {timeScale}x
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.amberMain,
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
