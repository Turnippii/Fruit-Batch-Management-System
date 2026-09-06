import { Modal, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { formatDate } from '../lib/format';

const WEEKDAY_LABELS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

interface DatePickerModalProps {
  visible: boolean;
  title: string;
  value: Date;
  /** Số ngày tối đa được lùi về so với hôm nay. Ngày tương lai không bao giờ nằm trong danh sách. */
  maxPastDays: number;
  onSelect: (date: Date) => void;
  onClose: () => void;
}

/** Modal chọn ngày thuần JS, không dùng thư viện native — liệt kê sẵn đúng khoảng
 * ngày hợp lệ (hôm nay lùi về maxPastDays ngày) nên không cần logic disable riêng. */
export function DatePickerModal({ visible, title, value, maxPastDays, onSelect, onClose }: DatePickerModalProps) {
  const today = startOfDay(new Date());
  const options: Date[] = [];
  for (let i = 0; i <= maxPastDays; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    options.push(d);
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          <ScrollView style={styles.list}>
            {options.map((date) => {
              const selected = isSameDay(date, value);
              return (
                <Pressable
                  key={date.toISOString()}
                  style={styles.option}
                  onPress={() => {
                    onSelect(date);
                    onClose();
                  }}
                >
                  <Text style={[styles.optionLabel, selected && styles.optionLabelSelected]}>
                    {formatDate(date)} · {WEEKDAY_LABELS[date.getDay()]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(31, 41, 55, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: spacing.xl,
    maxHeight: '70%',
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  list: {
    flexGrow: 0,
  },
  option: {
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  optionLabel: {
    fontSize: fontSize.md,
    color: colors.ink,
  },
  optionLabelSelected: {
    color: colors.greenMain,
    fontWeight: '700',
  },
});
