import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fontSize, radius, spacing } from '../../src/constants/theme';
import { strings, LOT_STATUS_LABELS } from '../../src/constants/strings';
import { Chip } from '../../src/components/Chip';
import { LotListItem } from '../../src/components/LotListItem';
import { useLots } from '../../src/state/LotsContext';
import type { LotStatus } from '../../src/mocks/lots';

const STATUS_FILTERS: (LotStatus | 'all')[] = ['all', 'at_garden', 'in_transit', 'in_stock', 'sold', 'discarded'];

export default function LotAllScreen() {
  const router = useRouter();
  const { lots } = useLots();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<LotStatus | 'all'>('all');

  const filteredLots = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return lots.filter((lot) => {
      const matchesStatus = statusFilter === 'all' || lot.status === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        lot.id.toLowerCase().includes(normalizedQuery) ||
        lot.gardenName.toLowerCase().includes(normalizedQuery);
      return matchesStatus && matchesQuery;
    });
  }, [lots, query, statusFilter]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={strings.lotAll.searchPlaceholder}
          placeholderTextColor={colors.muted}
        />

        <View style={styles.filterRowContainer}>
          <FlatList
            data={STATUS_FILTERS}
            horizontal
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item}
            contentContainerStyle={styles.filterRow}
            renderItem={({ item }) => (
              <Chip
                label={item === 'all' ? strings.common.all : LOT_STATUS_LABELS[item]}
                selected={statusFilter === item}
                onPress={() => setStatusFilter(item)}
              />
            )}
          />
        </View>

        <FlatList
          data={filteredLots}
          keyExtractor={(lot) => lot.id}
          style={styles.resultList}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>{strings.lotAll.emptyResult}</Text>}
          renderItem={({ item }) => (
            <LotListItem lot={item} onPress={() => router.push({ pathname: '/lot/[id]', params: { id: item.id } })} />
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  searchInput: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.md,
    color: colors.ink,
    marginBottom: spacing.md,
  },
  filterRowContainer: {
    height: 44,
    marginBottom: spacing.md,
  },
  filterRow: {
    gap: spacing.sm,
    alignItems: 'center',
  },
  resultList: {
    flex: 1,
  },
  list: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  emptyText: {
    marginTop: spacing.xl,
    textAlign: 'center',
    fontSize: fontSize.sm,
    color: colors.muted,
  },
});
