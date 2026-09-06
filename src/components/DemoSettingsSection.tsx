import { useState } from 'react';
import { Alert, StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fontSize, spacing } from '../constants/theme';
import { strings } from '../constants/strings';
import { SectionCard } from './SectionCard';
import { Chip } from './Chip';
import { PrimaryButton } from './PrimaryButton';
import { useAuth } from '../context/AuthContext';
import { useDemo, type DemoTimeScale } from '../context/DemoContext';
import { useConfig } from '../hooks/useConfig';
import { useLotsByHolder } from '../hooks/useLotsByHolder';
import { useLots } from '../state/LotsContext';
import { buildDemoLots } from '../lib/demoLots';

const TIME_SCALE_OPTIONS: { value: DemoTimeScale; label: string }[] = [
  { value: 1, label: strings.demo.scale1x },
  { value: 60, label: strings.demo.scale60x },
  { value: 1440, label: strings.demo.scale1440x },
];

/** Khối cài đặt demo — công tắc bật/tắt + hệ số nén (mọi vai trò), và nút
 * tạo/xoá lô mẫu (CHỈ đại lý, vì lô mẫu tạo thẳng vào kho currentHolderId của
 * chính đại lý đang đăng nhập). Dùng chung trong AccountScreen của cả hai vai trò. */
export function DemoSettingsSection() {
  const { profile } = useAuth();
  const { enabled, timeScale, setEnabled, setTimeScale } = useDemo();
  const { config } = useConfig();
  const isRetailer = profile?.role === 'retailer';
  const { lots } = useLotsByHolder(isRetailer ? profile?.uid : undefined);
  const { addLot, deleteLot } = useLots();
  const [busy, setBusy] = useState(false);

  const demoLots = lots.filter((lot) => lot.isDemo);

  async function handleGenerate() {
    if (!profile || !config) return;
    setBusy(true);
    try {
      const newLots = buildDemoLots(config, profile.uid);
      for (const lot of newLots) {
        await addLot(lot);
      }
      Alert.alert(strings.demo.generateSuccessTitle, strings.demo.generateSuccessMessage);
    } catch (e) {
      Alert.alert(strings.common.errorGeneric, e instanceof Error ? e.message : undefined);
    } finally {
      setBusy(false);
    }
  }

  function handleDelete() {
    if (demoLots.length === 0) {
      Alert.alert(strings.demo.deleteButton, strings.demo.deleteEmptyMessage);
      return;
    }
    Alert.alert(strings.demo.deleteConfirmTitle, strings.demo.deleteConfirmMessage, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.common.delete,
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            for (const lot of demoLots) {
              await deleteLot(lot.id);
            }
            Alert.alert(strings.demo.deleteButton, strings.demo.deleteSuccessMessage);
          } catch (e) {
            Alert.alert(strings.common.errorGeneric, e instanceof Error ? e.message : undefined);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  }

  return (
    <SectionCard title={strings.demo.sectionTitle} style={styles.card}>
      <View style={styles.toggleRow}>
        <View style={styles.toggleTextWrap}>
          <Text style={styles.toggleLabel}>{strings.demo.toggleLabel}</Text>
          <Text style={styles.toggleHint}>{strings.demo.toggleHint}</Text>
        </View>
        <Switch value={enabled} onValueChange={setEnabled} trackColor={{ true: colors.amberMain }} />
      </View>

      {enabled && (
        <View style={styles.scaleSection}>
          <Text style={styles.scaleLabel}>{strings.demo.timeScaleLabel}</Text>
          <View style={styles.chipRow}>
            {TIME_SCALE_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                selected={timeScale === option.value}
                color={colors.amberMain}
                onPress={() => setTimeScale(option.value)}
              />
            ))}
          </View>
        </View>
      )}

      {isRetailer && (
        <View style={styles.actions}>
          <PrimaryButton
            label={busy ? strings.common.loading : strings.demo.generateButton}
            onPress={handleGenerate}
            disabled={busy || !config}
            style={styles.actionButton}
          />
          <PrimaryButton
            label={strings.demo.deleteButton}
            onPress={handleDelete}
            variant="outline"
            color={colors.redMain}
            disabled={busy}
            style={styles.actionButton}
          />
        </View>
      )}
    </SectionCard>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: spacing.xl,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  toggleTextWrap: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
  },
  toggleHint: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.muted,
  },
  scaleSection: {
    marginTop: spacing.lg,
  },
  scaleLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  actions: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  actionButton: {
    alignSelf: 'stretch',
  },
});
