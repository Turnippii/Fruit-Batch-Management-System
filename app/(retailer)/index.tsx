import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fontSize, radius, spacing, statusColorHex } from '../../src/constants/theme';
import { strings, FRUIT_TYPE_LABELS } from '../../src/constants/strings';
import { SectionCard } from '../../src/components/SectionCard';
import { StatCard } from '../../src/components/StatCard';
import { ColorDot } from '../../src/components/ColorDot';
import { AsyncState } from '../../src/components/AsyncState';
import { DemoBanner } from '../../src/components/DemoBanner';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { useAuth } from '../../src/context/AuthContext';
import { useDemo } from '../../src/context/DemoContext';
import { useLotsByHolder } from '../../src/hooks/useLotsByHolder';
import { useStationTemp } from '../../src/hooks/useStationTemp';
import { useConfig } from '../../src/hooks/useConfig';
import { usePullToRefresh } from '../../src/hooks/usePullToRefresh';
import { getRemainingDays, getRemainingDaysFloor, getRemainingRatio, getStatusColor, resolveConsumedRatio } from '../../src/lib/shelfLife';

export default function RetailerHomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { now } = useDemo();
  const { lots, loading, error } = useLotsByHolder(profile?.uid);
  const { station } = useStationTemp(profile?.uid, profile?.role);
  const { config, refetch: refetchConfig } = useConfig();
  const { refreshing, onRefresh } = usePullToRefresh(refetchConfig);

  // Sắp theo số ngày còn lại tăng dần (lô sắp hết hạn lên đầu) — KHÔNG sắp theo
  // harvestDate, vì hạn dùng không tỉ lệ thuận với ngày thu hoạch (mỗi loại quả
  // T0 khác nhau, mỗi lô độ chín khác nhau). Cùng số ngày còn lại thì sắp phụ
  // theo harvestDate tăng dần.
  const inStockLots = lots
    .filter((lot) => lot.status === 'in_stock')
    .map((lot) => {
      const consumedRatio = config ? resolveConsumedRatio(lot, config.assumedTemp, station?.temp, now) : 0;
      return {
        lot,
        remainingDaysPrecise: getRemainingDays(lot.initialShelfDays, consumedRatio),
        remainingDays: getRemainingDaysFloor(lot.initialShelfDays, consumedRatio),
        color: getStatusColor(getRemainingRatio(consumedRatio)),
      };
    })
    .sort((a, b) => {
      if (a.remainingDaysPrecise !== b.remainingDaysPrecise) {
        return a.remainingDaysPrecise - b.remainingDaysPrecise;
      }
      return new Date(a.lot.harvestDate).getTime() - new Date(b.lot.harvestDate).getTime();
    });

  const greenCount = inStockLots.filter((e) => e.color === 'green').length;
  const yellowCount = inStockLots.filter((e) => e.color === 'yellow').length;
  const redCount = inStockLots.filter((e) => e.color === 'red').length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OfflineBanner />
      <DemoBanner />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blueMain} colors={[colors.blueMain]} />}
      >
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
        <AsyncState
          loading={loading}
          error={error}
          isEmpty={inStockLots.length === 0}
          emptyIcon="📦"
          emptyText={strings.retailerHome.emptyStock}
          emptyActionLabel={strings.scan.title}
          onEmptyAction={() => router.push('/(retailer)/scan')}
        >
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
