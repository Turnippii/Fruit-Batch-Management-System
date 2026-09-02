import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fontSize, radius, spacing, statusColorHex } from '../../src/constants/theme';
import { strings, FRUIT_TYPE_LABELS } from '../../src/constants/strings';
import { SectionCard } from '../../src/components/SectionCard';
import { StatCard } from '../../src/components/StatCard';
import { ColorDot } from '../../src/components/ColorDot';
import { AsyncState } from '../../src/components/AsyncState';
import { useAuth } from '../../src/context/AuthContext';
import { useLotsByHolder } from '../../src/hooks/useLotsByHolder';
import { useStationTemp } from '../../src/hooks/useStationTemp';
import { useConfig } from '../../src/hooks/useConfig';
import { getRemainingDaysFloor, getRemainingRatio, getStatusColor, resolveConsumedRatio } from '../../src/lib/shelfLife';

export default function RetailerHomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { lots, loading, error } = useLotsByHolder(profile?.uid);
  const { station } = useStationTemp(profile?.uid);
  const { config } = useConfig();

  const inStockLots = lots
    .filter((lot) => lot.status === 'in_stock')
    .map((lot) => {
      const consumedRatio = config ? resolveConsumedRatio(lot, config.assumedTemp, station?.temp, new Date()) : 0;
      return {
        lot,
        remainingDays: getRemainingDaysFloor(lot.initialShelfDays, consumedRatio),
        color: getStatusColor(getRemainingRatio(consumedRatio)),
      };
    });

  const greenCount = inStockLots.filter((e) => e.color === 'green').length;
  const yellowCount = inStockLots.filter((e) => e.color === 'yellow').length;
  const redCount = inStockLots.filter((e) => e.color === 'red').length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.stationName}>{station?.name ?? profile?.orgName}</Text>

        <View style={styles.statsRow}>
          <StatCard value={greenCount} label={strings.retailerHome.countGreen} accentColor={statusColorHex.green} />
          <StatCard value={yellowCount} label={strings.retailerHome.countYellow} accentColor={statusColorHex.yellow} />
          <StatCard value={redCount} label={strings.retailerHome.countRed} accentColor={statusColorHex.red} />
        </View>

        <SectionCard style={styles.tempCard}>
          <View style={styles.tempRow}>
            <View>
              <Text style={styles.tempLabel}>{strings.retailerHome.stationTemp}</Text>
              <Text style={styles.tempValue}>{station ? `${station.temp}°C` : '—'}</Text>
            </View>
            <View>
              <Text style={styles.tempLabel}>{strings.retailerHome.stationHumid}</Text>
              <Text style={styles.tempValue}>{station ? `${station.humid}%` : '—'}</Text>
            </View>
          </View>
        </SectionCard>

        <Text style={styles.sectionTitle}>{strings.retailerHome.lotListTitle}</Text>
        <AsyncState loading={loading} error={error} isEmpty={inStockLots.length === 0} emptyText={strings.lotAll.emptyResult}>
          <View style={styles.list}>
            {inStockLots.map(({ lot, remainingDays, color }) => (
              <Pressable
                key={lot.id}
                style={styles.lotRow}
                onPress={() => router.push({ pathname: '/lot/[id]', params: { id: lot.id } })}
              >
                <ColorDot color={color} size={12} />
                <View style={styles.lotInfo}>
                  <Text style={styles.lotTitle}>
                    {FRUIT_TYPE_LABELS[lot.fruitType]} · {lot.gardenName}
                  </Text>
                  <Text style={styles.lotCode}>{lot.id}</Text>
                </View>
                <Text style={[styles.daysLeft, { color: statusColorHex[color] }]}>
                  {remainingDays} {strings.retailerHome.daysLeft}
                </Text>
              </Pressable>
            ))}
          </View>
        </AsyncState>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
  },
  stationName: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.blueMain,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  tempCard: {
    marginBottom: spacing.xl,
  },
  tempRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tempLabel: {
    fontSize: fontSize.xs,
    color: colors.muted,
    textAlign: 'center',
  },
  tempValue: {
    marginTop: spacing.xs,
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.ink,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  list: {
    gap: spacing.sm,
  },
  lotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  lotInfo: {
    flex: 1,
  },
  lotTitle: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  lotCode: {
    marginTop: 2,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  daysLeft: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
});
