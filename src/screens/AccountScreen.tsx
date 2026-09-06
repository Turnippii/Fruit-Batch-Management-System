import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { colors, fontSize, radius, spacing } from '../constants/theme';
import { strings } from '../constants/strings';
import { SectionCard } from '../components/SectionCard';
import { PrimaryButton } from '../components/PrimaryButton';
import { DemoSettingsSection } from '../components/DemoSettingsSection';
import { useAuth } from '../context/AuthContext';

interface AccountScreenProps {
  accentColor: string;
}

export function AccountScreen({ accentColor }: AccountScreenProps) {
  const { profile, logout } = useAuth();
  const router = useRouter();

  if (!profile) return null;

  const orgLabel = profile.role === 'grower' ? strings.account.orgLabelGrower : strings.account.orgLabelRetailer;
  const roleLabel = profile.role === 'grower' ? strings.auth.roleGrower : strings.auth.roleRetailer;

  function handleLogout() {
    Alert.alert(strings.account.logoutConfirmTitle, strings.account.logoutConfirmMessage, [
      { text: strings.common.cancel, style: 'cancel' },
      {
        text: strings.account.logout,
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={[styles.avatar, { backgroundColor: accentColor }]}>
            <Text style={styles.avatarText}>{profile.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.name}>{profile.name}</Text>
          <View style={[styles.roleBadge, { borderColor: accentColor }]}>
            <Text style={[styles.roleBadgeText, { color: accentColor }]}>{roleLabel}</Text>
          </View>
        </View>

        <SectionCard style={styles.infoCard}>
          <InfoRow label={orgLabel} value={profile.orgName} />
          <InfoRow label={strings.account.emailLabel} value={profile.email} />
        </SectionCard>

        <DemoSettingsSection />

        <PrimaryButton label={strings.account.logout} onPress={handleLogout} color={colors.redMain} variant="outline" />
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
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
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.white,
  },
  name: {
    marginTop: spacing.md,
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.ink,
  },
  roleBadge: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  roleBadgeText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
  },
  infoCard: {
    marginBottom: spacing.xl,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  infoValue: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.ink,
  },
});
