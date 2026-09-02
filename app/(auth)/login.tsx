import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { colors, fontSize, radius, roleAccent, spacing } from '../../src/constants/theme';
import { strings } from '../../src/constants/strings';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { RoleCard } from '../../src/components/RoleCard';
import { useSession, Role } from '../../src/state/SessionContext';
import { mockStation } from '../../src/mocks/lots';

const DEMO_PROFILE: Record<Role, { name: string; orgName: string }> = {
  grower: { name: 'Chủ vườn', orgName: 'Vườn Xoài Cát Hòa Lộc' },
  retailer: { name: 'Nhân viên đại lý', orgName: mockStation.name },
};

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role | null>(null);

  const canSubmit = email.length > 0 && password.length > 0 && role !== null;

  function handleSubmit() {
    if (!canSubmit || !role) return;
    login({ email, role, ...DEMO_PROFILE[role] });
    router.replace(role === 'grower' ? '/(grower)' : '/(retailer)');
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.appName}>{strings.common.appName}</Text>
        <Text style={styles.subtitle}>{strings.auth.subtitle}</Text>

        <View style={styles.field}>
          <Text style={styles.label}>{strings.auth.emailLabel}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={strings.auth.emailPlaceholder}
            placeholderTextColor={colors.muted}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{strings.auth.passwordLabel}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={strings.auth.passwordPlaceholder}
            placeholderTextColor={colors.muted}
            secureTextEntry
          />
        </View>

        <Text style={styles.label}>{strings.auth.roleLabel}</Text>
        <View style={styles.roleRow}>
          <RoleCard
            label={strings.auth.roleGrower}
            description={strings.auth.roleGrowerDesc}
            color={roleAccent.grower}
            selected={role === 'grower'}
            onPress={() => setRole('grower')}
          />
          <RoleCard
            label={strings.auth.roleRetailer}
            description={strings.auth.roleRetailerDesc}
            color={roleAccent.retailer}
            selected={role === 'retailer'}
            onPress={() => setRole('retailer')}
          />
        </View>

        <PrimaryButton
          label={strings.auth.submit}
          onPress={handleSubmit}
          disabled={!canSubmit}
          color={role ? roleAccent[role] : colors.greenMain}
          style={styles.submitButton}
        />

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>{strings.auth.noAccount} </Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={styles.link}>{strings.auth.goRegister}</Text>
            </Pressable>
          </Link>
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
    padding: spacing.xl,
  },
  appName: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.greenDark,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: spacing.xs,
    fontSize: fontSize.sm,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.ink,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.ink,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  linkText: {
    fontSize: fontSize.sm,
    color: colors.muted,
  },
  link: {
    fontSize: fontSize.sm,
    color: colors.greenMain,
    fontWeight: '700',
  },
});
