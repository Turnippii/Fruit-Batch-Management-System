import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fontSize, radius, spacing } from '../constants/theme';

interface RoleCardProps {
  label: string;
  description: string;
  color: string;
  selected: boolean;
  onPress: () => void;
}

export function RoleCard({ label, description, color, selected, onPress }: RoleCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.roleCard, { borderColor: selected ? color : colors.border }, selected && { backgroundColor: `${color}14` }]}
    >
      <Text style={[styles.roleLabel, selected && { color }]}>{label}</Text>
      <Text style={styles.roleDesc}>{description}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  roleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: radius.lg,
    padding: spacing.lg,
    backgroundColor: colors.card,
  },
  roleLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.ink,
  },
  roleDesc: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
});
