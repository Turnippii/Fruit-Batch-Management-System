import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fontSize, spacing } from '../../src/constants/theme';
import { strings } from '../../src/constants/strings';
import { StatCard } from '../../src/components/StatCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { LotListItem } from '../../src/components/LotListItem';
import { useLots } from '../../src/state/LotsContext';
import { useSession } from '../../src/state/SessionContext';
import { getRemainingRatio, getStatusColor, resolveConsumedRatio } from '../../src/lib/shelfLife';
import { mockStation } from '../../src/mocks/lots';
import { assumedTemp } from '../../src/mocks/config';

const RECENT_LOTS_LIMIT = 4;

export default function GrowerHomeScreen() {
  const router = useRouter();
  const { session } = useSession();
  const { lots } = useLots();

  const recentLots = [...lots]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, RECENT_LOTS_LIMIT);

  const expiringSoonCount = lots.filter((lot) => {
    const consumedRatio = resolveConsumedRatio(lot, assumedTemp, mockStation.temp, new Date());
    const color = getStatusColor(getRemainingRatio(consumedRatio));
    return color === 'yellow' || color === 'red';
  }).length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>
          {strings.growerHome.greeting}, {session?.name ?? strings.auth.roleGrower}
        </Text>

        <View style={styles.statsRow}>
          <StatCard value={lots.length} label={strings.growerHome.statManaging} accentColor={colors.greenMain} />
          <StatCard value={expiringSoonCount} label={strings.growerHome.statExpiringSoon} accentColor={colors.amberMain} />
        </View>

        <PrimaryButton
          label={strings.growerHome.createLot}
          onPress={() => router.push('/(grower)/capture')}
          style={styles.createButton}
        />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{strings.growerHome.recentLots}</Text>
          <PrimaryButton label={strings.common.viewAll} onPress={() => router.push('/lot/all')} variant="outline" style={styles.viewAllButton} />
        </View>
        <View style={styles.list}>
          {recentLots.map((lot) => (
            <LotListItem key={lot.id} lot={lot} onPress={() => router.push({ pathname: '/lot/[id]', params: { id: lot.id } })} />
          ))}
        </View>
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
  greeting: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.greenDark,
    marginBottom: spacing.lg,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  createButton: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.ink,
  },
  viewAllButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  list: {
    gap: spacing.md,
  },
});
