import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fontSize, spacing } from '../../src/constants/theme';
import { strings } from '../../src/constants/strings';
import { StatCard } from '../../src/components/StatCard';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { LotListItem } from '../../src/components/LotListItem';
import { AsyncState } from '../../src/components/AsyncState';
import { useLots } from '../../src/state/LotsContext';
import { useAuth } from '../../src/context/AuthContext';
import { useConfig } from '../../src/hooks/useConfig';
import { getRemainingRatio, getStatusColor, resolveConsumedRatio } from '../../src/lib/shelfLife';

const RECENT_LOTS_LIMIT = 4;

export default function GrowerHomeScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { lots, loading, error } = useLots();
  const { config } = useConfig();

  const recentLots = [...lots]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, RECENT_LOTS_LIMIT);

  // Đếm nhanh không chờ cảm biến của từng đại lý — dùng nhiệt độ giả định, bỏ
  // qua phần trôi thực tế theo cảm biến (xem resolveConsumedRatio: thiếu
  // stationTemp thì giữ nguyên consumedRatio đã lưu, không cộng dồn thêm).
  const expiringSoonCount = config
    ? lots.filter((lot) => {
        const consumedRatio = resolveConsumedRatio(lot, config.assumedTemp, undefined, new Date());
        const color = getStatusColor(getRemainingRatio(consumedRatio));
        return color === 'yellow' || color === 'red';
      }).length
    : 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.greeting}>
          {strings.growerHome.greeting}, {profile?.name ?? strings.auth.roleGrower}
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
        <AsyncState loading={loading} error={error} isEmpty={recentLots.length === 0} emptyText={strings.lotAll.emptyResult}>
          <View style={styles.list}>
            {recentLots.map((lot) => (
              <LotListItem key={lot.id} lot={lot} onPress={() => router.push({ pathname: '/lot/[id]', params: { id: lot.id } })} />
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
