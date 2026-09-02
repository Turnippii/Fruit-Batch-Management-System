import { useEffect, useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { colors } from '../../../src/constants/theme';
import { strings } from '../../../src/constants/strings';
import { AsyncState } from '../../../src/components/AsyncState';
import { LotDetailView } from '../../../src/components/LotDetailView';
import { useLots } from '../../../src/state/LotsContext';
import { useAuth } from '../../../src/context/AuthContext';
import { useLotById } from '../../../src/hooks/useLotById';
import { useConfig } from '../../../src/hooks/useConfig';
import { useStationTemp } from '../../../src/hooks/useStationTemp';
import { getHolderRole } from '../../../src/lib/lotHolder';

export default function LotDetailScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { deleteLot } = useLots();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { lot, loading: lotLoading, error: lotError } = useLotById(id);
  const { config, loading: configLoading, error: configError } = useConfig();
  const { station } = useStationTemp(lot?.currentHolderId, lot ? getHolderRole(lot.status) : undefined);
  const [now, setNow] = useState(() => new Date());
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loading = lotLoading || configLoading;
  const error = lotError ?? configError;

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
      <AsyncState loading={loading} error={error} isEmpty={!lot} emptyText={strings.lotDetail.notFound}>
        {lot && config && (
          <LotDetailView
            lot={lot}
            assumedTempConfig={config.assumedTemp}
            stationTemp={station?.temp}
            now={now}
            isOwner={profile?.role === 'grower'}
            deleting={deleting}
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
