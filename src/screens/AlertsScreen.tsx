import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors, fontSize, spacing } from '../constants/theme';
import { strings, HISTORY_EVENT_LABELS, FRUIT_TYPE_LABELS } from '../constants/strings';
import { SectionCard } from '../components/SectionCard';
import { AlertCard } from '../components/AlertCard';
import { TimelineItem } from '../components/TimelineItem';
import { PrimaryButton } from '../components/PrimaryButton';
import { AsyncState } from '../components/AsyncState';
import { useAuth } from '../context/AuthContext';
import { useAlerts } from '../hooks/useAlerts';
import { useLotsByGrower } from '../hooks/useLotsByGrower';
import { useLotsByHolder } from '../hooks/useLotsByHolder';

interface AlertsScreenProps {
  accentColor: string;
}

export function AlertsScreen({ accentColor }: AlertsScreenProps) {
  const router = useRouter();
  const { profile } = useAuth();
  const isRetailer = profile?.role === 'retailer';
  const growerLots = useLotsByGrower(!isRetailer ? profile?.uid : undefined);
  const retailerLots = useLotsByHolder(isRetailer ? profile?.uid : undefined);
  const { lots, loading: lotsLoading, error: lotsError } = isRetailer ? retailerLots : growerLots;
  const { alerts, loading: alertsLoading, error: alertsError } = useAlerts(profile?.role, profile?.uid);
  const { lotId } = useLocalSearchParams<{ lotId?: string }>();
  const traceLot = lots.find((lot) => lot.id === lotId) ?? lots[0];

  function goToLot(id: string) {
    router.push({ pathname: '/lot/[id]', params: { id } });
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>{strings.alerts.alertsTitle}</Text>
        <AsyncState
          loading={alertsLoading || lotsLoading}
          error={alertsError ?? lotsError}
          isEmpty={alerts.length === 0}
          emptyText={strings.alerts.emptyAlerts}
        >
          <View style={styles.alertList}>
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                level={alert.level}
                message={alert.message}
                createdAt={alert.createdAt}
                lot={lots.find((lot) => lot.id === alert.lotId)}
                onPress={() => goToLot(alert.lotId)}
              />
            ))}
          </View>
        </AsyncState>

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

        <PrimaryButton
          label={strings.alerts.exportReport}
          onPress={() => Alert.alert(strings.alerts.exportReport, 'Báo cáo đã được tạo (demo).')}
          color={accentColor}
        />
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
