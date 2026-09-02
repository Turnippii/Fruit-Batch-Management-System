import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, radius, spacing } from '../constants/theme';

interface StatCardProps {
  value: number | string;
  label: string;
  accentColor?: string;
}

export function StatCard({ value, label, accentColor = colors.greenMain }: StatCardProps) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: accentColor }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: 'center',
  },
  value: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
  },
  label: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
  },
});
