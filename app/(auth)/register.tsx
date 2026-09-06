import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { colors, fontSize, radius, roleAccent, spacing } from '../../src/constants/theme';
import { strings } from '../../src/constants/strings';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { RoleCard } from '../../src/components/RoleCard';
import { OfflineBanner } from '../../src/components/OfflineBanner';
import { LeafLogo } from '../../src/components/LeafLogo';
import { useAuth, Role } from '../../src/context/AuthContext';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  orgName?: string;
  role?: string;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [role, setRole] = useState<Role | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const orgLabel = role === 'retailer' ? strings.auth.orgNameLabelRetailer : strings.auth.orgNameLabelGrower;

  function validate(): FormErrors {
    const next: FormErrors = {};
    if (!EMAIL_PATTERN.test(email)) next.email = strings.auth.errorEmailInvalid;
    if (password.length < 6) next.password = strings.auth.errorPasswordTooShort;
    if (confirmPassword !== password) next.confirmPassword = strings.auth.errorPasswordMismatch;
    if (name.trim().length === 0) next.name = strings.auth.errorNameRequired;
    if (orgName.trim().length === 0) next.orgName = strings.auth.errorOrgRequired;
    if (!role) next.role = strings.auth.errorRoleRequired;
    return next;
  }

  async function handleSubmit() {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || !role) return;
    setSubmitting(true);
    setFormError(null);
    try {
      const registeredRole = await register({ email, password, name: name.trim(), orgName: orgName.trim(), role });
      router.replace(registeredRole === 'grower' ? '/(grower)' : '/(retailer)');
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
        <Text style={styles.title}>{strings.auth.registerTitle}</Text>

        <Field label={strings.auth.nameLabel} value={name} onChangeText={setName} placeholder={strings.auth.namePlaceholder} error={errors.name} />
        <Field label={strings.auth.emailLabel} value={email} onChangeText={setEmail} placeholder={strings.auth.emailPlaceholder} error={errors.email} autoCapitalize="none" keyboardType="email-address" />
        <Field label={strings.auth.passwordLabel} value={password} onChangeText={setPassword} placeholder={strings.auth.passwordPlaceholder} error={errors.password} secureTextEntry />
        <Field label={strings.auth.confirmPasswordLabel} value={confirmPassword} onChangeText={setConfirmPassword} placeholder={strings.auth.passwordPlaceholder} error={errors.confirmPassword} secureTextEntry />
        <Field label={orgLabel} value={orgName} onChangeText={setOrgName} placeholder={orgLabel} error={errors.orgName} />

        <Text style={styles.label}>{strings.auth.roleLabel}</Text>
        <View style={styles.roleRow}>
          <RoleCard label={strings.auth.roleGrower} description={strings.auth.roleGrowerDesc} color={roleAccent.grower} selected={role === 'grower'} onPress={() => setRole('grower')} />
          <RoleCard label={strings.auth.roleRetailer} description={strings.auth.roleRetailerDesc} color={roleAccent.retailer} selected={role === 'retailer'} onPress={() => setRole('retailer')} />
        </View>
        {errors.role && <Text style={styles.errorText}>{errors.role}</Text>}
        {formError && <Text style={styles.errorText}>{formError}</Text>}

        <PrimaryButton
          label={submitting ? strings.common.loading : strings.auth.registerSubmit}
          onPress={handleSubmit}
          disabled={submitting}
          color={role ? roleAccent[role] : colors.greenMain}
          style={styles.submitButton}
        />

        <View style={styles.linkRow}>
          <Text style={styles.linkText}>{strings.auth.haveAccount} </Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.link}>{strings.auth.goLogin}</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  error?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences';
  keyboardType?: 'default' | 'email-address';
}

function Field({ label, value, onChangeText, placeholder, error, secureTextEntry, autoCapitalize, keyboardType }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
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
  title: {
    fontSize: fontSize.xxl,
    fontWeight: '800',
    color: colors.greenDark,
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
  inputError: {
    borderColor: colors.redMain,
  },
  errorText: {
    marginTop: spacing.xs,
    fontSize: fontSize.xs,
    color: colors.redMain,
  },
  roleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
  },
  submitButton: {
    marginTop: spacing.lg,
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
