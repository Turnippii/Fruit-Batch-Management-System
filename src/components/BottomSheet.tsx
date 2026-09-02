import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../constants/theme';

interface BottomSheetOption {
  key: string;
  label: string;
}

interface BottomSheetProps {
  visible: boolean;
  title: string;
  options: BottomSheetOption[];
  selectedKey?: string;
  onSelect: (key: string) => void;
  onClose: () => void;
}

export function BottomSheet({ visible, title, options, selectedKey, onSelect, onClose }: BottomSheetProps) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {options.map((option) => (
            <Pressable
              key={option.key}
              style={styles.option}
              onPress={() => {
                onSelect(option.key);
                onClose();
              }}
            >
              <Text style={[styles.optionLabel, option.key === selectedKey && styles.optionLabelSelected]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
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
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.md,
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
