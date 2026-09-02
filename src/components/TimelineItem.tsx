import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../constants/theme';
import { formatDateTime } from '../lib/format';

interface TimelineItemProps {
  title: string;
  timestamp: string;
  note?: string;
  isLast?: boolean;
}

export function TimelineItem({ title, timestamp, note, isLast = false }: TimelineItemProps) {
  return (
    <View style={styles.row}>
      <View style={styles.markerColumn}>
        <View style={styles.dot} />
        {!isLast && <View style={styles.line} />}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.time}>{formatDateTime(timestamp)}</Text>
        {note ? <Text style={styles.note}>{note}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
  },
  markerColumn: {
    width: 20,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.greenMain,
    marginTop: 4,
  },
  line: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
  },
  content: {
    flex: 1,
    paddingBottom: spacing.lg,
    paddingLeft: spacing.sm,
  },
  title: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  time: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  note: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.ink,
  },
});
