import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../../src/constants/theme';
import { strings } from '../../../src/constants/strings';
import { AsyncState } from '../../../src/components/AsyncState';
import { LotDetailView } from '../../../src/components/LotDetailView';
import { DemoBanner } from '../../../src/components/DemoBanner';
import { useLots } from '../../../src/state/LotsContext';
import { useAuth } from '../../../src/context/AuthContext';
import { useDemo } from '../../../src/context/DemoContext';
import { useLotById } from '../../../src/hooks/useLotById';
import { useConfig } from '../../../src/hooks/useConfig';
import { useStationTemp } from '../../../src/hooks/useStationTemp';
import { getHolderRole } from '../../../src/lib/lotHolder';
import { canTransition } from '../../../src/lib/lotStatus';
import { resolveConsumedRatio } from '../../../src/lib/shelfLife';

export default function LotDetailScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { deleteLot, updateLot } = useLots();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lot, loading: lotLoading, error: lotError } = useLotById(id);
  const { config, loading: configLoading, error: configError } = useConfig();
  const { station } = useStationTemp(lot?.currentHolderId, lot ? getHolderRole(lot.status) : undefined);
  // "now" HIỂN THỊ — có thể bị nén tốc độ ở chế độ demo (xem DemoContext). Các mốc
  // GHI xuống Firebase (shippedAt, soldAt...) bên dưới luôn dùng new Date() thật,
  // không được lẫn với giá trị này.
  const { now } = useDemo();
  const [deleting, setDeleting] = useState(false);
  const [transitioning, setTransitioning] = useState(false);

  const loading = lotLoading || configLoading;
  const error = lotError ?? configError;

  const canShip = !!lot && !!profile && canTransition(lot.status, 'in_transit', profile.role);
  const canMarkSold = !!lot && !!profile && canTransition(lot.status, 'sold', profile.role);

  function handleShip() {
    if (!lot || !profile || !canShip) return;
    const lotToShip = lot;
    const actorId = profile.uid;
    Alert.alert(strings.lotDetail.shipConfirmTitle, strings.lotDetail.shipConfirmMessage, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.confirm,
        onPress: async () => {
          setTransitioning(true);
          try {
            const shippedAt = new Date();
            await updateLot(lotToShip.id, {
              status: 'in_transit',
              history: [
                ...lotToShip.history,
                { event: 'shipped', timestamp: shippedAt.toISOString(), actorId, note: 'Xuất kho vận chuyển' },
              ],
            });
          } catch (e) {
            Alert.alert(strings.common.errorGeneric, e instanceof Error ? e.message : undefined);
          } finally {
            setTransitioning(false);
          }
        },
      },
    ]);
  }

  function handleMarkSold() {
    if (!lot || !profile || !config || !canMarkSold) return;
    const lotToSell = lot;
    const actorId = profile.uid;
    Alert.alert(strings.lotDetail.soldConfirmTitle, strings.lotDetail.soldConfirmMessage, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.confirm,
        onPress: async () => {
          setTransitioning(true);
          try {
            const soldAt = new Date();
            // Đóng băng consumedRatio TẠI THỜI ĐIỂM đánh dấu đã bán — sau đây
            // resolveConsumedRatio(status: 'sold') sẽ trả nguyên giá trị này mãi mãi,
            // không cộng thêm drift theo nhiệt độ kho nữa (xem shelfLife.ts).
            const frozenConsumedRatio = resolveConsumedRatio(lot, config.assumedTemp, station?.temp, soldAt);
            await updateLot(lotToSell.id, {
              status: 'sold',
              consumedRatio: frozenConsumedRatio,
              updatedAt: soldAt.toISOString(),
              history: [
                ...lotToSell.history,
                { event: 'sold', timestamp: soldAt.toISOString(), actorId, note: 'Đã bán' },
              ],
            });
          } catch (e) {
            Alert.alert(strings.common.errorGeneric, e instanceof Error ? e.message : undefined);
          } finally {
            setTransitioning(false);
          }
        },
      },
    ]);
  }

  async function handleDelete() {
    if (!lot) return;
    const lotId = lot.id;
    Alert.alert(strings.lotDetail.deleteConfirmTitle, strings.lotDetail.deleteConfirmMessage, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteLot(lotId);
            router.replace('/(grower)');
          } catch (e) {
            setDeleting(false);
            Alert.alert(strings.common.errorGeneric, e instanceof Error ? e.message : undefined);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <DemoBanner />
      <AsyncState loading={loading} error={error} isEmpty={!lot} emptyText={strings.lotDetail.notFound}>
        {lot && config && (
          <LotDetailView
            lot={lot}
            assumedTempConfig={config.assumedTemp}
            stationTemp={station?.temp}
            now={now}
            isOwner={profile?.role === 'grower'}
            deleting={deleting}
            transitioning={transitioning}
            canShip={canShip}
            onShip={handleShip}
            canMarkSold={canMarkSold}
            onMarkSold={handleMarkSold}
            onDelete={handleDelete}
          />
        )}
      </AsyncState>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});
