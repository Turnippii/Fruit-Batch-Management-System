import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, fontSize, spacing } from '../constants/theme';
import { strings, HISTORY_EVENT_LABELS, FRUIT_TYPE_LABELS } from '../constants/strings';
import { SectionCard } from '../components/SectionCard';
import { AlertCard } from '../components/AlertCard';
import { TimelineItem } from '../components/TimelineItem';
import { AsyncState } from '../components/AsyncState';
import { EmptyState } from '../components/EmptyState';
import { OfflineBanner } from '../components/OfflineBanner';
import { useAuth } from '../context/AuthContext';
import { useDemo } from '../context/DemoContext';
import { useLotsByGrower } from '../hooks/useLotsByGrower';
import { useLotsByHolder } from '../hooks/useLotsByHolder';
import { useStationTemp } from '../hooks/useStationTemp';
import { useConfig } from '../hooks/useConfig';
import { usePullToRefresh } from '../hooks/usePullToRefresh';
import { buildLotAlerts } from '../lib/lotAlerts';

interface AlertsScreenProps {
  accentColor: string;
}

export function AlertsScreen({ accentColor }: AlertsScreenProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const { now } = useDemo();
  const isRetailer = profile?.role === 'retailer';
  const growerLots = useLotsByGrower(!isRetailer ? profile?.uid : undefined);
  const retailerLots = useLotsByHolder(isRetailer ? profile?.uid : undefined);
  const { lots, loading, error } = isRetailer ? retailerLots : growerLots;
  // Retailer gets their own station temp; grower gets undefined (no station),
  // so in_stock lots on the grower side use the stored consumedRatio only.
  const { station } = useStationTemp(profile?.uid, profile?.role);
  const { config, refetch: refetchConfig } = useConfig();
  const { refreshing, onRefresh } = usePullToRefresh(refetchConfig);
  const { lotId } = useLocalSearchParams<{ lotId?: string }>();
  const traceLot = lots.find((lot) => lot.id === lotId) ?? lots[0];

  const alerts =
    config && profile
      ? buildLotAlerts(lots, {
          role: profile.role,
          uid: profile.uid,
          assumedTemp: config.assumedTemp,
          stationTemp: station?.temp,
          now,
        })
      : [];

  function goToLot(id: string) {
    router.push({ pathname: '/lot/[id]', params: { id } });
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <OfflineBanner />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} colors={[accentColor]} />}
      >
        <Text style={styles.sectionTitle}>{strings.alerts.alertsTitle}</Text>
        <AsyncState loading={loading} error={error}>
          {alerts.length === 0 ? (
            <EmptyState icon="✅" text={strings.alerts.emptyAlerts} />
          ) : (
            <View style={styles.alertList}>
              {alerts.map((alert) => (
                <AlertCard key={alert.lot.id} alert={alert} onPress={() => goToLot(alert.lot.id)} />
              ))}
            </View>
          )}

          {traceLot && (
            <SectionCard title={`${strings.alerts.traceTitle} — ${traceLot.id}`} style={styles.traceCard}>
              <Text style={styles.traceLotName}>
                {FRUIT_TYPE_LABELS[traceLot.fruitType]} · {traceLot.gardenName}
              </Text>
              <View style={styles.timeline}>
                {traceLot.history.map((entry, index) => (
                  <TimelineItem
                    key={`${entry.event}-${entry.timestamp}`}
                    title={HISTORY_EVENT_LABELS[entry.event] ?? entry.event}
                    timestamp={entry.timestamp}
                    note={entry.note}
                    isLast={index === traceLot.history.length - 1}
                  />
                ))}
              </View>
            </SectionCard>
          )}
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
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.ink,
    marginBottom: spacing.md,
  },
  alertList: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  traceCard: {
    marginBottom: spacing.xl,
  },
  traceLotName: {
    fontSize: fontSize.sm,
    color: colors.muted,
    marginBottom: spacing.lg,
  },
  timeline: {
    marginTop: spacing.xs,
  },
});
