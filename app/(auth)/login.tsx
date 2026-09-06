import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { colors, fontSize, radius, spacing } from '../../src/constants/theme';
import { strings } from '../../src/constants/strings';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { LeafLogo } from '../../src/components/LeafLogo';
import { useAuth } from '../../src/context/AuthContext';
import { USE_MOCK } from '../../src/config';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const canSubmit = email.length > 0 && password.length > 0 && !submitting;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    setFormError(null);
    try {
      // role không còn chọn thủ công — đọc từ users/{uid} sau khi xác thực.
      const role = await login(email.trim(), password);
      router.replace(role === 'grower' ? '/(grower)' : '/(retailer)');
    } catch (e) {
      setFormError(e instanceof Error ? e.message : strings.common.errorGeneric);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <OfflineBanner />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoWrap}>
          <View style={styles.logoCircle}>
            <LeafLogo size={56} color={colors.white} />
          </View>
        </View>
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

        {USE_MOCK && <Text style={styles.mockHint}>{strings.auth.mockHint}</Text>}
        {formError && <Text style={styles.errorText}>{formError}</Text>}

        <PrimaryButton
          label={submitting ? strings.common.loading : strings.auth.submit}
          onPress={handleSubmit}
          disabled={!canSubmit}
          color={colors.greenMain}
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
  logoWrap: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.greenDark,
    alignItems: 'center',
    justifyContent: 'center',
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
  mockHint: {
    fontSize: fontSize.xs,
    color: colors.muted,
    marginBottom: spacing.md,
  },
  errorText: {
    fontSize: fontSize.sm,
    color: colors.redMain,
    marginBottom: spacing.md,
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
